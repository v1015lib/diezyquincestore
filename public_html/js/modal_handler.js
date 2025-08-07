// js/modal_handler.js

const loginPromptModal = document.getElementById('login-prompt-modal');
const cancelPromptBtn = document.getElementById('login-prompt-cancel');

// Función para mostrar la ventana modal
export function showLoginPrompt() {
    if (loginPromptModal) {
        loginPromptModal.classList.remove('hidden');
        // Usamos un pequeño delay para que la transición de opacidad funcione
        setTimeout(() => loginPromptModal.classList.add('visible'), 10);
    }
}

// Función para inicializar los botones de la modal (cerrar)
export function initializeModals() {
    if (cancelPromptBtn && loginPromptModal) {
        cancelPromptBtn.addEventListener('click', () => {
            loginPromptModal.classList.remove('visible');
            // Usamos un delay para que la animación de salida termine antes de ocultarlo
            setTimeout(() => loginPromptModal.classList.add('hidden'), 300);
        });
    }
}