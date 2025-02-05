(function() {
    let currentUser = null; // To store the logged-in user (for simplicity, we store the identifier)
    let ws = null; // WebSocket connection
    let currentChatUser = null; // Currently selected chat partner
    let chatOffset = 0;
    const CHAT_LIMIT = 10;
  
    // Simple debounce function.
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      }
    }
  
    // API helper.
    async function api(path, options = {}) {
      const res = await fetch(path, options);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json().catch(() => ({}));
    }
  
    // Render login view.
    function showLoginView() {
      document.getElementById('app').innerHTML = `
        <h2>Login</h2>
        <form id="login-form">
          <input type="text" id="login-identifier" placeholder="Email or Nickname" required>
          <input type="password" id="login-password" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
        <p>Don't have an account? <span class="link" id="to-register">Register here</span></p>
      `;
      document.getElementById('to-register').addEventListener('click', showRegisterView);
      document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;
        try {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({identifier, password})
          });
          if (!res.ok) {
            const err = await res.text();
            alert("Login failed: " + err);
            return;
          }
          // For simplicity, we store the identifier as the user id.
          currentUser = { id: identifier, identifier: identifier };
          initWebSocket();
          showMainView();
          loadChatUsers();
        } catch (error) {
          alert("Error: " + error.message);
        }
      });
    }
  
    // Render registration view.
    function showRegisterView() {
      document.getElementById('app').innerHTML = `
        <h2>Register</h2>
        <form id="register-form">
          <input type="text" id="reg-nickname" placeholder="Nickname" required>
          <input type="number" id="reg-age" placeholder="Age" required>
          <select id="reg-gender" required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <input type="text" id="reg-first-name" placeholder="First Name" required>
          <input type="text" id="reg-last-name" placeholder="Last Name" required>
          <input type="email" id="reg-email" placeholder="Email" required>
          <input type="password" id="reg-password" placeholder="Password" required>
          <button type="submit">Register</button>
        </form>
        <p>Already have an account? <span class="link" id="to-login">Login here</span></p>
      `;
      document.getElementById('to-login').addEventListener('click', showLoginView);
      document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const user = {
          nickname: document.getElementById('reg-nickname').value,
          age: parseInt(document.getElementById('reg-age').value),
          gender: document.getElementById('reg-gender').value,
          first_name: document.getElementById('reg-first-name').value,
          last_name: document.getElementById('reg-last-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value
        };
        try {
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(user)
          });
          if (!res.ok) {
            const err = await res.text();
            alert("Registration failed: " + err);
            return;
          }
          alert("Registration successful! Please log in.");
          showLoginView();
        } catch (error) {
          alert("Error: " + error.message);
        }
      });
    }
  
    // Render the main view (posts feed).
    function showMainView() {
      document.getElementById('app').innerHTML = `
        <div>
          <button id="logout-btn">Logout</button>
          <h2>Posts Feed</h2>
          <form id="post-form">
            <input type="text" id="post-category" placeholder="Category" required>
            <textarea id="post-content" placeholder="What's on your mind?" required></textarea>
            <button type="submit">Create Post</button>
          </form>
          <div id="posts-container"></div>
        </div>
        <div id="post-comments-modal" class="modal" style="display:none;">
          <div class="modal-content">
            <span id="close-comments" class="close">&times;</span>
            <h3>Comments</h3>
            <div id="comments-container"></div>
            <form id="comment-form">
              <textarea id="comment-content" placeholder="Add a comment..." required></textarea>
              <button type="submit">Post Comment</button>
            </form>
          </div>
        </div>
      `;
      document.getElementById('logout-btn').addEventListener('click', logout);
      document.getElementById('post-form').addEventListener('submit', createPost);
      loadPosts();
  
      document.getElementById('close-comments').addEventListener('click', function() {
        document.getElementById('post-comments-modal').style.display = 'none';
      });
    }
  
    // Load posts from the backend.
    async function loadPosts() {
      try {
        const posts = await api('/api/posts');
        const container = document.getElementById('posts-container');
        container.innerHTML = '';
        posts.forEach(post => {
          const postDiv = document.createElement('div');
          postDiv.className = 'post';
          postDiv.innerHTML = `
            <h3>${post.category}</h3>
            <p>${post.content}</p>
            <small>${post.created_at}</small>
            <br>
            <button data-post-id="${post.id}" class="view-comments-btn">View Comments</button>
          `;
          container.appendChild(postDiv);
        });
        document.querySelectorAll('.view-comments-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            showComments(postId);
          });
        });
      } catch (error) {
        alert("Error loading posts: " + error.message);
      }
    }
  
    // Create a new post.
    async function createPost(e) {
      e.preventDefault();
      const category = document.getElementById('post-category').value;
      const content = document.getElementById('post-content').value;
      const post = { user_id: currentUser.id, category, content };
      try {
        const res = await fetch('/api/posts/create', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(post)
        });
        if (!res.ok) {
          const err = await res.text();
          alert("Failed to create post: " + err);
          return;
        }
        document.getElementById('post-form').reset();
        loadPosts();
      } catch (error) {
        alert("Error creating post: " + error.message);
      }
    }
  
    // Show comments for a specific post.
    async function showComments(postId) {
      document.getElementById('post-comments-modal').style.display = 'block';
      const commentsContainer = document.getElementById('comments-container');
      commentsContainer.innerHTML = '<p>Loading comments...</p>';
      try {
        const comments = await api(`/api/comments?post_id=${postId}`);
        commentsContainer.innerHTML = '';
        comments.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.className = 'comment';
          commentDiv.innerHTML = `<p>${comment.content}</p><small>${comment.created_at}</small>`;
          commentsContainer.appendChild(commentDiv);
        });
        document.getElementById('comment-form').onsubmit = async function(e) {
          e.preventDefault();
          const content = document.getElementById('comment-content').value;
          const comment = { post_id: postId, user_id: currentUser.id, content };
          const res = await fetch('/api/comments/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(comment)
          });
          if (!res.ok) {
            const err = await res.text();
            alert("Failed to post comment: " + err);
            return;
          }
          document.getElementById('comment-form').reset();
          showComments(postId);
        }
      } catch (error) {
        alert("Error loading comments: " + error.message);
      }
    }
  
    // Logout the user.
    async function logout() {
      try {
        await fetch('/api/logout', { method: 'POST' });
      } catch (error) {
        console.error("Logout error: " + error.message);
      }
      currentUser = null;
      if (ws) ws.close();
      showLoginView();
    }
  
    // Chat functionality.
  
    // Initialize the WebSocket connection for chat.
    function initWebSocket() {
      ws = new WebSocket(`ws://${window.location.host}/api/chat?sender_id=${currentUser.id}`);
      ws.onopen = function() {
        console.log("WebSocket connected");
      };
      ws.onmessage = function(event) {
        const msg = JSON.parse(event.data);
        if (currentChatUser && (msg.sender_id === currentChatUser || msg.receiver_id === currentChatUser)) {
          appendChatMessage(msg);
        }
        loadChatUsers();
      };
      ws.onclose = function() {
        console.log("WebSocket closed");
      };
    }
  
    // Load the list of chat users.
    async function loadChatUsers() {
      try {
        const users = await api('/api/users');
        const usersList = document.createElement('ul');
        usersList.id = 'chat-users';
        users.forEach(user => {
          const li = document.createElement('li');
          li.textContent = user.nickname;
          li.setAttribute('data-user-id', user.id);
          li.addEventListener('click', () => {
            currentChatUser = user.id;
            chatOffset = 0;
            loadChatHistory(user.id, true);
          });
          usersList.appendChild(li);
        });
        const chatSidebar = document.getElementById('chat-sidebar');
        chatSidebar.innerHTML = `<h3>Chats</h3>`;
        chatSidebar.appendChild(usersList);
        if (!document.getElementById('chat-window')) {
          const chatWindow = document.createElement('div');
          chatWindow.id = 'chat-window';
          chatWindow.style.height = '300px';
          chatWindow.style.overflowY = 'auto';
          chatWindow.addEventListener('scroll', debounce(function() {
            if (chatWindow.scrollTop === 0 && currentChatUser) {
              loadChatHistory(currentChatUser, false);
            }
          }, 300));
          chatSidebar.appendChild(chatWindow);
  
          const chatInputContainer = document.createElement('div');
          chatInputContainer.id = 'chat-input-container';
          chatInputContainer.innerHTML = `
            <input type="text" id="chat-input" placeholder="Type a message">
            <button id="chat-send-btn">Send</button>
          `;
          chatSidebar.appendChild(chatInputContainer);
          document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
        }
      } catch (error) {
        console.error("Error loading chat users: " + error.message);
      }
    }
  
    // Load chat history with a specific user.
    async function loadChatHistory(withUserId, reset) {
      const chatWindow = document.getElementById('chat-window');
      if (reset) {
        chatWindow.innerHTML = '';
        chatOffset = 0;
      }
      try {
        const messages = await api(`/api/chat/history?with=${withUserId}&limit=${CHAT_LIMIT}&offset=${chatOffset}`);
        if (messages.length > 0) {
          const scrollPos = chatWindow.scrollHeight;
          messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message';
            msgDiv.innerHTML = `<div class="meta"><strong>${msg.sender_id}</strong> ${msg.created_at}</div><div>${msg.content}</div>`;
            chatWindow.insertBefore(msgDiv, chatWindow.firstChild);
          });
          if (reset) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
          } else {
            chatWindow.scrollTop = chatWindow.scrollHeight - scrollPos;
          }
          chatOffset += messages.length;
        }
      } catch (error) {
        console.error("Error loading chat history: " + error.message);
      }
    }
  
    // Append a single chat message to the chat window.
    function appendChatMessage(msg) {
      const chatWindow = document.getElementById('chat-window');
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-message';
      msgDiv.innerHTML = `<div class="meta"><strong>${msg.sender_id}</strong> ${msg.created_at}</div><div>${msg.content}</div>`;
      chatWindow.appendChild(msgDiv);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  
    // Send a chat message via WebSocket.
    function sendChatMessage() {
      const input = document.getElementById('chat-input');
      const content = input.value.trim();
      if (!content || !currentChatUser) return;
      const message = {
        sender_id: currentUser.id,
        receiver_id: currentChatUser,
        content: content
      };
      ws.send(JSON.stringify(message));
      input.value = '';
    }
  
    // On page load, show the login view.
    document.addEventListener('DOMContentLoaded', function() {
      showLoginView();
    });
  })();
  