<?php
// includes/header.php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
?>
<header class="main-header">
    <div class="header-content <?php echo isset($page_type) && $page_type === 'simplified' ? 'simplified-header' : ''; ?>">
        <div class="logo">
            <a href="index.php">
                <img src="img/logo.png" alt="Logo de la Tienda">
                <img src="img/esbandera.webp" alt="El Salvador" class="season-img">
            </a>
        </div>
  <form action="index.php" method="GET" class="search-bar">
            <input type="text" id="search-input" name="search" placeholder="Que producto buscaba?">
            <button type="submit" id="search-button">Buscar</button>
        </form>

        
        <?php // --- CONDICIÓN AÑADIDA PARA OCULTAR CONTROLES --- ?>
        <?php if (!isset($page_type) || $page_type !== 'simplified'): ?>
            <div class="header-right-controls">
                <nav class="main-nav">
                    <ul>
                        <?php if (isset($_SESSION['id_cliente'])): ?>
                            <li><a href="dashboard.php" class="my-account-link">Mi Cuenta</a></li>
                            <li class="hide-on-mobile"><a href="logout.php">Cerrar Sesión</a></li>
                        <?php else: ?>
                            <li class="hide-on-mobile"><a href="index.php">Inicio</a></li>

                            <li class="hide-on-mobile"><a href="registro.php">Crear Cuenta</a></li>
                            <li><a href="login.php" class="login-link">Iniciar Sesión</a></li>
                        <?php endif; ?>
                    </ul>
                </nav>

                <div class="cart-widget-container">
                    <a href="#" aria-label="Ver carrito de compras">
                        <span class="cart-icon">&#128722;</span>
                        <span id="cart-total-header" class="cart-total-header">$0.00</span>
                    </a>
                </div>

                <div class="mobile-menu-toggle" id="mobile-menu-toggle">
                    &#9776;
                </div>
            </div>
        <?php endif; ?>
    </div>
</header>