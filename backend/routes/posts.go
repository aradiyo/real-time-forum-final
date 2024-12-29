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

	// parse post input
	var post models.Post
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadRequest)
		return
	}

	// generate UUID for the post
	post.ID = uuid.Must(uuid.NewV4()).String()

	// insert post into database
	_, err := database.DB.Exec(`
	INSERT INTO posts (id, user_id, category, content)
	VALUES (?, ?, ?, ?)`,
		post.ID, post.UserID, post.Category, post.Content)
	if err != nil {
		http.Error(w, "Failed to create post: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Success response
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Post created successfully"))

}

func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// query from database for posts
	rows, err := database.DB.Query("SELECT id, user_id, category, content, created_at FROM posts")
	if err != nil {
		http.Error(w, "Failed to fetch posts: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// store the posts
	var posts []models.Post
	for rows.Next() {
		var post models.Post
		if err := rows.Scan(&post.ID, &post.UserID, &post.Category, &post.Content, &post.CreatedAt); err != nil {
			http.Error(w, "Failed to scan post: "+err.Error(), http.StatusInternalServerError)
			return
		}
		posts = append(posts, post)

		// return the posts as JSON
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)

	}

}

func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// parse comment input
	var comment models.Comment
	if err := json.NewDecoder(r.Body).Decode(&comment); err != nil {
		http.Error(w, "Invalid input data", http.StatusBadGateway)
		return
	}

	// generate UUID for the comment
	comment.ID = uuid.Must(uuid.NewV4()).String()

	//insert comment into database
	_, err := database.DB.Exec(`
	INSERT INTO comments (id, post_id, user_id, content)
	VALUES (?, ?, ?, ?)`,
		comment.ID, comment.PostID, comment.UserID, comment.Content)

	if err != nil {
		http.Error(w, "Failed to create comment: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Successful response
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Comment created successfully"))
}

func GetCommentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// get the post_id from query parameters
	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		http.Error(w, "Missing post_id parameter", http.StatusBadRequest)
		return
	}

	// query database for the comment
	rows, err := database.DB.Query(`
SELECT id, post_id, user_id, content, created_at
FROM comments WHERE post_id = ?`, postID)

	if err != nil {
		http.Error(w, "Failed to fetch comments: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// store the comments
	var comments []models.Comment
	for rows.Next() {
		var comment models.Comment
		if err := rows.Scan(&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.CreatedAt); err != nil {
			http.Error(w, "Failed to scan comment: "+err.Error(), http.StatusInternalServerError)
			return
		}
		comments = append(comments, comment)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}
