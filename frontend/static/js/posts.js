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
  
  // Render posts filtered by category
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
      btn.addEventListener('click', function () {
        const postId = this.getAttribute('data-post-id');
        showComments(postId);
      });
    });
  }