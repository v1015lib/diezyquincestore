// js/favorites_handler.js
import { showNotification } from './notification_handler.js';
import { showLoginPrompt } from './modal_handler.js'; // <-- Importamos la nueva función

async function toggleFavorite(productId, button) {
    const isCurrentlyFavorite = button.classList.contains('is-favorite');
    const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
    const successMessage = isCurrentlyFavorite ? 'Producto eliminado de favoritos.' : '¡Producto añadido a favoritos!';

    try {
        const response = await fetch('api/index.php?resource=favorites', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error en la respuesta del servidor.');
        }
        
        if (result.success) {
            button.classList.toggle('is-favorite');
            showNotification(successMessage);
        } else {
            throw new Error(result.message || 'Error desconocido.');
        }

    } catch (error) {
        console.error(`No se pudo actualizar los favoritos: ${error.message}`);
        showNotification(`Error: ${error.message}`);
    }
}

export function initializeFavoritesHandler() {
    document.body.addEventListener('click', (event) => {
        const favoriteButton = event.target.closest('.favorite-btn');
        if (favoriteButton) {
            const isLoggedIn = document.querySelector('.my-account-link');

            if (isLoggedIn) {
                // Si el usuario ha iniciado sesión, funciona normal
                const productId = favoriteButton.dataset.productId;
                toggleFavorite(productId, favoriteButton);
            } else {
                // Si no ha iniciado sesión, muestra la ventana modal
                showLoginPrompt();
            }
        }
    });
}