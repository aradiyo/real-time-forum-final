# Real-Time Forum

A single-page application forum with real-time communication capabilities implemented with WebSockets, allowing users to communicate, share posts, and engage in real-time discussions.

## Features

### User Authentication
- Secure registration with email validation
- Custom-designed form elements with improved usability
- Enhanced date picker with month/year selection and calendar popup
- Gender selection with clear labeling
- Password confirmation to prevent typos
- Login with session management
- Logout functionality with proper session cleanup

### Posts and Comments
- Create posts with multiple categories
- View posts with category filtering
- Responsive post layout with title, content, author, and timestamp
- Add comments to any post
- View nested comments in real-time
- Proper formatting for text content

### Real-Time Messaging
- Private real-time chat with WebSockets
- Message history is preserved between sessions
- Automatic scrolling for new messages
- Load previous messages on scroll
- Online/offline user indicators
- New message notifications
- Empty chat state handling ("No messages found" removal on typing)

### User Interface
- Single-page application with smooth transitions
- Responsive design for different screen sizes
- Dark theme for comfortable viewing
- Real-time updates without page refreshes
- Improved form elements with better usability
- Clean and intuitive navigation

## Technology Stack

- **Backend**: Go with Gorilla WebSockets
- **Frontend**: HTML, CSS, JavaScript (Single Page Application)
- **Database**: SQLite
- **Authentication**: bcrypt for password hashing and secure cookies
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

## Authors

- **alalaradi**
- **hasabbas**

## License

MIT License