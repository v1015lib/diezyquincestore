<?php
session_start();
require_once __DIR__ . '/../config/config.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $_SESSION['login_error'] = 'Por favor, ingresa tu usuario y contraseña.';
        header('Location: ../admin/login-form.php');
        exit;
    }

    try {
        $stmt = $pdo->prepare("
        SELECT u.id_usuario, u.nombre_usuario, u.cod_acceso, u.rol, u.permisos, u.id_tienda, u.estado, t.nombre_tienda 
        FROM usuarios u
        LEFT JOIN tiendas t ON u.id_tienda = t.id_tienda
        WHERE u.nombre_usuario = :username
    ");
        
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['cod_acceso'])) {
            
            if ($user['estado'] === 'inactivo') {
                $_SESSION['login_error'] = 'Acceso bloqueado. Contacta a un administrador.';
                header('Location: ../admin/login-form.php');
                exit;
            }

            $allowed_roles = ['administrador_global', 'admin_tienda', 'empleado', 'bodeguero', 'cajero'];
            if (in_array($user['rol'], $allowed_roles)) {
                
                session_regenerate_id(true);
                
                $_SESSION['loggedin'] = true;
                $_SESSION['id_usuario'] = $user['id_usuario'];
                $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
                $_SESSION['rol'] = $user['rol'];
                $_SESSION['id_tienda'] = $user['id_tienda'];
        $_SESSION['nombre_tienda'] = $user['nombre_tienda']; 
                
                // --- CORRECCIÓN CLAVE ---
                // Se guardan los permisos para cualquier rol que no sea administrador global.
                // Esto hace el sistema más consistente para roles como 'empleado', 'cajero', etc.
                if ($user['rol'] !== 'administrador_global') {
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
        // En un entorno de producción, sería mejor registrar el error en un log
        // error_log('Error de base de datos en login: ' . $e->getMessage());
        $_SESSION['login_error'] = 'Error en la conexión con la base de datos.';
        header('Location: ../admin/login-form.php');
        exit;
    }
} else {
    header('Location: ../admin/login-form.php');
    exit;
}
?>