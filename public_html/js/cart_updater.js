// js/cart_updater.js

export async function updateCartHeader() {
    try {
        const response = await fetch('api/index.php?resource=cart-status');
        if (!response.ok) throw new Error('No se pudo obtener el estado del carrito.');
        
        const data = await response.json();
        const totalElement = document.getElementById('cart-total-header');

        if (totalElement) {
            const totalPrice = data.total_price || '0.00';
            totalElement.textContent = `$${totalPrice}`;
        }
    } catch (error) {
        console.error('Error al actualizar el header del carrito:', error);
    }
}