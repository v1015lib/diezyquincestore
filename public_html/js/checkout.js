// REEMPLAZA EL CONTENIDO COMPLETO de public_html/js/checkout.js

import { showNotification } from './notification_handler.js';

document.addEventListener('DOMContentLoaded', () => {
    const whatsappBtn = document.getElementById('send-whatsapp-btn');
    const payWithCardBtn = document.getElementById('pay-with-card-btn');

    const executeCheckout = async (resource, button, confirmStock = false) => {
        const originalButtonText = button.textContent;
        
        button.textContent = 'Verificando...';
        button.disabled = true;

        try {
            const response = await fetch(`api/index.php?resource=${resource}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm_stock: confirmStock })
            });

            // Primero, verificamos si la respuesta no es OK para mostrar un error genérico
            if (!response.ok && response.status !== 409) {
                 const errorText = await response.text(); // Leemos el texto del error
                 throw new Error(`Error del servidor (${response.status}): ${errorText}`);
            }

            const result = await response.json();

            if (result.success) {
                const successMessage = resource === 'checkout-with-card' 
                    ? 'tu pedido ha sido procesado.'
                    : '¡Stock confirmado! Serás redirigido a WhatsApp.';

                showNotification(successMessage, 'success');
                
                setTimeout(() => {
                    if (resource === 'cart-checkout') {
                        // Abrimos la URL de WhatsApp que está en el botón
                        window.open(button.href, '_blank');
                    }
                    // Redirigimos al dashboard de pedidos
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
                    showNotification('Proceso cancelado. Por favor, ajusta tu carrito.', 'info');
                    // Restauramos el botón a su estado original
                    button.textContent = originalButtonText;
                    button.disabled = false;
                }
            } else {
                // Si la respuesta es OK pero success es false
                throw new Error(result.error || 'Ocurrió un error inesperado al procesar el pedido.');
            }

        } catch (error) {
            console.error('Error en executeCheckout:', error); // Para ver el error detallado en la consola
            showNotification(`Error: ${error.message}`, 'error');
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