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
			fmt.Println("Error reading message:", err)
			mutex.Lock()
			delete(clients, conn)
			mutex.Unlock()
			break
		}

		msg.ID = uuid.Must(uuid.NewV4()).String()
		msg.CreatedAt = time.Now().Format(time.RFC3339)

		_, dbErr := database.DB.Exec(`
			INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
			VALUES (?, ?, ?, ?, ?)`,
			msg.ID, msg.SenderID, msg.ReceiverID, msg.Content, msg.CreatedAt)
		if dbErr != nil {
			fmt.Println("Error saving message to database:", dbErr)
			continue
		}

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

	query := `
		SELECT m.id, m.sender_id, u.nickname, m.receiver_id, m.content, m.created_at
		FROM messages m
		JOIN users u ON m.sender_id = u.id
		WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?`
	rows, err := database.DB.Query(query, currentUserID, otherUserID, otherUserID, currentUserID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch chat history: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []map[string]string
	for rows.Next() {
		var id, senderID, senderNickname, receiverID, content, createdAt string
		if err := rows.Scan(&id, &senderID, &senderNickname, &receiverID, &content, &createdAt); err != nil {
			http.Error(w, "Failed to scan message: "+err.Error(), http.StatusInternalServerError)
			return
		}
		msg := map[string]string{
			"id":              id,
			"sender_nickname": senderNickname,
			"receiver_id":     receiverID,
			"content":         content,
			"created_at":      createdAt,
		}
		messages = append(messages, msg)
	}

	// Reverse messages so that the oldest appears first
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
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
