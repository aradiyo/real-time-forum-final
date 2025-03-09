package main

import (
	"fmt"
	"log"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/routes"
	"real-time-forum/backend/utils"
	"strings"
)

// healthCheck returns a simple OK message.
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Server is running")
}

// serveIndex serves the SPA index file.
func serveIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/" {
		http.ServeFile(w, r, "frontend/index.html")
	} else {
		// Allow static files to be served; otherwise, 404.
		if !strings.HasPrefix(r.URL.Path, "/static/") {
			http.NotFound(w, r)
		}
	}
}

func main() {
	// Initialize the database.
	database.InitDatabase()
	defer database.DB.Close()

	// API endpoints.
	http.HandleFunc("/api/health", healthCheck)
	http.HandleFunc("/api/register", routes.RegisterHandler)
	http.HandleFunc("/api/login", routes.LoginHandler)
	http.HandleFunc("/api/logout", routes.LogoutHandler)
	http.HandleFunc("/api/session", utils.AuthMiddleware(routes.SessionHandler))
	http.HandleFunc("/api/posts/create", utils.AuthMiddleware(routes.CreatePostHandler))
	http.HandleFunc("/api/posts", utils.AuthMiddleware(routes.GetPostsHandler))
	http.HandleFunc("/api/comments/create", utils.AuthMiddleware(routes.CreateCommentHandler))
	http.HandleFunc("/api/comments", utils.AuthMiddleware(routes.GetCommentsHandler))
	http.HandleFunc("/api/chat", utils.AuthMiddleware(routes.ChatHandler))
	http.HandleFunc("/api/chat/history", utils.AuthMiddleware(routes.GetChatHistoryHandler))
	http.HandleFunc("/api/chat/count", utils.AuthMiddleware(routes.GetChatMessageCountHandler))
	http.HandleFunc("/api/users", utils.AuthMiddleware(routes.GetUsersHandler))

	// Start a goroutine to handle WebSocket message broadcasting.
	go routes.HandleMessages()

	// Serve static files.
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("frontend/static"))))

	// Serve the SPA index.html.
	http.HandleFunc("/", serveIndex)

	fmt.Println("Welcome to Real-Time Forum!")
	fmt.Println("Server is running on http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
