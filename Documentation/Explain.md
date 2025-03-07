# Real-Time Forum - Project Structure and Components

## Project Overview

This real-time forum is a single-page application that allows users to register, login, create posts, comment on posts, and engage in real-time private messaging with other users. The application follows a modern web architecture:

- **Backend**: Go with Gorilla WebSockets for real-time communication
- **Frontend**: Pure JavaScript, HTML, and CSS (no frameworks)
- **Database**: SQLite for data persistence
- **Authentication**: Session-based with secure cookies

The project implements all requirements from the specification, including user registration and authentication, post creation and commenting, and real-time private messaging.

## Backend Architecture

### main.go
- Health check endpoint to verify server status
- Database initialization and cleanup on exit
- Route handlers with appropriate middleware:
  - Authentication endpoints (register, login, logout)
  - Post management (create, retrieve)
  - Comment management (create, retrieve)
  - Real-time chat using WebSockets
  - User management
- WebSocket message broadcasting via goroutine
- Static file serving and SPA routing

### /database/db.go
- SQLite3 database initialization
- Table creation for:
  - Users (account information)
  - Posts (forum content)
  - Comments (responses to posts)
  - Messages (direct messaging content)

### /models/models.go
- Data structures for:
  - User (id, nickname, email, password, profile info, online status)
  - Post (id, userID, nickname, category, content, timestamp)
  - Comment (id, postID, userID, content, timestamp)
  - LoginRequest (email/nickname, password)
  - Message (id, sender, receiver, content, timestamp)

### /routes/auth.go
- User registration:
  - Form validation
  - UUID generation
  - Password hashing with bcrypt
  - Database storage
- User login:
  - Authentication by email or nickname
  - Password verification
  - Session creation
- User logout:
  - Session destruction

### /routes/chat.go
- Real-time messaging using Gorilla WebSocket
- Client tracking and connection management
- Direct message broadcasting between users
- Message persistence in database
- Chat history retrieval with pagination
- Online status tracking

### /routes/posts.go
- Post creation and storage
- Post retrieval with author information
- Comment creation for specific posts
- Comment retrieval by post ID

### /routes/users.go
- User listing with online status
- Filtering to exclude current user

### /utils/session.go
- Session management using secure cookies
- Token generation and validation
- Session storage in memory
- Authentication middleware for protected routes

## Frontend Architecture

### index.html
- Single Page Application (SPA) structure
- Container elements for dynamic content
- JavaScript module loading

### /static/js/app.js
- Application initialization and state management
- Main view rendering
- User session handling
- Category filtering for posts

### /static/js/auth.js
- Login form and processing
- Registration form and validation
- Session persistence in browser

### /static/js/chat.js
- WebSocket connection initialization
- Real-time message display
- Chat history loading with pagination (10 messages per scroll)
- User online/offline status display
- New message notifications
- Direct message interface

### /static/js/comments.js
- Comment display in modal view
- Comment form submission
- Real-time comment updates

### /static/js/posts.js
- Post listing and filtering by category
- Post creation form
- Post display with metadata

### /static/js/utils.js
- Helper functions used across modules
- API request wrapper
- Date formatting
- Debounce function for event throttling
- String manipulation utilities

### /static/css/style.css
- Application styling
- Responsive layout
- Form elements and button styles
- Chat interface styling

## Key Features

### User Authentication
- User registration with validation
- Login with email or nickname
- Session persistence
- Secure password hashing with bcrypt

### Post Management
- Create posts with categories
- View posts feed with category filtering
- Real-time updates

### Comments
- Comment on posts
- View comments in a modal
- Real-time updates

### Chat System
- WebSocket-based real-time messaging
- Message history with pagination
- Online/offline user status
- User list sorted by last message
- New message notifications

## Technical Implementation Details

### WebSockets
The chat system uses the Gorilla WebSocket library to establish persistent connections between the server and clients. When a user logs in, a WebSocket connection is established and managed throughout the session. Messages are broadcast to relevant users and stored in the database for history retrieval.

### Message Pagination
Chat messages are paginated with the limit of 10 messages per request. When a user scrolls to the top of the chat window, the system fetches the next 10 older messages. This is implemented using an offset-based pagination system to provide a smooth user experience while managing memory efficiently.

### Single Page Application
The application is built as a single page application without using any frameworks. Page transitions and view changes are handled via JavaScript DOM manipulation. This approach allows for a smooth user experience without page reloads.

### Error Handling
The application implements comprehensive error handling with user-friendly error messages. All errors are caught and processed to ensure the application doesn't crash. Console messages are suppressed in production for a cleaner experience.

### Session Management
User sessions are managed via secure cookies. The server generates and validates session tokens for authenticated requests. Sessions expire after a period of inactivity for security.

## Learning Resources

### Go
- [Official Go Documentation](https://golang.org/doc/)
- [Go by Example](https://gobyexample.com/)
- [Go Web Examples](https://gowebexamples.com/)

### WebSockets
- [Gorilla WebSocket Documentation](https://pkg.go.dev/github.com/gorilla/websocket)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [WebSockets Tutorial](https://www.tutorialspoint.com/websockets/index.htm)

### SQLite
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Go SQLite3 Package](https://github.com/mattn/go-sqlite3)

### Frontend Development
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [CSS Tricks](https://css-tricks.com/)
- [Single Page Application Resources](https://developer.mozilla.org/en-US/docs/Glossary/SPA)

### Authentication & Security
- [OWASP Authentication Guide](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Bcrypt Documentation](https://pkg.go.dev/golang.org/x/crypto/bcrypt)
- [Session Management Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

