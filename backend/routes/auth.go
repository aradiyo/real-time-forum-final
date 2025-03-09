package routes

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"
	"strings"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	// Clean inputs to prevent issues with leading/trailing spaces
	user.Nickname = strings.TrimSpace(user.Nickname)
	user.Email = strings.TrimSpace(user.Email)
	user.FirstName = strings.TrimSpace(user.FirstName)
	user.LastName = strings.TrimSpace(user.LastName)

	// Check for empty required fields after trimming
	if user.Nickname == "" || user.Email == "" || user.Password == "" {
		http.Error(w, "Nickname, email, and password are required fields", http.StatusBadRequest)
		return
	}

	// Validate gender
	if user.Gender != "Male" && user.Gender != "Female" {
		http.Error(w, "Gender must be Male or Female", http.StatusBadRequest)
		return
	}

	// Validate age
	if user.Age < 1 || user.Age > 100 {
		http.Error(w, "Age must be between 1 and 100", http.StatusBadRequest)
		return
	}

	// Check for unique email (case-insensitive check)
	var existingId string
	err := database.DB.QueryRow("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", user.Email).Scan(&existingId)
	if err == nil {
		http.Error(w, "Email already in use", http.StatusBadRequest)
		return
	} else if err != sql.ErrNoRows {
		http.Error(w, "Failed to check email uniqueness: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Check for unique nickname (case-insensitive check)
	err = database.DB.QueryRow("SELECT id FROM users WHERE LOWER(nickname) = LOWER(?)", user.Nickname).Scan(&existingId)
	if err == nil {
		http.Error(w, "Nickname already in use", http.StatusBadRequest)
		return
	} else if err != sql.ErrNoRows {
		http.Error(w, "Failed to check nickname uniqueness: "+err.Error(), http.StatusInternalServerError)
		return
	}

	user.ID = uuid.Must(uuid.NewV4()).String()

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}
	user.Password = string(hashedPassword)

	_, err = database.DB.Exec(`
		INSERT INTO users (id, nickname, email, password, first_name, last_name, age, gender)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.Nickname, user.Email, user.Password, user.FirstName, user.LastName, user.Age, user.Gender)
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to create user: %v", err.Error())
		http.Error(w, errorMsg, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("User registered successfully"))
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var loginReq models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	var user models.User
	// Case-insensitive query
	row := database.DB.QueryRow(`
		SELECT id, nickname, email, password FROM users
		WHERE LOWER(email) = LOWER(?) OR LOWER(nickname) = LOWER(?)`,
		loginReq.Identifier, loginReq.Identifier)

	err := row.Scan(&user.ID, &user.Nickname, &user.Email, &user.Password)
	if err == sql.ErrNoRows {
		http.Error(w, "Invalid email/nickname or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password))
	if err != nil {
		http.Error(w, "Invalid email/nickname or password", http.StatusUnauthorized)
		return
	}

	utils.CreateSession(w, user.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"id":       user.ID,
		"nickname": user.Nickname,
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	utils.DestroySession(w, r)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Logout successful"))
}

func SessionHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := utils.GetSession(r)
	if err != nil || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var nickname string
	err = database.DB.QueryRow("SELECT nickname FROM users WHERE id = ?", userID).Scan(&nickname)
	if err != nil {
		http.Error(w, "Failed to fetch session user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"id":       userID,
		"nickname": nickname,
	})
}
