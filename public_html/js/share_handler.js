// public_html/js/share_handler.js

import { showNotification } from './notification_handler.js';

let isInitialized = false;
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
    productUrlToCopy = productUrl; // Guardamos la URL para el botón de copiar

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
    if (isInitialized) {
        return;
    }
    isInitialized = true;

    document.body.addEventListener('click', (event) => {
        // Abrir el modal
        const shareButton = event.target.closest('.share-btn');
        if (shareButton) {
            const productCard = shareButton.closest('.product-card');
            const productSlug = productCard.dataset.productSlug;
            const productName = productCard.querySelector('h3').textContent;
            
            const baseUrl = document.baseURI;
            const productUrl = `${baseUrl}producto/${productSlug}`;

            openShareModal(productName, productUrl);
        }

        // Cerrar el modal
        const shareModal = document.getElementById('share-modal');
        if (shareModal && (event.target.id === 'share-modal-close' || event.target === shareModal)) {
            closeShareModal();
        }

        // --- INICIO DE LA CORRECCIÓN ---
        // Botón de Copiar
        const copyLinkBtn = event.target.closest('#share-copy-link');
        if (copyLinkBtn) {
            
            // Verificamos si navigator.clipboard está disponible (HTTPS / localhost)
            if (navigator.clipboard) {
                navigator.clipboard.writeText(productUrlToCopy).then(() => {
                    showNotification('¡Enlace copiado al portapapeles!');
                    closeShareModal();
                }).catch(err => {
                    console.error('Error al copiar (navigator.clipboard):', err);
                    showNotification('No se pudo copiar el enlace.', 'error');
                });
            } else {
                // Fallback para contextos inseguros (HTTP)
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = productUrlToCopy;
                    
                    // Hacemos el textarea invisible
                    textArea.style.position = 'fixed';
                    textArea.style.top = '-9999px';
                    textArea.style.left = '-9999px';
                    
                    document.body.appendChild(textArea);
                    
                    textArea.select(); // Seleccionamos el contenido
                    document.execCommand('copy'); // Ejecutamos la copia
                    
                    document.body.removeChild(textArea); // Limpiamos el DOM
                    
                    showNotification('¡Enlace copiado al portapapeles!');
                    closeShareModal();
                } catch (err) {
                    console.error('Error al copiar (execCommand):', err);
                    showNotification('No se pudo copiar el enlace.', 'error');
                }
            }
        }
        // --- FIN DE LA CORRECCIÓN ---
    });
}