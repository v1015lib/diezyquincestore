// REEMPLAZA EL CONTENIDO COMPLETO de public_html/js/pageuniquecontent.js

// --- Imports necesarios ---
import { loadProducts, getCartState, getUserFavorites } from './ajax/product_loader.js';
import { initializeSearch } from './ajax/search_handler.js';
import { setupMobileMenu } from './mobile_menu.js';
import { initializeCartView } from './cart_view_handler.js';
import { updateCartHeader } from './cart_updater.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js';
import { initializeModals } from './modal_handler.js';
// --- Se eliminó la importación conflictiva de './main.js' ---
import { initializeShareHandler } from './share_handler.js'; 

const API_BASE_URL = 'api/index.php'; 

// --- INICIO: FUNCIÓN 'loadDepartments' AÑADIDA LOCALMENTE ---
// Se copia la función aquí para evitar la importación desde main.js
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=departments`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const departments = await response.json();
        const sidemenuUl = document.querySelector('#sidemenu nav ul');
        if (!sidemenuUl) return;
        sidemenuUl.querySelectorAll('li:not(:first-child)').forEach(li => li.remove());
        if (Array.isArray(departments)) {
            departments.forEach(dept => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="index.php?department_id=${dept.id_departamento}" class="department-link" data-department-id="${dept.id_departamento}">${dept.departamento}</a>`;
                sidemenuUl.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
    }
}
// --- FIN: FUNCIÓN 'loadDepartments' AÑADIDA LOCALMENTE ---


document.addEventListener('DOMContentLoaded', () => {
    // Inicializa todos los módulos comunes
    setupMobileMenu();
    initializeCartView();
    updateCartHeader();
    initializeQuantityHandlers();
    initializeFavoritesHandler();
    initializeModals();
    initializeSearch('search-input', 'search-button', 'product-list', 'pagination-controls', API_BASE_URL);
    initializeShareHandler(); 
    
    // Llama a la función local
    loadDepartments(); 

    // --- INICIO: LÓGICA DE CLICS Y SWIPE (Igual que en main.js) ---
    document.body.addEventListener('click', (event) => {
        
        // 1. Lógica para los PUNTOS del slider de la tarjeta
        if (event.target.classList.contains('product-slider-dot')) {
            event.preventDefault(); 
            event.stopPropagation(); 
            
            const dot = event.target; 
            const card = dot.closest('.product-card');
            if (!card) return;
            
            const track = card.querySelector('.product-image-slider-track');
            const dotsContainer = card.querySelector('.product-slider-dots');
            if (!track || !dotsContainer) return;

            const index = parseInt(dot.dataset.slideIndex, 10);
            if (isNaN(index)) return;

            track.style.transform = `translateX(-${index * 100}%)`;

            dotsContainer.querySelectorAll('.product-slider-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
        } 
        // 2. Lógica para abrir el MODAL DE DETALLES
        else if (event.target.closest('.btn-details') || event.target.closest('.product-image-preview-trigger')) {
            
            if (event.target.closest('.quantity-selector, .favorite-btn, .share-btn')) {
                return; 
            }

            event.preventDefault();
            event.stopPropagation();
            
            const card = event.target.closest('.product-card');
            if (!card) return;
            
            const productDataJson = card.dataset.productJson;
            if (!productDataJson) {
                console.error('No se encontraron datos de producto en la tarjeta.');
                return;
            }
            
            try {
                const product = JSON.parse(productDataJson);
                showProductDetailModal(product); 
            } catch (e) {
                console.error('Error al parsear los datos del producto:', e);
            }
        }
    });

    // Lógica de SWIPE (deslizar con el dedo)
    let touchStartX = 0;
    let touchEndX = 0;
    let currentTrack = null;
    let currentCard = null;
    let slideCount = 0;
    let currentIndex = 0;
    const swipeThreshold = 50; 

    document.body.addEventListener('touchstart', (event) => {
        const trackContainer = event.target.closest('.product-image-slider-container');
        if (!trackContainer) return; 

        currentTrack = trackContainer.querySelector('.product-image-slider-track');
        currentCard = trackContainer.closest('.product-card');
        if (!currentTrack || !currentCard) return;

        touchStartX = event.touches[0].clientX;
        
        const activeDot = currentCard.querySelector('.product-slider-dot.active');
        currentIndex = activeDot ? parseInt(activeDot.dataset.slideIndex, 10) : 0;
        slideCount = currentCard.querySelectorAll('.product-image-slider-track img').length;
        
        if (slideCount <= 1) currentTrack = null;
    }, { passive: true });

    document.body.addEventListener('touchend', (event) => {
        if (!currentTrack) return; 

        touchEndX = event.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;

        let newIndex = currentIndex;

        if (deltaX < -swipeThreshold) {
            newIndex = (currentIndex + 1) % slideCount;
        } else if (deltaX > swipeThreshold) {
            newIndex = (currentIndex - 1 + slideCount) % slideCount;
        }

        if (newIndex !== currentIndex) {
            currentTrack.style.transform = `translateX(-${newIndex * 100}%)`;
            
            const dots = currentCard.querySelectorAll('.product-slider-dot');
            if (dots.length > 0) {
                dots[currentIndex].classList.remove('active');
                dots[newIndex].classList.add('active');
            }
        }

        touchStartX = 0;
        touchEndX = 0;
        currentTrack = null;
        currentCard = null;
        slideCount = 0;
        currentIndex = 0;
    });
    // --- FIN: LÓGICA DE CLICS Y SWIPE ---

    // Carga los productos usando los parámetros definidos en el PHP
    if (typeof productFilterParams !== 'undefined') {
        let params = { 
            ...productFilterParams, 
            page: 1, 
            apiBaseUrl: API_BASE_URL,
            hide_no_image: layoutSettings.hide_products_without_image 
        };
        loadProducts('product-list', 'pagination-controls', params);
    }
});


// --- INICIO: FUNCIÓN DEL MODAL (Igual que en main.js) ---
async function showProductDetailModal(product) {
    const modal = document.getElementById('product-detail-modal');
    const modalContent = document.getElementById('product-detail-content');
    if (!modal || !modalContent) {
        console.error('Elementos del modal no encontrados.');
        return;
    }

    modalContent.innerHTML = `
        <div class="product-detail-modal-layout">
            <div class="product-modal-image-col">
                <div class="skeleton-pulse" style="width: 100%; height: 500px;"></div>
            </div>
            <div class="product-modal-info-col">
                <div class="skeleton-pulse" style="height: 36px; width: 85%; margin-bottom: 0.8rem;"></div>
                <div class="skeleton-pulse" style="height: 20px; width: 50%; margin-bottom: 1.5rem;"></div>
                <div style="padding: 1.2rem 0; border-top: 2px solid #f1f3f5; border-bottom: 2px solid #f1f3f5; margin-bottom: 1.5rem;">
                    <div class="skeleton-pulse" style="height: 40px; width: 45%; margin-bottom: 0.5rem;"></div>
                    <div class="skeleton-pulse" style="height: 24px; width: 100%;"></div>
                </div>
                <div class="skeleton-pulse" style="height: 120px; width: 100%; margin-bottom: auto;"></div>
                <div class="skeleton-pulse" style="height: 56px; width: 180px; align-self: center; border-radius: 12px;"></div>
            </div>
        </div>
    `;
    modal.classList.add('visible');

    const [cartState, userFavorites] = await Promise.all([
        getCartState(),
        getUserFavorites()
    ]);
    
    const cartQuantity = cartState[product.id_producto] || 0;
    const isFavorite = userFavorites.has(parseInt(product.id_producto, 10));

    const precioVenta = parseFloat(product.precio_venta);
    const precioOferta = parseFloat(product.precio_oferta);
    const isOutOfStock = product.nombre_estado === 'Agotado';
    
    const isLoggedIn = !!document.querySelector('.my-account-link'); 
    const canShowDetails = !layoutSettings.details_for_logged_in_only || isLoggedIn;

    let imageSliderHtml = '';
    if (product.imagenes && product.imagenes.length > 0) {
        const imagesHtml = product.imagenes.map((imgUrl, index) => `
            <img src="${imgUrl || 'https://via.placeholder.com/300'}" alt="${product.nombre_producto} - imagen ${index + 1}" loading="lazy">
        `).join('');
        const dotsHtml = product.imagenes.length > 1 ? `
            <div class="product-slider-dots">
                ${product.imagenes.map((_, index) => `<span class="product-slider-dot ${index === 0 ? 'active' : ''}" data-slide-index="${index}"></span>`).join('')}
            </div>
        ` : '';
        imageSliderHtml = `
            <div class="product-image-slider-container">
                <div class="product-image-slider-track">${imagesHtml}</div>
                ${dotsHtml}
            </div>`;
    } else {
        imageSliderHtml = `<img src="https://via.placeholder.com/300" alt="${product.nombre_producto}" loading="lazy" style="width:100%; height:auto;">`;
    }

    let priceHtml = '';
    if (canShowDetails && layoutSettings.show_product_price) {
        if (precioOferta && precioOferta > 0 && precioOferta < precioVenta) {
            priceHtml = `<p class="price-offer">$${precioOferta.toFixed(2)}</p>
                         <p class="price-older">$${precioVenta.toFixed(2)}</p>`;
        } else {
            priceHtml = `<p class="price">$${precioVenta.toFixed(2)}</p>`;
        }
    } else if (!canShowDetails) {
         priceHtml = '<p class="login-prompt-message">Regístrese o inicie sesión para ver la información</p>';
    }
    
    const codeHtml = (canShowDetails && layoutSettings.show_product_code) ? `<p class="code"># ${product.codigo_producto}</p>` : '';
    const departmentHtml = (layoutSettings.show_product_department) ? `<p class="department">${product.nombre_departamento}</p>` : '';
    const descriptionHtml = product.descripcion ? `<p class="description">${product.descripcion}</p>` : '';

    const disabledAttribute = isOutOfStock ? 'disabled' : '';
    const quantitySelectorHtml = `
        <div class="quantity-selector ${isOutOfStock ? 'disabled' : ''}">
            <button class="quantity-btn minus" data-action="decrease" ${disabledAttribute} aria-label="Disminuir cantidad">-</button>
            <input type="number" class="quantity-input" value="${cartQuantity}" min="0" max="99" data-product-id="${product.id_producto}" aria-label="Cantidad" ${disabledAttribute}>
            <button class="quantity-btn plus" data-action="increase" ${disabledAttribute} aria-label="Aumentar cantidad">+</button>
        </div>
    `;
    
    const actionButtonsHtml = `
        <div class="product-modal-actions">
            <button class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" data-product-id="${product.id_producto}" aria-label="Añadir a favoritos">&#10084;</button>
            <button class="share-btn" data-product-id="${product.id_producto}" aria-label="Compartir producto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
        </div>
    `;

    modalContent.innerHTML = `
        <div class="product-detail-modal-layout" data-product-id="${product.id_producto}">
            <div class="product-modal-image-col">
                ${imageSliderHtml}
                ${isOutOfStock ? '<div class="out-of-stock-badge">Agotado</div>' : ''}
            </div>
            <div class="product-modal-info-col">
                ${actionButtonsHtml}
                <h3>${product.nombre_producto}</h3>
                ${departmentHtml}
                <div class="price-container">
                    ${priceHtml}
                    ${codeHtml}
                </div>
                <div class="description-container">
                    ${descriptionHtml}
                </div>
                ${quantitySelectorHtml}
            </div>
        </div>
    `;
    
    const modalSlider = modalContent.querySelector('.product-image-slider-container');
    if (modalSlider) {
        const track = modalSlider.querySelector('.product-image-slider-track');
        const dots = modalSlider.querySelectorAll('.product-slider-dot');
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.slideIndex, 10);
                if(track) track.style.transform = `translateX(-${index * 100}%)`;
                dots.forEach(d => d.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }
}
// --- FIN: FUNCIÓN DEL MODAL ---