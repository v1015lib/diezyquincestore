<?php
// public_html/pageuniquecontent.php
if (session_status() == PHP_SESSION_NONE) { session_start(); }

// 1. Determinar los filtros a partir de la URL
$filter_params = [];
$page_title = "Nuestras Promociones";

if (isset($_GET['department_id'])) {
    $filter_params['department_id'] = (int)$_GET['department_id'];
    // (Opcional) Podrías hacer una consulta a la BD para obtener el nombre del depto y usarlo en el título
    $page_title = "Departamento"; 
}

if (isset($_GET['ofertas']) && $_GET['ofertas'] === 'true') {
    $filter_params['ofertas'] = 'true';
    $page_title = "Productos en Oferta";
}

if (isset($_GET['department_id']) && isset($_GET['ofertas'])) {
    $page_title = "Ofertas del Departamento";
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($page_title); ?> - Variedades 10 y 15</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="shortcut icon" href="img/favicon.png">
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

    <?php include 'includes/cart_panel.php'; // Reutilizamos el panel del carrito ?>
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

    <script>
        const productFilterParams = <?php echo json_encode($filter_params); ?>;
    </script>
    <script type="module" src="js/pageuniquecontent.js"></script>
</body>
</html>