// REEMPLAZA EL CONTENIDO COMPLETO de public_html/js/main.js

import { loadProducts, currentProductParams, getCartState, getUserFavorites } from './ajax/product_loader.js';
import { initializeSearch } from './ajax/search_handler.js';
import { setupMobileMenu } from './mobile_menu.js';
import { initializeCartView } from './cart_view_handler.js';
import { updateCartHeader } from './cart_updater.js';
import { initializeQuantityHandlers } from './cart_quantity_handler.js';
import { initializeFavoritesHandler } from './favorites_handler.js';
import { showLoginPrompt, initializeModals } from './modal_handler.js';
import { initializeCarousel } from './carrousel.js';
import { initializeProductCarousels } from './product_carousel_handler.js';
import { initializeShareHandler } from './share_handler.js';
import { initializeCookieBanner } from './cookie_handler.js';
import { initializePushNotifications } from './push_manager.js';

const API_BASE_URL = 'api/index.php';

initializeCookieBanner(); 

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización de todos los módulos
    initializeShareHandler();
    setupMobileMenu();
    loadDepartments();
    initializeCartView();
    updateCartHeader();
    initializeQuantityHandlers();
    initializeFavoritesHandler();
    initializeModals(); 
    initializeCarousel('.carousel-container');
    initializeProductCarousels();

    const isLoggedIn = document.querySelector('a[href="dashboard.php"]');
    if (isLoggedIn) {
        console.log("Usuario logueado, inicializando notificaciones PUSH...");
        initializePushNotifications();
    }
    
    // --- INICIO: LÓGICA DE CLICS Y SWIPE EN TARJETAS DE PRODUCTO (CORREGIDA) ---
    // Se eliminó la variable 'productListElement' y el 'if (productListElement)'
    // Los listeners ahora se adjuntan a 'document.body' para funcionar en toda la página.
    
    // Listener ÚNICO para clics en CUALQUIER LUGAR de la página
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
            
            // Prevenimos que el modal se abra si se da clic en un botón de acción
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
    const swipeThreshold = 50; // Mínimo de 50px para considerarlo un swipe

    document.body.addEventListener('touchstart', (event) => { // <-- Adjunto a document.body
        const trackContainer = event.target.closest('.product-image-slider-container');
        if (!trackContainer) return; // No se tocó un slider

        currentTrack = trackContainer.querySelector('.product-image-slider-track');
        currentCard = trackContainer.closest('.product-card');
        if (!currentTrack || !currentCard) return;

        touchStartX = event.touches[0].clientX;
        
        // Obtenemos el índice y total de slides
        const activeDot = currentCard.querySelector('.product-slider-dot.active');
        currentIndex = activeDot ? parseInt(activeDot.dataset.slideIndex, 10) : 0;
        slideCount = currentCard.querySelectorAll('.product-image-slider-track img').length;
        
        if (slideCount <= 1) currentTrack = null; // No hay nada que deslizar
    }, { passive: true }); // Usamos passive: true para mejor rendimiento de scroll

    document.body.addEventListener('touchend', (event) => { // <-- Adjunto a document.body
        if (!currentTrack) return; // Si no empezamos en un track, ignoramos

        touchEndX = event.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;

        let newIndex = currentIndex;

        if (deltaX < -swipeThreshold) {
            // Swipe hacia la izquierda (siguiente imagen)
            newIndex = (currentIndex + 1) % slideCount;
        } else if (deltaX > swipeThreshold) {
            // Swipe hacia la derecha (imagen anterior)
            newIndex = (currentIndex - 1 + slideCount) % slideCount;
        }

        // Si el índice cambió, actualizamos el slider
        if (newIndex !== currentIndex) {
            currentTrack.style.transform = `translateX(-${newIndex * 100}%)`;
            
            const dots = currentCard.querySelectorAll('.product-slider-dot');
            if (dots.length > 0) {
                dots[currentIndex].classList.remove('active');
                dots[newIndex].classList.add('active');
            }
        }

        // Reseteamos las variables de estado
        touchStartX = 0;
        touchEndX = 0;
        currentTrack = null;
        currentCard = null;
        slideCount = 0;
        currentIndex = 0;
    });
    // --- FIN: LÓGICA DE CLICS Y SWIPE (CORREGIDA) ---


    // --- Lógica de carga de productos (sin cambios) ---
    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get('search');
    const productIdFromUrl = urlParams.get('product_id');

    if (productIdFromUrl) {
        document.querySelectorAll('.product-carousel-section, .product-list-controls').forEach(el => el.style.display = 'none');
        loadProducts('product-list', 'pagination-controls', {
            apiBaseUrl: API_BASE_URL,
            product_id: productIdFromUrl,
            hide_no_image: layoutSettings.hide_products_without_image
        });
    } 
    else if (searchTermFromUrl) {
        document.getElementById('search-input').value = searchTermFromUrl;
        loadProducts('product-list', 'pagination-controls', {
            apiBaseUrl: API_BASE_URL,
            search: searchTermFromUrl,
            hide_no_image: layoutSettings.hide_products_without_image
        });
    } 
    else {    
        loadProducts('product-list', 'pagination-controls', {
            sortBy: 'random',
            apiBaseUrl: API_BASE_URL,
            hide_no_image: layoutSettings.hide_products_without_image
        });
    }
    initializeSearch('search-input', 'search-button', 'product-list', 'pagination-controls', API_BASE_URL);

    const sortBySelect = document.getElementById('sort-by');
    if (sortBySelect) {
        sortBySelect.addEventListener('change', () => {
            const [sortBy, order] = sortBySelect.value.split('-');
            const paramsToPreserve = {
                search: currentProductParams.search || null,
                department_id: currentProductParams.department_id || null,
                ofertas: currentProductParams.ofertas || null,
                hide_no_image: layoutSettings.hide_products_without_image 
            };
            loadProducts('product-list', 'pagination-controls', {
                ...paramsToPreserve,
                sort_by: sortBy,
                order: order || 'asc',
                page: 1,
                apiBaseUrl: API_BASE_URL,
                shouldScroll: true
            });
        });
    }

    document.getElementById('sidemenu').addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.department-link')) {
            event.preventDefault();

            document.querySelectorAll('.department-link').forEach(link => {
                link.classList.remove('active');
            });
            target.classList.add('active');
            const departmentId = target.dataset.departmentId;
            let params = { 
                page: 1, 
                apiBaseUrl: API_BASE_URL, 
                shouldScroll: true,
                hide_no_image: layoutSettings.hide_products_without_image
            };
            if (departmentId !== 'all') {
                params.department_id = departmentId;
            } else {
                params.department_id = null;
                params.sortBy = 'random';
            }
            loadProducts('product-list', 'pagination-controls', params);
            document.getElementById('sidemenu').classList.remove('active');
        }
    });
});

/**
 * Muestra un modal con los detalles completos de un producto.
 * @param {object} product El objeto del producto a mostrar.
 */

async function showProductDetailModal(product) {
    const modal = document.getElementById('product-detail-modal');
    const modalContent = document.getElementById('product-detail-content');
    if (!modal || !modalContent) {
        console.error('Elementos del modal no encontrados. AsegÃºrate de que #product-detail-modal y #product-detail-content existan.');
        return;
    }

    // 1. Mostrar el modal INMEDIATAMENTE con un estado de carga (skeleton).
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

    // 2. Cargar datos en segundo plano (sin bloquear)
    const [cartState, userFavorites] = await Promise.all([
        getCartState(),
        getUserFavorites()
    ]);
    
    // 3. (El resto de la función es la misma lógica que ya tenías)
    const cartQuantity = cartState[product.id_producto] || 0;
    const isFavorite = userFavorites.has(parseInt(product.id_producto, 10));

    // Re-calcular precio y estado
    const precioVenta = parseFloat(product.precio_venta);
    const precioOferta = parseFloat(product.precio_oferta);
    const isOutOfStock = product.nombre_estado === 'Agotado';
    
    // Corrección: Usar '!!' (doble negación) para convertir la existencia del elemento en un booleano
    const isLoggedIn = !!document.querySelector('.my-account-link'); 
    const canShowDetails = !layoutSettings.details_for_logged_in_only || isLoggedIn;

    // Slider de Imágenes
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

    // Precio
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
    
    // Código, Departamento y Descripción
    const codeHtml = (canShowDetails && layoutSettings.show_product_code) ? `<p class="code"># ${product.codigo_producto}</p>` : '';
    const departmentHtml = (layoutSettings.show_product_department) ? `<p class="department">${product.nombre_departamento}</p>` : '';
    const descriptionHtml = product.descripcion ? `<p class="description">${product.descripcion}</p>` : '';

    // Selector de Cantidad
    const disabledAttribute = isOutOfStock ? 'disabled' : '';
    const quantitySelectorHtml = `
        <div class="quantity-selector ${isOutOfStock ? 'disabled' : ''}">
            <button class="quantity-btn minus" data-action="decrease" ${disabledAttribute} aria-label="Disminuir cantidad">-</button>
            <input type="number" class="quantity-input" value="${cartQuantity}" min="0" max="99" data-product-id="${product.id_producto}" aria-label="Cantidad" ${disabledAttribute}>
            <button class="quantity-btn plus" data-action="increase" ${disabledAttribute} aria-label="Aumentar cantidad">+</button>
        </div>
    `;
    
    // Botones de Acción (Favorito/Compartir)
    const actionButtonsHtml = `
        <div class="product-modal-actions">
            <button class="favorite-btn ${isFavorite ? 'is-favorite' : ''}" data-product-id="${product.id_producto}" aria-label="Añadir a favoritos">&#10084;</button>
<button class="share-btn" 
        data-product-id="${product.id_producto}" 
        data-product-slug="${product.slug}" 
        data-product-name="${product.nombre_producto}" 
        aria-label="Compartir producto">                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
        </div>
    `;

    // 4. Ensamblar contenido y REEMPLAZAR el skeleton
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
    
    // 5. Activar listeners para el slider *dentro* del modal
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

export async function loadDepartments() {
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