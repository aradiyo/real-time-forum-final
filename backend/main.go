package main

import (
	"fmt"
	"log"
	"net/http"
	"real-time-forum/backend/database"
	"real-time-forum/backend/routes"
	"real-time-forum/backend/utils"
)

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Server is running")
}

func main() {

	// Initialise the database
	database.InitDatabase()
	defer database.DB.Close() // close database connection when the program exist

	// Route for health check
	http.HandleFunc("/api/health", healthCheck)

	// route to register
	http.HandleFunc("/api/register", routes.RegisterHandler)

	// route to login
	http.HandleFunc("/api/login", routes.LoginHandler)

	// route to create post
	http.HandleFunc("/api/posts/create", utils.AuthMiddleware(routes.CreatePostHandler))

	// route to get posts
	http.HandleFunc("/api/posts", utils.AuthMiddleware(routes.GetPostsHandler))

	// route to create comment
	http.HandleFunc("/api/comments/create", utils.AuthMiddleware(routes.CreateCommentHandler))

	// route to comments
	http.HandleFunc("/api/comments", utils.AuthMiddleware(routes.GetCommentsHandler))

	// route to chat
	http.HandleFunc("/api/chat", utils.AuthMiddleware(routes.ChatHandler))

	// goroutine to handle messages

	go routes.HandleMessages()

	// route to logout
	http.HandleFunc("/api/logout", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Logout Called")
		utils.DestroySession(w)
		fmt.Println("Session Destroyed")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Logged out Successfully!"))
	})

	// rotue for homepage (html)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "frontend/index.html")
	})

	// start the server
	fmt.Println("Server is running on http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

}
