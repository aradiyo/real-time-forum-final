# main.go :
- function for healthCheck to check if server is running.
- call a function to initialize the Database and close it when program exit.
- hundlers for :
    - route to register (using post method)
    - route to login (using post method)
    - route to create post (using post method)
    - route to get post (using get method)
    - route to create comment (using post method)
    - route to get comments (using get method)
    - route to chat (under construction) ****
    - route to homepage (under construction) ****

/database
# db.go :
- function to initialize the Database (sqlite3)
- create tables for :
    - users
    - posts
    - comments

/models
# models.go :
- create struct for :
    - user 
    - post
    - comment
    - messsage (to use for private messages) *** under construction

/routes
# auth.go : this file contains 
- RegisterHandler:
    - use method post only or returns error.
    - initialize new user and parse it into json. 
    - generate UUID (unique identifier) using "github.com/gofrs/uuid" package.
    - hash password using bcrypt ("golang.org/x/crypto/bcrypt" package).
    - save user to data base.
    - get success resposone.


- Login Handler:
    - use method post only or returns error.
    - initialize loginReq which is combination of Identifier (email or nickname) + password.
    - search for loginReq in the database.
    - error + invalid identifier handling.
    - compare hashed password using bcrypt.CompareHashAndPassword.
    - error + invalid password handling.
    - get success response.

# chat.go :
- under construction (will use gorilla websocket package "https://pkg.go.dev/github.com/gorilla/websocket")

# posts.go :

- CreatePostsHandler:
    - use method post only or returns error.
    - parse post into json.
    - generate UUID.
    - insert post into database.
    - error handling.
    - get success response.

- GetPostsHandler:
    - use method get only or returns error.
    - query database for all posts.
    - create array for posts and loop into database and append the posts array.
    - return posts as JSON.

- CreateCommentsHandler:
    - use method post only or return error.
    - parse comment into json.
    - generate UUID for the comment ID.
    - insert comment into database.
    - error handling.
    - get success response.

- GetCommentsHandler:
    - use method get only or return error.
    - get post ID from query parameters.
    - query database with post ID.
    - error handling 
    - create array for comments and loop into database and append the comments array.
    - return comments as JSON.

/utils
# session.go : 
- under construction (should handle cookies.)

