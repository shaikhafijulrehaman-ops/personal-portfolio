// admin-js/api.js

export const token = localStorage.getItem("admin_token");

// Toast Alerts helper
export function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Global API Request Helper
export async function apiRequest(url, options = {}) {
    const headers = options.headers || {};
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    
    const fetchOptions = {
        ...options,
        headers
    };
    
    try {
        const res = await fetch(url, fetchOptions);
        
        // Handle unauthorized session logs
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("admin_token");
            showToast("Session expired. Redirecting to login...", "error");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
            throw new Error("Unauthorized");
        }
        
        const contentType = res.headers.get("content-type");
        if (res.ok) {
            if (contentType && contentType.includes("application/json")) {
                return await res.json();
            }
            return { success: true };
        } else {
            let errMsg = "Operation failed";
            if (contentType && contentType.includes("application/json")) {
                const errData = await res.json();
                errMsg = errData.error || errMsg;
            }
            throw new Error(errMsg);
        }
    } catch (err) {
        if (err.message !== "Unauthorized") {
            console.error(`API Error on ${url}:`, err);
            showToast(err.message || "Network error occurred", "error");
        }
        throw err;
    }
}
