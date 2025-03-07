# Real-Time Forum: Detailed Technical Documentation

This document provides a comprehensive, function-by-function and variable-by-variable explanation of the Real-Time Forum project. It's designed to help beginners understand how the entire application works, from the database structure to the user interface elements.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Database Structure](#database-structure)
3. [Backend Implementation](#backend-implementation)
   - [Main Application](#main-application)
   - [Database Management](#database-management)
   - [Models and Data Structures](#models-and-data-structures)
   - [Authentication and Session Management](#authentication-and-session-management)
   - [Route Handlers](#route-handlers)
4. [Frontend Implementation](#frontend-implementation)
   - [Application Initialization](#application-initialization)
   - [Authentication System](#authentication-system)
   - [Posts and Comments System](#posts-and-comments-system)
   - [Real-Time Chat System](#real-time-chat-system)
   - [Utility Functions](#utility-functions)
5. [User Interface Design](#user-interface-design)
6. [How It All Works Together](#how-it-all-works-together)

## Project Overview

The Real-Time Forum is a single-page web application that allows users to register, login, create posts, comment on posts, and engage in real-time private messaging with other users. The application is built with:

- **Backend**: Go programming language
- **Frontend**: HTML, CSS, and pure JavaScript (no frameworks)
- **Database**: SQLite
- **Real-time Communication**: WebSockets (via the Gorilla WebSocket library)

The application follows a client-server architecture where the Go backend serves both the static frontend files and provides API endpoints for data manipulation and real-time communication.

## Database Structure

The application uses SQLite, a lightweight file-based database. The database structure consists of four main tables:

### Users Table

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    age INTEGER,
    gender TEXT
);
```

- **id**: Unique identifier for each user (UUID)
- **nickname**: User's display name (must be unique)
- **email**: User's email address (must be unique)
- **password**: Hashed password using bcrypt
- **first_name**: User's first name
- **last_name**: User's last name
- **age**: User's age
- **gender**: User's gender

### Posts Table

```sql
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

- **id**: Unique identifier for each post (UUID)
- **user_id**: Foreign key referencing the user who created the post
- **category**: Category of the post
- **content**: Main text content of the post
- **created_at**: Timestamp when the post was created

### Comments Table

```sql
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

- **id**: Unique identifier for each comment (UUID)
- **post_id**: Foreign key referencing the post being commented on
- **user_id**: Foreign key referencing the user who created the comment
- **content**: Text content of the comment
- **created_at**: Timestamp when the comment was created

### Messages Table

```sql
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
);
```

- **id**: Unique identifier for each message (UUID)
- **sender_id**: Foreign key referencing the user who sent the message
- **receiver_id**: Foreign key referencing the user who received the message
- **content**: Text content of the message
- **created_at**: Timestamp when the message was sent

## Backend Implementation

### Main Application

The main Go file (`main.go`) is the entry point of the application. It:

1. Initializes the database
2. Sets up the HTTP routes
3. Handles WebSocket connections
4. Serves static files for the frontend
5. Starts the web server

Key components include:

- **`healthCheck`**: Simple handler function that returns "OK" to verify the server is running
- **`main`**: The main function that initializes everything and starts the server
- **`clients`**: A map that keeps track of active WebSocket connections
- **`broadcast`**: A channel for broadcasting messages to connected clients

### Database Management

The database package (`database/db.go`) handles database operations.

Key components include:

- **`DB`**: Global variable that holds the database connection
- **`InitDatabase()`**: Function that initializes the database connection and creates tables if they don't exist
- **`createUsersTable()`**: Creates the users table
- **`createPostsTable()`**: Creates the posts table
- **`createCommentsTable()`**: Creates the comments table
- **`createMessagesTable()`**: Creates the messages table

### Models and Data Structures

The models package (`models/models.go`) defines the data structures used throughout the application. These structures map to database tables and are used to pass data between the backend and frontend.

- **`User` Struct**:
  ```go
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
  ```

- **`Post` Struct**:
  ```go
  type Post struct {
    ID        string `json:"id"`
    UserID    string `json:"user_id"`
    Nickname  string `json:"nickname,omitempty"`
    Category  string `json:"category"`
    Content   string `json:"content"`
    CreatedAt string `json:"created_at"`
  }
  ```

- **`Comment` Struct**:
  ```go
  type Comment struct {
    ID        string `json:"id"`
    PostID    string `json:"post_id"`
    UserID    string `json:"user_id"`
    Content   string `json:"content"`
    CreatedAt string `json:"created_at"`
  }
  ```

- **`LoginRequest` Struct**:
  ```go
  type LoginRequest struct {
    Identifier string `json:"identifier"`
    Password   string `json:"password"`
  }
  ```

- **`Message` Struct**:
  ```go
  type Message struct {
    ID             string `json:"id"`
    SenderID       string `json:"sender_id"`
    SenderNickname string `json:"sender_nickname,omitempty"`
    ReceiverID     string `json:"receiver_id"`
    Content        string `json:"content"`
    CreatedAt      string `json:"created_at"`
  }
  ```

These structs use Go's struct tags (`json:"field_name"`) to control how they are converted to/from JSON when communicating with the frontend.

### Authentication and Session Management

The session management package (`utils/session.go`) handles user authentication and session tracking.

Key components include:

- **`sessions`**: A map that stores active user sessions
- **`CreateSession()`**: Creates a new session for an authenticated user
- **`GetSession()`**: Retrieves the session for a request
- **`DestroySession()`**: Removes a session when a user logs out
- **`AuthMiddleware()`**: HTTP middleware that checks if a request is authenticated

### Route Handlers

The routes package (`routes/`) contains handlers for HTTP endpoints.

#### Authentication Routes (`routes/auth.go`)

- **`RegisterHandler`**: Processes user registration
  - Validates registration data
  - Generates a UUID for the new user
  - Hashes the password using bcrypt
  - Stores the user in the database
  - Returns success or error

- **`LoginHandler`**: Handles user login
  - Validates login credentials (email/nickname and password)
  - Verifies the password against the stored hash
  - Creates a session if authentication is successful
  - Returns user data and session cookie

- **`LogoutHandler`**: Processes user logout
  - Destroys the user's session
  - Updates the user's online status

- **`SessionHandler`**: Returns current session information
  - Provides user ID and nickname to the frontend

#### Post Routes (`routes/posts.go`)

- **`CreatePostHandler`**: Creates a new post
  - Validates post data
  - Generates a UUID for the post
  - Stores the post in the database
  - Returns success or error

- **`GetPostsHandler`**: Retrieves all posts
  - Queries the database for all posts
  - Joins with the users table to get author information
  - Returns posts as JSON

- **`CreateCommentHandler`**: Adds a comment to a post
  - Validates comment data
  - Generates a UUID for the comment
  - Stores the comment in the database
  - Returns success or error

- **`GetCommentsHandler`**: Retrieves comments for a post
  - Takes a post ID as a query parameter
  - Queries the database for comments on that post
  - Joins with the users table to get author information
  - Returns comments as JSON

#### Chat Routes (`routes/chat.go`)

- **`ChatHandler`**: Manages WebSocket connections
  - Upgrades HTTP connection to WebSocket
  - Registers the client in the clients map
  - Handles incoming messages
  - Broadcasts messages to recipients
  - Cleans up when connection closes

- **`HandleMessages`**: Processes incoming chat messages
  - Validates message data
  - Stores messages in the database
  - Broadcasts to relevant clients

- **`GetChatHistoryHandler`**: Retrieves chat history
  - Takes sender and receiver IDs as parameters
  - Supports pagination with limit and offset
  - Returns messages as JSON

#### User Routes (`routes/users.go`)

- **`GetUsersHandler`**: Retrieves a list of users
  - Excludes the current user
  - Includes online status
  - Returns users as JSON

## Frontend Implementation

The frontend is a single-page application written in pure JavaScript, HTML, and CSS.

### Application Initialization

The main JavaScript file (`static/js/app.js`) initializes the application.

Key components include:

- **Global Variables**:
  - `currentUser`: Stores information about the logged-in user
  - `ws`: Holds the WebSocket connection
  - `currentChatUser`: Tracks the currently selected chat partner
  - `currentPostId`: Tracks the currently selected post for comments
  - `chatOffset`: Manages pagination for chat history
  - `CHAT_LIMIT`: Constant defining how many messages to load at once (10)
  - `chatAllLoaded`: Flag indicating if all chat history is loaded
  - `commentInterval`: Timer for polling comments
  - `allPosts`: Stores all posts for category filtering
  - `currentCategory`: Tracks the currently selected category filter
  - `chatLastMessages`: Stores the last message for each chat user
  - `chatUserStatus`: Tracks online status of users

- **`showMainView()`**: Renders the main application interface
  - Sets up the post creation form
  - Initializes event listeners
  - Calls `loadPosts()` to display posts
  - Initializes the chat sidebar

- **Periodic Updates**:
  - Uses `setInterval()` to refresh posts periodically
  - Reference stored in `window.postsInterval` for proper cleanup

- **Initialization**:
  - Calls `checkSession()` when the DOM is loaded

### Authentication System

The authentication module (`static/js/auth.js`) handles user registration, login, and logout.

Key components include:

- **`logout()`**: Handles user logout
  - Sends logout request to server
  - Cleans up intervals and WebSocket connection
  - Resets application state
  - Shows login view

- **`showLoginView()`**: Displays the login form
  - Creates HTML for login form
  - Sets up event listeners
  - Hides chat sidebar

- **`showRegisterView()`**: Displays the registration form
  - Creates HTML for registration form
  - Sets up validation for age and gender
  - Sets up event listeners

- **`checkSession()`**: Checks if user is already logged in
  - Calls the session API endpoint
  - If session exists, initializes the application
  - If no session, shows login view

### Posts and Comments System

The posts module (`static/js/posts.js`) manages forum posts and categories.

Key components include:

- **`loadPosts()`**: Fetches and displays posts
  - Calls the posts API endpoint
  - Updates the UI with posts data
  - Builds category tabs
  - Stores all posts for filtering

- **`createPost()`**: Creates a new post
  - Collects form data
  - Sends POST request to create post
  - Resets form and refreshes posts

- **`buildCategoryTabs()`**: Creates category filter UI
  - Extracts unique categories from posts
  - Creates tab UI for filtering
  - Sets up event listeners

- **`renderPosts()`**: Displays filtered posts
  - Filters posts by selected category
  - Creates HTML for each post
  - Sets up event listeners for comments

The comments module (`static/js/comments.js`) manages post comments.

Key components include:

- **`showComments()`**: Displays the comments modal
  - Sets the current post ID
  - Shows the modal UI
  - Loads comments
  - Sets up polling for new comments

- **`loadComments()`**: Fetches and displays comments
  - Calls the comments API endpoint with the current post ID
  - Updates the UI with comments data
  - Sets up form submission handler

- **`closeCommentsModal()`**: Hides the comments UI
  - Hides the modal
  - Clears the comment polling interval

### Real-Time Chat System

The chat module (`static/js/chat.js`) manages real-time messaging.

Key components include:

- **`showNewMessagePopup()`**: Displays notification for new messages
  - Creates a popup UI with the message preview
  - Auto-dismisses after a timeout
  - Handles click to open conversation

- **`initChatSidebar()`**: Sets up the chat interface
  - Creates chat UI elements
  - Sets up event listeners
  - Initializes scroll event for loading more messages
  - Starts user list polling

- **`loadChatUsers()`**: Fetches and displays available chat users
  - Calls the users API endpoint
  - Sorts users by last message time
  - Creates UI for online and offline users
  - Sets up click handlers for user selection

- **`loadChatHistory()`**: Loads message history
  - Takes user ID and reset flag as parameters
  - Calls chat history API with pagination
  - Adds messages to the chat window
  - Manages scrolling position
  - Updates pagination variables

- **`appendChatMessage()`**: Adds new messages to chat window
  - Creates message UI
  - Scrolls to bottom for visibility

- **`sendChatMessage()`**: Sends messages via WebSocket
  - Validates message content
  - Creates message object
  - Sends via WebSocket connection
  - Clears input field

- **`initWebSocket()`**: Sets up WebSocket connection
  - Creates WebSocket connection to server
  - Sets up event handlers for connection events
  - Handles incoming messages
  - Manages error handling

### Utility Functions

The utilities module (`static/js/utils.js`) provides helper functions used throughout the application.

Key components include:

- **`debounce(func, wait)`**: Throttles function calls
  - Prevents rapid, repeated execution
  - Used for scroll events and other frequent triggers

- **`toTitleCase(str)`**: Formats text with capital letters
  - Capitalizes first letter of each word
  - Used for displaying names

- **`formatDate(dateString)`**: Formats date strings
  - Converts ISO date strings to localized format
  - Used for timestamps in posts, comments, and messages

- **`api(path, options)`**: Helper for API requests
  - Wraps fetch API with standard error handling
  - Ensures consistent response format
  - Includes authentication credentials

## User Interface Design

The CSS file (`static/css/style.css`) defines the application's visual appearance.

Key components include:

- **Global Styles**: Reset and base styles
- **Layout Containers**: Main app area and chat sidebar
- **Chat Sidebar Styling**: User lists and message display
- **Form Styling**: Login, registration, and post creation forms
- **Post Feed Styling**: Post cards and metadata
- **Modal Implementation**: Comments overlay
- **Button Styling**: Interactive elements with hover effects

The application uses a two-column layout:
1. Main content area (posts, forms)
2. Chat sidebar (always visible after login)

## How It All Works Together

Here's a step-by-step flow of how the application works from start to finish:

1. **Initialization**:
   - When the page loads, `checkSession()` is called to check if the user is already logged in
   - If not logged in, the login view is shown
   - If logged in, the main view is displayed and WebSocket connection is established

2. **User Authentication**:
   - User enters credentials in the login form
   - The backend verifies the credentials
   - If valid, a session is created and user data is returned
   - The frontend stores the user data and shows the main view

3. **Posts and Categories**:
   - The application loads posts from the server
   - Category tabs are built based on post categories
   - User can filter posts by category
   - User can create new posts that appear in real-time
   - Posts refresh periodically (every 2 seconds)

4. **Comments**:
   - When a user clicks on a post, the comments modal appears
   - Comments for that post are loaded from the server
   - User can add new comments
   - Comments refresh periodically (every 2 seconds)

5. **Chat System**:
   - The chat sidebar displays online and offline users
   - User can click on another user to start a conversation
   - WebSocket connection is used for real-time messaging
   - Messages are stored in the database for history
   - When a new message arrives, a notification popup is shown
   - Chat history can be loaded with pagination (10 messages at a time)

6. **Logging Out**:
   - User clicks the logout button
   - The backend destroys the session
   - The frontend cleans up (WebSocket, intervals, variables)
   - Login view is shown again

Every aspect of the application is designed for real-time interaction, with automatic updates and WebSocket communication ensuring users always see the latest content without refreshing the page.

The application structure follows the single page application (SPA) pattern, where different "views" are swapped in and out without loading new HTML pages from the server.

This design allows for a seamless, responsive user experience similar to native applications while still running in a web browser.