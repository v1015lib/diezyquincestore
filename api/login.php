<?php
date_default_timezone_set('America/El_Salvador');

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
        // --- PASO 1: Obtener datos del usuario (ya no necesitamos la columna 'permisos') ---
        $stmt = $pdo->prepare("
            SELECT u.id_usuario, u.nombre_usuario, u.cod_acceso, u.rol, u.id_tienda, u.estado, t.nombre_tienda 
            FROM usuarios u
            LEFT JOIN tiendas t ON u.id_tienda = t.id_tienda
            WHERE u.nombre_usuario = :username
        ");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // --- PASO 2: Verificar usuario, contraseña y estado ---
        if ($user && password_verify($password, $user['cod_acceso'])) {
            
            if ($user['estado'] === 'inactivo') {
                $_SESSION['login_error'] = 'Acceso bloqueado. Contacta a un administrador.';
                header('Location: ../admin/login-form.php');
                exit;
            }

            // --- INICIA LA NUEVA LÓGICA DE ROLES Y PERMISOS ---

            session_regenerate_id(true);
            $_SESSION['loggedin'] = true;
            $_SESSION['id_usuario'] = $user['id_usuario'];
            $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
            $_SESSION['rol'] = $user['rol'];
            $_SESSION['id_tienda'] = $user['id_tienda'];
            $_SESSION['nombre_tienda'] = $user['nombre_tienda'];

            // PASO 3: Manejar el caso especial del Administrador Global
            if ($user['rol'] === 'administrador_global') {
                $_SESSION['permisos'] = json_encode([]); // No necesita permisos, tiene acceso a todo
                header('Location: ../admin/index.php');
                exit;
            }

            // PASO 4: Para TODOS los demás, buscar los permisos en la tabla 'roles'
            $stmt_roles = $pdo->prepare("SELECT permisos FROM roles WHERE nombre_rol = :rol");
            $stmt_roles->execute([':rol' => $user['rol']]);
            $rol_data = $stmt_roles->fetch(PDO::FETCH_ASSOC);

            // VERIFICACIÓN CLAVE: Si el rol existe en la tabla 'roles', cargamos sus permisos.
            if ($rol_data) {
                $_SESSION['permisos'] = $rol_data['permisos'] ?? json_encode([]);
                header('Location: ../admin/index.php');
                exit;
            } else {
                // Si el rol del usuario no se encuentra en la tabla 'roles', no tiene acceso.
                $_SESSION['login_error'] = 'Tu rol de usuario no tiene un acceso definido en el sistema.';
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
    header('Location: ../admin/login-form.php');
    exit;
}
?>