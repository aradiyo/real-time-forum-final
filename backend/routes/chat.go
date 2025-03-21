package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
	"strconv"
	"sync"
	"time"

	"github.com/gofrs/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var clients = make(map[*websocket.Conn]string)
var broadcast = make(chan models.Message)
var mutex = &sync.Mutex{}

func ChatHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Failed to upgrade to WebSocket:", err)
		return
	}
	defer conn.Close()

	senderID := r.URL.Query().Get("sender_id")
	if senderID == "" {
		fmt.Println("Missing sender_id in query params")
		return
	}

	mutex.Lock()
	clients[conn] = senderID
	mutex.Unlock()

	for {
		var msg models.Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			//fmt.Println("Error reading message:", err) - for debugging
			mutex.Lock()
			delete(clients, conn)
			mutex.Unlock()
			break
		}

		msg.ID = uuid.Must(uuid.NewV4()).String()
		msg.CreatedAt = time.Now().Format(time.RFC3339Nano) // Use more precise format with nanoseconds

		// Get the last sequence number for the conversation between these users
		var lastSequence int
		seqQuery := `
			SELECT COALESCE(MAX(sequence), 0) 
			FROM messages 
			WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`
		err = database.DB.QueryRow(seqQuery, senderID, msg.ReceiverID, msg.ReceiverID, senderID).Scan(&lastSequence)
		if err != nil {
			fmt.Println("Error getting last sequence:", err)
			lastSequence = 0
		}

		// Increment the sequence number
		newSequence := lastSequence + 1

		// Save the message with the sequence number
		_, dbErr := database.DB.Exec(`
			INSERT INTO messages (id, sender_id, receiver_id, content, created_at, sequence)
			VALUES (?, ?, ?, ?, ?, ?)`,
			msg.ID, msg.SenderID, msg.ReceiverID, msg.Content, msg.CreatedAt, newSequence)
		if dbErr != nil {
			fmt.Println("Error saving message to database:", dbErr)
			continue
		}

		// Add sequence number to the message before broadcasting
		msg.Sequence = newSequence
		broadcast <- msg
	}
}

func HandleMessages() {
	for {
		msg := <-broadcast
		mutex.Lock()
		for client, userID := range clients {
			if userID == msg.ReceiverID || userID == msg.SenderID {
				err := client.WriteJSON(msg)
				if err != nil {
					fmt.Println("Error sending message:", err)
					client.Close()
					delete(clients, client)
				}
			}
		}
		mutex.Unlock()
	}
}

func GetChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	otherUserID := r.URL.Query().Get("with")
	if otherUserID == "" {
		http.Error(w, "Missing 'with' parameter", http.StatusBadRequest)
		return
	}

	currentUserID, err := utils.GetSession(r)
	if err != nil || currentUserID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	limit := 10
	offset := 0
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = o
		}
	}

	// For simplicity, just get ALL messages for this chat
	// We can paginate on the client side to save complexity
	query := `
		SELECT m.id, m.sender_id, u.nickname, m.receiver_id, m.content, m.created_at, m.sequence
		FROM messages m
		JOIN users u ON m.sender_id = u.id
		WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
		ORDER BY created_at ASC`

	rows, err := database.DB.Query(query, currentUserID, otherUserID, otherUserID, currentUserID)
	if err != nil {
		http.Error(w, "Failed to fetch chat history: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allMessages []map[string]string
	for rows.Next() {
		var id, senderID, senderNickname, receiverID, content, createdAt string
		var sequence int
		if err := rows.Scan(&id, &senderID, &senderNickname, &receiverID, &content, &createdAt, &sequence); err != nil {
			http.Error(w, "Failed to scan message: "+err.Error(), http.StatusInternalServerError)
			return
		}
		msg := map[string]string{
			"id":              id,
			"sender_id":       senderID,
			"sender_nickname": senderNickname,
			"receiver_id":     receiverID,
			"content":         content,
			"created_at":      createdAt,
			"sequence":        strconv.Itoa(sequence),
		}
		allMessages = append(allMessages, msg)
	}

	// Handle pagination client-side for simplicity
	totalCount := len(allMessages)
	startIndex := 0
	endIndex := totalCount

	// If this is initial load, get last 'limit' messages
	if offset == 0 {
		startIndex = max(0, totalCount-limit)
	} else {
		// If loading more, get messages before the ones we already have
		startIndex = max(0, totalCount-offset-limit)
		endIndex = totalCount - offset
	}

	// Clamp to valid range
	if startIndex >= totalCount {
		startIndex = max(0, totalCount-1)
	}
	if endIndex > totalCount {
		endIndex = totalCount
	}
	if endIndex <= startIndex {
		endIndex = startIndex
	}

	// Get the slice of messages to return
	var messages []map[string]string
	if startIndex < endIndex {
		messages = allMessages[startIndex:endIndex]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// Helper function (Go 1.21+ has this built-in)
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func GetChatMessageCountHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	otherUserID := r.URL.Query().Get("with")
	if otherUserID == "" {
		http.Error(w, "Missing 'with' parameter", http.StatusBadRequest)
		return
	}

	currentUserID, err := utils.GetSession(r)
	if err != nil || currentUserID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT COUNT(*) 
		FROM messages 
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`
	var count int
	err = database.DB.QueryRow(query, currentUserID, otherUserID, otherUserID, currentUserID).Scan(&count)
	if err != nil {
		http.Error(w, "Failed to count messages: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"count": count})
}

func IsUserOnline(userID string) bool {
	mutex.Lock()
	defer mutex.Unlock()
	for _, id := range clients {
		if id == userID {
			return true
		}
	}
	return false
}
