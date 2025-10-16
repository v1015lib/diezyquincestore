<?php
// admin/login_process.php
session_start();
require_once __DIR__ . '/../config/config.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $_SESSION['login_error'] = 'Por favor, ingresa tu usuario y contraseña.';
        header('Location: login-form.php');
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE nombre_usuario = :username");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['cod_acceso'])) {
            if ($user['rol'] === 'administrador') {
                // Regenera el ID de sesión por seguridad
                session_regenerate_id(true);
                
                // Configura las variables de sesión
                $_SESSION['loggedin'] = true;
                $_SESSION['id_usuario'] = $user['id_usuario'];
                $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
                $_SESSION['rol'] = $user['rol'];

                // Redirige al panel principal de administración
                header('Location: ../index.php');
                exit;
            } else {
                $_SESSION['login_error'] = 'No tienes permisos para acceder a esta área.';
                header('Location: ../login-form.php');
                exit;
            }
        } else {
            $_SESSION['login_error'] = 'Usuario o contraseña incorrectos.';
            header('Location: ../login-form.php');
            exit;
        }
    } catch (PDOException $e) {
        // En un entorno de producción, sería mejor registrar este error que mostrarlo
        $_SESSION['login_error'] = 'Error en la conexión con la base de datos.';
        // error_log('Error en login: ' . $e->getMessage()); // Descomenta para registrar errores
        header('Location: ../login-form.php');
        exit;
    }
} else {
    // Si no es una solicitud POST, simplemente redirige al login
    header('Location: ../login-form.php');
    exit;
}
?>