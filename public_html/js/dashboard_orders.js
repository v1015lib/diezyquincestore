// js/dashboard_orders.js
import { showNotification } from './notification_handler.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('order-history-container');
    if (!container) return;

    const loadOrderHistory = async () => {
        container.innerHTML = '<p>Cargando historial...</p>';
        try {
            const response = await fetch('api/index.php?resource=order-history');
            const result = await response.json();

            if (result.success && result.orders.length > 0) {
                renderOrderHistory(result.orders);
            } else {
                container.innerHTML = '<p>No has realizado ningún pedido todavía.</p>';
            }
        } catch (error) {
            container.innerHTML = '<p style="color: red;">Error al cargar el historial.</p>';
        }
    };

    // public_html/js/dashboard_orders.js

const renderOrderHistory = (orders) => {
    container.innerHTML = '';
    orders.forEach(order => {
        const itemsHtml = order.items.map(item => `
            <li class="order-item">
                <span class="order-item-qty">${item.cantidad}x</span>
                <span class="order-item-name">${item.nombre_producto}</span>
                <span class="order-item-price">$${parseFloat(item.precio_unitario).toFixed(2)}</span>
            </li>
        `).join('');

        const isCanceled = order.status_name === 'Cancelado';
        
        // --- INICIO DE LA MODIFICACIÓN ---
        // Se añade un nuevo botón/enlace para la factura
        const reorderButtonHtml = `
            <a href="api/index.php?resource=generate-invoice&order_id=${order.id_pedido}" class="submit-btn" target="_blank">Descargar Factura</a>
            <button class="submit-btn reorder-btn" data-order-id="${order.id_pedido}" ${isCanceled ? 'disabled' : ''}>
                ${isCanceled ? 'Pedido Cancelado' : 'Repetir Pedido'}
            </button>
        `;
        // --- FIN DE LA MODIFICACIÓN ---

        const orderCardHtml = `
            <div class="order-card">
                <div class="order-card-header">
                    <div class="order-summary">
                        <strong>Orden #${order.id_pedido}</strong>
                        <small>${order.fecha}</small>
                    </div>
                    <div class="order-card-actions">
                        <span class="order-status-badge">${order.status_name}</span>
                        <span class="order-card-total">Total: <strong>$${order.total}</strong></span>
                        <button class="details-btn toggle-details-btn">Detalles</button>
                    </div>
                </div>
                <div class="order-card-body">
                    <ul class="order-items-list">${itemsHtml}</ul>
                    <div class="order-card-footer">
                        ${reorderButtonHtml}
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', orderCardHtml);
    });
};


    const handleReorder = async (target) => {
        if (!target.classList.contains('reorder-btn')) return;

        const button = target;
        const orderId = button.dataset.orderId;
        button.textContent = 'Procesando...';
        button.disabled = true;

        try {
            const response = await fetch('api/index.php?resource=reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId })
            });
            const result = await response.json();

            if (result.success) {
                showNotification('¡Pedido añadido al carrito! Redirigiendo...', 'success');
                setTimeout(() => window.location.href = 'finalizar_compra.php', 1500);
            } else {
                throw new Error(result.error || 'No se pudo repetir el pedido.');
            }
        } catch (error) {
            showNotification(error.message, 'error');
            button.textContent = 'Repetir Pedido';
            button.disabled = false;
        }
    };

    const handleAccordion = (target) => {
        if (!target.classList.contains('toggle-details-btn')) return;

        const button = target;
        const currentCard = button.closest('.order-card');
        if (!currentCard) return;

        const isOpening = !currentCard.classList.contains('is-open');

        container.querySelectorAll('.order-card.is-open').forEach(openCard => {
            if (openCard !== currentCard) {
                openCard.classList.remove('is-open');
                openCard.querySelector('.toggle-details-btn').textContent = 'Detalles';
            }
        });

        if (isOpening) {
            currentCard.classList.add('is-open');
            button.textContent = 'Ocultar';
        } else {
            currentCard.classList.remove('is-open');
            button.textContent = 'Detalles';
        }
    };

    loadOrderHistory();
    container.addEventListener('click', (e) => {
        handleReorder(e.target);
        handleAccordion(e.target);
    });
});