package models

// User represents a user in the system
type User struct {
	ID        string // Unique identifier for the user
	Nickname  string // User's nickname (unique)
	Email     string // User's email (unique)
	Password  string // Encrypted password
	FirstName string // User's first name
	LastName  string // User's last name
	Age       int    // User's age
	Gender    string // User's gender
}

// Post represents a user-created post
type Post struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Category  string `json:"category"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// Comment represents a comment on a post
type Comment struct {
	ID        string `json:"id"`
	PostID    string `json:"post_id"`
	UserID    string `json:"user_id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// LoginRequest represent the identifier (either nickname or email) and password
type LoginRequset struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

// Message represents a private message between users
type Message struct {
	ID         string `json:"id"`
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id"`
	Content    string `json:"content"`
	CreatedAt  string `json:"created_at"`
}
