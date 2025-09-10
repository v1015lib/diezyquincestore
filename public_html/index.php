<?php 

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$settings_json = @file_get_contents('http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/api/index.php?resource=layout-settings');

// 2. Valores por "defecto" actualizados para la nueva estructura
$layout_settings = json_decode($settings_json, true)['settings'] ?? [
    'show_main_carousel' => true,
    'show_offers_carousel' => true,
    'offers_carousel_config' => ['title' => 'Ofertas', 'filters' => ['ofertas' => 'true', 'limit' => 10]],
    'show_department_carousel' => true,
    'department_carousel_config' => ['title' => 'Departamento', 'filters' => ['department_id' => 8, 'limit' => 10]]
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link rel="shortcut icon" href="img/favicon.png">    
    <meta name="robots" content="index, follow">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Variedades 10 y 15</title>
    <meta name="description" content="Busca en la variedad de productos disponibles, lo que buscas en un solo lugar, y horarios de atencion unicos.">

    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="css/style.css">
    <!-- Google tag (gtag.js) -->
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

    <div class="main-container" style="position: relative;">
        <?php include 'includes/sidemenu.php';?>
            <div class="grid-inner">
                <?php 
                    if ($layout_settings['show_main_carousel']) {
                        include 'includes/carrousel-ads.php';
                    }
                ?>

                <?php 
                    include 'includes/product_carousel.php';

                    // --- INICIO DE LA CORRECCIÓN ---

                    // Carrusel #1: RENDERIZA LAS OFERTAS
                    if ($layout_settings['show_offers_carousel']) {
                        $config = $layout_settings['offers_carousel_config'];
                        render_product_carousel(
                            'ofertas-carousel',
                            $config['title'],
                            $config['filters']
                        );
                    }
                
                    // Carrusel #2: RENDERIZA EL DEPARTAMENTO DESTACADO
                    if ($layout_settings['show_department_carousel']) {
                        $config = $layout_settings['department_carousel_config'];
                        render_product_carousel(
                            'department-carousel', // ID genérico
                            $config['title'],
                            $config['filters']
                        );
                    }
                    // --- FIN DE LA CORRECCIÓN ---
                ?>

                <div class="products-container">
                        <div class="product-list-controls">
                            <div id="results-summary" class="results-summary-style"></div>
                            <div class="sort-control">
                                <label for="sort-by">Ordenar por:</label>
                                <select id="sort-by" name="sort-by">
                                    <option value="random">Relevancia</option>
                                    <option value="nombre_producto-asc">Nombre (A a Z)</option>
                                    <option value="nombre_producto-desc">Nombre (Z a A)</option>
                                    <option value="precio_venta-asc">Precio (Menor a Mayor)</option>
                                    <option value="precio_venta-desc">Precio (Mayor a Menor)</option>
                                </select>
                            </div>
                        </div>
                    <div id="product-list" class="product-grid"></div>
                    <div id="pagination-controls" class="pagination"></div>
                </div>    
            
                <?php include 'includes/footer.php'; ?>
                <?php include 'includes/cookie_banner.php'; ?>


            </div>
    </div>
    
    <?php include 'includes/cart_panel.php' ?>
    <div id="notification-container" class="notification-container"></div>
    
    <div id="login-prompt-modal" class="modal-overlay">
        <div class="modal-content">
            <h3>Inicia Sesión para Continuar</h3>
            <p>Debe inciar sesion o registrarte para efectuar la accion :)
            </br>Adelante, No te llevara mucho tiempo</p>
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

    <div id="image-preview-modal" class="modal-overlay">
        <div class="modal-content image-preview-content">
            <span class="close-btn">&times;</span>
            <img id="image-preview-display" src="" alt="Previsualización de imagen">
        </div>
    </div>
    
    <script type="module" src="js/main.js"></script>
    <script>
        const layoutSettings = <?php echo json_encode($layout_settings); ?>;
    </script>


</body>
</html>