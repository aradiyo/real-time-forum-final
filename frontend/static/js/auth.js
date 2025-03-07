// Logout function with proper cleanup
async function logout() {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      // Silent error handling for production
    }
    
    // Clear intervals
    if (window.postsInterval) {
      clearInterval(window.postsInterval);
      window.postsInterval = null;
    }
    
    // Clear comment interval if active
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
    }
    
    // Clear chat users interval if exists
    if (window.chatUsersInterval) {
      clearInterval(window.chatUsersInterval);
      window.chatUsersInterval = null;
    }
    
    // Reset user and close connection
    currentUser = null;
    if (ws) {
      try {
        ws.close();
      } catch (error) {
        // Silent error handling for production
      }
      ws = null;
    }
    
    showLoginView();
  }
  
  // Show login view
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
    document.getElementById('login-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value;
      const password = document.getElementById('login-password').value;
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.text();
          alert("Login failed: Invalid credentials. Please check your email/nickname and password and try again.");
          return;
        }
        const userData = await res.json();
        currentUser = { id: userData.id, nickname: userData.nickname };
        initWebSocket();
        showMainView();
      } catch (error) {
        alert("Connection error. Please check your internet connection and try again.");
      }
    });
    document.getElementById('login-form').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
      }
    });
  }
  
  // Show registration view with gender and age validation
  function showRegisterView() {
    document.getElementById('app').innerHTML = `
      <h2>Register</h2>
      <form id="register-form">
        <input type="text" id="reg-nickname" placeholder="Nickname" required>
        <input type="number" id="reg-age" placeholder="Age" min="1" max="100" required>
        <select id="reg-gender" required>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
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
    document.getElementById('register-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const age = parseInt(document.getElementById('reg-age').value);
      if (age < 1 || age > 100) {
        alert("Please enter a valid age between 1 and 100 years.");
        return;
      }
      const gender = document.getElementById('reg-gender').value;
      if (gender !== "Male" && gender !== "Female") {
        alert("Please select a gender from the dropdown menu.");
        return;
      }
      const user = {
        nickname: document.getElementById('reg-nickname').value,
        age: age,
        gender: gender,
        first_name: document.getElementById('reg-first-name').value,
        last_name: document.getElementById('reg-last-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
      };
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.text();
          alert("Registration failed. This email or nickname may already be in use. Please try a different one.");
          return;
        }
        alert("Your account has been created successfully! Please log in with your credentials.");
        showLoginView();
      } catch (error) {
        alert("Connection error. Please check your internet connection and try again.");
      }
    });
    document.getElementById('register-form').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('register-form').dispatchEvent(new Event('submit'));
      }
    });
  }
  
  // Check session on load
  async function checkSession() {
    try {
      const sessionData = await api('/api/session');
      currentUser = { id: sessionData.id, nickname: sessionData.nickname };
      initWebSocket();
      showMainView();
    } catch (error) {
      showLoginView(); // Silent redirect, no console error
    }
  }