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
      <div class="auth-container">
        <h2>Welcome to Real-Time Forum</h2>
        <form id="login-form">
          <h3>Login</h3>
          <input type="text" id="login-identifier" placeholder="Email or Nickname" required>
          <input type="password" id="login-password" placeholder="Password" required>
          <button type="submit">Sign In</button>
        </form>
        <p>Don't have an account? <span class="link" id="to-register">Register here</span></p>
      </div>
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
      <div class="auth-container">
        <h2>Join Real-Time Forum</h2>
        <form id="register-form">
          <h3>Create an Account</h3>
          <div class="form-row">
            <input type="text" id="reg-first-name" placeholder="First Name" required>
            <input type="text" id="reg-last-name" placeholder="Last Name" required>
          </div>
          <input type="text" id="reg-nickname" placeholder="Nickname" required>
          <div class="form-row">
            <div class="date-field">
              <label for="reg-dob">Date of Birth</label>
              <div class="advanced-date-picker" id="date-picker-container">
                <input type="text" id="reg-dob-display" placeholder="Select date" readonly>
                <input type="hidden" id="reg-dob" required>
                <div class="date-picker-dropdown" id="date-picker-dropdown">
                  <div class="date-picker-header">
                    <button type="button" class="prev-btn" id="prev-btn">←</button>
                    <div class="month-year-selectors">
                      <select id="month-select" class="date-select">
                        <option value="0">January</option>
                        <option value="1">February</option>
                        <option value="2">March</option>
                        <option value="3">April</option>
                        <option value="4">May</option>
                        <option value="5">June</option>
                        <option value="6">July</option>
                        <option value="7">August</option>
                        <option value="8">September</option>
                        <option value="9">October</option>
                        <option value="10">November</option>
                        <option value="11">December</option>
                      </select>
                      <select id="year-select" class="date-select"></select>
                    </div>
                    <button type="button" class="next-btn" id="next-btn">→</button>
                  </div>
                  <div class="date-picker-body">
                    <div class="weekdays">
                      <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>
                    <div class="days" id="days-grid"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="gender-field">
              <label for="reg-gender">Select Gender</label>
              <select id="reg-gender" required>
                <option value="">-- Select --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <input type="email" id="reg-email" placeholder="Email" required>
          <input type="password" id="reg-password" placeholder="Password" required>
          <input type="password" id="reg-password-confirm" placeholder="Confirm Password" required>
          <button type="submit">Create Account</button>
        </form>
        <p>Already have an account? <span class="link" id="to-login">Login here</span></p>
      </div>
    `;
    document.getElementById('chat-sidebar').style.display = 'none';
    document.getElementById('to-login').addEventListener('click', showLoginView);
    
    // Advanced Date Picker Implementation
    const initDatePicker = () => {
      // Elements
      const displayInput = document.getElementById('reg-dob-display');
      const hiddenInput = document.getElementById('reg-dob');
      const dropdown = document.getElementById('date-picker-dropdown');
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      const daysGrid = document.getElementById('days-grid');
      const monthSelect = document.getElementById('month-select');
      const yearSelect = document.getElementById('year-select');
      
      // State
      let currentDate = new Date();
      let selectedDate = null;
      
      // Month names
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      // Populate year select (from 120 years ago to current year)
      const populateYearSelect = () => {
        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 120; year--) {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          yearSelect.appendChild(option);
        }
        yearSelect.value = currentDate.getFullYear();
      };
      
      // Initialize month and year selects
      populateYearSelect();
      monthSelect.value = currentDate.getMonth();
      
      // Toggle dropdown
      displayInput.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        if (dropdown.style.display === 'block') {
          updateCalendar();
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!document.getElementById('date-picker-container').contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
      
      // Update when month select changes
      monthSelect.addEventListener('change', () => {
        currentDate.setMonth(parseInt(monthSelect.value));
        updateCalendar();
      });
      
      // Update when year select changes
      yearSelect.addEventListener('change', () => {
        currentDate.setFullYear(parseInt(yearSelect.value));
        updateCalendar();
      });
      
      // Previous month button
      prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
        // Update dropdown to match
        monthSelect.value = currentDate.getMonth();
        if (parseInt(yearSelect.value) !== currentDate.getFullYear()) {
          yearSelect.value = currentDate.getFullYear();
        }
      });
      
      // Next month button
      nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
        // Update dropdown to match
        monthSelect.value = currentDate.getMonth();
        if (parseInt(yearSelect.value) !== currentDate.getFullYear()) {
          yearSelect.value = currentDate.getFullYear();
        }
      });
      
      // Update calendar for current month/year
      const updateCalendar = () => {
        // Get first day of month and number of days
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Clear grid
        daysGrid.innerHTML = '';
        
        // Add empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
          const emptyCell = document.createElement('div');
          emptyCell.classList.add('day', 'empty');
          daysGrid.appendChild(emptyCell);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateStr = formatDateForComparison(date);
          
          const dayCell = document.createElement('div');
          dayCell.classList.add('day');
          dayCell.textContent = day;
          
          // Highlight today
          if (isSameDay(date, new Date())) {
            dayCell.classList.add('today');
          }
          
          // Highlight selected date
          if (selectedDate && isSameDay(date, selectedDate)) {
            dayCell.classList.add('selected');
          }
          
          // Select date on click
          dayCell.addEventListener('click', () => {
            selectedDate = date;
            updateSelectedDate();
            dropdown.style.display = 'none';
          });
          
          daysGrid.appendChild(dayCell);
        }
      };
      
      // Helper to format date for comparison
      const formatDateForComparison = (date) => {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      };
      
      // Helper to check if same day
      const isSameDay = (date1, date2) => {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
      };
      
      // Update selected date
      const updateSelectedDate = () => {
        // Update display and hidden input
        if (selectedDate) {
          const formattedDate = `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
          displayInput.value = formattedDate;
          hiddenInput.value = formatDateForComparison(selectedDate);
          
          // Update the month and year dropdowns to match selected date
          monthSelect.value = selectedDate.getMonth();
          yearSelect.value = selectedDate.getFullYear();
        }
      };
      
      // Initialize calendar
      updateCalendar();
    };
    
    // Initialize date picker after DOM is fully loaded
    setTimeout(initDatePicker, 0);
    
    document.getElementById('register-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const dobInput = document.getElementById('reg-dob').value;
      if (!dobInput) {
        alert("Please select your date of birth.");
        return;
      }
      
      const dob = new Date(dobInput);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      if (age < 0 || age > 125) {
        alert("Please enter a valid date of birth.");
        return;
      }
      const gender = document.getElementById('reg-gender').value;
      if (gender !== "Male" && gender !== "Female") {
        alert("Please select a gender from the dropdown menu.");
        return;
      }
      
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-password-confirm').value;
      
      if (password !== confirmPassword) {
        alert("Passwords do not match. Please try again.");
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
          const errorMessage = await res.text();
          alert("Registration failed. " + errorMessage);
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