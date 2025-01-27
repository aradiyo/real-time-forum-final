import { ApiService } from './api.js';

let currentUser = null;
let socket = null;
let selectedUserId = null;
let messagePage = 1;
let isLoadingMessages = false;

const DOM = {
    authSection: document.getElementById('authSection'),
    mainContent: document.getElementById('mainContent'),
    postsList: document.getElementById('postsList'),
    onlineUsersList: document.getElementById('onlineUsersList'),
    chatMessages: document.getElementById('chatMessages'),
    messageForm: document.getElementById('messageForm'),
    messageInput: document.getElementById('messageInput'),
    newPostBtn: document.getElementById('newPostBtn'),
    postModal: document.getElementById('postModal'),
    currentUser: document.getElementById('currentUser')
};

document.addEventListener('DOMContentLoaded', initApp);
document.getElementById('navLogout').addEventListener('click', logout);
document.getElementById('newPostBtn').addEventListener('click', () => toggleModal('postModal', true));
document.getElementById('postForm').addEventListener('submit', createPost);

// Authentication Handling
function initAuthForms() {
    document.querySelector('.auth-tabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('tab')) {
            const tab = e.target.dataset.tab;
            showAuthForm(tab);
        }
    });

    document.getElementById('authSection').addEventListener('submit', async(e) => {
        e.preventDefault();
        const isLogin = e.target.id === 'loginForm';

        const data = {
            identifier: e.target.querySelector('input[type="text"]').value,
            password: e.target.querySelector('input[type="password"]').value
        };

        try {
            const user = isLogin ?
                await ApiService.login(data) :
                await ApiService.register(data);

            currentUser = user;
            DOM.mainContent.classList.remove('hidden');
            DOM.authSection.classList.add('hidden');
            DOM.currentUser.textContent = user.nickname;
            initWebSocket();
            loadPosts();
        } catch (error) {
            showError(isLogin ? 'Login failed' : 'Registration failed');
        }
    });
}

async function checkSession() {
    try {
        const response = await fetch('/api/me');
        return await response.json();
    } catch {
        return null;
    }
}

// WebSocket Handling
function initWebSocket() {
    socket = new WebSocket(`ws://${window.location.host}/api/chat`);

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: 'register',
            userId: currentUser.id
        }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'message':
                displayMessage(data);
                break;
            case 'userList':
                updateOnlineUsers(data.users);
                break;
            case 'history':
                loadMessageHistory(data.messages);
                break;
        }
    };

    socket.onclose = () => {
        setTimeout(initWebSocket, 1000);
    };
}

// Post Handling
async function loadPosts() {
    try {
        const posts = await ApiService.getPosts();
        DOM.postsList.innerHTML = posts.map(post => `
            <div class="post-card" data-post-id="${post.id}">
                <h3>${post.title}</h3>
                <p>${post.content}</p>
                <div class="post-meta">
                    <span>By ${post.author}</span>
                    <span>${new Date(post.created_at).toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showError('Failed to load posts');
    }
}

async function createPost(e) {
    e.preventDefault();
    const postData = {
        title: document.getElementById('postTitle').value,
        content: document.getElementById('postContent').value,
        category: document.getElementById('postCategory').value,
        user_id: currentUser.id
    };

    try {
        await ApiService.createPost(postData);
        toggleModal('postModal', false);
        loadPosts();
    } catch (error) {
        showError('Failed to create post');
    }
}

// Chat Handling
function updateOnlineUsers(users) {
    DOM.onlineUsersList.innerHTML = users.map(user => `
        <div class="online-user" data-user-id="${user.id}" onclick="selectUser('${user.id}')">
            <i class="fas fa-circle ${user.online ? 'online' : 'offline'}"></i>
            ${user.nickname}
        </div>
    `).join('');
}

function selectUser(userId) {
    selectedUserId = userId;
    DOM.chatMessages.innerHTML = '';
    messagePage = 1;
    socket.send(JSON.stringify({
        type: 'history',
        receiverId: userId,
        page: messagePage
    }));
}

function displayMessage(message) {
    const isSelf = message.sender_id === currentUser.id;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSelf ? 'self' : ''}`;
    messageElement.innerHTML = `
        <div class="message-header">
            <span>${isSelf ? 'You' : message.sender}</span>
            <span>${new Date(message.created_at).toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${message.content}</div>
    `;
    DOM.chatMessages.appendChild(messageElement);
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

DOM.messageForm.addEventListener('submit', async(e) => {
    e.preventDefault();
    const message = DOM.messageInput.value.trim();
    if (!message || !selectedUserId) return;

    socket.send(JSON.stringify({
        type: 'message',
        receiverId: selectedUserId,
        content: message,
        senderId: currentUser.id
    }));

    DOM.messageInput.value = '';
});

// Utility Functions
async function initApp() {
    initAuthForms();
    try {
        const user = await checkSession();
        if (user) {
            currentUser = user;
            DOM.mainContent.classList.remove('hidden');
            DOM.authSection.classList.add('hidden');
            DOM.currentUser.textContent = user.nickname;
            initWebSocket();
            loadPosts();
        }
    } catch (error) {
        showAuthForm('login');
    }
}

function toggleModal(modalId, show) {
    document.getElementById(modalId).classList.toggle('hidden', !show);
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    document.body.prepend(errorElement);
    setTimeout(() => errorElement.remove(), 3000);
}

async function logout() {
    await ApiService.logout();
    currentUser = null;
    socket.close();
    DOM.mainContent.classList.add('hidden');
    DOM.authSection.classList.remove('hidden');
    window.location.reload();
}