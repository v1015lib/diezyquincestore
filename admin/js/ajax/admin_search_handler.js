    const API_BASE_URL = 'http://localhost/diezyquincestore/api/index.php';
    const WAPI_BASE_URL = 'https://diezyquince.store/api/index.php';


import { fetchAndRenderProducts } from './admin_product_loader.js';

let searchTimeout;

export function initializeAdminSearch(searchInputId) {
    const searchInput = document.getElementById(searchInputId);
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchAndRenderProducts(searchInput.value);
        }, 300);
    });
}