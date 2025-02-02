package routes

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/models"
	"real-time-forum/backend/utils"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Handle user registration
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse user input
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	// Generate a UUID for the user
	user.ID = uuid.Must(uuid.NewV4()).String()

	// Hash the password using bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}
	user.Password = string(hashedPassword)

	// Save the user to the database
	_, err = database.DB.Exec(`
		INSERT INTO users (id, nickname, email, password, first_name, last_name, age, gender)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.Nickname, user.Email, user.Password, user.FirstName, user.LastName, user.Age, user.Gender)
	if err != nil {
		http.Error(w, "Failed to create user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Success response
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("User registered successfully"))

}

// handle user login
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// parse input data
	var loginReq models.LoginRequset
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	// retrieve user from database
	var user models.User
	row := database.DB.QueryRow(`
		SELECT id, nickname, email, password FROM users
		WHERE email = ? OR nickname = ?`,
		loginReq.Identifier, loginReq.Identifier)

	err := row.Scan(&user.ID, &user.Nickname, &user.Email, &user.Password)
	if err == sql.ErrNoRows {
		http.Error(w, "Invalid email/nickname or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// compare passwords using bcrypt
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password))
	if err != nil {
		http.Error(w, "Invalid email/nickname or password", http.StatusUnauthorized)
		return
	}

	// login successful
	utils.CreateSession(w, user.ID) // to add cookies for this user
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("login successful"))

}

// handle user logout

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	utils.DestroySession(w) // Destroy the session by clearing the cookie
	fmt.Fprintf(w, "Logout successful")
}
