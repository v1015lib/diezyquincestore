// REEMPLAZA EL CONTENIDO COMPLETO de public_html/js/dashboards_offers.js

// 1. Importamos la función para obtener el estado del carrito
import { getCartState } from './ajax/product_loader.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('ofertas-container');
    if (!container) return;

    // 2. Modificamos renderOffers para que acepte el estado del carrito
    const renderOffers = (ofertas, cartState) => {
        container.innerHTML = '';
        
        ofertas.forEach(product => {
            const precioVenta = parseFloat(product.precio_venta);
            const precioOferta = parseFloat(product.precio_oferta);
            let discountHtml = '';
            if (precioVenta > precioOferta) {
                const discountPercent = Math.round(((precioVenta - precioOferta) / precioVenta) * 100);
                discountHtml = `-${discountPercent}%`;
            }

            // 3. Obtenemos la cantidad actual del producto desde el cartState
            const currentQuantity = cartState[product.id_producto] || 0;

            const productCardHtml = `
                <div class="product-card" data-product-id="${product.id_producto}">
                    <div class="product-image-container">
                        <img src="${product.url_imagen || 'https://via.placeholder.com/200'}" alt="${product.nombre_producto}" loading="lazy">
                        <div class="discount-badge">${discountHtml}</div>
                    </div>
                    <div class="product-info">
                        <h3>${product.nombre_producto}</h3>
                        <p class="department">${product.nombre_departamento}</p>
                        <div class="price-container">
                            <p class="price-offer">$${precioOferta.toFixed(2)}</p>
                            <p class="price-older">$${precioVenta.toFixed(2)}</p>
                        </div>
                        <p class="code"># ${product.codigo_producto}</p>
                        <div class="quantity-selector">
                            <button class="quantity-btn minus" data-action="decrease">-</button>
                            
                            <input type="number" class="quantity-input" value="${currentQuantity}" min="0" max="99" data-product-id="${product.id_producto}" aria-label="Cantidad">
                            
                            <button class="quantity-btn plus" data-action="increase">+</button>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', productCardHtml);
        });
    };

    const loadOffers = async () => {
        container.innerHTML = '<p>Buscando ofertas para ti...</p>';
        try {
            // 5. Obtenemos el estado del carrito y las ofertas al mismo tiempo
            const [cartState, offersResponse] = await Promise.all([
                getCartState(),
                fetch('api/index.php?resource=ofertas')
            ]);
            
            const offersResult = await offersResponse.json();

            if (offersResult.success && offersResult.ofertas.length > 0) {
                // 6. Pasamos el estado del carrito a la función que renderiza
                renderOffers(offersResult.ofertas, cartState);
            } else {
                container.innerHTML = '<p>Por el momento, no hay ofertas para tus departamentos de interés.</p>';
            }
        } catch (error) {
            container.innerHTML = '<p style="color: red;">Error al cargar tus ofertas.</p>';
        }
    };

    loadOffers();
});