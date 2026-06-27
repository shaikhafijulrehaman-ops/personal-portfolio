(function() {
    let fabSettings = null;
    let fabContainer = null;

    async function initFAB() {
        // Only run on mobile viewport (<= 768px)
        if (window.innerWidth > 768) {
            removeFAB();
            return;
        }

        if (fabContainer) return; // already initialized

        try {
            const apiBase = window.API_BASE_URL || '';
            const res = await fetch(`${apiBase}/api/settings/fab`);
            if (!res.ok) throw new Error("Failed to load FAB settings");
            fabSettings = await res.json();
            
            if (!fabSettings || !fabSettings.is_enabled) {
                return;
            }

            renderFAB();
        } catch (e) {
            console.error("Error loading Mobile FAB:", e);
        }
    }

    function removeFAB() {
        if (fabContainer) {
            fabContainer.remove();
            fabContainer = null;
            // Remove CSS styles if present
            const style = document.getElementById('mobile-fab-styles');
            if (style) style.remove();
        }
    }

    function renderFAB() {
        // Create container
        fabContainer = document.createElement('div');
        fabContainer.id = 'mobile-fab-container';
        
        // CSS Styles for FAB and menu
        const style = document.createElement('style');
        style.id = 'mobile-fab-styles';
        style.innerHTML = `
            #mobile-fab-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 15px;
                font-family: 'Outfit', 'Inter', sans-serif;
            }

            /* Main Button styling */
            .mobile-fab-trigger {
                width: ${fabSettings.button_size || 60}px;
                height: ${fabSettings.button_size || 60}px;
                border-radius: ${fabSettings.border_radius || 50}%;
                background: ${fabSettings.bg_color || '#2563eb'};
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #ffffff;
                font-size: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
                z-index: 10;
                outline: none;
                padding: 0;
            }

            .mobile-fab-trigger:active {
                transform: scale(0.9);
            }

            /* Glow effect */
            ${fabSettings.glow_effect ? `
            .mobile-fab-trigger {
                box-shadow: 0 0 20px ${fabSettings.bg_color || '#2563eb'}80, 0 8px 32px 0 rgba(31, 38, 135, 0.3);
            }
            ` : ''}

            /* Animations */
            ${fabSettings.animation_type === 'pulse' ? `
            .mobile-fab-trigger.animate-pulse {
                animation: fabPulse 2s infinite;
            }
            @keyframes fabPulse {
                0% { box-shadow: 0 0 0 0 ${fabSettings.bg_color || '#2563eb'}99; }
                70% { box-shadow: 0 0 0 15px ${fabSettings.bg_color || '#2563eb'}00; }
                100% { box-shadow: 0 0 0 0 ${fabSettings.bg_color || '#2563eb'}00; }
            }
            ` : ''}

            /* Menu items stack styling */
            .mobile-fab-menu {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 12px;
                visibility: hidden;
                pointer-events: none;
                opacity: 0;
                transform: translateY(20px) scale(0.8);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .mobile-fab-menu.active {
                visibility: visible;
                pointer-events: auto;
                opacity: 1;
                transform: translateY(0) scale(1);
            }

            .mobile-fab-item {
                display: flex;
                align-items: center;
                gap: 10px;
                text-decoration: none;
                opacity: 0;
                transform: translateY(15px);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .mobile-fab-menu.active .mobile-fab-item {
                opacity: 1;
                transform: translateY(0);
            }

            .mobile-fab-item-label {
                background: rgba(15, 23, 42, 0.85);
                color: #ffffff;
                padding: 6px 12px;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 500;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(4px);
                white-space: nowrap;
            }

            .mobile-fab-item-button {
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background: rgba(30, 41, 59, 0.75);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 17px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                transition: all 0.2s ease;
            }

            .mobile-fab-item-button:active {
                transform: scale(0.9);
                background: ${fabSettings.bg_color || '#2563eb'};
            }

            /* Rotations for the trigger icon when active */
            .mobile-fab-trigger i {
                transition: transform 0.3s ease;
            }
            .mobile-fab-trigger.active i {
                transform: rotate(135deg);
            }
        `;
        document.head.appendChild(style);

        // Build Trigger HTML
        const trigger = document.createElement('button');
        trigger.className = `mobile-fab-trigger ${fabSettings.animation_type === 'pulse' ? 'animate-pulse' : ''}`;
        
        if (fabSettings.custom_image_url) {
            trigger.innerHTML = `<img src="${fabSettings.custom_image_url}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;">`;
        } else {
            trigger.innerHTML = `<i class="${fabSettings.icon_class || 'fa-solid fa-bars'}"></i>`;
        }

        // Build Menu HTML
        const menu = document.createElement('div');
        menu.className = 'mobile-fab-menu';

        // Render each menu item
        (fabSettings.menu_items || []).forEach((item, index) => {
            const a = document.createElement('a');
            a.className = 'mobile-fab-item';
            a.href = item.url;
            a.target = '_blank';
            a.style.transitionDelay = `${index * 50}ms`; // staggered spring animation delay

            a.innerHTML = `
                <span class="mobile-fab-item-label">${item.label}</span>
                <div class="mobile-fab-item-button">
                    <i class="${item.icon_class}"></i>
                </div>
            `;

            a.addEventListener('click', () => {
                // Auto close menu after selection
                menu.classList.remove('active');
                trigger.classList.remove('active');
                if (fabSettings.animation_type === 'pulse') trigger.classList.add('animate-pulse');
            });

            menu.appendChild(a);
        });

        // Toggle action
        trigger.addEventListener('click', () => {
            const isActive = menu.classList.toggle('active');
            trigger.classList.toggle('active');
            
            if (isActive) {
                trigger.classList.remove('animate-pulse');
            } else {
                if (fabSettings.animation_type === 'pulse') trigger.classList.add('animate-pulse');
            }
        });

        // Append to container
        fabContainer.appendChild(menu);
        fabContainer.appendChild(trigger);
        document.body.appendChild(fabContainer);
    }

    // Initialize on load and resize
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initFAB);
    } else {
        initFAB();
    }
    window.addEventListener('resize', initFAB);
})();
