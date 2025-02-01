document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const logoutBtn = document.getElementById("navLogout");
    const currentUserDisplay = document.getElementById("currentUser");

    async function login(event) {
        event.preventDefault();
        const identifier = document.getElementById("loginIdentifier").value;
        const password = document.getElementById("loginPassword").value;

        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("sessionToken", data.token);
            alert("Login successful");
            window.location.reload();
        } else {
            alert("Login failed. Check your credentials.");
        }
    }

    async function register(event) {
        event.preventDefault();
        const user = {
            nickname: document.getElementById("regNickname").value,
            email: document.getElementById("regEmail").value,
            password: document.getElementById("regPassword").value,
            firstName: document.getElementById("regFirstName").value,
            lastName: document.getElementById("regLastName").value,
            age: document.getElementById("regAge").value,
            gender: document.getElementById("regGender").value
        };

        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user)
        });

        if (response.ok) {
            alert("Registration successful! You can now login.");
            window.location.reload();
        } else {
            alert("Registration failed. Try again.");
        }
    }

    async function logout() {
        localStorage.removeItem("sessionToken");
        const response = await fetch("/api/logout", { method: "POST" });
        if (response.ok) {
            alert("Logged out successfully.");
            window.location.reload();
        }
    }

    loginForm.addEventListener("submit", login);
    registerForm.addEventListener("submit", register);
    logoutBtn.addEventListener("click", logout);
});