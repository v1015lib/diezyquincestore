// ARCHIVO NUEVO: public_html/js/dashboard_notifications.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('notifications-list-container');
    if (!container) return;

    const loadNotifications = async () => {
        try {
            const response = await fetch('api/index.php?resource=notifications');
            const result = await response.json();

            if (result.success && result.notifications.length > 0) {
                container.innerHTML = '';
                result.notifications.forEach(notif => {
                    const notifDiv = document.createElement('a');
                    notifDiv.href = notif.url_destino || '#';
                    notifDiv.className = `notification-item ${notif.leida == 0 ? 'unread' : 'read'}`;
                    
                    let icon = '🔔';
                    if (notif.tipo_notificacion === 'pedido') icon = '📦';
                    if (notif.tipo_notificacion === 'tarjeta') icon = '💳';
                    if (notif.tipo_notificacion === 'favorito') icon = '⭐';

                    notifDiv.innerHTML = `
                        <span class="notification-icon">${icon}</span>
                        <div class="notification-content">
                            <p>${notif.mensaje}</p>
                            <small>${new Date(notif.fecha_creacion).toLocaleString('es-SV')}</small>
                        </div>
                    `;
                    container.appendChild(notifDiv);
                });
            } else {
                container.innerHTML = '<p>No tienes notificaciones nuevas.</p>';
            }
        } catch (error) {
            container.innerHTML = '<p style="color:red;">Error al cargar notificaciones.</p>';
        }
    };

    loadNotifications();
});