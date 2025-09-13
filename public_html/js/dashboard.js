// js/dashboard.js

import { updateCartHeader } from './cart_updater.js';
import { initializeCartView } from './cart_view_handler.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js'; // <-- AÑADIDO
import { initializeModals } from './modal_handler.js';             // <-- AÑADIDO

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('dashboard-menu-toggle');
    const sidemenu = document.getElementById('dashboard-sidemenu');




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
    // Lógica para el menú lateral del dashboard
    if (menuToggle && sidemenu) {
        menuToggle.addEventListener('click', () => {
            sidemenu.classList.toggle('active');
        });
    }

    // --- LÓGICA DEL CARRITO Y OTROS MÓDULOS (AÑADIDA AL DASHBOARD) ---
    
    // 1. Actualiza el total en el header al cargar la página.
    updateCartHeader();

    // 2. Inicializa la lógica para abrir/cerrar el panel del carrito.
    initializeCartView();

    // 3. Inicializa los contadores de cantidad para que funcionen dentro del panel del carrito.
    //    Esto soluciona el problema de que al disminuir a 0, el producto no se eliminaba.
    initializeQuantityHandlers();

    // 4. Inicializa el manejador de favoritos para los botones de corazón.
    initializeFavoritesHandler(); // <-- AÑADIDO

    // 5. Inicializa los modales (ej. para pedir inicio de sesión al usar favoritos sin sesión).
    initializeModals(); // <-- AÑADIDO
});