document.addEventListener("DOMContentLoaded", () => {
    const authSection = document.getElementById("authSection");
    const mainContent = document.getElementById("mainContent");

    function checkLoginStatus() {
        fetch("/api/health")
            .then(response => {
                if (response.ok) {
                    authSection.classList.add("hidden");
                    mainContent.classList.remove("hidden");
                }
            })
            .catch(() => {
                authSection.classList.remove("hidden");
                mainContent.classList.add("hidden");
            });
    }

    checkLoginStatus();
});