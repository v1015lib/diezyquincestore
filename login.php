<?php
// login.php
$page_type = 'simplified';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión</title>
    <link rel="stylesheet" href="css/style.css">
    
</head>
<body class="page-login">
    <?php include 'includes/header.php'; ?>

    <div class="form-container">
        <div class="form-header">
            <h1>Iniciar Sesión</h1>
            <p>Ingresa a tu cuenta para continuar</p>
        </div>

        <div class="form-content">
            <form id="login-form" novalidate>
                <div id="form-message" class="form-message" style="display:none;"></div>

                <div class="form-group floating-label">
                    <input type="text" id="nombre_usuario" name="nombre_usuario" required placeholder=" ">
                    <label for="nombre_usuario">Nombre de usuario</label>
                </div>

                <div class="form-group floating-label">
                    <input type="password" id="password" name="password" required placeholder=" ">
                    <label for="password">Contraseña</label>
                </div>

                <div class="form-navigation">
                    <button type="submit" id="login-btn" class="submit-btn full-width">Ingresar</button>
                </div>
            </form>
            
            <p class="form-footer-link">¿No tienes una cuenta? <a href="registro.php">Regístrate</a></p>
        </div>
    </div>

    <?php include 'includes/footer.php'; ?>
    <div id="notification-container" class="notification-container"></div>
    <script type="module" src="js/login.js">
        
    </script>

</body>
</html>