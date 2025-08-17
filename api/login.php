<?php
// admin/login_process.php
session_start();
require_once __DIR__ . '/../config/config.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $_SESSION['login_error'] = 'Por favor, ingresa tu usuario y contraseña.';
        header('Location: ../login-form.php');
        exit;
    }

    try {
        // Se selecciona también la nueva columna de permisos
        $stmt = $pdo->prepare("SELECT id_usuario, nombre_usuario, cod_acceso, rol, permisos FROM usuarios WHERE nombre_usuario = :username");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['cod_acceso'])) {
            // AHORA SE ACEPTAN AMBOS ROLES: 'administrador' y 'empleado'
            if ($user['rol'] === 'administrador' || $user['rol'] === 'empleado') {
                
                session_regenerate_id(true);
                
                $_SESSION['loggedin'] = true;
                $_SESSION['id_usuario'] = $user['id_usuario'];
                $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
                $_SESSION['rol'] = $user['rol'];
                
                // Si el usuario es un empleado, se cargan sus permisos en la sesión
                if ($user['rol'] === 'empleado') {
                    $_SESSION['permisos'] = $user['permisos']; // Guardamos el JSON de permisos
                }

                header('Location: ../index.php');
                exit;
            } else {
                // Este bloque ahora solo se ejecutaría para roles desconocidos o deshabilitados
                $_SESSION['login_error'] = 'Tu rol de usuario no tiene un acceso definido.';
                header('Location: ../login-form.php');
                exit;
            }
        } else {
            $_SESSION['login_error'] = 'Usuario o contraseña incorrectos.';
            header('Location: ../login-form.php');
            exit;
        }
    } catch (PDOException $e) {
        $_SESSION['login_error'] = 'Error en la conexión con la base de datos.';
        header('Location: ../login-form.php');
        exit;
    }
} else {
    header('Location: ../login-form.php');
    exit;
}
?>