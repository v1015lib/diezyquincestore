// EN: public_html/js/main.js

import { loadProducts, currentProductParams } from './ajax/product_loader.js';
import { initializeSearch } from './ajax/search_handler.js';
import { setupMobileMenu } from './mobile_menu.js';
import { initializeCartView } from './cart_view_handler.js';
import { updateCartHeader } from './cart_updater.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js';
import { showLoginPrompt, initializeModals } from './modal_handler.js';
import { initializeCarousel } from './carrousel.js';
import { initializeProductCarousels } from './product_carousel_handler.js';
import { initializeShareHandler } from './share_handler.js';
import { initializeCookieBanner } from './cookie_handler.js';
import { initializePushNotifications } from './push_manager.js';

const API_BASE_URL = 'api/index.php';
// Se quita la llamada de aquí para moverla adentro.

initializeCookieBanner(); // El banner de cookies sí puede ir aquí.

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización de todos los módulos
    initializeShareHandler();
    setupMobileMenu();
    loadDepartments();
    initializeCartView();
    updateCartHeader();
    initializeQuantityHandlers();
    initializeFavoritesHandler();
    initializeModals(); 
    initializeCarousel('.carousel-container');
    initializeProductCarousels();

    // --- INICIO DE LA CORRECCIÓN ---
    // Verificamos si existe un enlace a "Mi Cuenta", lo que indica que el usuario inició sesión.
    const isLoggedIn = document.querySelector('a[href="dashboard.php"]');
    if (isLoggedIn) {
        // Si el usuario SÍ ha iniciado sesión, llamamos a la función aquí.
        // Esto asegura que solo los usuarios registrados reciban la solicitud de permiso.
        console.log("Usuario logueado, inicializando notificaciones PUSH...");
        initializePushNotifications();
    }
    // --- FIN DE LA CORRECCIÓN ---

    // El resto de tu código para cargar productos no cambia...
    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get('search');
    const productIdFromUrl = urlParams.get('product_id');

    if (productIdFromUrl) {
        document.querySelectorAll('.product-carousel-section, .product-list-controls').forEach(el => el.style.display = 'none');
        loadProducts('product-list', 'pagination-controls', {
            apiBaseUrl: API_BASE_URL,
            product_id: productIdFromUrl,
            hide_no_image: layoutSettings.hide_products_without_image
        });
    } 
    else if (searchTermFromUrl) {
        document.getElementById('search-input').value = searchTermFromUrl;
        loadProducts('product-list', 'pagination-controls', {
            apiBaseUrl: API_BASE_URL,
            search: searchTermFromUrl,
            hide_no_image: layoutSettings.hide_products_without_image
        });
    } 
    else {    
        loadProducts('product-list', 'pagination-controls', {
            sortBy: 'random',
            apiBaseUrl: API_BASE_URL,
            hide_no_image: layoutSettings.hide_products_without_image
        });
    }
    initializeSearch('search-input', 'search-button', 'product-list', 'pagination-controls', API_BASE_URL);

    const sortBySelect = document.getElementById('sort-by');
    if (sortBySelect) {
        sortBySelect.addEventListener('change', () => {
            const [sortBy, order] = sortBySelect.value.split('-');
            const paramsToPreserve = {
                search: currentProductParams.search || null,
                department_id: currentProductParams.department_id || null,
                ofertas: currentProductParams.ofertas || null,
                hide_no_image: layoutSettings.hide_products_without_image 
            };
            loadProducts('product-list', 'pagination-controls', {
                ...paramsToPreserve,
                sort_by: sortBy,
                order: order || 'asc',
                page: 1,
                apiBaseUrl: API_BASE_URL,
                shouldScroll: true
            });
        });
    }

    document.getElementById('sidemenu').addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.department-link')) {
            event.preventDefault();

            document.querySelectorAll('.department-link').forEach(link => {
                link.classList.remove('active');
            });
            target.classList.add('active');
            const departmentId = target.dataset.departmentId;
            let params = { 
                page: 1, 
                apiBaseUrl: API_BASE_URL, 
                shouldScroll: true,
                hide_no_image: layoutSettings.hide_products_without_image
            };
            if (departmentId !== 'all') {
                params.department_id = departmentId;
            } else {
                params.department_id = null;
                params.sortBy = 'random';
            }
            loadProducts('product-list', 'pagination-controls', params);
            document.getElementById('sidemenu').classList.remove('active');
        }
    });
});

export async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=departments`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const departments = await response.json();
        const sidemenuUl = document.querySelector('#sidemenu nav ul');
        if (!sidemenuUl) return;
        sidemenuUl.querySelectorAll('li:not(:first-child)').forEach(li => li.remove());
        if (Array.isArray(departments)) {
            departments.forEach(dept => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="index.php?department_id=${dept.id_departamento}" class="department-link" data-department-id="${dept.id_departamento}">${dept.departamento}</a>`;
                sidemenuUl.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
    }
}