<?php
if (session_status() == PHP_SESSION_NONE) { session_start(); }
require_once __DIR__ . '/../config/config.php';

$settings_json = @file_get_contents('http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/api/index.php?resource=layout-settings');
$layout_settings = json_decode($settings_json, true)['settings'] ?? [];

$filter_params = [];
$page_title = "Nuestras Promociones"; // Título por defecto

function getIdBySlug($pdo, $table, $slug) {
    $id_column_map = [
        'productos' => 'id_producto',
        'departamentos' => 'id_departamento',
        'marcas' => 'id_marca' 
    ];
    $id_column = $id_column_map[$table] ?? null;
    if (!$id_column) return null;

    $stmt = $pdo->prepare("SELECT $id_column FROM $table WHERE slug = :slug LIMIT 1");
    $stmt->execute([':slug' => $slug]);
    return $stmt->fetchColumn();
}

// Manejo de páginas que son exclusivas (un solo producto o un solo departamento)
if (isset($_GET['department_slug'])) {
    $department_id = getIdBySlug($pdo, 'departamentos', $_GET['department_slug']);
    if ($department_id) {
        $filter_params['department_id'] = $department_id;
        $stmt_title = $pdo->prepare("SELECT departamento FROM departamentos WHERE id_departamento = :id");
        $stmt_title->execute([':id' => $department_id]);
        if($dept_name = $stmt_title->fetchColumn()){ $page_title = $dept_name; }
    }
} else if (isset($_GET['product_slug'])) {
    $product_id = getIdBySlug($pdo, 'productos', $_GET['product_slug']);
    if ($product_id) {
        $filter_params['product_id'] = $product_id;
        $stmt_title = $pdo->prepare("SELECT nombre_producto FROM productos WHERE id_producto = :id");
        $stmt_title->execute([':id' => $product_id]);
        if($product_name = $stmt_title->fetchColumn()){ $page_title = $product_name; }
    }
} else {
    // --- INICIO DE LA CORRECCIÓN LÓGICA ---
    // Manejo de filtros que se pueden combinar (marca, etiqueta, ofertas)
    $title_parts = [];

    // 1. Revisa si hay una MARCA
    if (isset($_GET['marca_slug'])) {
        $filter_params['marca_slug'] = $_GET['marca_slug'];
        $stmt_marca = $pdo->prepare("SELECT nombre_marca FROM marcas WHERE slug = :slug");
        $stmt_marca->execute([':slug' => $_GET['marca_slug']]);
        if ($marca_name = $stmt_marca->fetchColumn()) {
            $title_parts[] = $marca_name;
        }
    }

    // 2. Revisa si hay una ETIQUETA (independientemente de la marca)
    if (isset($_GET['etiqueta_slug'])) {
        $filter_params['etiqueta_slug'] = $_GET['etiqueta_slug'];
        $stmt_etiqueta = $pdo->prepare("SELECT nombre_etiqueta FROM etiquetas WHERE nombre_etiqueta = :slug");
        $stmt_etiqueta->execute([':slug' => $_GET['etiqueta_slug']]);
        if ($etiqueta_name = $stmt_etiqueta->fetchColumn()) {
            // Pone la etiqueta al principio del título para que suene mejor (ej. "Bolígrafos de BIC")
            array_unshift($title_parts, ucfirst($etiqueta_name));
        }
    }
    
    // 3. Construye el título de la página si se encontró marca o etiqueta
    if (!empty($title_parts)) {
        $page_title = implode(' de ', $title_parts);
    } 
    // 4. Si no hay ni marca ni etiqueta, revisa si es la página de ofertas
    else if (isset($_GET['ofertas']) && $_GET['ofertas'] === 'true') {
        $filter_params['ofertas'] = 'true';
        $page_title = "Productos en Oferta";
    }
    // --- FIN DE LA CORRECCIÓN LÓGICA ---
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
        const layoutSettings = <?php echo json_encode($layout_settings); ?>;
        const productFilterParams = <?php echo json_encode($filter_params); ?>;
    </script>
    <script type="module" src="js/pageuniquecontent.js"></script>
</body>
</html>