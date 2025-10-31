// REEMPLAZA EL CONTENIDO COMPLETO de public_html/js/main.js

import { loadProducts, currentProductParams } from './ajax/product_loader.js';
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
    
    // --- INICIO: LÓGICA DEL SLIDER DE IMÁGENES DE LA TARJETA ---
    // Agregamos un listener al contenedor principal de productos
    const productListElement = document.getElementById('product-list');
    if (productListElement) {
        productListElement.addEventListener('click', (event) => {
            // Verificamos si el clic fue en un punto de navegación
if (productListElement) {
        productListElement.addEventListener('click', (event) => {
            
            // Verificamos si el clic fue en un punto de navegación
            if (event.target.classList.contains('product-slider-dot')) {
                event.preventDefault(); // Prevenimos la acción por defecto
                event.stopPropagation(); // <-- ¡¡ARREGLO CLAVE!! Detiene el clic aquí
                
                const dot = event.target; // Definimos dot aquí
                
                // Buscamos la tarjeta (article) más cercana
                const card = dot.closest('.product-card');
                if (!card) return;
                
                // Encontramos el 'track' del slider y el contenedor de 'dots'
                const track = card.querySelector('.product-image-slider-track');
                const dotsContainer = card.querySelector('.product-slider-dots');
                if (!track || !dotsContainer) return;

                // Obtenemos el índice del slide al que ir (desde 'data-slide-index')
                const index = parseInt(dot.dataset.slideIndex, 10);
                if (isNaN(index)) return;

                // Movemos el 'track' horizontalmente
                track.style.transform = `translateX(-${index * 100}%)`;

                // Actualizamos la clase 'active' en los puntos
                dotsContainer.querySelectorAll('.product-slider-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
            }
        });
    }
        });
        let touchStartX = 0;
        let touchEndX = 0;
        let currentTrack = null;
        let currentCard = null;
        let slideCount = 0;
        let currentIndex = 0;
        const swipeThreshold = 50; // Mínimo de 50px para considerarlo un swipe

        productListElement.addEventListener('touchstart', (event) => {
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

        productListElement.addEventListener('touchend', (event) => {
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
    }
    // --- FIN: LÓGICA DEL SLIDER ---


    // El resto de tu código para cargar productos no cambia...
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