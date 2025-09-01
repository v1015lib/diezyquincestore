<?php
// api/logout.php
session_start();

// --- INICIO DE LA MODIFICACIÓN ---
// Limpiar tickets de POS "En Proceso" antes de cerrar sesión
if (isset($_SESSION['id_usuario'])) {
    require_once __DIR__ . '/../config/config.php';
    try {
        $stmt = $pdo->prepare(
            "DELETE FROM ventas WHERE id_usuario_venta = :user_id AND estado_id = 8"
        );
        $stmt->execute([':user_id' => $_SESSION['id_usuario']]);
    } catch (Exception $e) {
        // Si hay un error, lo registramos pero no detenemos el logout
        error_log("Error al limpiar tickets de POS durante el logout: " . $e->getMessage());
    }
}
// --- FIN DE LA MODIFICACIÓN ---

session_unset();
session_destroy();

// Redirige al formulario de login que está en la carpeta 'admin'
header("Location: ../login-form.php");
exit();
?>