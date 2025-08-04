// js/carousel.js
export function initializeCarousel(containerSelector) {
    const carouselContainer = document.querySelector(containerSelector);
    if (!carouselContainer) return;

    const slides = carouselContainer.querySelectorAll('.carousel-slide');
    const nextBtn = carouselContainer.querySelector('.carousel-control.next');
    const prevBtn = carouselContainer.querySelector('.carousel-control.prev');
    let currentSlide = 0;
    let slideInterval;

    function goToSlide(slideIndex) {
        slides[currentSlide].classList.remove('active');
        currentSlide = (slideIndex + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    function startSlideShow() {
        slideInterval = setInterval(() => {
            goToSlide(currentSlide + 1);
        }, 5000); // Cambia de slide cada 5 segundos
    }

    function stopSlideShow() {
        clearInterval(slideInterval);
    }

    nextBtn.addEventListener('click', () => {
        goToSlide(currentSlide + 1);
        stopSlideShow();
        startSlideShow(); // Reinicia el temporizador al hacer clic
    });

    prevBtn.addEventListener('click', () => {
        goToSlide(currentSlide - 1);
        stopSlideShow();
        startSlideShow(); // Reinicia el temporizador al hacer clic
    });

    // Iniciar el carrusel automático
    startSlideShow();
}