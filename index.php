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
    <title>Vaiedades 10 y 15</title>
    <meta name="description" content="Busca en la variedad de productos disponibles, lo que buscas en un solo lugar, y horarios de atencion unicos.">
    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="main-container" style="position: relative;">
        <?php include 'includes/sidemenu.php';?>
            <div class="grid-inner">
                <?php include 'includes/carrousel-ads.php';?>

               <?php // --- INICIO: CÓDIGO AÑADIDO --- ?>
                 <?php
                // 1. Incluimos el nuevo archivo que contiene la función
                include 'includes/product_carousel.php';

                // 2. Renderizamos un carrusel de "Productos en Oferta"
                render_product_carousel(
                    'ofertas-carousel', // ID único
                    'Nuestras Mejores Ofertas', // Título
                    ['ofertas' => 'true', 'limit' => 10] // Filtros: Solo ofertas, máximo 10 productos
                );

                // 3. (OPCIONAL) Renderizamos OTRO carrusel para un departamento específico
                render_product_carousel(
                    'papeleria-carousel', // ID único diferente
                    'Lo Mejor en Papelería', // Título diferente
                    ['department_id' => 2, 'limit' => 10] // Filtros: Departamento 2, máximo 10 productos
                );
            ?>
            <?php // --- FIN: CÓDIGO AÑADIDO --- ?>


                <div class="products-container">
                    <div id="product-list" class="product-grid"></div>
                    <div id="pagination-controls" class="pagination"></div>
                </div>    
            
                <?php include 'includes/footer.php'; ?>
            </div>

    </div>

    
    <?php include 'includes/cart_panel.php' ?>


    <div id="notification-container" class="notification-container"></div>

<div id="login-prompt-modal" class="modal-overlay hidden">
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


    <script type="module" src="js/main.js"></script>
</body>
</html>