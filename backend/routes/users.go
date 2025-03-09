package routes

import (
	"encoding/json"
	"log"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
)

func GetUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	currentUserID, err := utils.GetSession(r)
	if err != nil || currentUserID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := database.DB.Query(`SELECT id, nickname, gender FROM users WHERE id != ? ORDER BY nickname ASC`, currentUserID)
	if err != nil {
		http.Error(w, "Failed to fetch users: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type UserWithLastMessage struct {
		models.User
		LastMessage     string `json:"last_message,omitempty"`
		LastMessageTime string `json:"last_message_time,omitempty"`
	}

	var users []UserWithLastMessage
	for rows.Next() {
		var user UserWithLastMessage
		if err := rows.Scan(&user.ID, &user.Nickname, &user.Gender); err != nil {
			http.Error(w, "Failed to scan user: "+err.Error(), http.StatusInternalServerError)
			return
		}
		user.Online = IsUserOnline(user.ID)

		// Get last message exchanged with this user
		lastMsgRow := database.DB.QueryRow(`
			SELECT content, created_at 
			FROM messages 
			WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
			ORDER BY created_at DESC 
			LIMIT 1`,
			currentUserID, user.ID, user.ID, currentUserID)

		var content, createdAt string
		err := lastMsgRow.Scan(&content, &createdAt)
		if err == nil {
			user.LastMessage = content
			user.LastMessageTime = createdAt
		}

		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(users); err != nil {
		log.Println("Error encoding users:", err)
	}
}
