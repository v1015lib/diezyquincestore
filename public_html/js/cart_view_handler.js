// js/cart_view_handler.js

const cartPanel = document.getElementById('cart-panel');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart-btn');
const openCartTrigger = document.querySelector('.cart-widget-container');
const cartContent = document.getElementById('cart-content');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.querySelector('.checkout-btn');
import { showNotification } from './notification_handler.js';
import { updateCartHeader } from './cart_updater.js';


export async function loadCartDetails() {
    if (!cartContent) return;
    cartContent.innerHTML = '<p>Cargando productos...</p>';
    try {
        const response = await fetch('api/index.php?resource=cart-details');
        if (!response.ok) throw new Error('No se pudo obtener la información del carrito.');
        const data = await response.json();
        cartContent.innerHTML = '';

        if (data.cart_items && data.cart_items.length > 0) {
            data.cart_items.forEach(item => {
                const itemHtml = `
                    <div class="cart-item" data-product-id="${item.id_producto}">
                        <img src="${item.url_imagen || 'https://via.placeholder.com/60'}" alt="${item.nombre_producto}" class="cart-item-image">
                        <div class="cart-item-details">
                            <span class="cart-item-name">${item.nombre_producto}</span>
                            <span class="cart-item-price">$${parseFloat(item.precio_unitario).toFixed(2)}</span>
                        </div>
                        <div class="quantity-selector cart-quantity-selector">
                            <button class="quantity-btn minus" data-action="decrease">-</button>
                            <input type="number" class="quantity-input" value="${item.cantidad}" min="0" max="99" data-product-id="${item.id_producto}" aria-label="Cantidad">
                            <button class="quantity-btn plus" data-action="increase">+</button>
                        </div>
                    </div>
                `;
                cartContent.insertAdjacentHTML('beforeend', itemHtml);
            });
        } else {
            cartContent.innerHTML = '<p>Tu carrito está vacío.</p>';
        }
        cartTotalPrice.textContent = `$${data.total}`;
    } catch (error) {
        console.error('Error al cargar el carrito:', error);
        cartContent.innerHTML = '<p>Hubo un error al cargar tu carrito.</p>';
    }
}

function toggleCartPanel(event) {
    if (event) event.preventDefault();
    if (!cartPanel || !cartOverlay) return;
    const isVisible = cartPanel.classList.contains('visible');
    if (isVisible) {
        cartPanel.classList.remove('visible');
        cartOverlay.classList.remove('visible');
    } else {
        loadCartDetails();
        cartPanel.classList.add('visible');
        cartOverlay.classList.add('visible');
    }
}

// js/cart_view_handler.js

// ... (importaciones y constantes no cambian)

export function initializeCartView() {
    if (openCartTrigger) {
        openCartTrigger.addEventListener('click', toggleCartPanel);
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', toggleCartPanel);
    }

    if (cartOverlay) {
        cartOverlay.addEventListener('click', toggleCartPanel);
    }
    
    const clearCartBtn = document.getElementById('clear-cart-btn');

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de que quieres vaciar tu carrito?')) {
                return;
            }

            try {
                const response = await fetch('api/index.php?resource=clear-cart', {
                    method: 'POST'
                });
                const result = await response.json();

                if (result.success) {
                    showNotification('Carrito vaciado con éxito.', 'info');
                    
                    // --- Lógica de UI en tiempo real ---
                    
                    // 1. Animación y vaciado del PANEL del carrito
                    const items = cartContent.querySelectorAll('.cart-item');
                    items.forEach(item => item.classList.add('is-removing'));

                    setTimeout(() => {
                        cartContent.innerHTML = '<p>Tu carrito está vacío.</p>';
                    }, 400);

                    // 2. Actualizamos totales del PANEL y HEADER
                    cartTotalPrice.textContent = '$0.00';
                    updateCartHeader();

                    // --- INICIO: CÓDIGO AÑADIDO PARA LA CORRECCIÓN ---
                    
                    // 3. Reseteamos a CERO todos los contadores de las tarjetas de producto en la página.
                    const allProductCardInputs = document.querySelectorAll('.product-grid .quantity-input');
                    allProductCardInputs.forEach(input => {
                        input.value = 0;
                    });
                    
                    // --- FIN: CÓDIGO AÑADIDO PARA LA CORRECCIÓN ---

                } else {
                    throw new Error(result.error || 'No se pudo vaciar el carrito.');
                }
            } catch (error) {
                showNotification(error.message, 'error');
                console.error('Error al vaciar el carrito:', error);
            }
        });
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            window.location.href = 'finalizar_compra.php';
        });
    }
}