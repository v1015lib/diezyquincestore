    // public_html/js/pageuniquecontent.js

import { loadProducts } from './ajax/product_loader.js';
import { initializeSearch } from './ajax/search_handler.js';
import { setupMobileMenu } from './mobile_menu.js';
import { initializeCartView } from './cart_view_handler.js';
import { updateCartHeader } from './cart_updater.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js';
import { initializeModals } from './modal_handler.js';
// --- INICIO: CÓDIGO AÑADIDO ---
import { loadDepartments } from './main.js'; // Importamos la función desde main.js
import { initializeShareHandler } from './share_handler.js'; 
// --- FIN: CÓDIGO AÑADIDO ---

const API_BASE_URL = 'api/index.php'; 

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa todos los módulos comunes
    setupMobileMenu();
    initializeCartView();
    updateCartHeader();
    initializeQuantityHandlers();
    initializeFavoritesHandler();
    initializeModals();
    initializeSearch('search-input', 'search-button', 'product-list', 'pagination-controls', API_BASE_URL);
    initializeShareHandler(); 

    // --- INICIO: CÓDIGO AÑADIDO ---
    loadDepartments(); // ¡Llamamos a la función para cargar los departamentos aquí!
    // --- FIN: CÓDIGO AÑADIDO ---

    // Carga los productos usando los parámetros definidos en el PHP
    if (typeof productFilterParams !== 'undefined') {
        let params = { 
            ...productFilterParams, // Usa el filtro que viene de la URL
            page: 1, 
            apiBaseUrl: API_BASE_URL 
        };
        loadProducts('product-list', 'pagination-controls', params);
    }
});