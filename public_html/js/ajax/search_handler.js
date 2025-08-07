// js/ajax/search_handler.js

import { loadProducts, currentProductParams } from './product_loader.js';

let searchTimeout;

export function initializeSearch(searchInputId, searchButtonId, productListId, paginationControlsId, apiBaseUrl) {
    const searchInput = document.getElementById(searchInputId);
    const searchForm = searchInput ? searchInput.closest('form') : null;

    if (!searchInput || !searchForm) {
        console.error('Elementos del formulario de búsqueda no encontrados.');
        return;
    }

    const performSearch = () => {
        const searchTerm = searchInput.value.trim();

        // Conservamos los filtros que pudieran estar activos
        const paramsToPreserve = {
            department_id: currentProductParams.department_id || null,
            ofertas: currentProductParams.ofertas || null,
            sort_by: currentProductParams.sort_by || 'random',
            order: currentProductParams.order || 'asc',
            hide_no_image: currentProductParams.hide_no_image || null
        };

        // Llamamos a la función para cargar productos
        loadProducts(productListId, paginationControlsId, {
            ...paramsToPreserve,
            search: searchTerm,
            page: 1, // Reiniciamos a la primera página con cada búsqueda
            apiBaseUrl: apiBaseUrl,
            shouldScroll: true // <-- Esta es la línea clave que activa el scroll
        });
    };

    // Búsqueda en tiempo real (sin cambios)
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 500); 
    });

    // Búsqueda al presionar Enter (sin cambios)
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        clearTimeout(searchTimeout);
        performSearch();
    });
}