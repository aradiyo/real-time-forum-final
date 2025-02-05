(function() {
  let currentUser = null; // Currently logged-in user info
  let ws = null; // WebSocket connection
  let currentChatUser = null; // Currently selected chat partner's ID (for direct message toggle)
  let chatOffset = 0;
  const CHAT_LIMIT = 10;
  // Object to store the last message for each chat user (for preview purposes)
  let chatLastMessages = {};

  // --------------------- //
  // Utility Functions
  // --------------------- //

  // Debounce function to throttle scroll events
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Format date nicely
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  // API helper
  async function api(path, options = {}) {
    const res = await fetch(path, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    return res.json().catch(() => ({}));
  }

  // --------------------- //
  // Authentication Views
  // --------------------- //

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
          body: JSON.stringify({ identifier, password })
        });
        if (!res.ok) {
          const err = await res.text();
          alert("Login failed: " + err);
          return;
        }
        // For simplicity, we store the identifier as the user id.
        currentUser = { id: identifier, identifier };
        initWebSocket();
        showMainView();
        initChatSidebar();
      } catch (error) {
        alert("Error: " + error.message);
      }
    });
  }

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

  // --------------------- //
  // Main Application (Posts / Comments)
  // --------------------- //

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
          <small>${formatDate(post.created_at)}</small>
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

  async function showComments(postId) {
    document.getElementById('post-comments-modal').style.display = 'flex';
    const commentsContainer = document.getElementById('comments-container');
    commentsContainer.innerHTML = '<p>Loading comments...</p>';
    try {
      const comments = await api(`/api/comments?post_id=${postId}`);
      commentsContainer.innerHTML = '';
      comments.forEach(comment => {
        // Display the commentor's id along with the comment content.
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        commentDiv.innerHTML = `<p><strong>${comment.user_id}:</strong> ${comment.content}</p><small>${formatDate(comment.created_at)}</small>`;
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

  // --------------------- //
  // Chat Functionality
  // --------------------- //

  // Initialize WebSocket connection for chat.
  function initWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}/api/chat?sender_id=${currentUser.id}`);
    ws.onopen = function() {
      console.log("WebSocket connected");
    };
    ws.onmessage = function(event) {
      const msg = JSON.parse(event.data);
      // Update last message info for preview.
      if (msg.sender_id !== currentUser.id) {
        chatLastMessages[msg.sender_id] = msg;
      } else {
        chatLastMessages[msg.receiver_id] = msg;
      }
      // If the message belongs to the currently open DM, append it.
      if (currentChatUser && (msg.sender_id === currentChatUser || msg.receiver_id === currentChatUser)) {
        appendChatMessage(msg);
      }
      // Refresh chat users list to update preview and online status.
      loadChatUsers();
    };
    ws.onclose = function() {
      console.log("WebSocket closed");
    };
  }

  // Render and initialize the chat sidebar.
  function initChatSidebar() {
    const chatSidebar = document.getElementById('chat-sidebar');
    chatSidebar.innerHTML = `
      <header>Direct Messages</header>
      <ul id="chat-users"></ul>
      <div id="chat-window"></div>
      <div id="chat-input-container">
        <input type="text" id="chat-input" placeholder="Type a message">
        <button id="chat-send-btn">Send</button>
      </div>
    `;
    document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
    const chatWindow = document.getElementById('chat-window');
    chatWindow.addEventListener('scroll', debounce(function() {
      if (chatWindow.scrollTop === 0 && currentChatUser) {
        loadChatHistory(currentChatUser, false);
      }
    }, 300));
    loadChatUsers();
  }

  // Load chat users (all users with online status and message preview).
  async function loadChatUsers() {
    try {
      let users = await api('/api/users');
      if (!users || users.length === 0) {
        document.getElementById('chat-users').innerHTML = '<li>No other users available</li>';
        return;
      }
      // Sort users: with a last message come first (newest first), then alphabetical.
      users.sort((a, b) => {
        const aMsg = chatLastMessages[a.id];
        const bMsg = chatLastMessages[b.id];
        if (aMsg && bMsg) {
          return new Date(bMsg.created_at) - new Date(aMsg.created_at);
        } else if (aMsg) {
          return -1;
        } else if (bMsg) {
          return 1;
        } else {
          return a.nickname.localeCompare(b.nickname);
        }
      });
      const usersList = document.getElementById('chat-users');
      usersList.innerHTML = '';
      users.forEach(user => {
        const li = document.createElement('li');
        li.setAttribute('data-user-id', user.id);
        let preview = '';
        let time = '';
        if (chatLastMessages[user.id]) {
          preview = chatLastMessages[user.id].content;
          time = formatDate(chatLastMessages[user.id].created_at);
        }
        // Highlight the selected user.
        let selectedClass = (currentChatUser === user.id) ? 'selected' : '';
        li.innerHTML = `
          <div>
            <span class="status-dot ${user.online ? 'online' : 'offline'}"></span>
            <strong>${user.nickname}</strong>
            <div class="chat-user-info">${preview}</div>
          </div>
          <div class="chat-user-time">${time}</div>
        `;
        li.className = selectedClass;
        li.addEventListener('click', () => {
          // Toggle DM view: if clicking the already selected user, unselect (close DM).
          if (currentChatUser === user.id) {
            currentChatUser = null;
            document.getElementById('chat-window').innerHTML = '';
            loadChatUsers();
          } else {
            currentChatUser = user.id;
            chatOffset = 0;
            loadChatHistory(user.id, true);
            loadChatUsers();
          }
        });
        usersList.appendChild(li);
      });
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
        const prevScrollHeight = chatWindow.scrollHeight;
        messages.forEach(msg => {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'chat-message';
          msgDiv.innerHTML = `
            <div class="meta"><strong>${msg.sender_id}</strong> ${formatDate(msg.created_at)}</div>
            <div>${msg.content}</div>
          `;
          chatWindow.insertBefore(msgDiv, chatWindow.firstChild);
        });
        if (!reset) {
          // Maintain scroll position after loading older messages.
          chatWindow.scrollTop = chatWindow.scrollHeight - prevScrollHeight;
        } else {
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
        chatOffset += messages.length;
      }
    } catch (error) {
      console.error("Error loading chat history: " + error.message);
    }
  }

  // Append a new chat message to the chat window.
  function appendChatMessage(msg) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.innerHTML = `
      <div class="meta"><strong>${msg.sender_id}</strong> ${formatDate(msg.created_at)}</div>
      <div>${msg.content}</div>
    `;
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

  // --------------------- //
  // Session Persistence
  // --------------------- //

  async function checkSession() {
    try {
      const userID = await api('/api/session');
      currentUser = { id: userID, identifier: userID };
      initWebSocket();
      showMainView();
      initChatSidebar();
    } catch (error) {
      showLoginView();
    }
  }

  // --------------------- //
  // Initialize on Page Load
  // --------------------- //

  document.addEventListener('DOMContentLoaded', function() {
    checkSession();
  });
})();
