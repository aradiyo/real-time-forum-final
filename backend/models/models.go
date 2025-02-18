package models

// User يمثل مستخدم النظام.
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

// Post يمثل منشور قام المستخدم بإنشائه.
type Post struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Nickname  string `json:"nickname,omitempty"` // اسم المنشئ.
	Category  string `json:"category"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// Comment يمثل تعليق على منشور.
type Comment struct {
	ID        string `json:"id"`
	PostID    string `json:"post_id"`
	UserID    string `json:"user_id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// LoginRequest يمثل بيانات تسجيل الدخول.
type LoginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

// Message يمثل رسالة خاصة بين المستخدمين.
type Message struct {
	ID             string `json:"id"`
	SenderID       string `json:"sender_id"`
	SenderNickname string `json:"sender_nickname,omitempty"`
	ReceiverID     string `json:"receiver_id"`
	Content        string `json:"content"`
	CreatedAt      string `json:"created_at"`
}
