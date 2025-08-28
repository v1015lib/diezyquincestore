<?php
session_start();
$error_message = '';
if (isset($_SESSION['login_error'])) {
    $error_message = $_SESSION['login_error'];
    unset($_SESSION['login_error']);
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración</title>
    <style>
        /* --- TU CSS EXISTENTE VA AQUÍ --- */
        /* (Lo he omitido por brevedad, pero debe estar aquí) */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Google Sans', 'Roboto', Arial, sans-serif;
            background: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .login-container {
            border: 1px solid #dadce0;
            border-radius: 8px;
            padding: 48px 40px 36px 40px;
            width: 100%;
            max-width: 450px;
            background: #fff;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 24px;
        }
        
        .login-header h1 {
            font-size: 24px;
            font-weight: 400;
            color: #202124;
            margin-bottom: 8px;
        }
        
        .login-header p {
            font-size: 16px;
            color: #5f6368;
            font-weight: 400;
        }
        
        .step {
            display: none;
        }
        
        .step.active {
            display: block;
        }
        
        .input-group {
            margin-bottom: 24px;
        }
        
        .input-wrapper {
            position: relative;
        }
        
        .input-wrapper input {
            width: 100%;
            padding: 13px 15px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .input-wrapper input:focus {
            border-color: #0C0A4E;
            border-width: 2px;
            padding: 12px 14px;
        }
        
        .input-wrapper label {
            position: absolute;
            left: 15px;
            top: 13px;
            color: #5f6368;
            font-size: 16px;
            pointer-events: none;
            transition: all 0.2s ease;
            background: white;
            padding: 0 4px;
        }
        
        .input-wrapper input:focus + label,
        .input-wrapper input:not(:placeholder-shown) + label {
            top: -6px;
            font-size: 12px;
            color: #0C0A4E;
        }
        
        .button-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 32px;
        }
        
        .back-button {
            background: none;
            border: none;
            color: #0C0A4E;
            font-size: 14px;
            cursor: pointer;
            padding: 8px;
            display: none;
        }
        
        .back-button:hover {
            background: rgba(12, 10, 78, 0.04);
            border-radius: 4px;
        }
        
        .next-button, .login-button {
            background: #0C0A4E;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .next-button:hover, .login-button:hover {
            background: #D4A017;
        }
        
        .next-button:disabled, .login-button:disabled {
            background: #f8f9fa;
            color: #5f6368;
            cursor: not-allowed;
        }
        
        .error {
            color: #d93025; /* Rojo para errores */
            font-size: 12px;
            margin-top: 4px;
            min-height: 18px; /* Para evitar que el layout salte */
        }

        .success {
            color: green; /* Azul para éxito/verificación */
            font-size: 12px;
            margin-top: 4px;
            min-height: 18px;
        }
        
        .step-username .back-button {
            display: none;
        }
        
        .step-password .back-button {
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Iniciar sesión</h1>
            <p>Usa tu cuenta asignada</p>
        </div>
        
        <?php if (!empty($error_message)): ?>
            <div class="error" style="text-align: center; margin-bottom: 10px;"><?php echo htmlspecialchars($error_message); ?></div>
        <?php endif; ?>
        
        <form id="loginForm" action="api/login.php" method="POST" novalidate>
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

 <script>
        document.addEventListener('DOMContentLoaded', () => {
            const usernameStep = document.querySelector('.step-username');
            const passwordStep = document.querySelector('.step-password');
            const nextBtn = document.getElementById('nextBtn');
            const backBtn = document.getElementById('backBtn');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const usernameStatus = document.getElementById('username-status');

            let debounceTimer;

            usernameInput.addEventListener('input', () => {
                const username = usernameInput.value.trim();
                nextBtn.disabled = true;
                usernameStatus.textContent = '';

                clearTimeout(debounceTimer);

                if (username.length < 3) {
                    if (username.length > 0) {
                        usernameStatus.textContent = 'Ingresa al menos 3 caracteres.';
                        usernameStatus.className = 'error';
                    }
                    return;
                }

                debounceTimer = setTimeout(() => {
                    usernameStatus.textContent = 'Verificando...';
                    usernameStatus.className = 'success';

                    fetch(`api/check_user.php?username=${encodeURIComponent(username)}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.exists) {
                                // ---- 👇 AQUÍ ESTÁ EL CAMBIO ----
                                usernameStatus.textContent = 'Usuario encontrado';
                                usernameStatus.className = 'success';
                                nextBtn.disabled = false;
                            } else {
                                usernameStatus.textContent = 'No se pudo encontrar tu cuenta.';
                                usernameStatus.className = 'error';
                                nextBtn.disabled = true;
                            }
                        })
                        .catch(error => {
                            console.error('Error de red:', error);
                            usernameStatus.textContent = 'Error al verificar. Intenta de nuevo.';
                            usernameStatus.className = 'error';
                        });
                }, 500);
            });
            
            function nextStep() {
                if (!nextBtn.disabled) {
                    usernameStep.classList.remove('active');
                    passwordStep.classList.add('active');
                    passwordInput.focus();
                    
                    document.querySelector('.login-header h1').textContent = 'Bienvenido';
                    document.querySelector('.login-header p').textContent = usernameInput.value;
                }
            }

            nextBtn.addEventListener('click', nextStep);

            usernameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !nextBtn.disabled) {
                    e.preventDefault();
                    nextStep();
                }
            });

            backBtn.addEventListener('click', function() {
                passwordStep.classList.remove('active');
                usernameStep.classList.add('active');
                usernameInput.focus();
                
                document.querySelector('.login-header h1').textContent = 'Iniciar sesión';
                document.querySelector('.login-header p').textContent = 'Usa tu cuenta de administrador';
                usernameStatus.textContent = '';
                nextBtn.disabled = true;
            });
        });
    </script>
</body>
</html>
</body>
</html>