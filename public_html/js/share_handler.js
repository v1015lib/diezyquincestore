// public_html/js/share_handler.js
import { showNotification } from './notification_handler.js';

const shareModal = document.getElementById('share-modal');
const closeBtn = document.getElementById('share-modal-close');
const productNameEl = document.getElementById('share-product-name');

const whatsappBtn = document.getElementById('share-whatsapp');
const facebookBtn = document.getElementById('share-facebook');
const twitterBtn = document.getElementById('share-twitter');
const copyLinkBtn = document.getElementById('share-copy-link');
let productUrlToCopy = '';

function openShareModal(productName, productUrl) {
    if (!shareModal) return;

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
    if (!shareModal) return;
    shareModal.classList.remove('visible');
    setTimeout(() => shareModal.classList.add('hidden'), 300);
}

export function initializeShareHandler() {
    document.body.addEventListener('click', (event) => {
        const shareButton = event.target.closest('.share-btn');
        if (shareButton) {
            const productCard = shareButton.closest('.product-card');
            const productId = productCard.dataset.productId;
            const productName = productCard.querySelector('h3').textContent;
            
            const productUrl = `${window.location.origin}${window.location.pathname.replace('index.php', '')}pageuniquecontent.php?search=${encodeURIComponent(productName)}`;

            openShareModal(productName, productUrl);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeShareModal);
    }
    if (shareModal) {
        shareModal.addEventListener('click', (event) => {
            if (event.target === shareModal) {
                closeShareModal();
            }
        });
    }

    // --- INICIO DE LA CORRECCIÓN PARA COPIAR ENLACE ---
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            // Función de respaldo para entornos no seguros (HTTP)
            const fallbackCopyTextToClipboard = (text) => {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed"; // Evita que la página se desplace
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showNotification('¡Enlace copiado al portapapeles!');
                    closeShareModal();
                } catch (err) {
                    showNotification('No se pudo copiar el enlace.', 'error');
                }
                document.body.removeChild(textArea);
            };

            // Intenta usar la API moderna, y si falla, usa el respaldo
            if (!navigator.clipboard) {
                fallbackCopyTextToClipboard(productUrlToCopy);
                return;
            }
            navigator.clipboard.writeText(productUrlToCopy).then(() => {
                showNotification('¡Enlace copiado al portapapeles!');
                closeShareModal();
            }).catch(err => {
                console.error('Error al usar navigator.clipboard, usando respaldo:', err);
                fallbackCopyTextToClipboard(productUrlToCopy);
            });
        });
    }
    // --- FIN DE LA CORRECCIÓN ---
}