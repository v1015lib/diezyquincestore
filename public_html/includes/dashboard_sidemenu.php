<?php
// public_html/includes/dashboard_sidemenu.php
// VERSIÓN FINAL Y CORREGIDA

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../../config/config.php';

$tiene_tarjeta = false;

if (isset($_SESSION['id_cliente'])) {
    
    // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
    // Forzamos que el ID de la sesión sea un número entero (integer).
    // Esto asegura que la comparación en la base de datos sea 100% precisa.
    $clientId = (int)$_SESSION['id_cliente'];
    // --- FIN DE LA CORRECCIÓN DEFINITIVA ---

    try {
        // La consulta no cambia, pero ahora el parámetro que se envía es un número garantizado.
        $stmt = $pdo->prepare("SELECT 1 FROM tarjetas_recargables WHERE id_cliente = ? LIMIT 1");
        $stmt->execute([$clientId]);
        
        if ($stmt->fetch()) {
            $tiene_tarjeta = true;
        }
    } catch (PDOException $e) {
        // En caso de un error de base de datos, lo registramos para futuras revisiones.
        error_log("Error al verificar la tarjeta del cliente: " . $e->getMessage());
    }
}
?>
<aside class="dashboard-sidemenu" id="dashboard-sidemenu">
    <div class="dashboard-sidemenu-header">
        <h3>Hola, <?php echo isset($_SESSION['nombre_usuario']) ? htmlspecialchars($_SESSION['nombre_usuario']) : 'Invitado'; ?></h3>
    </div>
    <nav>
        <ul>
            <li><a href="index.php" class="back-to-store-link">← Volver a la Tienda</a></li>
            <li class="separator"></li>
            <li><a href="dashboard.php?view=perfil">Mi Perfil</a></li>
            
            <?php if ($tiene_tarjeta): ?>
                <li><a href="dashboard.php?view=tarjeta">Mi Tarjeta</a></li>
            <?php endif; ?>

            <li><a href="dashboard.php?view=favoritos">Mis Favoritos</a></li>
            <li><a href="dashboard.php?view=pedidos">Historial de Pedidos</a></li>
            <li><a href="dashboard.php?view=ofertas">Mis Ofertas</a></li>
            <li class="separator"></li>
            <li><a href="logout.php">Cerrar Sesión</a></li>
        </ul>
    </nav>
</aside>