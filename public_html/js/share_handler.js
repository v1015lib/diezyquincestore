// REEMPLAZA EL CONTENIDO COMPLETO DE: public_html/js/share_handler.js

import { showNotification } from './notification_handler.js';
// Importamos la función para cerrar el modal de detalles
import { closeProductDetailModal } from './modal_handler.js';

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
    productUrlToCopy = productUrl; 

    const encodedUrl = encodeURIComponent(productUrl);
    const encodedText = encodeURIComponent(`¡Mira este producto que encontré: ${productName}!`);

    whatsappBtn.href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
    facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    twitterBtn.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;

    shareModal.classList.remove('hidden');
    // Aumentamos el retardo a 50ms para asegurar que la animación sea fluida
    setTimeout(() => shareModal.classList.add('visible'), 50);
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
            
            let productSlug = shareButton.dataset.productSlug;
            let productName = shareButton.dataset.productName;

            if (!productSlug || !productName) {
                const productCard = shareButton.closest('.product-card');
                if (productCard) {
                    productSlug = productCard.dataset.productSlug;
                    productName = productCard.querySelector('h3').textContent;
                }
            }
            
            if (!productSlug || !productName) {
                console.error('Share handler: No se pudo encontrar el slug o el nombre del producto.');
                return;
            }

            const baseUrl = document.baseURI;
            const productUrl = `${baseUrl.replace(/\/$/, '')}/producto/${productSlug}`;
            
            // --- INICIO DE LA CORRECCIÓN ---
            // 1. Verificamos si el botón está DENTRO del modal de detalles
            const isInsideDetailModal = shareButton.closest('#product-detail-modal');

            // 2. Si está en el modal (sin importar quién sea)...
            if (isInsideDetailModal) {
                // Cerramos el modal de detalles primero
                closeProductDetailModal();
                
                // Esperamos un breve momento para que la animación de cierre comience
                setTimeout(() => {
                    openShareModal(productName, productUrl);
                }, 100); 
            } else {
                // Si está en la cuadrícula de productos, solo abre el modal
                openShareModal(productName, productUrl);
            }
            // --- FIN DE LA CORRECCIÓN ---
        }

        // Cerrar el modal de compartir
        const shareModal = document.getElementById('share-modal');
        if (shareModal && (event.target.id === 'share-modal-close' || event.target === shareModal)) {
            closeShareModal();
        }

        // Botón de Copiar
        const copyLinkBtn = event.target.closest('#share-copy-link');
        if (copyLinkBtn) {
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(productUrlToCopy).then(() => {
                    showNotification('¡Enlace copiado al portapapeles!');
                    closeShareModal();
                }).catch(err => {
                    console.error('Error al copiar (navigator.clipboard):', err);
                    showNotification('No se pudo copiar el enlace.', 'error');
                });
            } else {
                // Fallback para HTTP
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = productUrlToCopy;
                    textArea.style.position = 'fixed';
                    textArea.style.top = '-9999px';
                    textArea.style.left = '-9999px';
                    
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    showNotification('¡Enlace copiado al portapapeles!');
                    closeShareModal();
                } catch (err) {
                    console.error('Error al copiar (execCommand):', err);
                    showNotification('No se pudo copiar el enlace.', 'error');
                }
            }
        }
    });
}