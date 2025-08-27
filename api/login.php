<?php
// admin/api/login.php (Versión Corregida)
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/config.php'; 

// Si el método no es POST, no se procesa nada.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../login-form.php');
    exit;
}

// --- CORRECCIÓN CLAVE ---
// Se leen los datos desde $_POST, que es como los envía el formulario de admin.
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($username) || empty($password)) {
    $_SESSION['login_error'] = 'Usuario y contraseña son requeridos.';
    header('Location: ../login-form.php');
    exit;
}

try {
    // La consulta ahora también pide el 'id_tienda' del usuario.
    $stmt = $pdo->prepare("SELECT id_usuario, nombre_usuario, cod_acceso, rol, permisos, id_tienda FROM usuarios WHERE nombre_usuario = :username");
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verificamos si el usuario existe y la contraseña es correcta.
    if ($user && password_verify($password, $user['cod_acceso'])) {
        // Limpiamos cualquier error de login anterior.
        unset($_SESSION['login_error']);

        // Regeneramos la sesión por seguridad.
        session_regenerate_id(true);

        // Guardamos todos los datos necesarios en la sesión.
        $_SESSION['loggedin'] = true;
        $_SESSION['id_usuario'] = $user['id_usuario'];
        $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
        $_SESSION['rol'] = $user['rol'];
        $_SESSION['permisos'] = $user['permisos'];

        // Si es un empleado, guardamos el ID de su tienda asignada.
        if ($user['rol'] === 'empleado' && !empty($user['id_tienda'])) {
            $_SESSION['id_tienda'] = $user['id_tienda'];
        }
        
        // Redirigimos al panel de administración principal tras un login exitoso.
        header('Location: ../index.php');
        exit;

    } else {
        // Si los datos son incorrectos, guardamos el error y redirigimos de vuelta.
        $_SESSION['login_error'] = 'Usuario o contraseña incorrectos.';
        header('Location: ../login-form.php');
        exit;
    }

} catch (PDOException $e) {
    // Si hay un error de base de datos, lo registramos y redirigimos.
    $_SESSION['login_error'] = 'Error en el servidor. Intenta más tarde.';
    error_log("Error de login (admin): " . $e->getMessage());
    header('Location: ../login-form.php');
    exit;
}