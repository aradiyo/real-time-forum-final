# Real-Time Forum

A single-page application forum with real-time communication capabilities implemented with WebSockets.

## Features

- User authentication (registration and login)
- Post creation with categories
- Commenting on posts
- Real-time private messaging
- Online/offline user status

## Technology Stack

- **Backend**: Go with Gorilla WebSockets
- **Frontend**: HTML, CSS, JavaScript (Single Page Application)
- **Database**: SQLite
- **Authentication**: bcrypt for password hashing
- **UUID Generation**: For unique identifiers

## Project Structure

- `/backend` - Go server code
  - `/database` - Database initialization and management
  - `/models` - Data structures
  - `/routes` - API endpoints handlers
  - `/utils` - Helper functions and middleware
- `/frontend` - Client-side code
  - `index.html` - Single HTML entry point
  - `/static` - Static assets
    - `/css` - Stylesheets
    - `/js` - JavaScript modules
- `/Documentation` - Project documentation

## Requirements

- Go 1.16 or higher
- SQLite

## Installation

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   go mod download
   ```
3. Run the server:
   ```
   go run main.go
   ```
4. Access the application at http://localhost:8080

### Docker Deployment

1. Build the Docker image:
   ```
   docker build -t real-time-forum .
   ```
2. Run the container:
   ```
   docker run -p 8080:8080 real-time-forum
   ```

## API Endpoints

- `/api/register` - User registration
- `/api/login` - User authentication
- `/api/logout` - User logout
- `/api/posts` - Get/create posts
- `/api/comments` - Get/create comments
- `/api/chat` - WebSocket endpoint for real-time messaging
- `/api/users` - Get user information

## Usage

1. Register a new account or login with existing credentials
2. Create posts in various categories
3. Comment on posts by clicking on them
4. Chat with online users via the sidebar
5. Filter posts by category using the tabs

## License

MIT License