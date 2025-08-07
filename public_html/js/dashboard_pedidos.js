import { updateCartHeader } from './cart_updater.js';
import { loadCartDetails } from './cart_view_handler.js';

// Función principal que se llamará desde dashboard.js
export async function initializeOrderHistoryView() {
    const container = document.getElementById('dashboard-content');
    
    // Esta línea es clave: comprueba si estamos en la vista de "pedidos".
    // Si no es así, la función se detiene y no interfiere con las otras secciones.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') !== 'pedidos') {
        return;
    }

    container.innerHTML = '<p>Cargando tu historial de pedidos...</p>';

    try {
        const orders = await fetchOrderHistory();
        renderOrderHistory(container, orders);
        setupEventListeners();
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error al cargar el historial: ${error.message}</p>`;
    }
}

// 1. Pide el historial a la API
async function fetchOrderHistory() {
    const response = await fetch('api/index.php?resource=order-history');
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo obtener el historial.');
    }
    const data = await response.json();
    return data.orders;
}

// 2. Construye el HTML de la lista
function renderOrderHistory(container, orders) {
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p>No tienes pedidos en tu historial.</p>';
        return;
    }

    let html = '<div class="order-history-list">';
    orders.forEach(order => {
        html += `
            <div class="order-item">
                <div class="order-summary">
                    <span class="order-date"><strong>Fecha:</strong> ${order.fecha}</span>
                    <span class="order-total"><strong>Total:</strong> $${order.total}</span>
                    <span class="order-toggle-icon">▼</span>
                </div>
                <div class="order-details">
                    <ul>
                        ${order.productos.map(p => `<li>${p.cantidad} x ${p.nombre_producto}</li>`).join('')}
                    </ul>
                    <button class="repeat-order-btn" data-order-id="${order.id_pedido}">Repetir Pedido</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// 3. Añade la funcionalidad para expandir/colapsar Y para el botón de repetir
function setupEventListeners() {
    const orderList = document.querySelector('.order-history-list');
    if (!orderList) return;

    orderList.addEventListener('click', async function(event) {
        // Lógica para desplegar el pedido
        const summary = event.target.closest('.order-summary');
        if (summary) {
            const details = summary.nextElementSibling;
            if (details) details.classList.toggle('visible');
            const icon = summary.querySelector('.order-toggle-icon');
            if (icon) icon.classList.toggle('rotated');
            return; // Detenemos aquí si solo fue un clic para desplegar
        }

        // Lógica para el botón "Repetir Pedido"
        if (event.target.matches('.repeat-order-btn')) {
            const button = event.target;
            const orderId = button.dataset.orderId;
            
            try {
                button.textContent = 'Añadiendo...';
                button.disabled = true;

                const response = await fetch('api/index.php?resource=repeat-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId })
                });

                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message);

                // ¡LA SOLUCIÓN! Actualizamos ambas partes del carrito
                await updateCartHeader();
                await loadCartDetails();

                alert('¡Productos añadidos a tu carrito actual!');

            } catch (error) {
                alert(`Error al repetir el pedido: ${error.message}`);
            } finally {
                button.textContent = 'Repetir Pedido';
                button.disabled = false;
            }
        }
    });
}