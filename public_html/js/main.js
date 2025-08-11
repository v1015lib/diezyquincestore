// js/main.js

import { loadProducts, currentProductParams } from './ajax/product_loader.js';
import { initializeSearch } from './ajax/search_handler.js';
import { setupMobileMenu } from './mobile_menu.js';
import { initializeCartView } from './cart_view_handler.js';
import { updateCartHeader } from './cart_updater.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js';
import { initializeModals } from './modal_handler.js';
import { initializeCarousel } from './carrousel.js';
import { initializeProductCarousels } from './product_carousel_handler.js';
const API_BASE_URL = 'api/index.php';

document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    loadDepartments();
    initializeCartView();
    updateCartHeader();
    initializeQuantityHandlers();
    initializeFavoritesHandler();
    initializeModals();
    initializeCarousel('.carousel-container');
    initializeProductCarousels();

    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get('search');

    if (searchTermFromUrl) {
        document.getElementById('search-input').value = searchTermFromUrl;
        loadProducts('product-list', 'pagination-controls', {
            apiBaseUrl: API_BASE_URL,
            search: searchTermFromUrl,
            // CORRECCIÓN: Se asegura de aplicar el filtro de imagen también en las búsquedas desde URL
            hide_no_image: layoutSettings.hide_products_without_image
        });
    } else {
        // Esta parte ya estaba correcta
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
            const departmentId = target.dataset.departmentId;
            
            let params = { 
                page: 1, 
                apiBaseUrl: API_BASE_URL, 
                shouldScroll: true,
                // --- INICIO DE LA CORRECCIÓN CLAVE ---
                // Aquí es donde faltaba añadir el parámetro.
                // Ahora, cada vez que filtres por departamento, también se respetará
                // la configuración de visibilidad de imágenes que pusiste en el panel.
                hide_no_image: layoutSettings.hide_products_without_image
                // --- FIN DE LA CORRECCIÓN CLAVE ---
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