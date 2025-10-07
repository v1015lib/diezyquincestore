// public_html/js/share_handler.js

import { showNotification } from './notification_handler.js';

// --- INICIO DE LA CORRECCIÓN ---
// Bandera para asegurar que la inicialización ocurra solo una vez.
let isInitialized = false;
// --- FIN DE LA CORRECCIÓN ---

let productUrlToCopy = '';

function openShareModal(productName, productUrl) {
    const shareModal = document.getElementById('share-modal');
    if (!shareModal) {
        console.error('El modal de compartir no se encuentra en la página.');
        return;
    }

    const productNameEl = document.getElementById('share-product-name');
    const whatsappBtn = document.getElementById('share-whatsapp');
    const facebookBtn = document.getElementById('share-facebook');
    const twitterBtn = document.getElementById('share-twitter');

    productNameEl.textContent = productName;
    productUrlToCopy = productUrl;

    const encodedUrl = encodeURIComponent(productUrl);
    const encodedText = encodeURIComponent(`¡Mira este producto que encontré: ${productName}!`);

    whatsappBtn.href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
    facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    twitterBtn.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;

    shareModal.classList.remove('hidden');
    setTimeout(() => shareModal.classList.add('visible'), 10);
}

function closeShareModal() {
    const shareModal = document.getElementById('share-modal');
    if (!shareModal) return;
    shareModal.classList.remove('visible');
}

export function initializeShareHandler() {
    // --- INICIO DE LA CORRECCIÓN ---
    // Si ya fue inicializado, nos detenemos para evitar duplicados.
    if (isInitialized) {
        return;
    }
    isInitialized = true;
    // --- FIN DE LA CORRECCIÓN ---

    document.body.addEventListener('click', (event) => {
        // Abrir el modal
        const shareButton = event.target.closest('.share-btn');
        if (shareButton) {
            const productCard = shareButton.closest('.product-card');
            const productId = productCard.dataset.productId;
            const productName = productCard.querySelector('h3').textContent;
            
            const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
            const productUrl = `${baseUrl}pageuniquecontent.php?product_id=${productId}`;

            openShareModal(productName, productUrl);
        }

        // Cerrar el modal
        const shareModal = document.getElementById('share-modal');
        if (shareModal && (event.target.id === 'share-modal-close' || event.target === shareModal)) {
            closeShareModal();
        }

        // Botón de Copiar
        const copyLinkBtn = event.target.closest('#share-copy-link');
        if (copyLinkBtn) {
            navigator.clipboard.writeText(productUrlToCopy).then(() => {
                showNotification('¡Enlace copiado al portapapeles!');
                closeShareModal();
            }).catch(err => {
                showNotification('No se pudo copiar el enlace.', 'error');
            });
        }
    });
}