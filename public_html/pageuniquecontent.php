<?php
// public_html/pageuniquecontent.php
if (session_status() == PHP_SESSION_NONE) { session_start(); }

// --- INICIO: CÓDIGO AÑADIDO ---
// 1. Obtener la configuración de la tienda desde la API
$settings_json = @file_get_contents('http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/api/index.php?resource=layout-settings');
$layout_settings = json_decode($settings_json, true)['settings'] ?? [];
// --- FIN: CÓDIGO AÑADIDO ---


// 2. Determinar los filtros a partir de la URL (esto ya existía)
$filter_params = [];
$page_title = "Nuestras Promociones";

if (isset($_GET['department_id'])) {
    $filter_params['department_id'] = (int)$_GET['department_id'];
    $page_title = "Departamento"; 
}

if (isset($_GET['ofertas']) && $_GET['ofertas'] === 'true') {
    $filter_params['ofertas'] = 'true';
    $page_title = "Productos en Oferta";
}

if (isset($_GET['department_id']) && isset($_GET['ofertas'])) {
    $page_title = "Ofertas del Departamento";
}
// Si viene un ID de producto, se ajusta el título principal de la página.
// La lógica de las metaetiquetas se gestiona en el include.
if (isset($_GET['product_id']) && is_numeric($_GET['product_id'])) {
    $product_id = (int)$_GET['product_id'];
    $filter_params['product_id'] = $product_id; // <-- ESTA LÍNEA ES LA CLAVE
    
    require_once __DIR__ . '/../config/config.php';
    $stmt_title = $pdo->prepare("SELECT nombre_producto FROM productos WHERE id_producto = :id");
    $stmt_title->execute([':id' => $product_id]);
    if($product_name = $stmt_title->fetchColumn()){
        $page_title = $product_name;
    }
}

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
    <title><?php echo htmlspecialchars($page_title); ?> - Variedades 10 y 15</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="shortcut icon" href="img/favicon.png">
    <?php include 'includes/og_meta_handler.php'; ?>
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
    <?php include 'includes/header.php'; ?>

    <div class="main-container">
        <?php include 'includes/sidemenu.php'; ?>
        <div class="grid-inner">
            <div class="products-container">
                <div id="results-summary" class="results-summary-style"></div>
                <div id="product-list" class="product-grid"></div>
                <div id="pagination-controls" class="pagination"></div>
            </div>
            <?php include 'includes/footer.php'; ?>
        </div>
    </div>

    <?php include 'includes/cart_panel.php'; ?>
    <div id="notification-container" class="notification-container"></div>
    <div id="login-prompt-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <h3>Inicia Sesión para Continuar</h3>
            <p>Debes iniciar sesión o registrarte para efectuar la acción.</p>
            <div class="modal-actions">
                <button id="login-prompt-cancel" class="btn-secondary">Cancelar</button>
                <a href="login.php" class="btn-primary">Iniciar Sesión</a>
            </div>
        </div>
    </div>
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
    <script>
        // --- INICIO: CÓDIGO AÑADIDO ---
        // Ahora también se imprime la configuración global para que los scripts la usen
        const layoutSettings = <?php echo json_encode($layout_settings); ?>;
        // --- FIN: CÓDIGO AÑADIDO ---

        const productFilterParams = <?php echo json_encode($filter_params); ?>;
    </script>
    <script type="module" src="js/pageuniquecontent.js"></script>
</body>
</html>