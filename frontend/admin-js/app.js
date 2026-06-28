// admin-js/app.js
import { token, apiRequest, showToast } from './api.js';
import { lazyLoaders } from './modules.js';

// Global check: if no token, redirect immediately
if (!token) {
    window.location.href = "login.html";
} else {
    // DOM Selectors
    const menuItems = document.querySelectorAll(".sidebar-menu li");
    const modules = document.querySelectorAll(".dashboard-module");
    const moduleTitle = document.getElementById("module-title");
    const moduleSubtitle = document.getElementById("module-subtitle");

    const moduleMeta = {
        dashboard: { title: "Dashboard", subtitle: "Overview of your portfolio metrics and database entries." },
        hero: { title: "Hero Section Settings", subtitle: "Manage the hero banner details, text spacing, and taglines." },
        about: { title: "About Me Settings", subtitle: "Update B.Tech details, current year, CGPA, and your profile bio." },
        skills: { title: "Skills Management", subtitle: "Insert, edit, delete, or drag-and-drop to reorder frontend/backend skills." },
        projects: { title: "Projects Management", subtitle: "Configure featured project cards, technology tags, and details." },
        timeline: { title: "Timeline Settings", subtitle: "Add education and professional experience nodes to your vertical timeline." },
        certifications: { title: "Certifications", subtitle: "Manage horizontal scrolling certifications slider listings." },
        contact: { title: "Contact Settings", subtitle: "Update email, location, phone, and direct messaging socials." },
        seo: { title: "SEO Settings", subtitle: "Configure Open Graph metadata, titles, keywords, and search tags." },
        media: { title: "Media Manager", subtitle: "Manage your portfolio graphics assets. Upload files directly." },
        backgrounds: { title: "Background Manager", subtitle: "Configure dynamic image or video backgrounds for each page section." },
        resume: { title: "Resume Settings", subtitle: "Upload or replace your resume PDF file for download actions." },
        uxi: { title: "UXI Startup Settings", subtitle: "Configure General Startup Info, Team Members, and UXI Projects." },
        mobilenav: { title: "Mobile Navigation Settings", subtitle: "Configure dynamic compact mobile headers and floating nav buttons." },
        settings: { title: "Settings", subtitle: "Configure dynamic favicons, admin credentials, database backups, and data exports." },
        activity: { title: "Activity Log", subtitle: "Inspect administrator events, modifications, uploads, and publish actions." }
    };

    const loadedModules = new Set();

    // Trigger lazy loading
    async function triggerLazyLoad(moduleName, forceReload = false) {
        if (lazyLoaders[moduleName] && (!loadedModules.has(moduleName) || forceReload)) {
            showModuleSkeleton(moduleName);
            try {
                await lazyLoaders[moduleName]();
                loadedModules.add(moduleName);
                hideModuleSkeleton(moduleName);
            } catch (e) {
                console.error(`Failed to load module "${moduleName}":`, e);
                hideModuleSkeleton(moduleName);
            }
        }
    }
    window.triggerLazyLoad = triggerLazyLoad;

    // Skeletons overlays managers
    function showModuleSkeleton(moduleId) {
        const moduleEl = document.getElementById(`module-${moduleId}`);
        if (!moduleEl) return;
        const card = moduleEl.querySelector('.admin-card');
        if (!card) return;
        
        let skeleton = moduleEl.querySelector('.module-skeleton-loader');
        if (!skeleton) {
            skeleton = document.createElement('div');
            skeleton.className = 'module-skeleton-loader';
            skeleton.style = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(11,15,25,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;border-radius:16px;z-index:999;';
            skeleton.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                    <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.05);border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;"></div>
                    <span style="font-size:12px;color:var(--text-muted);">Syncing portfolio database...</span>
                </div>
            `;
            card.style.position = 'relative';
            card.appendChild(skeleton);
        }
        skeleton.style.display = 'flex';
    }

    function hideModuleSkeleton(moduleId) {
        const moduleEl = document.getElementById(`module-${moduleId}`);
        if (!moduleEl) return;
        const skeleton = moduleEl.querySelector('.module-skeleton-loader');
        if (skeleton) {
            skeleton.style.display = 'none';
        }
    }

    // Inactivity session timer
    let inactivityTimer;
    function setupInactivityTimer(minutes) {
        clearTimeout(inactivityTimer);
        const timeoutMs = minutes * 60 * 1000;
        
        function resetTimer() {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                showToast("Session expired due to inactivity. Redirecting to login...", "error");
                localStorage.removeItem("admin_token");
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            }, timeoutMs);
        }
        
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
            document.removeEventListener(evt, resetTimer, true);
            document.addEventListener(evt, resetTimer, true);
        });
        resetTimer();
    }
    setupInactivityTimer(30); // Default fallback timer

    // Handle navigation
    function handleHashRoute() {
        const hash = window.location.hash.replace('#', '');
        const validModules = Object.keys(lazyLoaders);
        const targetMod = (hash && validModules.includes(hash)) ? hash : 'dashboard';
        
        const targetItem = document.querySelector(`.sidebar-menu li[data-module="${targetMod}"]`);
        if (targetItem) {
            menuItems.forEach(i => i.classList.remove("active"));
            modules.forEach(m => m.classList.remove("active"));
            
            targetItem.classList.add("active");
            const modEl = document.getElementById(`module-${targetMod}`);
            if (modEl) modEl.classList.add("active");
            
            if (moduleTitle && moduleMeta[targetMod]) {
                moduleTitle.textContent = moduleMeta[targetMod].title;
                moduleSubtitle.textContent = moduleMeta[targetMod].subtitle;
            }
            return targetMod;
        }
        return 'dashboard';
    }

    // Load initial tab instantly
    const initialTab = handleHashRoute();
    triggerLazyLoad(initialTab);

    // Browser navigation Back/Forward hash change sync
    window.addEventListener('hashchange', () => {
        const activeTab = handleHashRoute();
        triggerLazyLoad(activeTab);
    });

    // Sidebar navigation click switcher
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            const activeMod = item.getAttribute("data-module");
            window.location.hash = activeMod; // triggers hashchange event automatically
        });
    });

    // Silent background authentication session validity check
    apiRequest('/api/auth/me')
        .then(data => {
            if (data && data.session_timeout) {
                setupInactivityTimer(data.session_timeout);
            }
            console.log("Session verified silently in background.");
        })
        .catch(err => {
            console.warn("Background authentication check failed (offline fallback active):", err);
        });

    // Sign out button handler
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("admin_token");
            window.location.href = "login.html";
        });
    }
}
