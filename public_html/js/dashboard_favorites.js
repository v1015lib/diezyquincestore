// js/dashboard_favorites.js

import { showNotification } from './notification_handler.js';
import { updateCartHeader } from './cart_updater.js'; // <-- IMPORTADO

document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('favorites-list');
    const selectAllCheckbox = document.getElementById('select-all-favorites');
    const addToCartBtn = document.getElementById('add-favorites-to-cart-btn');

    if (!listContainer) return; // Salir si no estamos en la página de favoritos

    // --- FUNCIÓN PARA RENDERIZAR LA LISTA DE FAVORITOS ---
    const renderFavorites = (favorites) => {
        listContainer.innerHTML = ''; // Limpiar la lista actual
        if (favorites.length === 0) {
            listContainer.innerHTML = '<p style="padding: 1.5rem; text-align: center;">No tienes productos guardados en favoritos.</p>';
            // Ocultar cabecera y pie de página si no hay favoritos
            const header = document.querySelector('.favorites-header');
            const footer = document.querySelector('.favorites-footer');
            if (header) header.style.display = 'none';
            if (footer) footer.style.display = 'none';
            return;
        }

        favorites.forEach(item => {
            const itemHtml = `
                <div class="favorite-item" data-product-id="${item.id_producto}">
                    <div class="form-group-checkbox">
                        <input type="checkbox" class="favorite-checkbox" data-product-id="${item.id_producto}" id="fav-check-${item.id_producto}">
                        <label for="fav-check-${item.id_producto}" class="visually-hidden">Seleccionar ${item.nombre_producto}</label>
                    </div>
                    <img src="${item.url_imagen || 'https://via.placeholder.com/60'}" alt="${item.nombre_producto}" class="favorite-item-image">
                    <div class="favorite-item-details">
                        <span class="favorite-item-name">${item.nombre_producto}</span>
                        <span class="favorite-item-price">$${parseFloat(item.precio_venta).toFixed(2)}</span>
                    </div>
                    <button class="favorite-item-remove-btn" title="Eliminar de favoritos" data-product-id="${item.id_producto}">&times;</button>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
    };

    // --- FUNCIÓN PARA CARGAR LOS DATOS DESDE LA API ---
    const loadFavorites = async () => {
        try {
            const response = await fetch('api/index.php?resource=get-favorite-details');
            const result = await response.json();
            if (result.success) {
                renderFavorites(result.favorites);
                updateState(); // <-- Actualizar estado después de cargar
            } else {
                showNotification('Error al cargar favoritos.', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión al cargar favoritos.', 'error');
        }
    };

    // --- LÓGICA PARA ACTUALIZAR EL ESTADO DE LOS BOTONES Y CHECKBOXES ---
    const updateState = () => {
        const checkboxes = listContainer.querySelectorAll('.favorite-checkbox');
        const checkedCheckboxes = listContainer.querySelectorAll('.favorite-checkbox:checked');
        
        // Habilitar/deshabilitar el botón de "Añadir al carrito"
        addToCartBtn.disabled = checkedCheckboxes.length === 0;

        // Sincronizar el checkbox "Seleccionar Todo"
        if (checkboxes.length > 0) {
            selectAllCheckbox.checked = checkboxes.length === checkedCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < checkboxes.length;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    };

    // --- EVENT LISTENERS ---

    // Al hacer clic en cualquier checkbox de la lista
    listContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('favorite-checkbox')) {
            updateState();
        }
    });

    // Al hacer clic en "Seleccionar Todo"
    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = listContainer.querySelectorAll('.favorite-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        updateState();
    });

    // Al hacer clic en "Añadir Seleccionados al Carrito"
    addToCartBtn.addEventListener('click', async () => {
        const selectedCheckboxes = listContainer.querySelectorAll('.favorite-checkbox:checked');
        const productIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.productId);

        if (productIds.length === 0) return;

        try {
            const response = await fetch('api/index.php?resource=add-multiple-to-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_ids: productIds })
            });
            const result = await response.json();
            if (result.success) {
                showNotification(result.message, 'success');
                // Desmarcar los checkboxes después de añadir
                selectedCheckboxes.forEach(cb => cb.checked = false);
                updateState();
                updateCartHeader(); // <-- CORRECCIÓN: Actualiza el total del carrito aquí
            } else {
                showNotification(result.message || 'Error al añadir al carrito.', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión.', 'error');
        }
    });
    
    // Al hacer clic en el botón de eliminar un favorito
    listContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('favorite-item-remove-btn')) {
            const productId = e.target.dataset.productId;
            
            try {
                const response = await fetch('api/index.php?resource=favorites', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId })
                });
                const result = await response.json();
                
                if (result.success) {
                    showNotification('Producto eliminado de favoritos.', 'info');
                    // Volver a cargar la lista para reflejar el cambio
                    loadFavorites();
                } else {
                    showNotification(result.error || 'No se pudo eliminar el favorito.', 'error');
                }
            } catch (error) {
                showNotification('Error de conexión.', 'error');
            }
        }
    });

    // --- CARGA INICIAL ---
    loadFavorites();
});