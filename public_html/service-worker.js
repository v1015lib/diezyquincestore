// EN: public_html/service-worker.js

self.addEventListener('push', function(event) {
    let data;
    try {
        // Intenta interpretar los datos como JSON, que es lo que envía tu API.
        data = event.data.json();
    } catch (e) {
        // Si falla (como en una prueba desde el navegador), lo trata como texto simple.
        data = {
            title: 'Nueva Notificación',
            body: event.data.text(),
            icon: 'img/favicon.png', // Icono por defecto para pruebas
            data: { url: '/' } // URL por defecto
        };
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: 'img/favicon.png', // Un ícono pequeño para la barra de notificaciones
        data: {
            url: data.data.url // Guardamos la URL para abrirla al hacer clic
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Cierra la notificación

    // Abre la URL asociada o la página principal si no hay URL
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});