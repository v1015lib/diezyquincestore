// js/cart_quantity_handler.js
import { updateCartHeader } from './cart_updater.js';
import { loadCartDetails } from './cart_view_handler.js';
import { showLoginPrompt } from './modal_handler.js';

// En: public_html/js/cart_quantity_handler.js
async function updateCartAPI(productId, quantity) {
    const itemElement = document.querySelector(`.cart-item[data-product-id="${productId}"]`);

    // 1. Lógica de animación para eliminar un elemento
    if (quantity <= 0 && itemElement) {
        itemElement.classList.add('is-removing');
        // Esperamos a que la animación de CSS termine (400ms) y LUEGO eliminamos el elemento del DOM.
        itemElement.addEventListener('transitionend', () => {
            itemElement.remove();
            
            // Comprobamos si el carrito ha quedado vacío
            const cartContent = document.getElementById('cart-content');
            if (cartContent && cartContent.children.length === 0) {
                cartContent.innerHTML = '<p>Tu carrito está vacío.</p>';
            }
        });
    }

    try {
        const response = await fetch('api/index.php?resource=cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, quantity: quantity })
        });
        
        const data = await response.json();
        if (!data.success) {
            // Si la API falla, lanzamos un error para que el 'catch' lo maneje
            throw new Error(data.error || 'Error desconocido del API.');
        }

        // 2. Actualizamos los totales SIN RECARGAR NADA
        // Usamos el 'new_total' que nos devuelve nuestra API modificada
        const cartTotalElement = document.getElementById('cart-total-price');
        if (cartTotalElement) {
            cartTotalElement.textContent = `$${data.new_total || '0.00'}`;
        }
        // Llamamos a la función que solo actualiza el numerito del header
        await updateCartHeader();

        // 3. Lógica de animación "flash" para confirmar una actualización de cantidad
        if (quantity > 0 && itemElement) {
            itemElement.classList.add('is-updated');
            // Quitamos la clase después de 700ms para que la animación pueda volver a ocurrir
            setTimeout(() => {
                itemElement.classList.remove('is-updated');
            }, 700);
        }
        
        // 4. Sincronizamos el valor con la tarjeta del producto en la página principal, si existe
        const productCardInput = document.querySelector(`.product-card[data-product-id="${productId}"] .quantity-input`);
        if (productCardInput) {
            productCardInput.value = quantity;
        }

    } catch (error) {
        console.error('Error al actualizar el carrito:', error);
        // SOLO si hay un error, recargamos todo el carrito para asegurar que el usuario vea el estado real.
        // Esto evita que la interfaz quede en un estado inconsistente.
        showNotification('Error al actualizar, restaurando carrito.', 'error');
        await loadCartDetails(); 
    }
}

function handleQuantityInteraction(event) {
    // --- LA CORRECCIÓN DEFINITIVA ESTÁ AQUÍ ---
    // Ahora, la variable `isLoggedIn` será verdadera si encuentra el enlace de "Mi Cuenta"
    // O si encuentra el layout principal del dashboard, lo que soluciona el problema.
    const isLoggedIn = document.querySelector('.my-account-link') || document.querySelector('.dashboard-layout');

    if (!isLoggedIn) {
        showLoginPrompt();
        const input = event.target.closest('.quantity-selector')?.querySelector('.quantity-input');
        if (input) input.value = 0;
        return;
    }

    const target = event.target;
    const selector = target.closest('.quantity-selector');
    if (!selector) return;

    const input = selector.querySelector('.quantity-input');
    const productId = input.dataset.productId;
    let currentValue = parseInt(input.value, 10);

    if (isNaN(currentValue)) currentValue = 0;

    if (target.matches('.quantity-btn')) {
        const action = target.dataset.action;
        if (action === 'increase') {
            currentValue++;
        } else if (action === 'decrease') {
            currentValue = Math.max(0, currentValue - 1);
        }
        input.value = currentValue;
        updateCartAPI(productId, currentValue);
    } else if (target.matches('.quantity-input')) {
        let debounceTimer = null;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateCartAPI(productId, currentValue);
        }, 500);
    }
}

export function initializeQuantityHandlers() {
    // Volvemos al listener en el body, que tus propias pruebas demostraron que sí funciona.
    // Esto es más simple y robusto para capturar todos los clics.
    document.body.addEventListener('click', event => {
        if (event.target.matches('.quantity-btn')) {
            handleQuantityInteraction(event);
        }
    });

    document.body.addEventListener('input', event => {
        if (event.target.matches('.quantity-input')) {
            handleQuantityInteraction(event);
        }
    });
}