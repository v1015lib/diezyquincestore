
// public_html/js/ajax/product_loader.js
export let currentProductParams = {};

// Hacemos que estas funciones sean exportables para que el carrusel las pueda usar
export async function getCartState() {
    try {
        const response = await fetch('api/index.php?resource=cart-details');
        if (!response.ok) return {};
        const data = await response.json();
        const cartState = {};
        if (data.cart_items) {
            data.cart_items.forEach(item => {
                cartState[item.id_producto] = item.cantidad;
            });
        }
        return cartState;
    } catch (error) {
        console.error("No se pudo obtener el estado del carrito:", error);
        return {};
    }
}

export async function getUserFavorites() {
    try {
        const response = await fetch('api/index.php?resource=favorites');
        if (!response.ok) return new Set();
        const favoriteIds = await response.json();
        return new Set(favoriteIds.map(id => parseInt(id, 10)));
    } catch (error) {
        console.error("No se pudieron cargar los favoritos:", error);
        return new Set();
    }
}
/**
 * Función centralizada para crear el HTML de una tarjeta de producto.
 * @param {object} product - El objeto del producto con sus datos.
 * @param {number} cartQuantity - La cantidad actual en el carrito.
 * @param {boolean} isFavorite - Si el producto está en favoritos.
 * @returns {string} El HTML completo de la tarjeta.
 */
export function createProductCardHTML(product, cartQuantity = 0, isFavorite = false) {
    const precioVenta = parseFloat(product.precio_venta);
    const precioOferta = parseFloat(product.precio_oferta);

    // Lógica de visibilidad
    const isLoggedIn = document.querySelector('.my-account-link');
    const canShowDetails = !layoutSettings.details_for_logged_in_only || isLoggedIn;
    
    let priceContainerContent = '';
    let departmentHtml = '';

    if (canShowDetails) {
        let priceHtml = '';
        let codeHtml = '';
        
        // --- INICIO: CÓDIGO CORREGIDO ---
        // Ahora el departamento solo se muestra si la visibilidad general está permitida
        if (layoutSettings.show_product_department) {
            departmentHtml = `<p class="department"> ${product.nombre_departamento}</p>`;
            //Si se quier poner Depto:  despues de <p class="department">
        }
        // --- FIN: CÓDIGO CORREGIDO ---

        if (layoutSettings.show_product_price) {
            if (precioOferta && precioOferta > 0 && precioOferta < precioVenta) {
                priceHtml = `
                    <p class="price-offer">$${precioOferta.toFixed(2)}</p>
                    <p class="price-older">$${precioVenta.toFixed(2)}</p>
                `;
            } else {
                priceHtml = `<p class="price">$${precioVenta.toFixed(2)}</p>`;
            }
        }

        if (layoutSettings.show_product_code) {
            codeHtml = `<p class="code"># ${product.codigo_producto}</p>`;
        }
        priceContainerContent = priceHtml + codeHtml;
    } else {
        priceContainerContent = '<p class="login-prompt-message">Regístrese o inicie sesión para ver la informacion</p>';
    }
    
    let discountBadgeHtml = '';

    if (precioOferta && precioOferta > 0 && precioOferta < precioVenta) {
        const discountPercent = Math.round(((precioVenta - precioOferta) / precioVenta) * 100);
        discountBadgeHtml = `<div class="discount-badge">${discountPercent}%</div>`;
    }   //Antes de ${discountPercent} puede agregarse un "-" para que se vea -40% por ejemplo

    return `
        <div class="product-card" data-product-id="${product.id_producto}">
            <div class="product-card-actions">
                <button class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" data-product-id="${product.id_producto}" aria-label="Añadir a favoritos">&#10084;</button>
                <button class="share-btn" data-product-id="${product.id_producto}" aria-label="Compartir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
            </div>
            <div class="product-image-container">
                <img src="${product.url_imagen || 'https://via.placeholder.com/200'}" alt="${product.nombre_producto}" loading="lazy">
                ${discountBadgeHtml}
            </div>
            <div class="product-info">
                <h3>${product.nombre_producto}</h3>
                ${departmentHtml}
                <div class="price-container">
                    ${priceContainerContent}
                </div>
                <div class="quantity-selector">
                    <button class="quantity-btn minus" data-action="decrease">-</button>
                    <input type="number" class="quantity-input" value="${cartQuantity}" min="0" max="99" data-product-id="${product.id_producto}" aria-label="Cantidad">
                    <button class="quantity-btn plus" data-action="increase">+</button>
                </div>
            </div>
        </div>
    `;
}



export async function loadProducts(productListId, paginationControlsId, params = {}) {
    currentProductParams = { ...currentProductParams, ...params };
    currentProductParams.page = params.page || 1;
    const productListElement = document.getElementById(productListId);
    const paginationControlsElement = document.getElementById(paginationControlsId);
    if (!productListElement || !paginationControlsElement) return;

    let summaryElement = document.getElementById('results-summary');
    if (!summaryElement) {
        summaryElement = document.createElement('div');
        summaryElement.id = 'results-summary';
        summaryElement.className = 'results-summary-style';
        productListElement.parentNode.insertBefore(summaryElement, productListElement);
    }
    
    summaryElement.innerHTML = 'Cargando...';
    productListElement.innerHTML = '<div class="loading-spinner">Cargando...</div>';
    paginationControlsElement.innerHTML = '';
    
    const [cartState, userFavorites] = await Promise.all([getCartState(), getUserFavorites()]);

    const urlParams = new URLSearchParams({ resource: 'products' });
    for (const key in currentProductParams) {
        if (currentProductParams[key] !== null && currentProductParams[key] !== undefined) {
            urlParams.append(key, currentProductParams[key]);
        }
    }

    try {
    const response = await fetch(`api/index.php?${urlParams.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    let summaryText = `<b>${data.total_products}</b> productos encontrados`;
    if (data.filter_name) summaryText += ` para "<b>${data.filter_name}</b>"`;
    summaryElement.innerHTML = summaryText;

    // ===== INICIO DE LA CORRECCIÓN =====
    // Ahora, el scroll SÓLO se ejecutará si 'params.shouldScroll' es verdadero.
    if (params.shouldScroll) {
        summaryElement.scrollIntoView({ block: 'start' });
    }
    // ===== FIN DE LA CORRECCIÓN =====
    
    productListElement.innerHTML = '';
    if (data.products && data.products.length > 0) {
        data.products.forEach(product => {
            const currentQuantity = cartState[product.id_producto] || 0;
            const isFavorite = userFavorites.has(parseInt(product.id_producto, 10));
            
            // Usamos la nueva función centralizada para generar el HTML
            const productCardHtml = createProductCardHTML(product, currentQuantity, isFavorite);
            productListElement.insertAdjacentHTML('beforeend', productCardHtml);
        });
    } else {
        productListElement.innerHTML = '<p>No se encontraron productos.</p>';
    }
    setupPagination(paginationControlsId, data.total_pages, data.current_page, productListId);
} // ... (resto del try-catch)
 catch (error) {
        console.error('Error al cargar productos:', error);
        summaryElement.innerHTML = '<span style="color: red;">Error al cargar resultados.</span>';
        productListElement.innerHTML = '<p>Error al cargar los productos.</p>';
    }
}

export function setupPagination(paginationControlsId, totalPages, currentPage, productListId) {
    const paginationControlsElement = document.getElementById(paginationControlsId);
    if (!paginationControlsElement) return;
    paginationControlsElement.innerHTML = '';
    if (totalPages <= 1) return;

    const maxPagesToShow = window.innerWidth < 768 ? 3 : 5; 
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (currentPage > 1) {
        paginationControlsElement.appendChild(createPageButton('<', currentPage - 1, productListId, paginationControlsId));
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationControlsElement.appendChild(createPageButton(i, i, productListId, paginationControlsId, i === currentPage, true));
    }

    if (currentPage < totalPages) {
        paginationControlsElement.appendChild(createPageButton('>', currentPage + 1, productListId, paginationControlsId));
    }
}

function createPageButton(text, page, productListId, paginationControlsId, isActive = false, isPageNumber = false) {
    const button = document.createElement('button');
    button.textContent = text;
    if (isActive) button.classList.add('active');
    if (isPageNumber) button.classList.add('page-number');
    button.addEventListener('click', () => {
        currentProductParams.page = page;
        loadProducts(productListId, paginationControlsId, currentProductParams);
    });
    return button;
}