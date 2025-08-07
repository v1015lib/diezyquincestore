<?php
// admin/includes/_header.php
?>
<header class="dashboard-header">
    <div class="dashboard-header-left">
        <div class="logo">
            <a href="../index.php" title="Ir a la Tienda">
                <img src="img/logo.png" alt="Logo de la Tienda">
            </a>
        </div>
    </div>
    
    <div class="header-right-controls">
        <div class="admin-info">
            <span>Bienvenido, <?php echo isset($_SESSION['nombre_usuario']) ? htmlspecialchars($_SESSION['nombre_usuario']) : 'Admin'; ?></span>
        </div>
    </div>        
    
    <button id="admin-menu-toggle" class="dashboard-menu-toggle">&#9776;</button>
</header>