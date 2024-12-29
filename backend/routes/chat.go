package routes

import (
	"fmt"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/models"
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

// connected clients
var clients = make(map[*websocket.Conn]string)
var broadcast = make(chan models.Message)
var mutex = &sync.Mutex{}

func ChatHandler(w http.ResponseWriter, r *http.Request) {
	// upgrade http to websocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Failed to upgrade to Websocket", err)
		return
	}
	defer conn.Close()

	// save user connection
	senderID := r.URL.Query().Get("sender_id")
	if senderID == "" {
		fmt.Println("Missing sender_id in query params")
		return
	}

	mutex.Lock()
	clients[conn] = senderID
	mutex.Unlock()

	// to listen to messages from this user
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

		// create uuid and time for message
		msg.ID = uuid.Must(uuid.NewV4()).String()
		msg.CreatedAt = time.Now().Format(time.RFC3339)

		// save message to database
		_, dbErr := database.DB.Exec(`
		INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
		VALUES (?, ?, ?, ?, ?)`,
			msg.ID, msg.SenderID, msg.ReceiverID, msg.Content, msg.CreatedAt)

		if dbErr != nil {
			fmt.Println("Error saving message to database:", err)
			continue
		}

		// send message to chanel
		broadcast <- msg

	}
}

func HandleMessages() {
	for {
		msg := <-broadcast

		// send message to all connections
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


