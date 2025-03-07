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
    return date.toLocaleString();
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