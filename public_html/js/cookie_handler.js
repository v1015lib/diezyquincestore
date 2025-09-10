// public_html/js/cookie_handler.js

export function initializeCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('cookie-accept-btn');

    if (!banner || !acceptBtn) {
        return;
    }

    // Función para dar consentimiento a Google Analytics
    function grantAnalyticsConsent() {
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
            console.log("Consentimiento de analítica otorgado.");
        }
    }

    // Comprobar si el usuario ya ha aceptado las cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');

    if (cookiesAccepted) {
        // Si ya aceptó, activamos la analítica inmediatamente
        grantAnalyticsConsent();
    } else {
        // Si no ha aceptado, mostramos el banner
        setTimeout(() => {
            banner.classList.add('visible');
        }, 1500);
    }

    // Cuando el usuario hace clic en el botón de aceptar
    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('cookiesAccepted', 'true');
        grantAnalyticsConsent();
        banner.classList.remove('visible');
    });
}