package routes

import (
	"encoding/json"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/models"

	"github.com/gofrs/uuid"
)

func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var post models.Post
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	post.ID = uuid.Must(uuid.NewV4()).String()

	_, err := database.DB.Exec(`
		INSERT INTO posts (id, user_id, category, content)
		VALUES (?, ?, ?, ?)`,
		post.ID, post.UserID, post.Category, post.Content)
	if err != nil {
		http.Error(w, "Failed to create post: "+err.Error(), http.StatusInternalServerError)
		return
	}

	err = database.DB.QueryRow("SELECT nickname FROM users WHERE id = ?", post.UserID).Scan(&post.Nickname)
	if err != nil {
		http.Error(w, "Failed to fetch user nickname: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := `
	SELECT posts.id, posts.user_id, users.nickname, posts.category, posts.content, posts.created_at 
	FROM posts 
	JOIN users ON posts.user_id = users.id 
	ORDER BY posts.created_at DESC`
	rows, err := database.DB.Query(query)
	if err != nil {
		http.Error(w, "Failed to fetch posts: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		if err := rows.Scan(&post.ID, &post.UserID, &post.Nickname, &post.Category, &post.Content, &post.CreatedAt); err != nil {
			http.Error(w, "Failed to scan post: "+err.Error(), http.StatusInternalServerError)
			return
		}
		posts = append(posts, post)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var comment models.Comment
	if err := json.NewDecoder(r.Body).Decode(&comment); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	comment.ID = uuid.Must(uuid.NewV4()).String()

	_, err := database.DB.Exec(`
		INSERT INTO comments (id, post_id, user_id, content)
		VALUES (?, ?, ?, ?)`,
		comment.ID, comment.PostID, comment.UserID, comment.Content)
	if err != nil {
		http.Error(w, "Failed to create comment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Comment created successfully"))
}

func GetCommentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		http.Error(w, "Missing post_id parameter", http.StatusBadRequest)
		return
	}

	query := `
		SELECT c.id, c.post_id, u.nickname, c.content, c.created_at
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ? ORDER BY c.created_at ASC`
	rows, err := database.DB.Query(query, postID)
	if err != nil {
		http.Error(w, "Failed to fetch comments: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type CommentResponse struct {
		ID        string `json:"id"`
		PostID    string `json:"post_id"`
		Nickname  string `json:"nickname"`
		Content   string `json:"content"`
		CreatedAt string `json:"created_at"`
	}
	var comments []CommentResponse
	for rows.Next() {
		var c CommentResponse
		if err := rows.Scan(&c.ID, &c.PostID, &c.Nickname, &c.Content, &c.CreatedAt); err != nil {
			http.Error(w, "Failed to scan comment: "+err.Error(), http.StatusInternalServerError)
			return
		}
		comments = append(comments, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}
