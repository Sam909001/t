// notificationManager.js
window.NotificationManager = {
    init() {
        console.log("✅ NotificationManager initialized");

        // Ensure containers exist
        if (!document.getElementById("toast")) {
            const toast = document.createElement("div");
            toast.id = "toast";
            toast.style.position = "fixed";
            toast.style.top = "1rem";
            toast.style.right = "1rem";
            toast.style.zIndex = "9999";
            document.body.appendChild(toast);
        }
    },

    showAlert(message, type = "info") {
        const container = document.getElementById("toast");
        if (!container) return;

        const alert = document.createElement("div");
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.padding = "10px";
        alert.style.marginTop = "5px";
        alert.style.borderRadius = "4px";
        alert.style.color = "white";
        alert.style.fontFamily = "sans-serif";

        // Color by type
        switch (type) {
            case "success": alert.style.background = "#2ecc71"; break;
            case "error": alert.style.background = "#e74c3c"; break;
            case "warning": alert.style.background = "#f39c12"; break;
            default: alert.style.background = "#3498db";
        }

        container.appendChild(alert);

        // Auto remove after 3s
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }
};
