// js/main.js

import { loadProducts } from './ajax/product_loader.js';
import { initializeSearch } from './ajax/search_handler.js';
import { setupMobileMenu } from './mobile_menu.js';
import { initializeCartView } from './cart_view_handler.js';
import { updateCartHeader } from './cart_updater.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js';
import { initializeModals } from './modal_handler.js';
import { initializeCarousel } from './carrousel.js'; 

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
    // --- LÓGICA CORREGIDA PARA MANEJAR BÚSQUEDA DESDE OTRAS PÁGINAS ---
    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get('search'); // Usamos 'search' para coincidir con el form

    if (searchTermFromUrl) {
        // Si hay un término de búsqueda en la URL, lo ponemos en el input
        // y cargamos los productos filtrados.
        document.getElementById('search-input').value = searchTermFromUrl;
        loadProducts('product-list', 'pagination-controls', { 
            apiBaseUrl: API_BASE_URL,
            search: searchTermFromUrl 
        });
    } else {
        // Si no, cargamos los productos iniciales como siempre.
        loadProducts('product-list', 'pagination-controls', { 
            sortBy: 'random', 
            apiBaseUrl: API_BASE_URL,
            hide_no_image: true
        });
    }

    initializeSearch('search-input', 'search-button', 'product-list', 'pagination-controls', API_BASE_URL);
    
    document.getElementById('sidemenu').addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.department-link')) {
            event.preventDefault(); 
            const departmentId = target.dataset.departmentId;
            let params = { page: 1, apiBaseUrl: API_BASE_URL };
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

async function loadDepartments() {
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
                li.innerHTML = `<a href="#" class="department-link" data-department-id="${dept.id_departamento}">${dept.departamento}</a>`;
                sidemenuUl.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
    }
}