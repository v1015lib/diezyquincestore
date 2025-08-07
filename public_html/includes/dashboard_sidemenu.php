<?php
// includes/dashboard_sidemenu.php
?>
<aside class="dashboard-sidemenu" id="dashboard-sidemenu">
    <div class="dashboard-sidemenu-header">
        <h3>Hola, <?php echo htmlspecialchars($_SESSION['nombre_usuario']); ?></h3>
    </div>
    <nav>
        <ul>
            <li><a href="index.php" class="back-to-store-link">← Volver a la Tienda</a></li>
            <li class="separator"></li>
            <li><a href="dashboard.php?view=perfil">Mi Perfil</a></li>
            <li><a href="dashboard.php?view=favoritos">Mis Favoritos</a></li>
            <li><a href="dashboard.php?view=pedidos">Historial de Pedidos</a></li>
            <li><a href="dashboard.php?view=ofertas">Mis Ofertas</a></li>
            <li class="separator"></li>
            <li><a href="logout.php">Cerrar Sesión</a></li>
        </ul>
    </nav>
</aside>