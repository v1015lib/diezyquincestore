// EN: public_html/js/modal_handler.js

// --- Referencias a TODOS los modales ---
const loginPromptModal = document.getElementById('login-prompt-modal');
const imagePreviewModal = document.getElementById('image-preview-modal');
const imagePreviewDisplay = document.getElementById('image-preview-display');

// --- Función para mostrar el modal de Login ---
export function showLoginPrompt() {
    if (loginPromptModal) {
        loginPromptModal.classList.add('visible');
    }
}

// --- Función para abrir el modal de previsualización de imagen ---
function openImagePreview(imageSrc) {
    if (imagePreviewModal && imagePreviewDisplay) {
        imagePreviewDisplay.src = imageSrc;
        imagePreviewModal.classList.add('visible');
    }
}

// --- Función para cerrar el modal de previsualización de imagen ---
function closeImagePreview() {
    if (imagePreviewModal) {
        imagePreviewModal.classList.remove('visible');
        // Limpiamos la imagen después de que la transición termine
        setTimeout(() => {
            imagePreviewDisplay.src = '';
        }, 300);
    }
}

// --- Función ÚNICA para inicializar TODOS los modales y sus triggers ---
export function initializeModals() {
    // Listener para cerrar el modal de login
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'login-prompt-cancel' || event.target === loginPromptModal) {
            if (loginPromptModal) loginPromptModal.classList.remove('visible');
        }
    });

    // Listener para abrir y cerrar el modal de imagen
    document.body.addEventListener('click', (event) => {
        const imageTrigger = event.target.closest('.product-image-preview-trigger');
        
        // Abrir previsualización de imagen
        if (imageTrigger) {
            event.preventDefault();
            const imageSrc = imageTrigger.querySelector('img')?.src;
            if (imageSrc) {
                openImagePreview(imageSrc);
            }
        }

        // Cerrar modal de imagen (al hacer clic en fondo o 'X')
        if (event.target === imagePreviewModal || event.target.closest('#image-preview-modal .close-btn')) {
            closeImagePreview();
        }
    });
}