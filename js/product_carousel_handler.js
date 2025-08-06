// public_html/js/product_carousel_handler.js

// Importamos la función para crear tarjetas y las funciones para obtener el estado del carrito y favoritos
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

function renderSlides(container, products, cartState, userFavorites) {
    const slidesContainer = container.querySelector('.product-carousel-slides');
    if (!slidesContainer) return;

    slidesContainer.innerHTML = '';
    const itemsPerSlide = window.innerWidth < 480 ? 1 : (window.innerWidth < 768 ? 2 : 4);
    const slidesNeeded = Math.ceil(products.length / itemsPerSlide);

    for (let i = 0; i < slidesNeeded; i++) {
        const slide = document.createElement('div');
        slide.className = 'product-carousel-slide';
        
        const startIndex = i * itemsPerSlide;
        const endIndex = startIndex + itemsPerSlide;
        const slideProducts = products.slice(startIndex, endIndex);

        slideProducts.forEach(product => {
            const currentQuantity = cartState[product.id_producto] || 0;
            const isFavorite = userFavorites.has(parseInt(product.id_producto, 10));
            // ¡Usamos la función centralizada para asegurar consistencia!
            const cardHtml = createProductCardHTML(product, currentQuantity, isFavorite);
            slide.innerHTML += cardHtml;
        });
        slidesContainer.appendChild(slide);
    }
    // Hacemos visible el primer slide
    const firstSlide = slidesContainer.querySelector('.product-carousel-slide');
    if(firstSlide) firstSlide.classList.add('active');
}

function setupCarouselControls(container) {
    const slidesContainer = container.querySelector('.product-carousel-slides');
    const slides = container.querySelectorAll('.product-carousel-slide');
    const nextBtn = container.querySelector('.carousel-control.next');
    const prevBtn = container.querySelector('.carousel-control.prev');
    
    if (slides.length <= 1) {
        nextBtn.style.display = 'none';
        prevBtn.style.display = 'none';
        return;
    }
    
    let currentSlide = 0;
    
    function updateSlidePosition() {
        const offset = -currentSlide * 100;
        slidesContainer.style.transform = `translateX(${offset}%)`;
    }

    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        updateSlidePosition();
    });

    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updateSlidePosition();
    });
}

export async function initializeProductCarousels() {
    const carousels = document.querySelectorAll('.product-carousel-container');
    if (carousels.length === 0) return;

    // Obtenemos el estado del carrito y favoritos una sola vez para todos los carruseles.
    const [cartState, userFavorites] = await Promise.all([getCartState(), getUserFavorites()]);

    for (const carousel of carousels) {
        const filters = { ...carousel.dataset };
        const products = await fetchCarouselProducts(filters);
        if (products && products.length > 0) {
            renderSlides(carousel, products, cartState, userFavorites);
            setupCarouselControls(carousel);
        } else {
            if (carousel.parentElement) {
                carousel.parentElement.style.display = 'none';
            }
        }
    }
}