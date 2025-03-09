// Show comments modal
async function showComments(postId) {
    currentPostId = postId;
    const modal = document.getElementById('post-comments-modal');
    if (!modal) {
      // Silently handle the error instead of logging to console
      return;
    }
    modal.style.display = 'flex';
    loadComments();
    if (commentInterval) clearInterval(commentInterval);
    commentInterval = setInterval(loadComments, 2000);
    setTimeout(() => {
      const commentInput = document.getElementById('comment-content');
      if (commentInput) commentInput.focus();
    }, 100);
  }
  
  // Load comments for a post
  async function loadComments() {
    const commentsContainer = document.getElementById('comments-container');
    try {
      let comments = await api(`/api/comments?post_id=${currentPostId}`);
      if (!Array.isArray(comments) || comments.length === 0) {
        commentsContainer.innerHTML = '<p class="empty-state">Be the first to comment on this post!</p>';
      } else {
        commentsContainer.innerHTML = '';
        comments.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.className = 'comment';
          const displayName = comment.nickname ? toTitleCase(comment.nickname) : comment.user_id;
          commentDiv.innerHTML = `
            <div class="meta">
              <strong>${displayName}</strong> 
              <span class="comment-date">${formatDate(comment.created_at, 'full')}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
          `;
          commentsContainer.appendChild(commentDiv);
        });
      }
      document.getElementById('comment-form').onsubmit = async function (e) {
        e.preventDefault();
        const content = document.getElementById('comment-content').value;
        const comment = { post_id: currentPostId, user_id: currentUser.id, content };
        const res = await fetch('/api/comments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comment)
        });
        if (!res.ok) {
          const err = await res.text();
          alert("Unable to post your comment. Please try again or check if you're still logged in.");
          return;
        }
        document.getElementById('comment-form').reset();
        loadComments();
      };
      const commentInput = document.getElementById('comment-content');
      if (commentInput && !commentInput.hasAttribute('data-listener')) {
        commentInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('comment-form').dispatchEvent(new Event('submit'));
          }
        });
        commentInput.setAttribute('data-listener', 'true');
      }
    } catch (error) {
      commentsContainer.innerHTML = '<p>Unable to load comments. Please try again later.</p>';
    }
  }
  
  // Close comments modal
  function closeCommentsModal() {
    document.getElementById('post-comments-modal').style.display = 'none';
    if (commentInterval) {
      clearInterval(commentInterval);
      commentInterval = null;
    }
  }