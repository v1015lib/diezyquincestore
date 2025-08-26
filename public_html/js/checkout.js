// REEMPLAZA EL CONTENIDO COMPLETO de public_html/js/checkout.js

import { showNotification } from './notification_handler.js';

document.addEventListener('DOMContentLoaded', () => {
    const whatsappBtn = document.getElementById('send-whatsapp-btn');
    const payWithCardBtn = document.getElementById('pay-with-card-btn');

    const executeCheckout = async (resource, button, confirmStock = false) => {
        const originalButtonText = button.textContent;
        
        if (!confirmStock) {
            button.textContent = 'Verificando stock...';
            button.disabled = true;
        }

        try {
            const response = await fetch(`api/index.php?resource=${resource}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm_stock: confirmStock })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const successMessage = resource === 'checkout-with-card' 
                    ? '¡Pago Exitoso! Tu pedido ha sido finalizado.'
                    : '¡Lista enviada! Serás redirigido a WhatsApp.';

                showNotification(successMessage, 'success');
                
                setTimeout(() => {
                    if (resource === 'cart-checkout') {
                        // Es importante construir la URL de WhatsApp aquí por si el total cambió
                        // (Aunque para WhatsApp no es crítico, es buena práctica)
                        window.open(whatsappBtn.href, '_blank');
                    }
                    window.location.href = 'dashboard.php?view=pedidos';
                }, 1500);

            } else if (response.status === 409 && result.stock_conflict) {
                
                let confirmationMessage = "¡Atención! No hay suficiente stock para algunos productos:\n\n";
                result.conflicts.forEach(item => {
                    confirmationMessage += `- ${item.nombre_producto}\n  Solicitaste: ${item.cantidad_pedida}, Disponible: ${item.stock_actual}\n`;
                });
                confirmationMessage += "\n¿Deseas continuar? Tu pedido se ajustará a la cantidad disponible.";

                if (confirm(confirmationMessage)) {
                    button.textContent = 'Procesando con ajuste...';
                    await executeCheckout(resource, button, true); 
                } else {
                    showNotification('Proceso cancelado. Por favor, ajusta tu lista.', 'info');
                    button.textContent = originalButtonText;
                    button.disabled = false;
                }
            } else {
                throw new Error(result.error || 'Ocurrió un error inesperado.');
            }

        } catch (error) {
            showNotification(error.message, 'error');
            button.textContent = originalButtonText;
            button.disabled = false;
        }
    };

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            executeCheckout('cart-checkout', whatsappBtn);
        });
    }

    if (payWithCardBtn) {
        payWithCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeCheckout('checkout-with-card', payWithCardBtn);
        });
    }
});

