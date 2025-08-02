<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="shortcut icon" href="img/favicon.png">    
    <meta name="robots" content="index, follow">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diez y Quince Store</title>
    <meta name="description" content="Busca en la variedad de productos disponibles, lo que buscas en un solo lugar, y horarios de atencion unicos.">
    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <?php include 'includes/header.php'; ?>

    <div class="main-container" style="position: relative;">
        <?php include 'includes/sidemenu.php'; ?>
            <div class="grid-inner">
                <div class="products-container">
                    <div id="product-list" class="product-grid"></div>
                    <div id="pagination-controls" class="pagination"></div>
                </div>    
            
                <?php include 'includes/footer.php'; ?>
            </div>
    </div>

    <div id="cart-panel" class="cart-panel">
        <div class="cart-header">
            <h2>Mi Carrito</h2>
            <button id="close-cart-btn" class="close-cart-btn">&times;</button>
        </div>
        <div id="cart-content" class="cart-content">
            <p>Tu carrito está vacío.</p>
        </div>
        <div class="cart-footer">
            <div class="cart-total">
                <span>Total:</span>
                <span id="cart-total-price">$0.00</span>
            </div>
            <button class="checkout-btn">Finalizar Compra</button>
        </div>
    </div>
    <div id="cart-overlay" class="cart-overlay"></div>


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