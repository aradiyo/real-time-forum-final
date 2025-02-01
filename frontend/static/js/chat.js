document.addEventListener("DOMContentLoaded", () => {
    const chatList = document.getElementById("conversationsList");
    const chatMessages = document.getElementById("chatMessages");
    const messageForm = document.getElementById("messageForm");
    const messageInput = document.getElementById("messageInput");
    let ws;

    function connectWebSocket() {
        const userId = localStorage.getItem("sessionToken");
        if (!userId) return;

        ws = new WebSocket(`ws://localhost:8080/api/chat?sender_id=${userId}`);

        ws.onmessage = event => {
            const message = JSON.parse(event.data);
            renderMessage(message);
        };
    }

    function renderMessage(message) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.innerHTML = `<strong>${message.sender_id}:</strong> ${message.content} <small>${message.created_at}</small>`;
        chatMessages.appendChild(messageElement);
    }

    async function sendMessage(event) {
        event.preventDefault();
        const message = {
            sender_id: localStorage.getItem("sessionToken"),
            receiver_id: "2", // Replace with selected user ID
            content: messageInput.value
        };

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            messageInput.value = "";
        }
    }

    messageForm.addEventListener("submit", sendMessage);
    connectWebSocket();
});