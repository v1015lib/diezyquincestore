import { showNotification } from './notification_handler.js';

document.addEventListener('DOMContentLoaded', () => {
    const whatsappBtn = document.getElementById('send-whatsapp-btn');
    const payWithCardBtn = document.getElementById('pay-with-card-btn');

    // Botón de Enviar por WhatsApp (Método Tradicional)
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', async (e) => {
            // Prevenimos que se abra WhatsApp inmediatamente
            e.preventDefault(); 
            
            whatsappBtn.textContent = 'Procesando...';
            whatsappBtn.style.pointerEvents = 'none';

            try {
                // Llama a la API para cambiar el estado del carrito a "En Proceso"
                const response = await fetch('api/index.php?resource=cart-checkout', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    showNotification('¡Lista enviada! Serás redirigido a WhatsApp.', 'success');
                    // Si la API responde bien, ahora sí abre WhatsApp y luego redirige
                    setTimeout(() => {
                        window.open(whatsappBtn.href, '_blank');
                        window.location.href = 'dashboard.php?view=pedidos';
                    }, 1500);
                } else {
                    throw new Error(result.error || 'Ocurrió un error al enviar la lista.');
                }
            } catch (error) {
                showNotification(error.message, 'error');
                whatsappBtn.textContent = '✔ Enviar Pedido por WhatsApp';
                whatsappBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // Nuevo Botón de Pagar con Tarjeta
    if (payWithCardBtn) {
        payWithCardBtn.addEventListener('click', async () => {
            payWithCardBtn.disabled = true;
            payWithCardBtn.textContent = 'Procesando Pago...';

            try {
                const response = await fetch('api/index.php?resource=checkout-with-card', { method: 'POST' });
                const result = await response.json();

                if (result.success) {
                    showNotification('¡Pago Exitoso! Tu pedido ha sido pagado y finalizado.', 'success');
                    setTimeout(() => window.location.href = 'dashboard.php?view=pedidos', 2000);
                } else {
                    throw new Error(result.error || 'No se pudo completar el pago.');
                }
            } catch (error) {
                showNotification(error.message, 'error');
                payWithCardBtn.disabled = false;
                payWithCardBtn.textContent = 'Pagar con Mi Tarjeta y Finalizar Pedido';
            }
        });
    }
});