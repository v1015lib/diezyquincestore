<?php
session_start();
if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true && isset($_SESSION['rol'])) {
   // Si ya está logueado, redirige al panel principal (index.php)
   header("Location: index.php");
   exit(); // Detiene la ejecución del script para asegurar la redirección
}
// Mantenemos esta lógica por si hay un error de sesión antes de que JS actúe
$error_message = $_SESSION['login_error'] ?? '';
unset($_SESSION['login_error']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <link rel="shortcut icon" href="img/favicon.png">    
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración</title>
    <style>
        /* (Tu CSS existente va aquí, no se necesita cambiar) */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Google Sans', 'Roboto', Arial, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .login-container { border: 1px solid #dadce0; border-radius: 8px; padding: 48px 40px 36px 40px; width: 100%; max-width: 450px; background: #fff; }
        .login-header { text-align: center; margin-bottom: 24px; }
        .login-header h1 { font-size: 24px; font-weight: 400; color: #202124; margin-bottom: 8px; }
        .login-header p { font-size: 16px; color: #5f6368; font-weight: 400; }
        .step { display: none; }
        .step.active { display: block; }
        .input-group { margin-bottom: 24px; }
        .input-wrapper { position: relative; }
        .input-wrapper input { width: 100%; padding: 13px 15px; border: 1px solid #dadce0; border-radius: 4px; font-size: 16px; outline: none; transition: border-color 0.2s; }
        .input-wrapper input:focus { border-color: #0C0A4E; border-width: 2px; padding: 12px 14px; }
        .input-wrapper label { position: absolute; left: 15px; top: 13px; color: #5f6368; font-size: 16px; pointer-events: none; transition: all 0.2s ease; background: white; padding: 0 4px; }
        .input-wrapper input:focus + label, .input-wrapper input:not(:placeholder-shown) + label { top: -6px; font-size: 12px; color: #0C0A4E; }
        .button-container { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; }
        .back-button { background: none; border: none; color: #0C0A4E; font-size: 14px; cursor: pointer; padding: 8px; display: none; }
        .back-button:hover { background: rgba(12, 10, 78, 0.04); border-radius: 4px; }
        .next-button, .login-button { background: #0C0A4E; color: white; border: none; border-radius: 4px; padding: 10px 24px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; }
        .next-button:hover, .login-button:hover { background: #D4A017; }
        .next-button:disabled, .login-button:disabled { background: #f8f9fa; color: #5f6368; cursor: not-allowed; }
        .error { color: #d93025; font-size: 12px; margin-top: 4px; min-height: 18px; }
        .success { color: green; font-size: 12px; margin-top: 4px; min-height: 18px; }
        .step-username .back-button { display: none; }
        .step-password .back-button { display: inline-block; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Iniciar sesión</h1>
            <p>Usa tu cuenta asignada</p>
        </div>
        
        <div id="global-error" class="error" style="text-align: center; margin-bottom: 10px;"><?php echo htmlspecialchars($error_message); ?></div>
        
        <form id="loginForm" novalidate>
            <div class="step step-username active">
                <div class="input-group">
                    <div class="input-wrapper">
                        <input type="text" id="username" name="username" placeholder=" " required>
                        <label for="username">Usuario</label>
                    </div>
                    <div id="username-status" class="error"></div> 
                </div>
                
                <div class="button-container">
                    <button type="button" class="back-button">Atrás</button>
                    <button type="button" class="next-button" id="nextBtn" disabled>Siguiente</button>
                </div>
            </div>
            
            <div class="step step-password">
                <div class="input-group">
                    <div class="input-wrapper">
                        <input type="password" id="password" name="password" placeholder=" " required>
                        <label for="password">Contraseña</label>
                    </div>
                </div>
                
                <div class="button-container">
                    <button type="button" class="back-button" id="backBtn">Atrás</button>
                    <button type="submit" class="login-button">Iniciar sesión</button>
                </div>
            </div>
        </form>
    </div>

    <script src="js/login.js"></script>
</body>
</html>