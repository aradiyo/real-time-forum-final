package routes

import (
	"encoding/json"
	"log"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
)

// GetUsersHandler returns a list of all users (except the current user) with their online status.
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

	rows, err := database.DB.Query(`SELECT id, nickname FROM users WHERE id != ? ORDER BY nickname ASC`, currentUserID)
	if err != nil {
		http.Error(w, "Failed to fetch users: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Nickname); err != nil {
			http.Error(w, "Failed to scan user: "+err.Error(), http.StatusInternalServerError)
			return
		}
		// Set online status using the helper from chat.go.
		user.Online = IsUserOnline(user.ID)
		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(users); err != nil {
		log.Println("Error encoding users:", err)
	}
}
