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
let chatLastMessages = {}; // Store the last message for each chat user
let chatUserStatus = {}; // Store user online status

// Show main view
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
    <div id="post-comments-modal" class="modal" style="display:none;">
      <div class="modal-content">
        <span id="close-comments" class="close" style="cursor:pointer;">×</span>
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
  document.getElementById('post-content').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('post-form').dispatchEvent(new Event('submit'));
    }
  });
  document.getElementById('close-comments').addEventListener('click', closeCommentsModal);
  loadPosts();
  document.getElementById('chat-sidebar').style.display = 'flex';
  initChatSidebar();
}

// Periodic updates with stored reference
window.postsInterval = setInterval(function () {
  if (currentUser) {
    loadPosts();
  }
}, 2000);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', checkSession);