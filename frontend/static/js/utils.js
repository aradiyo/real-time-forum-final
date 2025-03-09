// Debounce function to throttle events
function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Convert a string to Title Case
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  
  // Format date string nicely
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // For messages in chat window, show full date and time
    if (arguments.length > 1 && arguments[1] === 'full') {
      return date.toLocaleString();
    }
    
    // For message previews in sidebar (Discord-like)
    if (diffDays === 0) {
      // Today - show only time
      return 'Today at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else if (diffDays < 7) {
      // Last week - show day name
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    } else {
      // Older - show date
      return date.toLocaleDateString();
    }
  }
  
  // API helper function; ensures array is returned for list endpoints
  async function api(path, options = {}) {
    options.credentials = 'include';
    const res = await fetch(path, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    const data = await res.json().catch(() => ([]));
    return Array.isArray(data) ? data : data;
  }