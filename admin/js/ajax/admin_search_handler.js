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