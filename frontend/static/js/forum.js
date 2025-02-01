document.addEventListener("DOMContentLoaded", () => {
    const postList = document.getElementById("postsList");
    const postForm = document.getElementById("postForm");
    const postModal = document.getElementById("postModal");
    const closeModal = document.getElementById("closeModal");

    async function fetchPosts() {
        const response = await fetch("/api/posts");
        if (response.ok) {
            const posts = await response.json();
            postList.innerHTML = "";
            posts.forEach(post => {
                const postElement = document.createElement("div");
                postElement.classList.add("post-card");
                postElement.innerHTML = `
                    <h3>${post.category}</h3>
                    <p>${post.content}</p>
                    <p><strong>By:</strong> User ${post.user_id}</p>
                    <button class="comment-btn" data-post-id="${post.id}">View Comments</button>
                `;
                postList.appendChild(postElement);
            });
        }
    }

    async function createPost(event) {
        event.preventDefault();
        const post = {
            user_id: localStorage.getItem("sessionToken"),
            category: document.getElementById("postCategory").value,
            content: document.getElementById("postContent").value
        };

        const response = await fetch("/api/posts/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(post)
        });

        if (response.ok) {
            alert("Post created successfully");
            postModal.classList.remove("active");
            fetchPosts();
        } else {
            alert("Failed to create post");
        }
    }

    postForm.addEventListener("submit", createPost);
    closeModal.addEventListener("click", () => postModal.classList.remove("active"));
    document.getElementById("newPostBtn").addEventListener("click", () => postModal.classList.add("active"));

    fetchPosts();
});