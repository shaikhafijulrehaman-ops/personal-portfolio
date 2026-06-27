(function() {
    let navSettings = null;
    let fabContainer = null;
    let overlayElement = null;

    async function initMobileNav() {
        // Only run on mobile viewport (<= 768px)
        if (window.innerWidth > 768) {
            removeMobileNav();
            return;
        }

        if (fabContainer) return; // already initialized

        try {
            const apiBase = window.API_BASE_URL || '';
            const res = await fetch(`${apiBase}/api/settings/mobile-nav`);
            if (!res.ok) throw new Error("Failed to load Mobile Navigation settings");
            navSettings = await res.json();
            
            if (!navSettings || !navSettings.is_enabled) {
                return;
            }

            renderMobileNav();
        } catch (e) {
            console.error("Error loading Mobile Navigation:", e);
        }
    }

    function removeMobileNav() {
        if (fabContainer) {
            fabContainer.remove();
            fabContainer = null;
        }
        if (overlayElement) {
            overlayElement.remove();
            overlayElement = null;
        }
        const style = document.getElementById('mobile-nav-dynamic-styles');
        if (style) style.remove();
        window.removeEventListener('keydown', handleEscKey);
    }

    function renderMobileNav() {
        // Add dynamic CSS styles to head
        const style = document.createElement('style');
        style.id = 'mobile-nav-dynamic-styles';
        
        const isRight = navSettings.position !== 'bottom-left';
        const positionStyles = isRight 
            ? `bottom: 20px; right: 20px;` 
            : `bottom: 20px; left: 20px;`;

        style.innerHTML = `
            /* FAB Trigger Styles */
            .mobile-nav-fab {
                position: fixed;
                ${positionStyles}
                width: ${navSettings.button_size || 60}px;
                height: ${navSettings.button_size || 60}px;
                border-radius: 50%;
                background: ${navSettings.bg_color || 'linear-gradient(135deg, #3b82f6, #1d4ed8)'};
                border: ${navSettings.border_style || '1px solid rgba(255, 255, 255, 0.2)'};
                box-shadow: ${navSettings.shadow_style || '0 8px 32px 0 rgba(31, 38, 135, 0.3)'};
                color: #ffffff;
                font-size: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10001;
                outline: none;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                padding: 0;
            }

            .mobile-nav-fab:active {
                transform: scale(0.9);
            }

            /* Animations */
            ${navSettings.animation_type === 'pulse' ? `
            .mobile-nav-fab.animate-pulse {
                animation: fabPulse 2s infinite;
            }
            @keyframes fabPulse {
                0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
                70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            }
            ` : ''}

            /* Ripple Effect */
            .mobile-nav-fab .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.4);
                transform: scale(0);
                animation: rippleEffect 0.6s linear;
                pointer-events: none;
            }
            @keyframes rippleEffect {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }

            /* Overlay Styles */
            .mobile-nav-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.45);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.35s ease-in-out;
            }

            .mobile-nav-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            /* Menu Card styling */
            .mobile-nav-menu-card {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 24px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 14px;
                width: 90%;
                max-width: 330px;
                max-height: 80vh;
                overflow-y: auto;
                transform: scale(0.8) translateY(20px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-sizing: border-box;
            }

            .mobile-nav-overlay.active .mobile-nav-menu-card {
                transform: scale(1) translateY(0);
            }

            /* Menu items stack */
            .mobile-nav-menu-item {
                display: flex;
                align-items: center;
                gap: 14px;
                text-decoration: none;
                padding: 10px;
                border-radius: 16px;
                transition: all 0.3s ease;
                box-sizing: border-box;
            }

            .mobile-nav-menu-item:active {
                background: rgba(37, 99, 235, 0.08); /* Blue hover */
            }

            .mobile-nav-item-icon-container {
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: #2563eb;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
                box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
            }

            .mobile-nav-item-text {
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .mobile-nav-item-title {
                font-size: 15px;
                font-weight: 600;
                color: #0f172a;
            }

            .mobile-nav-item-desc {
                font-size: 11px;
                color: #64748b;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);

        // Render FAB trigger button
        fabContainer = document.createElement('button');
        fabContainer.className = `mobile-nav-fab ${navSettings.animation_type === 'pulse' ? 'animate-pulse' : ''}`;
        
        if (navSettings.custom_image_url) {
            fabContainer.innerHTML = `<img src="${navSettings.custom_image_url}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;">`;
        } else {
            fabContainer.innerHTML = `<i class="${navSettings.icon_class || 'fa-solid fa-compass'}"></i>`;
        }

        // Render overlay navigation card
        overlayElement = document.createElement('div');
        overlayElement.className = 'mobile-nav-overlay';

        const card = document.createElement('div');
        card.className = 'mobile-nav-menu-card';

        // Add each enabled navigation item
        const activeItems = (navSettings.menu_items || []).filter(item => item.is_enabled);
        activeItems.forEach(item => {
            const a = document.createElement('a');
            a.className = 'mobile-nav-menu-item';
            a.href = item.url;
            
            if (item.target_type === 'link') {
                a.target = '_blank';
            }

            a.innerHTML = `
                <div class="mobile-nav-item-icon-container">
                    <i class="${item.icon_class}"></i>
                </div>
                <div class="mobile-nav-item-text">
                    <span class="mobile-nav-item-title">${item.label}</span>
                    ${item.description ? `<span class="mobile-nav-item-desc">${item.description}</span>` : ''}
                </div>
            `;

            a.addEventListener('click', (e) => {
                // Close overlay
                closeOverlay();

                if (item.target_type === 'scroll') {
                    e.preventDefault();
                    const targetEl = document.querySelector(item.url);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });

            card.appendChild(a);
        });

        overlayElement.appendChild(card);
        document.body.appendChild(overlayElement);
        document.body.appendChild(fabContainer);

        // Click ripple effect
        fabContainer.addEventListener('click', (e) => {
            createRipple(e);
            toggleOverlay();
        });

        // Click outside close
        overlayElement.addEventListener('click', (e) => {
            if (e.target === overlayElement) {
                closeOverlay();
            }
        });

        // ESC close
        window.addEventListener('keydown', handleEscKey);
    }

    function createRipple(e) {
        const fab = fabContainer;
        const circle = document.createElement('span');
        const diameter = Math.max(fab.clientWidth, fab.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - fab.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${e.clientY - fab.getBoundingClientRect().top - radius}px`;
        circle.className = 'ripple';

        const oldRipple = fab.querySelector('.ripple');
        if (oldRipple) {
            oldRipple.remove();
        }

        fab.appendChild(circle);
    }

    function toggleOverlay() {
        const isActive = overlayElement.classList.toggle('active');
        if (isActive) {
            fabContainer.classList.remove('animate-pulse');
        } else {
            if (navSettings.animation_type === 'pulse') fabContainer.classList.add('animate-pulse');
        }
    }

    function closeOverlay() {
        if (overlayElement) {
            overlayElement.classList.remove('active');
            if (navSettings.animation_type === 'pulse' && fabContainer) {
                fabContainer.classList.add('animate-pulse');
            }
        }
    }

    function handleEscKey(e) {
        if (e.key === 'Escape') {
            closeOverlay();
        }
    }

    // Lazy load responsive checks
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
    window.addEventListener('resize', initMobileNav);
})();
