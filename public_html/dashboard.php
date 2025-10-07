
<?php
// dashboard.php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
if (!isset($_SESSION['id_cliente'])) {
    header('Location: login.php');
    exit;
}
$page_type = 'simplified';

$view = $_GET['view'] ?? 'perfil';
?>
<!DOCTYPE html>
<html lang="es">
<head>
<?php
// Construye la URL base absoluta y detecta subcarpetas automáticamente.
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
$path = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
$base_url = "{$protocol}://{$host}{$path}/";
?>
<base href="<?php echo $base_url; ?>">
<base href="<?php echo $base_path; ?>">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="shortcut icon" href="img/favicon.png">    
    <title>Mi Cuenta - <?php echo ucfirst($view); ?></title>
    <link rel="stylesheet" href="css/style.css">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <meta name="robots" content="noindex, follow">

    <script async src="https://www.googletagmanager.com/gtag/js?id=G-HBEVFQFD8Q"></script>
    <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            'analytics_storage': 'denied'
        });
          gtag('js', new Date());

          gtag('config', 'G-HBEVFQFD8Q');
    </script>
</head>
<body>

    <div class="dashboard-layout">

        <?php include 'includes/dashboard_sidemenu.php'; ?>

        <main class="dashboard-main">
            <?php include 'includes/dashboard_header.php'; ?>
            
            <div class="dashboard-content">
                <?php
                switch ($view) {
                    case 'notificaciones':
                    ?>
                        <h1>Mis Notificaciones</h1>
                        <p>Aquí encontrarás las últimas actualizaciones sobre tus pedidos y productos.</p>
                        <div id="notifications-list-container">
                            <p>Cargando notificaciones...</p>
                        </div>
                    <?php
                    break;
                    case 'favoritos':
                    ?>
                    <h1>Mis Favoritos</h1>
                    <p>Selecciona los productos que deseas añadir a tu carrito de compras.</p>

                    <div class="favorites-list-container">
                        <div class="favorites-header">
                            <div class="form-group-checkbox select-all-container">
                                <input type="checkbox" id="select-all-favorites">
                                <label for="select-all-favorites">Seleccionar Todos</label>
                            </div>
                        </div>

                        <div id="favorites-list" class="favorites-list">
                        </div>

                        <div class="favorites-footer">
                            <button id="add-favorites-to-cart-btn" class="submit-btn" disabled>
                                Añadir Seleccionados al Carrito
                            </button>
                        </div>
                    </div>
                    <?php
                        break; // Fin del case 'favoritos'
                        
                        case 'pedidos':
                        ?>
                        <h1>Historial de Pedidos</h1>
                        <p>Aquí puedes ver tus compras anteriores y repetirlas fácilmente.</p>
                        <div id="order-history-container" class="order-history-container">
                        </div>
                        <?php
                            break; // Fin del case 'pedidos'
                            case 'ofertas':
                            ?>
                            <h1>Mis Ofertas</h1>
                            <p>Estos son los productos en oferta según tus departamentos de interés.</p>

                            <div id="ofertas-container" class="product-grid">
                            </div>
                            <?php
                            break; 


                            case 'tarjeta':
                            include 'includes/dashboard_tarjeta.php';
                            break; 


                            case 'perfil':
                            default:
                            ?>
                            <h1>Mi Perfil</h1>
                            <p>Actualiza tu información personal y de seguridad.</p>

                            <div class="profile-forms-grid">

                                <div class="form-container-profile">
                                    <h2>Datos Personales</h2>
                                    <form id="profile-form" novalidate>

                                        <div class="form-group">
                                            <label for="profile-nombre">Nombre</label>
                                            <input type="text" id="profile-nombre" name="nombre" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="profile-apellido">Apellido</label>
                                            <input type="text" id="profile-apellido" name="apellido" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="profile-nombre-usuario">Nombre de Usuario</label>
                                            <input type="text" id="profile-nombre-usuario" name="nombre_usuario" disabled>
                                            <small>El nombre de usuario no se puede cambiar.</small>
                                        </div>
                                        <div class="form-group">
                                            <label for="profile-email">Correo Electrónico</label>
                                            <input type="email" id="profile-email" name="email" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="profile-telefono">Teléfono</label>
                                            <input type="tel" id="profile-telefono" name="telefono">
                                        </div>
                                        <button type="submit" class="submit-btn">Guardar Cambios</button>
                                    </form>
                                </div>

                                <div class="form-container-pass">
                                    <h2>Cambiar Contraseña</h2>
                                    <form id="password-form" novalidate>

                                        <div class="form-group">
                                            <label for="current-password">Contraseña Actual</label>
                                            <input type="password" id="current-password" name="current_password" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="new-password">Nueva Contraseña</label>
                                            <input type="password" id="new-password" name="new_password" required>
                                        </div>
                                        <button type="submit" class="submit-btn">Actualizar Contraseña</button>
                                    </form>
                                </div>
                            </div>
                            <?php
                            break; // Fin del case 'perfil'
                        }
                        ?>
                        
                    </div>
                </main>

            </div>


            <?php include 'includes/cart_panel.php' ?>


            <div id="notification-container" class="notification-container"></div>
            
            <?php // --- INICIO DE LA CORRECCIÓN --- ?>
            <div id="share-modal" class="modal-overlay">
                <div class="modal-content share-modal-content">
                    <div class="modal-header">
                        <h3>Compartir Producto</h3>
                        <button id="share-modal-close" class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="share-product-name" style="font-weight: 600; margin-bottom: 1.5rem;"></p>
                        <div class="share-options">
                            <a href="#" id="share-whatsapp" class="share-option whatsapp" target="_blank" rel="noopener noreferrer">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg" alt="WhatsApp">
                                <span>WhatsApp</span>
                            </a>
                            <a href="#" id="share-facebook" class="share-option facebook" target="_blank" rel="noopener noreferrer">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="Facebook">
                                <span>Facebook</span>
                            </a>
                            <a href="#" id="share-twitter" class="share-option twitter" target="_blank" rel="noopener noreferrer">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg" alt="X (Twitter)">
                                <span>X</span>
                            </a>
                            <button id="share-copy-link" class="share-option copy-link">
                                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'%3E%3C/path%3E%3Crect x='8' y='2' width='8' height='4' rx='1' ry='1'%3E%3C/rect%3E%3C/svg%3E" alt="Copiar">
                                <span>Copiar Enlace</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <?php if ($view === 'notificaciones'): ?>
                <script type="module" src="js/dashboard_notifications.js"></script>
            <?php endif; ?>
            <?php // --- FIN DE LA CORRECCIÓN --- ?>

            <?php if ($view === 'ofertas'): ?>
                <script type="module" src="js/dashboards_offers.js"></script>
            <?php endif; ?>
            <?php if ($view === 'tarjeta'): ?>
                <script type="module" src="js/dashboard_card.js"></script>
            <?php endif; ?>
            <script type="module" src="js/dashboard.js"></script>
            <?php if ($view === 'perfil'): ?>
                <script type="module" src="js/dashboard_profile.js"></script>
            <?php endif; ?>
            <?php if ($view === 'favoritos'): ?>
                <script type="module" src="js/dashboard_favorites.js"></script>
            <?php endif; ?>
            <?php if ($view === 'pedidos'): ?>
                <script type="module" src="js/dashboard_orders.js"></script>
            <?php endif; ?>
    <div id="share-modal" class="modal-overlay">
        <div class="modal-content share-modal-content">
            <div class="modal-header">
                <h3>Compartir Producto</h3>
                <button id="share-modal-close" class="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p id="share-product-name" style="font-weight: 600; margin-bottom: 1.5rem;"></p>
                <div class="share-options">
                    <a href="#" id="share-whatsapp" class="share-option whatsapp" target="_blank" rel="noopener noreferrer">
                        <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg" alt="WhatsApp">
                        <span>WhatsApp</span>
                    </a>
                    <a href="#" id="share-facebook" class="share-option facebook" target="_blank" rel="noopener noreferrer">
                        <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="Facebook">
                        <span>Facebook</span>
                    </a>
                    <a href="#" id="share-twitter" class="share-option twitter" target="_blank" rel="noopener noreferrer">
                        <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg" alt="X (Twitter)">
                        <span>X</span>
                    </a>
                    <button id="share-copy-link" class="share-option copy-link">
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'%3E%3C/path%3E%3Crect x='8' y='2' width='8' height='4' rx='1' ry='1'%3E%3C/rect%3E%3C/svg%3E" alt="Copiar">
                        <span>Copiar Enlace</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
        </body>
        </html>