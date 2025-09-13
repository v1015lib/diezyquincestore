// RUTA: public_html/js/push_manager.js

const API_BASE_URL = 'api/index.php'; 

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function getVapidPublicKey() {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=get-vapid-public-key`);
        if (!response.ok) {
            throw new Error(`Error del servidor al obtener VAPID key: ${response.status}`);
        }
        const data = await response.json();
        if (!data.publicKey) {
            throw new Error("La respuesta de la API no contenía la VAPID public key.");
        }
        console.log("VAPID Key obtenida del servidor.");
        return data.publicKey;
    } catch (error) {
        console.error('Fallo al obtener la VAPID public key:', error);
        return null;
    }
}

async function sendSubscriptionToServer(subscription) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=save-push-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription),
        });
        if (!response.ok) {
            throw new Error(`Error del servidor al guardar la suscripción: ${response.status}`);
        }
        console.log('Suscripción enviada y guardada en el servidor con éxito.');
    } catch (error) {
        console.error('Fallo al enviar la suscripción al servidor:', error);
    }
}

export async function initializePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Las notificaciones push no son soportadas en este navegador.');
        return;
    }

    try {
        // La ruta correcta para el service worker
        const registration = await navigator.serviceWorker.register('service-worker.js');
        console.log('Service Worker registrado correctamente.');

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('El usuario no concedió permiso para las notificaciones.');
            return;
        }
        console.log('Permiso para notificaciones concedido.');

        let subscription = await registration.pushManager.getSubscription();

        if (subscription === null) {
            console.log('No existe suscripción, creando una nueva...');
            
            const vapidPublicKey = await getVapidPublicKey();
            if (!vapidPublicKey) {
                return;
            }

            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('Nueva suscripción creada:', subscription);
            await sendSubscriptionToServer(subscription);

        } else {
            console.log('El usuario ya estaba suscrito:', subscription);
        }

    } catch (error) {
        console.error('Ocurrió un error durante el proceso de inicialización de notificaciones push:', error);
    }
}