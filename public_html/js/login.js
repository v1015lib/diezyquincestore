// js/login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const messageContainer = document.getElementById('form-message');
    const loginBtn = document.getElementById('login-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            loginBtn.disabled = true;
            loginBtn.textContent = 'Ingresando...';

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('api/index.php?resource=login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Ocurrió un error.');
                }

                if (result.success) {
                    messageContainer.textContent = result.message || 'Inicio de sesión exitoso.';
                    messageContainer.className = 'form-message success';
                    messageContainer.style.display = 'block';
                    
                    // Redirigir a la página principal después de 1 segundo
                    setTimeout(() => {
                        window.location.href = 'index.php';
                    }, 1000);
                }

            } catch (error) {
                messageContainer.textContent = error.message;
                messageContainer.className = 'form-message error';
                messageContainer.style.display = 'block';
                
                loginBtn.disabled = false;
                loginBtn.textContent = 'Ingresar';
            }
        });
    }
});