package models

type User struct {
	ID        string `json:"id"`
	Nickname  string `json:"nickname"`
	Email     string `json:"email"`
	Password  string `json:"password,omitempty"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Online    bool   `json:"online,omitempty"`
}

type Post struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Nickname  string `json:"nickname,omitempty"`
	Category  string `json:"category"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

type Comment struct {
	ID        string `json:"id"`
	PostID    string `json:"post_id"`
	UserID    string `json:"user_id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

type LoginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

type Message struct {
	ID             string `json:"id"`
	SenderID       string `json:"sender_id"`
	SenderNickname string `json:"sender_nickname,omitempty"`
	ReceiverID     string `json:"receiver_id"`
	Content        string `json:"content"`
	CreatedAt      string `json:"created_at"`
}
