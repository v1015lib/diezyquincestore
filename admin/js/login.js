document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return; // Si no estamos en la página de login, no hacer nada.

    const usernameStep = document.querySelector('.step-username');
    const passwordStep = document.querySelector('.step-password');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameStatus = document.getElementById('username-status');
    const globalErrorDiv = document.getElementById('global-error');

    let debounceTimer;

    // --- Lógica para verificar si el usuario existe en la base de datos ---
    usernameInput.addEventListener('input', () => {
        const username = usernameInput.value.trim();
        nextBtn.disabled = true;
        usernameStatus.textContent = '';
        if(globalErrorDiv) globalErrorDiv.textContent = ''; // Limpia el error global al escribir

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

            // Apuntamos al endpoint que solo verifica la existencia del usuario
            fetch(`../api/check_user.php?username=${encodeURIComponent(username)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.exists) {
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

    // --- Funciones para cambiar entre los pasos del formulario ---
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
        document.querySelector('.login-header p').textContent = 'Usa tu cuenta asignada';
        usernameStatus.textContent = '';
        nextBtn.disabled = true;
    });

    // --- Lógica de envío asíncrono (AJAX) al presionar el botón final ---
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Evita la recarga de la página
        const loginButton = this.querySelector('.login-button');
        loginButton.disabled = true;
        loginButton.textContent = 'Ingresando...';
        if(globalErrorDiv) globalErrorDiv.textContent = '';

        const formData = new FormData(this);

        // Apuntamos al nuevo endpoint en el router principal
        fetch('../api/index.php?resource=admin/login', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                // Si el servidor responde con un error (ej. 401, 403), lo capturamos
                return response.json().then(err => { throw new Error(err.error) });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                window.location.href = 'index.php'; // Redirección en caso de éxito
            } else {
                // Esto es por si el servidor responde 200 pero con un error en el JSON
                throw new Error(data.error || 'Ocurrió un error desconocido.');
            }
        })
        .catch(error => {
            if(globalErrorDiv) globalErrorDiv.textContent = error.message;
            loginButton.disabled = false;
            loginButton.textContent = 'Iniciar sesión';
        });
    });
});