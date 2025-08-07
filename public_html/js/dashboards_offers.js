// js/dashboard_offers.js

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('ofertas-container');
    if (!container) return;

    // --- FUNCIÓN PARA RENDERIZAR LAS TARJETAS ---
    // Genera el HTML idéntico al de la tienda para que el manejador de cantidad global funcione.
    const renderOffers = (ofertas) => {
        container.innerHTML = '';
        
        ofertas.forEach(product => {
            const precioVenta = parseFloat(product.precio_venta);
            const precioOferta = parseFloat(product.precio_oferta);
            let discountHtml = '';
            if (precioVenta > precioOferta) {
                const discountPercent = Math.round(((precioVenta - precioOferta) / precioVenta) * 100);
                discountHtml = `<div class="discount-badge">-${discountPercent}%</div>`;
            }

            const productCardHtml = `
                <div class="product-card" data-product-id="${product.id_producto}">
                    <div class="product-image-container">
                        <img src="${product.url_imagen || 'https://via.placeholder.com/200'}" alt="${product.nombre_producto}" loading="lazy">
                        ${discountHtml}
                    </div>
                    <div class="product-info">
                        <h3>${product.nombre_producto}</h3>
                        <p class="department">${product.nombre_departamento}</p>
                        <div class="price-container">
                            <p class="price-offer" ">$${precioOferta.toFixed(2)}</p>
                            <p class="price-older">$${precioVenta.toFixed(2)}</p>
                        </div>
                    <p class="code"># ${product.codigo_producto}</p>

                        <div class="quantity-selector">
                            <button class="quantity-btn minus" data-action="decrease">-</button>
                            <input type="number" class="quantity-input" value="0" min="0" max="99" data-product-id="${product.id_producto}" aria-label="Cantidad">
                            <button class="quantity-btn plus" data-action="increase">+</button>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', productCardHtml);
        });
    };

    // --- FUNCIÓN PRINCIPAL PARA CARGAR LAS OFERTAS ---
    const loadOffers = async () => {
        container.innerHTML = '<p>Buscando ofertas para ti...</p>';
        try {
            const response = await fetch('api/index.php?resource=ofertas');
            const result = await response.json();

            if (result.success && result.ofertas.length > 0) {
                renderOffers(result.ofertas);
            } else {
                container.innerHTML = '<p>Por el momento, no hay ofertas para tus departamentos de interés.</p>';
            }
        } catch (error) {
            container.innerHTML = '<p style="color: red;">Error al cargar tus ofertas.</p>';
        }
    };

    // Iniciar la carga
    loadOffers();
});