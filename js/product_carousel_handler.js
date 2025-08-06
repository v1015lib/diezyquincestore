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
 * REDISEÑO COMPLETO: Configura un carrusel de productos infinito, profesional y fluido.
 * @param {HTMLElement} carouselEl - El elemento contenedor del carrusel.
 */
function setupCarousel(carouselEl) {
    const slidesContainer = carouselEl.querySelector('.product-carousel-slides');
    const prevButton = carouselEl.querySelector('.carousel-control.prev');
    const nextButton = carouselEl.querySelector('.carousel-control.next');
    let originalCards = Array.from(slidesContainer.querySelectorAll('.product-card'));

    if (originalCards.length === 0) {
        if (prevButton) prevButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        return;
    }

    let slidesPerPage;
    const updateSlidesPerPage = () => {
        const width = window.innerWidth;
        if (width <= 480) slidesPerPage = 1;
        else if (width <= 768) slidesPerPage = 2;
        else if (width <= 992) slidesPerPage = 3;
        else slidesPerPage = 4;
    };
    updateSlidesPerPage();

    // Si no hay suficientes tarjetas para hacer un bucle, se centra el contenido y se detiene.
    if (originalCards.length <= slidesPerPage) {
        if (prevButton) prevButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        slidesContainer.style.justifyContent = 'center';
        return;
    }

    // --- Lógica de Clonación Optimizada ---
    const clonesToPrepend = originalCards.slice(-slidesPerPage).map(card => card.cloneNode(true));
    const clonesToAppend = originalCards.slice(0, slidesPerPage).map(card => card.cloneNode(true));
    
    slidesContainer.append(...clonesToAppend);
    slidesContainer.prepend(...clonesToPrepend);

    let allSlides = Array.from(slidesContainer.children);
    let currentIndex = slidesPerPage; // Posición inicial (inicio de los items originales)
    let isTransitioning = false;
    let slideInterval;

    const updateSlidePosition = (animate = true) => {
        slidesContainer.style.transition = animate ? 'transform 0.5s ease-in-out' : 'none';
        const cardWidth = allSlides[0].getBoundingClientRect().width;
        // Ajuste para el gap entre tarjetas
        const gap = parseInt(window.getComputedStyle(slidesContainer).gap) || 0;
        slidesContainer.style.transform = `translateX(-${currentIndex * (cardWidth + gap)}px)`;
    };

    const moveTo = (newIndex) => {
        if (isTransitioning) return;
        isTransitioning = true;
        currentIndex = newIndex;
        updateSlidePosition();
    };

    // Evento que hace la magia del bucle infinito
    slidesContainer.addEventListener('transitionend', () => {
        isTransitioning = false;
        if (currentIndex === 0) {
            currentIndex = originalCards.length;
            updateSlidePosition(false);
        } else if (currentIndex === originalCards.length + slidesPerPage) {
            currentIndex = slidesPerPage;
            updateSlidePosition(false);
        }
    });

    const startSlideShow = () => {
        stopSlideShow();
        slideInterval = setInterval(() => moveTo(currentIndex + 1), 5000);
    };

    const stopSlideShow = () => clearInterval(slideInterval);

    nextButton.addEventListener('click', () => moveTo(currentIndex + 1));
    prevButton.addEventListener('click', () => moveTo(currentIndex - 1));

    carouselEl.addEventListener('mouseenter', stopSlideShow);
    carouselEl.addEventListener('mouseleave', startSlideShow);

    window.addEventListener('resize', () => {
        // En un redimensionamiento, es más seguro y limpio recargar la lógica
        initializeProductCarousels();
    });

    // Posición inicial sin animación
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

    // Llama a la nueva función de configuración del carrusel
    setupCarousel(container);
}

export async function initializeProductCarousels() {
    const carousels = document.querySelectorAll('.product-carousel-container');
    if (carousels.length === 0) return;

    const [cartState, userFavorites] = await Promise.all([getCartState(), getUserFavorites()]);

    for (const carousel of carousels) {
        // Limpiar clones y listeners anteriores si existieran para evitar duplicados en recargas
        const oldSlides = carousel.querySelector('.product-carousel-slides');
        if (oldSlides) {
            const originalCards = Array.from(oldSlides.querySelectorAll('.product-card[data-product-id]'));
            oldSlides.innerHTML = '';
            originalCards.forEach(card => oldSlides.appendChild(card));
        }

        const filters = { ...carousel.dataset };
        const products = await fetchCarouselProducts(filters);
        
        if (products && products.length > 0) {
            await renderProducts(carousel, products, cartState, userFavorites);
        } else if (carousel.parentElement) {
            carousel.parentElement.style.display = 'none';
        }
    }
}