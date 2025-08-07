// js/checkout.js

document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-whatsapp-btn');

    if (sendButton) {
        sendButton.addEventListener('click', async (event) => {
            // Prevenimos que el enlace se abra inmediatamente
            event.preventDefault(); 
            
            // Guardamos la URL de WhatsApp para usarla después
            const whatsappUrl = sendButton.href;

            try {
                const response = await fetch('api/index.php?resource=cart-checkout', {
                    method: 'POST'
                });

                if (!response.ok) {
                    throw new Error('No se pudo finalizar la compra en el sistema.');
                }
                
                const data = await response.json();

                if (data.success) {
                    console.log('El carrito se ha marcado como completado.');
                    
                    // Abrimos el enlace de WhatsApp en una nueva pestaña
                    window.open(whatsappUrl, '_blank');
                    
                    // ======================================================
                    // REDIRECCIÓN A LA PÁGINA DE INICIO (AÑADIDA AQUÍ)
                    // ======================================================
                    alert('¡Pedido enviado! Serás redirigido al inicio.');
                    window.location.href = 'index.php';

                } else {
                    alert('Hubo un problema al finalizar tu compra. Por favor, intenta de nuevo.');
                }

            } catch (error) {
                console.error("Error en el checkout:", error);
                alert('Error de conexión al finalizar la compra. Por favor, intenta de nuevo.');
            }
        });
    }
});