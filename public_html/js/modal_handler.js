// REEMPLAZA EL CONTENIDO COMPLETO de public_html/js/modal_handler.js

// --- Referencias a TODOS los modales ---
const loginPromptModal = document.getElementById('login-prompt-modal');
const imagePreviewModal = document.getElementById('image-preview-modal');
const imagePreviewDisplay = document.getElementById('image-preview-display');
const productDetailModal = document.getElementById('product-detail-modal');

// --- Variables para el estado de la galería del modal ---
let currentGalleryImages = [];
let currentGalleryIndex = 0;

// --- Función para mostrar el modal de Login ---
export function showLoginPrompt() {
    
    // 1. Cerramos el modal de detalles de producto, si está abierto.
    closeProductDetailModal();
    
    // 2. Mostramos el modal de login.
    if (loginPromptModal) {
        // Usamos un pequeño retardo para que la transición sea más suave
        setTimeout(() => {
            loginPromptModal.classList.add('visible');
        }, 50); 
    }
}

// --- NUEVA: Función para renderizar la imagen actual en el modal ---
function showModalImage(index) {
    if (imagePreviewDisplay && currentGalleryImages.length > 0) {
        // Aseguramos que el índice sea cíclico
        currentGalleryIndex = (index + currentGalleryImages.length) % currentGalleryImages.length;
        imagePreviewDisplay.src = currentGalleryImages[currentGalleryIndex];
        
        // Mostrar u ocultar botones de navegación si hay más de 1 imagen
        const navButtons = document.querySelectorAll('.modal-image-nav');
        if (currentGalleryImages.length > 1) {
            navButtons.forEach(btn => btn.style.display = 'block');
        } else {
            navButtons.forEach(btn => btn.style.display = 'none');
        }
    }
}

// --- MODIFICADA: Función para abrir el modal de previsualización ---
function openImagePreview(images, startIndex = 0) {
    if (imagePreviewModal && imagePreviewDisplay) {
        currentGalleryImages = images; // Guardamos todas las imágenes
        imagePreviewModal.classList.add('visible');
        showModalImage(startIndex); // Mostramos la imagen en la que se hizo clic
    }
}

// --- MODIFICADA: Función para cerrar el modal de previsualización ---
function closeImagePreview() {
    if (imagePreviewModal) {
        imagePreviewModal.classList.remove('visible');
        // Limpiamos la galería después de que la transición termine
        setTimeout(() => {
            imagePreviewDisplay.src = '';
            currentGalleryImages = [];
            currentGalleryIndex = 0;
        }, 300);
    }
}

// --- INICIO DE LA CORRECCIÓN ---
// --- Hacemos "exportable" esta función ---
export function closeProductDetailModal() {
    if (productDetailModal) {
        productDetailModal.classList.remove('visible');
        // Opcional: Limpiar el contenido después de cerrar para aligerar el DOM
        const modalContent = document.getElementById('product-detail-content');
        if (modalContent) {
            setTimeout(() => {
                modalContent.innerHTML = '';
            }, 300); // Espera a que la animación de salida termine
        }
    }
}
// --- FIN DE LA CORRECCIÓN ---


// --- MODIFICADA: Función ÚNICA para inicializar TODOS los modales ---
export function initializeModals() {
    
    // --- INICIO: Inyectar botones de navegación en el modal ---
    if (imagePreviewModal && !document.getElementById('modal-nav-prev')) {
        const modalContent = imagePreviewModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.insertAdjacentHTML('beforeend', `
                <button class="modal-image-nav prev" id="modal-nav-prev" aria-label="Imagen anterior">&#10094;</button>
                <button class="modal-image-nav next" id="modal-nav-next" aria-label="Siguiente imagen">&#10095;</button>
            `);
        }
    }
    // --- FIN: Inyección de botones ---

    // Listener para cerrar el modal de login
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'login-prompt-cancel' || event.target === loginPromptModal) {
            if (loginPromptModal) loginPromptModal.classList.remove('visible');
        }
    });

    // Listener para abrir, cerrar y NAVEGAR en el modal de imagen
    document.body.addEventListener('click', (event) => {
        
        if (event.target.classList.contains('product-slider-dot')) {
            return;
        }

        const imageTrigger = event.target.closest('.product-image-preview-trigger');
        
        // Abrir previsualización de imagen
        if (imageTrigger) {
            event.preventDefault();
            
            const card = event.target.closest('.product-card');
            if (!card) return;

            const imagesInSlider = Array.from(card.querySelectorAll('.product-image-slider-track img'));
            const imageUrls = imagesInSlider.map(img => img.src);

            if (imageUrls.length === 0) return; 

            const activeDot = card.querySelector('.product-slider-dot.active');
            let activeIndex = 0;
            if (activeDot) {
                activeIndex = parseInt(activeDot.dataset.slideIndex, 10) || 0;
            }

            openImagePreview(imageUrls, activeIndex);
        }

        // Navegación DENTRO del modal
        if (event.target.id === 'modal-nav-next') {
            showModalImage(currentGalleryIndex + 1);
        }
        if (event.target.id === 'modal-nav-prev') {
            showModalImage(currentGalleryIndex - 1);
        }

        // Cerrar modal de imagen (al hacer clic en fondo o 'X')
        if (event.target === imagePreviewModal || event.target.closest('#image-preview-modal .close-btn')) {
            closeImagePreview();
        }
    });

    // Listener para cerrar el modal de DETALLES DE PRODUCTO
    document.body.addEventListener('click', (event) => {
        if (event.target === productDetailModal || event.target.closest('#product-detail-modal .close-modal-btn')) {
            closeProductDetailModal();
        }
    });
}