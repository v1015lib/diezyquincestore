// public_html/js/dashboard.js

import { updateCartHeader } from './cart_updater.js';
import { initializeCartView } from './cart_view_handler.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js';
import { initializeModals } from './modal_handler.js';
import { initializePushNotifications } from './push_manager.js';
// --- INICIO DE LA CORRECCIÓN ---
import { initializeShareHandler } from './share_handler.js'; // Se importa el manejador de "compartir"
// --- FIN DE LA CORRECCIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    initializePushNotifications();
    const menuToggle = document.getElementById('dashboard-menu-toggle');
    const sidemenu = document.getElementById('dashboard-sidemenu');

    // --- INICIO DE LA CORRECCIÓN ---
    initializeShareHandler(); // Se inicializa aquí para que funcione en todas las vistas del dashboard
    // --- FIN DE LA CORRECCIÓN ---

    const updateNotificationBadge = async () => {
        const badge = document.getElementById('notification-count-badge');
        if (!badge) return;

        try {
            const response = await fetch('api/index.php?resource=notifications/unread-count');
            const result = await response.json();
            if (result.success && result.count > 0) {
                badge.textContent = result.count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        } catch (error) {
            console.error('Error al obtener contador de notificaciones.');
        }
    };

    updateNotificationBadge();
    
    if (menuToggle && sidemenu) {
        menuToggle.addEventListener('click', () => {
            sidemenu.classList.toggle('active');
        });
    }

    updateCartHeader();
    initializeCartView();
    initializeQuantityHandlers();
    initializeFavoritesHandler();
    initializeModals();
});