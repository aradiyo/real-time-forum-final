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
  
  // Create sender name span to be able to change its color
  const senderNameSpan = document.createElement("span");
  senderNameSpan.textContent = toTitleCase(senderNickname) + ": ";
  
  // Fetch the sender's gender to apply the correct color
  api('/api/users').then(users => {
    const sender = users.find(u => u.id === senderId);
    if (sender) {
      if (sender.gender === 'Male') {
        senderNameSpan.style.color = '#89CFF0'; // Baby blue
      } else if (sender.gender === 'Female') {
        senderNameSpan.style.color = '#F4C2C2'; // Baby pink
      }
    }
  }).catch(() => {});
  
  // Create message preview span
  const messageSpan = document.createElement("span");
  messageSpan.textContent = messagePreview;
  
  // Add both elements to popup
  popup.appendChild(senderNameSpan);
  popup.appendChild(messageSpan);
  
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
    <div class="chat-container">
      <div class="users-list">
        <div id="dm-online">
          <h4>Online Users</h4>
          <ul id="chat-users-online"></ul>
        </div>
        <div id="dm-offline">
          <h4>Offline Users</h4>
          <ul id="chat-users-offline"></ul>
        </div>
      </div>
      <div id="chat-window"></div>
      <div id="chat-input-container">
        <input type="text" id="chat-input" placeholder="Type a message">
        <button id="chat-send-btn">Send</button>
      </div>
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
      // Load users with their last messages already populated by the backend
      let users = await api('/api/users');
      
      // Initialize chatLastMessages with backend data
      for (const user of users) {
        if (user.last_message && user.last_message_time) {
          chatLastMessages[user.id] = {
            content: user.last_message,
            created_at: user.last_message_time
          };
        } else {
          // For backward compatibility, fetch messages if not provided by backend
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
      onlineList.innerHTML = '';
      offlineList.innerHTML = '<li class="empty-message">No users available</li>';
      return;
    }
    
    // Update chatLastMessages with data from the backend
    users.forEach(user => {
      if (user.last_message && user.last_message_time && !chatLastMessages[user.id]) {
        chatLastMessages[user.id] = {
          content: user.last_message,
          created_at: user.last_message_time
        };
      }
    });
    
    // Sort users: first by recent chat activity, then alphabetically for those without messages
    // Separate users into online and offline
    const onlineUsers = users.filter(user => user.online);
    const offlineUsers = users.filter(user => !user.online);
    
    // Then sort each group by message activity
    const onlineWithMessages = [];
    const onlineWithoutMessages = [];
    const offlineWithMessages = [];
    const offlineWithoutMessages = [];
    
    onlineUsers.forEach(user => {
      if (chatLastMessages[user.id] || user.last_message_time) {
        onlineWithMessages.push(user);
      } else {
        onlineWithoutMessages.push(user);
      }
    });
    
    offlineUsers.forEach(user => {
      if (chatLastMessages[user.id] || user.last_message_time) {
        offlineWithMessages.push(user);
      } else {
        offlineWithoutMessages.push(user);
      }
    });
    
    // Sort each group by message recency
    const sortByMessageTime = (a, b) => {
      const aTime = chatLastMessages[a.id]?.created_at || a.last_message_time;
      const bTime = chatLastMessages[b.id]?.created_at || b.last_message_time;
      return new Date(bTime) - new Date(aTime);
    };
    
    // Sort by nickname
    const sortByNickname = (a, b) => a.nickname.localeCompare(b.nickname);
    
    // Sort all groups
    onlineWithMessages.sort(sortByMessageTime);
    offlineWithMessages.sort(sortByMessageTime);
    onlineWithoutMessages.sort(sortByNickname);
    offlineWithoutMessages.sort(sortByNickname);
    
    // Combine into respective lists
    const onlineSorted = [...onlineWithMessages, ...onlineWithoutMessages];
    const offlineSorted = [...offlineWithMessages, ...offlineWithoutMessages];
    
    // Display function for a user
    const createUserListItem = (user) => {
      chatUserStatus[user.id] = user.online;
      const li = document.createElement('li');
      li.className = 'chat-user-item';
      li.id = `chat-user-${user.id}`; // Important: Set the correct ID for selection
      
      // Use the last message from our local state or from the backend
      const lastMsg = chatLastMessages[user.id] ? 
                     chatLastMessages[user.id] : 
                     (user.last_message ? { content: user.last_message, created_at: user.last_message_time } : null);
      
      const preview = lastMsg ? lastMsg.content : '';
      const time = lastMsg ? formatDate(lastMsg.created_at) : '';
      
      // Set the nickname color based on gender
      const nicknameColor = user.gender === 'Male' ? '#89CFF0' : user.gender === 'Female' ? '#F4C2C2' : 'inherit';
      
      li.innerHTML = `
        <div>
          <span class="status-dot ${user.online ? 'online' : 'offline'}"></span>
          <strong style="color: ${nicknameColor}">${toTitleCase(user.nickname)}</strong>
          <div class="chat-user-info">${preview}</div>
        </div>
        <div class="chat-user-time">${time}</div>
      `;
      li.style.cursor = "pointer";
      li.addEventListener('click', () => {
        selectChatUser(user.id);
      });
      return li;
    };
    
    // Handle empty lists with appropriate messages
    if (onlineSorted.length === 0) {
      onlineList.innerHTML = '<li class="empty-message">No users online</li>';
    } else {
      onlineSorted.forEach(user => {
        onlineList.appendChild(createUserListItem(user));
      });
    }
    
    if (offlineSorted.length === 0) {
      offlineList.innerHTML = '<li class="empty-message">No offline users</li>';
    } else {
      offlineSorted.forEach(user => {
        offlineList.appendChild(createUserListItem(user));
      });
    }
  } catch (error) {
    // Silent error handling for production
  }
}

// Select chat user and load history
function selectChatUser(userId) {
  console.log('Selecting chat user:', userId);
  // Only change users if different
  if (currentChatUser !== userId) {
    // Update UI for selection
    currentChatUser = userId;
    document.querySelectorAll('.chat-user-item').forEach(el => {
      el.classList.remove('active');
    });
    const userElement = document.getElementById(`chat-user-${userId}`);
    if (userElement) {
      userElement.classList.add('active');
    } else {
      console.log('User element not found:', `chat-user-${userId}`);
    }
    
    const chatInput = document.getElementById('chat-input');
    chatInput.disabled = false;
    chatInput.focus();
    chatInput.placeholder = "Type a message";
    
    // Reset and load the recent chat history
    loadChatHistory(userId, true);
  }
}

// Load chat history with pagination and delay
async function loadChatHistory(withUserId, reset) {
  console.log('Loading chat history with:', withUserId, 'reset:', reset);
  const chatWindow = document.getElementById('chat-window');
  
  if (reset) {
    console.log('Resetting chat window');
    chatWindow.innerHTML = '';
    chatOffset = 0;
    chatAllLoaded = false;
  }
  
  // Always add loading indicator when we start
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.textContent = 'Loading messages...';
  loadingIndicator.id = 'chat-loading-indicator';
  chatWindow.appendChild(loadingIndicator);
  
  try {
    console.log(`Fetching messages with limit ${CHAT_LIMIT} offset ${chatOffset}`);
    const response = await fetch(`/api/chat/history?with=${withUserId}&limit=${CHAT_LIMIT}&offset=${chatOffset}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.status} ${response.statusText}`);
    }
    
    const messages = await response.json();
    console.log(`Got ${messages.length} messages`);
    
    // Remove loading indicator
    const indicator = document.getElementById('chat-loading-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    if (messages.length === 0) {
      if (chatOffset === 0) {
        chatWindow.innerHTML = '<p class="no-messages">No messages yet.</p>';
        chatAllLoaded = true;
      }
      return;
    }
    
    // Create message elements
    const messageElements = [];
    messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-message';
      const displayName = msg.sender_nickname ? msg.sender_nickname : msg.sender_id;
      
      // Find the user in the users list to get the gender
      api('/api/users').then(users => {
        const sender = users.find(u => u.id === msg.sender_id);
        if (sender) {
          const nicknameColor = sender.gender === 'Male' ? '#89CFF0' : sender.gender === 'Female' ? '#F4C2C2' : 'inherit';
          msgDiv.querySelector('.sender-nickname').style.color = nicknameColor;
        }
      }).catch(() => {});
      
      msgDiv.innerHTML = `
        <div class="meta"><strong class="sender-nickname">${toTitleCase(displayName)}</strong> ${formatDate(msg.created_at, 'full')}</div>
        <div>${msg.content}</div>
      `;
      messageElements.push(msgDiv);
    });
    
    // Get or create messages container
    let messageContainer = chatWindow.querySelector('.messages-container');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.className = 'messages-container';
      chatWindow.appendChild(messageContainer);
    }
    
    if (reset) {
      // Replace all messages
      messageContainer.innerHTML = '';
      messageElements.forEach(msg => messageContainer.appendChild(msg));
    } else {
      // Prepend older messages at the beginning (not the end)
      const prevScrollHeight = chatWindow.scrollHeight;
      
      // Reverse the elements to maintain correct chronological order
      // This ensures older messages appear at the top and newer messages at the bottom
      messageElements.reverse();
      
      // Insert at the beginning of the container
      messageElements.forEach(msg => {
        messageContainer.insertBefore(msg, messageContainer.firstChild);
      });
      
      // Adjust scroll position to stay at the same point
      chatWindow.scrollTop = chatWindow.scrollHeight - prevScrollHeight;
    }
    
    // Update offset and status
    chatOffset += messages.length;
    if (messages.length < CHAT_LIMIT) {
      chatAllLoaded = true;
    }
    
    // Update chat last messages for sidebar
    if (reset && messages.length > 0) {
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
    
    // Scroll to bottom on initial load
    if (reset) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    
  } catch (error) {
    console.error('Error loading chat history:', error);
    const indicator = document.getElementById('chat-loading-indicator');
    if (indicator) {
      indicator.remove();
    }
    chatWindow.innerHTML += '<p class="error-message">No messages found.</p>';
  }
}

// Append a new chat message
function appendChatMessage(msg) {
  const chatWindow = document.getElementById('chat-window');
  const msgDiv = document.createElement('div');
  const displayName = msg.sender_nickname ? msg.sender_nickname : msg.sender_id;
  msgDiv.className = 'chat-message';
  
  // Set HTML content first
  msgDiv.innerHTML = `
    <div class="meta"><strong class="sender-nickname">${toTitleCase(displayName)}</strong> ${formatDate(msg.created_at, 'full')}</div>
    <div>${msg.content}</div>
  `;
  
  // Find the user in the users list to get the gender
  api('/api/users').then(users => {
    const sender = users.find(u => u.id === msg.sender_id);
    if (sender) {
      const nicknameColor = sender.gender === 'Male' ? '#89CFF0' : sender.gender === 'Female' ? '#F4C2C2' : 'inherit';
      msgDiv.querySelector('.sender-nickname').style.color = nicknameColor;
    }
  }).catch(() => {});
  
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
  
  // Remove any "No messages found" error message when sending a message
  removeNoMessagesError();
  
  const message = {
    sender_id: currentUser.id,
    sender_nickname: currentUser.nickname,
    receiver_id: currentChatUser,
    content: content
  };
  ws.send(JSON.stringify(message));
  input.value = '';
}

// Helper function to remove the "No messages found" error message
function removeNoMessagesError() {
  const chatWindow = document.getElementById('chat-window');
  const errorMessages = chatWindow.querySelectorAll('.error-message');
  errorMessages.forEach(msg => msg.remove());
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
        
        // Update last message data
        if (msg.sender_id !== currentUser.id) {
          chatLastMessages[msg.sender_id] = {
            content: msg.content,
            created_at: msg.created_at
          };
          if (currentChatUser !== msg.sender_id) {
            showNewMessagePopup(msg.sender_id, msg.sender_nickname, msg.content);
          }
        } else {
          chatLastMessages[msg.receiver_id] = {
            content: msg.content,
            created_at: msg.created_at
          };
        }
        
        if (currentChatUser && (msg.sender_id === currentChatUser || msg.receiver_id === currentChatUser)) {
          appendChatMessage(msg);
        }
        
        // Reload chat users to update the sorting
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
    
    // Add event listener for chat input to remove "No messages found" when typing
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('input', removeNoMessagesError);
    }
    
  } catch (error) {
    // Silent error handling for production
  }
}