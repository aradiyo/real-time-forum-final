// Load all posts
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
  
  // Create a new post
  async function createPost(e) {
    e.preventDefault();
    const category = document.getElementById('post-category').value;
    const content = document.getElementById('post-content').value;
    const post = { user_id: currentUser.id, category, content };
    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
      if (!res.ok) {
        const err = await res.text();
        return;
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
      // Suppress error for first post creation
    }
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
    allTab.className = currentCategory === "All" ? "active" : "";
    allTab.addEventListener("click", () => {
      currentCategory = "All";
      renderPosts(allPosts);
      buildCategoryTabs(allPosts);
    });
    tabContainer.appendChild(allTab);
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.textContent = cat;
      btn.className = currentCategory === cat ? "active" : "";
      btn.addEventListener("click", () => {
        currentCategory = cat;
        renderPosts(allPosts);
        buildCategoryTabs(allPosts);
      });
      tabContainer.appendChild(btn);
    });
  }
  
  // Render posts filtered by category
  function renderPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = "";
    let filtered = posts;
    if (currentCategory !== "All") {
      filtered = posts.filter(post => post.category === currentCategory);
    }
    if (!filtered || filtered.length === 0) {
      container.innerHTML = `<p class="empty-state">There are no posts yet. Please create one!</p>`;
      return;
    }
    filtered.forEach(post => {
      const postDiv = document.createElement('div');
      postDiv.className = 'post';
      
      // Format the date for better display
      const postDate = formatDate(post.created_at, 'full');
      
      postDiv.innerHTML = `
        <div class="post-header">
          <h3>${post.category}</h3>
          <div class="post-meta">
            <span class="post-author">By: ${toTitleCase(post.nickname)}</span>
            <span class="post-date">${postDate}</span>
          </div>
        </div>
        <div class="post-content">${post.content}</div>
        <div class="post-actions">
          <button data-post-id="${post.id}" class="view-comments-btn">View Comments</button>
        </div>
      `;
      container.appendChild(postDiv);
    });
    document.querySelectorAll('.view-comments-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const postId = this.getAttribute('data-post-id');
        showComments(postId);
      });
    });
  }