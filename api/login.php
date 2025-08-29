<?php
// admin/login_process.php
session_start();
require_once __DIR__ . '/../config/config.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $_SESSION['login_error'] = 'Por favor, ingresa tu usuario y contraseña.';
        header('Location: ../admin//login-form.php');
        exit;
    }

    try {
        // --- 1. SE AÑADE "estado" A LA CONSULTA ---
        $stmt = $pdo->prepare("SELECT id_usuario, nombre_usuario, cod_acceso, rol, permisos, id_tienda, estado FROM usuarios WHERE nombre_usuario = :username");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['cod_acceso'])) {
            
            // --- 2. SE AÑADE LA NUEVA VALIDACIÓN DE ESTADO ---
            if ($user['estado'] === 'inactivo') {
                $_SESSION['login_error'] = 'Acceso bloqueado. Contacta a un administrador.';
                
                header('Location: ../admin/login-form.php');
                exit;
            }
            // --- FIN DE LA VALIDACIÓN ---

            // --- CORRECCIÓN: Se usan los nombres de rol correctos ('bodeguero', 'cajero') ---
            if ($user['rol'] === 'administrador_global' || $user['rol'] === 'admin_tienda' || $user['rol'] === 'empleado' || $user['rol'] === 'bodeguero' || $user['rol'] === 'cajero') {
                
                session_regenerate_id(true);
                
                $_SESSION['loggedin'] = true;
                $_SESSION['id_usuario'] = $user['id_usuario'];
                $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
                $_SESSION['rol'] = $user['rol'];
                $_SESSION['id_tienda'] = $user['id_tienda'];
                
                if ($user['rol'] === 'empleado') {
                    $_SESSION['permisos'] = $user['permisos'];
                }

                header('Location: ../admin/index.php');
                exit;
            } else {
                $_SESSION['login_error'] = 'Tu rol de usuario no tiene un acceso definido.';
                header('Location: ../admin/login-form.php');
                exit;
            }
        } else {
            $_SESSION['login_error'] = 'Usuario o contraseña incorrectos.';
            header('Location: ../admin/login-form.php');
            exit;
        }
    } catch (PDOException $e) {
        $_SESSION['login_error'] = 'Error en la conexión con la base de datos.';
        header('Location: ../admin/login-form.php');
        exit;
    }
} else {
    // Redirigir si no es una solicitud POST
    header('Location: ../admin/login-form.php');
    exit;
}
?>