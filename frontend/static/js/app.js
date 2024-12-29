// Variables
let socket;
let currentUserID = null;

// Show Login Form on Page Load
document.getElementById('login-register').style.display = 'block';

// Show Register Form
function showRegister() {
    document.getElementById('login-register').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

// Show Login Form
function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-register').style.display = 'block';
}

// Register Function
async function register() {
    const data = {
        nickname: document.getElementById('reg-nickname').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        first_name: document.getElementById('reg-first-name').value,
        last_name: document.getElementById('reg-last-name').value,
        age: parseInt(document.getElementById('reg-age').value),
        gender: document.getElementById('reg-gender').value,
    };

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (response.ok) {
        alert('Registration successful! You can now login.');
        showLogin();
    } else {
        alert('Registration failed. Please try again.');
    }
}

// Login Function
async function login() {
    const data = {
        identifier: document.getElementById('login-identifier').value,
        password: document.getElementById('login-password').value,
    };

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (response.ok) {
        const userID = await response.text(); // Assuming the backend sends the user ID
        currentUserID = userID;
        startChat(userID);
    } else {
        alert('Login failed. Please try again.');
    }
}

// Start Chat Function
function startChat(userID) {
    document.getElementById('login-register').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('chat').style.display = 'block';

    // Connect to WebSocket
    socket = new WebSocket(`ws://localhost:8080/api/chat?sender_id=${userID}`);

    socket.onopen = () => {
        console.log('Connected to chat server');
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        displayMessage(message.sender_id, message.content);
    };

    socket.onclose = () => {
        console.log('Disconnected from chat server');
    };
}

// Send Message Function
function sendMessage() {
    const content = document.getElementById('message-input').value;
    const message = {
        sender_id: currentUserID,
        receiver_id: 'RECEIVER_ID', // Replace with the actual receiver ID
        content: content,
    };

    socket.send(JSON.stringify(message));
    displayMessage('You', content);
    document.getElementById('message-input').value = '';
}

// Display Message
function displayMessage(sender, content) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.textContent = `${sender}: ${content}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}
