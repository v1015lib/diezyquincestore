import { createProductCardHTML, getCartState, getUserFavorites } from './ajax/product_loader.js';

const API_BASE_URL = 'api/index.php';

async function fetchCarouselProducts(filters) {
    const urlParams = new URLSearchParams({ resource: 'products', ...filters });
    try {
        const response = await fetch(`${API_BASE_URL}?${urlParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        return data.products;
    } catch (error) {
        console.error("Error fetching carousel products:", error);
        return [];
    }
}

/**
 * Configura un carrusel de productos infinito, automático y proporcional.
 * @param {HTMLElement} carousel - El contenedor del carrusel.
 */
function setupCarousel(carousel) {
    const slidesContainer = carousel.querySelector('.product-carousel-slides');
    const prevButton = carousel.querySelector('.carousel-control.prev');
    const nextButton = carousel.querySelector('.carousel-control.next');

    let originalCards = Array.from(slidesContainer.querySelectorAll('.product-card'));
    if (originalCards.length === 0) {
        if(prevButton) prevButton.style.display = 'none';
        if(nextButton) nextButton.style.display = 'none';
        return;
    }

    // --- Configuración Responsiva y Proporcional ---
    let slidesPerPage;
    const updateSlidesPerPage = () => {
        if (window.innerWidth <= 480) slidesPerPage = 1;
        else if (window.innerWidth <= 768) slidesPerPage = 2;
        else if (window.innerWidth <= 992) slidesPerPage = 3;
        else slidesPerPage = 4;
    };
    updateSlidesPerPage();

    if (originalCards.length <= slidesPerPage) {
        if(prevButton) prevButton.style.display = 'none';
        if(nextButton) nextButton.style.display = 'none';
        slidesContainer.style.justifyContent = 'center'; // Centrar si no hay suficientes para el bucle
        return;
    }

    // --- Lógica de Clonación para Bucle Infinito ---
    const clonesToAppend = originalCards.map(card => card.cloneNode(true));
    const clonesToPrepend = originalCards.map(card => card.cloneNode(true));
    clonesToAppend.forEach(clone => slidesContainer.appendChild(clone));
    clonesToPrepend.reverse().forEach(clone => slidesContainer.insertBefore(clone, originalCards[0]));
    
    let currentIndex = originalCards.length; // Posición inicial (inicio de los items originales)
    let isTransitioning = false;
    let slideInterval;
    const slideIntervalTime = 5000; // 5 segundos

    const updateSlidePosition = (animate = true) => {
        slidesContainer.style.transition = animate ? 'transform 0.8s ease-in-out' : 'none';
        // La posición se basa en el ancho de una tarjeta individual
        const cardWidth = 100 / (originalCards.length * 3); // Total de tarjetas (original + 2 clones)
        slidesContainer.style.transform = `translateX(-${currentIndex * cardWidth}%)`;
    };

    const moveToNext = () => {
        if (isTransitioning) return;
        isTransitioning = true;
        currentIndex += slidesPerPage; // Mover un bloque completo
        updateSlidePosition();
    };
    
    const moveToPrev = () => {
        if (isTransitioning) return;
        isTransitioning = true;
        currentIndex -= slidesPerPage; // Mover un bloque completo
        updateSlidePosition();
    };

    // La magia del bucle infinito: se resetea la posición sin animación
    slidesContainer.addEventListener('transitionend', () => {
        if (currentIndex >= originalCards.length * 2) {
            currentIndex = originalCards.length;
            updateSlidePosition(false);
        }
        if (currentIndex <= slidesPerPage - 1) {
            currentIndex = originalCards.length + (currentIndex % slidesPerPage);
            updateSlidePosition(false);
        }
        isTransitioning = false;
    });

    const startSlideShow = () => {
        stopSlideShow();
        slideInterval = setInterval(moveToNext, slideIntervalTime);
    };

    const stopSlideShow = () => clearInterval(slideInterval);

    nextButton.addEventListener('click', () => {
        moveToNext();
        startSlideShow(); // Reiniciar temporizador
    });
    prevButton.addEventListener('click', () => {
        moveToPrev();
        startSlideShow(); // Reiniciar temporizador
    });
    
    carousel.addEventListener('mouseenter', stopSlideShow);
    carousel.addEventListener('mouseleave', startSlideShow);
    window.addEventListener('resize', () => {
        stopSlideShow();
        // Recargar la lógica en redimensionamiento puede ser complejo,
        // por ahora solo ajustamos variables y reiniciamos.
        updateSlidesPerPage();
        startSlideShow();
    });

    updateSlidePosition(false);
    startSlideShow();
}

async function renderProducts(container, products, cartState, userFavorites) {
    const slidesContainer = container.querySelector('.product-carousel-slides');
    if (!slidesContainer) return;
    slidesContainer.innerHTML = ''; 

    products.forEach(product => {
        const currentQuantity = cartState[product.id_producto] || 0;
        const isFavorite = userFavorites.has(parseInt(product.id_producto, 10));
        slidesContainer.innerHTML += createProductCardHTML(product, currentQuantity, isFavorite);
    });

    setupCarousel(container);
}

export async function initializeProductCarousels() {
    const carousels = document.querySelectorAll('.product-carousel-container');
    if (carousels.length === 0) return;

    const [cartState, userFavorites] = await Promise.all([getCartState(), getUserFavorites()]);

    for (const carousel of carousels) {
        const filters = { ...carousel.dataset };
        const products = await fetchCarouselProducts(filters);
        
        if (products && products.length > 0) {
            await renderProducts(carousel, products, cartState, userFavorites);
        } else if (carousel.parentElement) {
            carousel.parentElement.style.display = 'none';
        }
    }
}