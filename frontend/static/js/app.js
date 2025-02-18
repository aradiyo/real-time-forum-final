(function() {
  let currentUser = null; // Current user info (id and nickname)
  let ws = null; // WebSocket connection
  let currentChatUser = null; // Selected chat partner for DM
  let currentPostId = null; // Current post id for comments modal
  let chatOffset = 0;
  const CHAT_LIMIT = 10;
  let chatAllLoaded = false; // Flag to indicate that all messages have been loaded
  let commentInterval = null; // Interval for polling comments when modal is open
  let allPosts = []; // Store all posts for filtering by category
  let currentCategory = "All"; // Currently selected category
  // Store the last message for each chat user (for preview purposes)
  let chatLastMessages = {};
  // Store user online status for DM input enabling/disabling
  let chatUserStatus = {};

  // Utility: Debounce function to throttle events
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Utility: Convert a string to Title Case
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // Utility: Format date string nicely
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  // Utility: API helper function; ensure array is returned for list endpoints
  async function api(path, options = {}) {
    const res = await fetch(path, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    const data = await res.json().catch(() => ([]));
    return Array.isArray(data) ? data : data;
  }

  // Build category tabs from posts
  function buildCategoryTabs(posts) {
    const tabContainer = document.getElementById("category-tabs");
    if (!tabContainer) return;
    let categories = new Set();
    posts.forEach(post => {
      if (post.category) categories.add(post.category);
    });
    tabContainer.innerHTML = "";
    const allTab = document.createElement("button");
    allTab.textContent = "All";
    allTab.style.marginRight = "5px";
    allTab.className = currentCategory === "All" ? "active-tab" : "";
    allTab.addEventListener("click", () => {
      currentCategory = "All";
      renderPosts(allPosts);
      buildCategoryTabs(allPosts);
    });
    tabContainer.appendChild(allTab);
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.textContent = cat;
      btn.style.marginRight = "5px";
      btn.className = currentCategory === cat ? "active-tab" : "";
      btn.addEventListener("click", () => {
        currentCategory = cat;
        renderPosts(allPosts);
        buildCategoryTabs(allPosts);
      });
      tabContainer.appendChild(btn);
    });
  }

  // Render posts filtered by currentCategory
  function renderPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = "";
    let filtered = posts;
    if (currentCategory !== "All") {
      filtered = posts.filter(post => post.category === currentCategory);
    }
    if (!filtered || filtered.length === 0) {
      container.innerHTML = `<p>There is no posts yet, Please create one!</p>`;
      return;
    }
    filtered.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.className = 'post';
      postDiv.innerHTML = `
        <h3>Category: ${post.category}</h3>
        <p>${post.content}</p>
        <small>${formatDate(post.created_at)}</small>
        <br>
        <small>Created by: ${toTitleCase(post.nickname)}</small>
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
  }

  // Popup for new DM notifications (click to open chat)
  function showNewMessagePopup(senderId, senderNickname, messagePreview) {
    const popup = document.createElement("div");
    popup.className = "dm-popup";
    popup.style.position = "fixed";
    popup.style.bottom = "20px";
    popup.style.right = "20px";
    popup.style.background = "#3742fa";
    popup.style.color = "#fff";
    popup.style.padding = "10px 15px";
    popup.style.borderRadius = "5px";
    popup.style.cursor = "pointer";
    popup.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    popup.textContent = `${toTitleCase(senderNickname)}: ${messagePreview}`;
    popup.addEventListener("click", function() {
      currentChatUser = senderId;
      chatOffset = 0;
      chatAllLoaded = false;
      loadChatHistory(senderId, true);
      document.body.removeChild(popup);
    });
    document.body.appendChild(popup);
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 5000);
  }

  // Authentication: Show login view
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
    document.getElementById('chat-sidebar').style.display = 'none';
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
        const userData = await res.json();
        currentUser = { id: userData.id, nickname: userData.nickname };
        initWebSocket();
        showMainView();
      } catch (error) {
        alert("Error: " + error.message);
      }
    });
    document.getElementById('login-form').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
      }
    });
  }

  // Authentication: Show register view
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
    document.getElementById('chat-sidebar').style.display = 'none';
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
    document.getElementById('register-form').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('register-form').dispatchEvent(new Event('submit'));
      }
    });
  }

  // Main view: Top bar with welcome message (Title Case), category tabs, posts feed; DM sidebar is always visible
  function showMainView() {
    document.getElementById('app').innerHTML = `
      <div id="top-bar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <span id="welcome-msg" style="font-size: 1.2em; font-weight: bold;">Welcome, ${toTitleCase(currentUser.nickname)}</span>
        <button id="logout-btn" style="margin-right: 10px;">Logout</button>
      </div>
      <div id="category-tabs" style="margin-bottom: 10px;"></div>
      <div>
        <h2>Posts Feed</h2>
        <form id="post-form">
          <input type="text" id="post-category" placeholder="Category" required>
          <textarea id="post-content" placeholder="Enter the subject/content" required></textarea>
          <button type="submit">Create Post</button>
        </form>
        <div id="posts-container"></div>
      </div>
    `;
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('post-form').addEventListener('submit', createPost);
    document.getElementById('post-content').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('post-form').dispatchEvent(new Event('submit'));
      }
    });
    loadPosts();
    document.getElementById('chat-sidebar').style.display = 'flex';
    initChatSidebar();
  }

  // Load posts, build category tabs, and render posts filtered by category
  async function loadPosts() {
    try {
      let posts = await api('/api/posts');
      if (!Array.isArray(posts)) {
        posts = [];
      }
      allPosts = posts;
      buildCategoryTabs(allPosts);
      renderPosts(allPosts);
    } catch (error) {
      document.getElementById('posts-container').innerHTML = '<p>There is no posts yet, Please create one!</p>';
    }
  }

  // Create a new post and update posts list; support submission via Enter key
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
        return; // Suppress error for first post creation if allPosts is not defined
      }
      const newPost = await res.json();
      if (!Array.isArray(allPosts)) {
        allPosts = [];
      }
      allPosts.unshift(newPost);
      buildCategoryTabs(allPosts);
      renderPosts(allPosts);
      document.getElementById('post-form').reset();
    } catch (error) {
      // Suppress error message for first post creation
    }
  }

  // Show comments modal for a specific post and start polling for real-time comments
  async function showComments(postId) {
    currentPostId = postId;
    document.getElementById('post-comments-modal').style.display = 'flex';
    loadComments();
    if (commentInterval) clearInterval(commentInterval);
    commentInterval = setInterval(loadComments, 2000);
    // Focus the comment input after modal opens
    setTimeout(() => {
      document.getElementById('comment-content') && document.getElementById('comment-content').focus();
    }, 100);
  }

  // Load comments for the current post (real-time polling)
  async function loadComments() {
    const commentsContainer = document.getElementById('comments-container');
    try {
      let comments = await api(`/api/comments?post_id=${currentPostId}`);
      if (!Array.isArray(comments) || comments.length === 0) {
        commentsContainer.innerHTML = '<p>No comments yet.</p>';
      } else {
        commentsContainer.innerHTML = '';
        comments.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.className = 'comment';
          const displayName = comment.nickname ? toTitleCase(comment.nickname) : comment.user_id;
          commentDiv.innerHTML = `<p><strong>${displayName}:</strong> ${comment.content}</p><small>${formatDate(comment.created_at)}</small>`;
          commentsContainer.appendChild(commentDiv);
        });
      }
      document.getElementById('comment-form').onsubmit = async function(e) {
        e.preventDefault();
        const content = document.getElementById('comment-content').value;
        const comment = { post_id: currentPostId, user_id: currentUser.id, content };
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
        loadComments();
      };
      document.getElementById('comment-content').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          document.getElementById('comment-form').dispatchEvent(new Event('submit'));
        }
      });
    } catch (error) {
      commentsContainer.innerHTML = '<p>No comments yet.</p>';
    }
  }

  // Close comments modal and stop polling
  function closeCommentsModal() {
    document.getElementById('post-comments-modal').style.display = 'none';
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
    }
  }

  // Logout user
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

  // Initialize WebSocket for DM; include sender_nickname in outgoing messages
  function initWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}/api/chat?sender_id=${currentUser.id}`);
    ws.onopen = function() {
      console.log("WebSocket connected");
    };
    ws.onmessage = function(event) {
      const msg = JSON.parse(event.data);
      if (!msg.sender_nickname) {
        msg.sender_nickname = msg.sender_id;
      }
      if (msg.sender_id !== currentUser.id) {
        chatLastMessages[msg.sender_id] = msg;
        // Show popup notification if chat with sender is not open
        if (currentChatUser !== msg.sender_id) {
          showNewMessagePopup(msg.sender_id, msg.sender_nickname, msg.content);
        }
      } else {
        chatLastMessages[msg.receiver_id] = msg;
      }
      if (currentChatUser && (msg.sender_id === currentChatUser || msg.receiver_id === currentChatUser)) {
        appendChatMessage(msg);
      }
      loadChatUsers();
    };
    ws.onclose = function() {
      console.log("WebSocket closed");
    };
  }

  // Popup for new DM notifications (click to open chat)
  function showNewMessagePopup(senderId, senderNickname, messagePreview) {
    const popup = document.createElement("div");
    popup.className = "dm-popup";
    popup.style.position = "fixed";
    popup.style.bottom = "20px";
    popup.style.right = "20px";
    popup.style.background = "#3742fa";
    popup.style.color = "#fff";
    popup.style.padding = "10px 15px";
    popup.style.borderRadius = "5px";
    popup.style.cursor = "pointer";
    popup.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    popup.textContent = `${toTitleCase(senderNickname)}: ${messagePreview}`;
    popup.addEventListener("click", function() {
      currentChatUser = senderId;
      chatOffset = 0;
      chatAllLoaded = false;
      loadChatHistory(senderId, true);
      document.body.removeChild(popup);
    });
    document.body.appendChild(popup);
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 5000);
  }

  // Initialize DM sidebar (always visible) with online/offline grouping sorted by last message timestamp if available, else alphabetically.
  // For offline users, allow viewing chat history but disable message input.
  function initChatSidebar() {
    const chatSidebar = document.getElementById('chat-sidebar');
    chatSidebar.innerHTML = `
      <header>Direct Messages</header>
      <div id="dm-online">
        <h4>Online Users</h4>
        <ul id="chat-users-online"></ul>
      </div>
      <div id="dm-offline">
        <h4>Offline Users</h4>
        <ul id="chat-users-offline"></ul>
      </div>
      <div id="chat-window"></div>
      <div id="chat-input-container">
        <input type="text" id="chat-input" placeholder="Type a message">
        <button id="chat-send-btn">Send</button>
      </div>
    `;
    document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
    const chatWindow = document.getElementById('chat-window');
    chatWindow.addEventListener('scroll', debounce(function() {
      if (chatWindow.scrollTop === 0 && currentChatUser && !chatAllLoaded) {
        loadChatHistory(currentChatUser, false);
      }
    }, 300));
    loadChatUsers();
    setInterval(function() {
      loadChatUsers();
    }, 2000);
    document.getElementById('chat-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Only send if input is enabled (for online users)
        if (!document.getElementById('chat-input').disabled) {
          sendChatMessage();
        }
      }
    });
  }

  // Load chat users grouped by online/offline status, sorted by last message timestamp if available, else alphabetically.
  async function loadChatUsers() {
    try {
      let users = await api('/api/users');
      const onlineList = document.getElementById('chat-users-online');
      const offlineList = document.getElementById('chat-users-offline');
      onlineList.innerHTML = '';
      offlineList.innerHTML = '';
      chatUserStatus = {};
      if (!users || users.length === 0) {
        onlineList.innerHTML = '<li>No users available</li>';
        return;
      }
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
      users.forEach(user => {
        chatUserStatus[user.id] = user.online;
        const li = document.createElement('li');
        li.setAttribute('data-user-id', user.id);
        let preview = '';
        let time = '';
        if (chatLastMessages[user.id]) {
          preview = chatLastMessages[user.id].content;
          time = formatDate(chatLastMessages[user.id].created_at);
        }
        li.innerHTML = `
          <div>
            <span class="status-dot ${user.online ? 'online' : 'offline'}"></span>
            <strong>${toTitleCase(user.nickname)}</strong>
            <div class="chat-user-info">${preview}</div>
          </div>
          <div class="chat-user-time">${time}</div>
        `;
        // Allow clicking for both online and offline users
        li.style.cursor = "pointer";
        li.addEventListener('click', () => {
          currentChatUser = user.id;
          chatOffset = 0;
          chatAllLoaded = false;
          loadChatHistory(user.id, true);
          loadChatUsers();
          // Disable DM input if selected user is offline
          if (!user.online) {
            document.getElementById('chat-input').disabled = true;
            document.getElementById('chat-input').placeholder = "User is offline, cannot send messages";
          } else {
            document.getElementById('chat-input').disabled = false;
            document.getElementById('chat-input').placeholder = "Type a message";
          }
        });
        if (user.online) {
          onlineList.appendChild(li);
        } else {
          offlineList.appendChild(li);
        }
      });
    } catch (error) {
      console.error("Error loading chat users: " + error.message);
    }
  }

  // Load chat history for the selected user using scroll event; stop when all messages loaded
  async function loadChatHistory(withUserId, reset) {
    const chatWindow = document.getElementById('chat-window');
    if (reset) {
      chatWindow.innerHTML = '';
      chatOffset = 0;
      chatAllLoaded = false;
    }
    if (chatAllLoaded) return;
    try {
      let messages = await api(`/api/chat/history?with=${withUserId}&limit=${CHAT_LIMIT}&offset=${chatOffset}`);
      if (messages.length > 0) {
        // Reverse messages to display chronologically (oldest at top)
        messages = messages.reverse();
        const prevScrollHeight = chatWindow.scrollHeight;
        messages.forEach(msg => {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'chat-message';
          const displayName = msg.sender_nickname ? msg.sender_nickname : msg.sender_id;
          msgDiv.innerHTML = `
            <div class="meta"><strong>${toTitleCase(displayName)}</strong> ${formatDate(msg.created_at)}</div>
            <div>${msg.content}</div>
          `;
          chatWindow.insertBefore(msgDiv, chatWindow.firstChild);
        });
        chatOffset += messages.length;
        if (messages.length < CHAT_LIMIT) {
          chatAllLoaded = true;
        }
        if (!reset) {
          chatWindow.scrollTop = chatWindow.scrollHeight - prevScrollHeight;
        } else {
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      }
    } catch (error) {
      console.error("Error loading chat history: " + error.message);
    }
  }

  // Append a new chat message to the chat window
  function appendChatMessage(msg) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    const displayName = msg.sender_nickname ? msg.sender_nickname : msg.sender_id;
    msgDiv.className = 'chat-message';
    msgDiv.innerHTML = `
      <div class="meta"><strong>${toTitleCase(displayName)}</strong> ${formatDate(msg.created_at)}</div>
      <div>${msg.content}</div>
    `;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // Send a DM via WebSocket; include sender_nickname in outgoing message
  function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content || !currentChatUser) return;
    const message = {
      sender_id: currentUser.id,
      sender_nickname: currentUser.nickname,
      receiver_id: currentChatUser,
      content: content
    };
    ws.send(JSON.stringify(message));
    input.value = '';
  }

  // Check session and load main view if authenticated
  async function checkSession() {
    try {
      const sessionData = await api('/api/session');
      currentUser = { id: sessionData.id, nickname: sessionData.nickname };
      initWebSocket();
      showMainView();
    } catch (error) {
      showLoginView();
    }
  }

  // Poll for new posts every 2 seconds for near real-time updates
  setInterval(function() {
    if (currentUser) {
      loadPosts();
    }
  }, 2000);

  document.addEventListener('DOMContentLoaded', function() {
    checkSession();
  });
})();
