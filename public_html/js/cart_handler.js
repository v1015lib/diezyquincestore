// js/cart_handler.js

// Importamos la función para actualizar el contador
import { updateCartCounter } from './cart_updater.js';

export function initializeCartButtons(containerId) {
    const productContainer = document.getElementById(containerId);
    if (!productContainer) return;

    productContainer.addEventListener('click', async (event) => {
        if (event.target.matches('.add-to-cart-btn')) {
            const button = event.target;
            const productId = button.dataset.productId;
            const quantityInput = button.closest('.add-to-cart-controls').querySelector('.quantity-input');
            const quantity = parseInt(quantityInput.value, 10);

            if (isNaN(quantity) || quantity < 1) {
                alert('Por favor, ingrese una cantidad válida.');
                return;
            }
            
            button.textContent = 'Añadiendo...';
            button.disabled = true;

            try {
                const response = await addToCart(productId, quantity);
                if (response.success) {
                    button.textContent = '¡Añadido!';
                    
                    // Actualizamos el contador después de añadir
                    await updateCartCounter(); 
                    
                    setTimeout(() => {
                        button.textContent = 'Agregar';
                        button.disabled = false;
                    }, 2000);
                } else {
                    throw new Error(response.error || 'Error desconocido al añadir al carrito.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
                button.textContent = 'Error';
                 setTimeout(() => {
                    button.textContent = 'Agregar';
                    button.disabled = false;
                }, 2000);
            }
        }
    });
}

async function addToCart(productId, quantity) {
    const response = await fetch('api/index.php?resource=cart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: quantity,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error de red o respuesta no válida.' }));
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
    }

    return response.json();
}