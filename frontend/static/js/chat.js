// Show popup for new DM notifications
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
    popup.addEventListener("click", function () {
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
  
  // Initialize chat sidebar
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
    chatWindow.addEventListener('scroll', debounce(function () {
      if (chatWindow.scrollTop === 0 && currentChatUser && !chatAllLoaded) {
        loadChatHistory(currentChatUser, false);
      }
    }, 300));
    
    // Load chat history for all users to populate chatLastMessages
    async function loadInitialChatData() {
      try {
        // First load users
        let users = await api('/api/users');
        
        // For each user, fetch just the most recent message
        for (const user of users) {
          const messages = await api(`/api/chat/history?with=${user.id}&limit=1&offset=0`);
          if (messages.length > 0) {
            const msg = messages[0];
            if (msg.sender_id === currentUser.id) {
              chatLastMessages[user.id] = {
                content: msg.content,
                created_at: msg.created_at
              };
            } else {
              chatLastMessages[msg.sender_id] = {
                content: msg.content,
                created_at: msg.created_at
              };
            }
          }
        }
        
        // Now load the user list with correct message previews
        loadChatUsers();
      } catch (error) {
        // Silent error handling
        loadChatUsers();
      }
    }
    
    // Load initial data to properly populate chat sidebar
    loadInitialChatData();
    
    // Store interval reference in window object
    window.chatUsersInterval = setInterval(loadChatUsers, 2000);
    document.getElementById('chat-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!document.getElementById('chat-input').disabled) {
          sendChatMessage();
        }
      }
    });
  }
  
  // Load chat users
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
        const preview = chatLastMessages[user.id] ? chatLastMessages[user.id].content : '';
        const time = chatLastMessages[user.id] ? formatDate(chatLastMessages[user.id].created_at) : '';
        li.innerHTML = `
          <div>
            <span class="status-dot ${user.online ? 'online' : 'offline'}"></span>
            <strong>${toTitleCase(user.nickname)}</strong>
            <div class="chat-user-info">${preview}</div>
          </div>
          <div class="chat-user-time">${time}</div>
        `;
        li.style.cursor = "pointer";
        li.addEventListener('click', () => {
          currentChatUser = user.id;
          chatOffset = 0;
          chatAllLoaded = false;
          loadChatHistory(user.id, true);
          loadChatUsers();
          const chatInput = document.getElementById('chat-input');
          chatInput.disabled = false;
          chatInput.placeholder = "Type a message";
        });
        if (user.online) {
          onlineList.appendChild(li);
        } else {
          offlineList.appendChild(li);
        }
      });
    } catch (error) {
      // Silent error handling for production
    }
  }
  
  // Load chat history with pagination and delay
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
        messages = messages.reverse(); // Oldest first
        
        // Update chatLastMessages with the most recent message
        // This ensures the sidebar shows correct message previews
        if (reset) {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg.sender_id === currentUser.id) {
            chatLastMessages[withUserId] = {
              content: lastMsg.content,
              created_at: lastMsg.created_at
            };
          } else {
            chatLastMessages[lastMsg.sender_id] = {
              content: lastMsg.content,
              created_at: lastMsg.created_at
            };
          }
          // Update user list to reflect the new message previews
          loadChatUsers();
        }
        
        const prevScrollHeight = chatWindow.scrollHeight;
        // Add a 500ms delay before appending messages
        setTimeout(() => {
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
          if (messages.length < CHAT_LIMIT) chatAllLoaded = true;
          if (!reset) {
            chatWindow.scrollTop = chatWindow.scrollHeight - prevScrollHeight;
          } else {
            chatWindow.scrollTop = chatWindow.scrollHeight;
          }
        }, 500); // 500ms delay
      } else if (chatOffset === 0) {
        chatWindow.innerHTML = '<p>No messages yet.</p>';
        chatAllLoaded = true;
      }
    } catch (error) {
      // Silent error handling for production
      if (chatOffset === 0) chatWindow.innerHTML = '<p>No messages yet.</p>';
    }
  }
  
  // Append a new chat message
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
  
  // Send a chat message with user selection check
  function sendChatMessage() {
    if (!currentChatUser) {
      alert("Please select a user from the list to start a conversation.");
      return;
    }
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content) return;
    const message = {
      sender_id: currentUser.id,
      sender_nickname: currentUser.nickname,
      receiver_id: currentChatUser,
      content: content
    };
    ws.send(JSON.stringify(message));
    input.value = '';
  }
  
  // Initialize WebSocket with proper error handling
  function initWebSocket() {
    try {
      ws = new WebSocket(`ws://${window.location.host}/api/chat?sender_id=${currentUser.id}`);
      
      ws.onopen = function () {
        // Connection established - no logging needed
      };
      
      ws.onmessage = function (event) {
        try {
          const msg = JSON.parse(event.data);
          if (!msg.sender_nickname) {
            msg.sender_nickname = msg.sender_id;
          }
          
          if (msg.sender_id !== currentUser.id) {
            chatLastMessages[msg.sender_id] = msg;
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
        } catch (error) {
          // Silent error handling for production
        }
      };
      
      ws.onclose = function (event) {
        // Connection closed - no logging needed
      };
      
      ws.onerror = function (error) {
        // Silent error handling for production
      };
    } catch (error) {
      // Silent error handling for production
    }
  }