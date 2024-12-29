package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDatabase() {
	var err error

	DB, err = sql.Open("sqlite3", "./real_time_forum.db")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)

	}

	createUsersTable()
	createPostsTable()
	createCommentsTable()
}

func createUsersTable() {
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	nickname TEXT UNIQUE NOT NULL,
	email TEXT UNIQUE NOT NULL,
	password TEXT NOT NULL,
	first_name TEXT,
	last_name TEXT,
	age INTEGER,
	gender TEXT
	);`

	_, err := DB.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Failed to create users table: %v", err)
	}
	
	// to check in terminal if table is created.
	log.Println("Users table created successfully (if it didn't exist).")
}


func createPostsTable() {
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS posts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	category TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	_, err := DB.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Failed to create posts table: %v", err)
	}

	// to check in terminal if table is created.
	log.Println("Posts table created successfully (if it didn't exist).")
}

func createCommentsTable() {
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS comments (
	id TEXT PRIMARY KEY,
	post_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY(post_id) REFERENCES posts(id),
	FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	_, err := DB.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Failed to create comments table: %v", err)
	}

	// to check in terminal if table is created.
	log.Println("Comments table created successfully (if id didn't exist).")
}
