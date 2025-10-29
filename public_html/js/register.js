import { showNotification } from './notification_handler.js';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    if (!form) return;

    const steps = Array.from(form.querySelectorAll('.form-step'));
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const formTitle = document.getElementById('form-title');
    const progressBarFill = document.getElementById('progress-bar-fill');
    
    // --- Campos y elementos específicos ---
    const studentChoiceButtons = document.querySelectorAll('.btn-choice');
    const isStudentCheckInput = document.getElementById('is_student_check');
    const studentInfoStep = document.querySelector('[data-step="5"]');
    
    // --- Campos de validación en tiempo real ---
    const usernameInput = document.getElementById('nombre_usuario');
    const phoneInput = document.getElementById('telefono');
    const emailInput = document.getElementById('email');

    let currentStep = 0;

    // --- Función de chequeo que DEVUELVE un valor (para validación) ---
    /**
     * Verifica la disponibilidad de un campo contra la API.
     * @param {string} field - El nombre del campo (ej: 'username').
     * @param {string} value - El valor a verificar.
     * @param {string} endpoint - El endpoint de la API (ej: 'check-username').
     * @param {string} messageElementId - El ID del elemento donde mostrar el mensaje.
     * @returns {Promise<boolean>} - true si está disponible, false si no lo está.
     */
    const checkFieldValidity = async (field, value, endpoint, messageElementId) => {
        const messageElement = document.getElementById(messageElementId);
        
        // Si el campo es opcional y está vacío, es VÁLIDO y no mostramos mensaje.
        if (field === 'email' && !value) {
            if (messageElement) {
                messageElement.textContent = '';
                messageElement.className = 'form-message';
            }
            return true; // Email opcional es válido si está vacío
        }
        
        // Si es un campo requerido y está vacío
        if (!value) {
            if (messageElement) {
                messageElement.textContent = '';
                messageElement.className = 'form-message';
            }
            return false;
        }

        try {
            const response = await fetch(`api/index.php?resource=${endpoint}&${field}=${encodeURIComponent(value)}`);
            const result = await response.json();
            
            if (result.is_available) {
                if (messageElement) {
                    messageElement.textContent = 'Disponible';
                    messageElement.className = 'form-message success';
                }
                return true; // Está disponible
            } else {
                if (messageElement) {
                    messageElement.textContent = 'No disponible';
                    messageElement.className = 'form-message error';
                }
                return false; // NO está disponible
            }
        } catch (error) {
            if (messageElement) {
                messageElement.textContent = 'Error al verificar';
                messageElement.className = 'form-message error';
            }
            return false; // Asumimos que no es válido si hay un error de red
        }
    };

    // --- Función de chequeo VISUAL (para onblur) ---
    const checkAvailabilityVisual = (field, value, endpoint, messageElementId) => {
        checkFieldValidity(field, value, endpoint, messageElementId);
    };


    const updateTotalSteps = () => {
        const visibleSteps = steps.filter(step => !step.classList.contains('step-hidden'));
        return visibleSteps.length;
    };

    const updateFormView = () => {
        const visibleSteps = steps.filter(step => !step.classList.contains('step-hidden'));
        const totalSteps = visibleSteps.length;
        
        visibleSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        const percentage = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
        if (progressBarFill) {
            progressBarFill.style.width = percentage + '%';
        }

        btnPrev.style.display = currentStep > 0 ? 'inline-block' : 'none';
        btnNext.textContent = currentStep === totalSteps - 1 ? 'Finalizar Registro' : 'Siguiente';
        
        // Deshabilitar el botón si estamos en el paso 4 (pregunta de estudiante) y no se ha seleccionado nada
        const currentStepElement = visibleSteps[currentStep];
        if (currentStepElement && currentStepElement.dataset.step === "4") {
            const hasSelection = isStudentCheckInput.value !== "";
            btnNext.disabled = !hasSelection;
        } else {
            btnNext.disabled = false;
        }
    };
    
    // --- VALIDATESTEP AHORA ES ASÍNCRONA ---
    const validateStep = async (stepIndex) => {
        const step = steps.filter(s => !s.classList.contains('step-hidden'))[stepIndex];
        if (!step) return false;

        const inputs = Array.from(step.querySelectorAll('input[required], select[required]'));
        let isStepValid = true;

        // --- Validación de Nombre (Paso 1) ---
        if (step.dataset.step === "1") {
            const nameRegex = /^[a-zA-Z\s]*$/;
            const nombreInput = document.getElementById('nombre');
            const apellidoInput = document.getElementById('apellido');
            
            if (!nombreInput.value.trim()) {
                showNotification('El campo "Nombre" es obligatorio.', 'error');
                return false;
            }
            if (!nameRegex.test(nombreInput.value)) {
                showNotification('El nombre solo puede contener letras y espacios.', 'error');
                return false; 
            }
            if (apellidoInput.value && !nameRegex.test(apellidoInput.value)) {
                showNotification('El apellido solo puede contener letras y espacios.', 'error');
                return false; 
            }
        }
        
        // Validación genérica de campos requeridos
        for (const input of inputs) {
            if (!input.value.trim()) {
                const labelElement = input.labels ? input.labels[0] : null;
                const labelText = labelElement ? labelElement.innerText.replace('*','').trim() : 'Este campo';
                
                showNotification(`El campo "${labelText}" es obligatorio.`, 'error');
                isStepValid = false;
                break;
            }
        }
        if (!isStepValid) return false;

        // --- Validación de Cuenta (Paso 2) ---
        if (step.dataset.step === "2") {
            
            // 1. Validar formato de WhatsApp (8 dígitos)
            const phoneInput = document.getElementById('telefono');
            const phoneRegex = /^\d{8}$/; // Regex para exactamente 8 dígitos
            if (!phoneRegex.test(phoneInput.value)) {
                showNotification('El número de WhatsApp debe tener 8 dígitos (ej: 68345121).', 'error');
                isStepValid = false;
            }

            // 2. Validar disponibilidad de Usuario (ASÍNCRONO)
            const usernameInput = document.getElementById('nombre_usuario');
            const isUsernameValid = await checkFieldValidity(
                'username', 
                usernameInput.value, 
                'check-username', 
                'username-availability'
            );
            
            if (!isUsernameValid) {
                showNotification('El nombre de usuario no está disponible. Por favor, elige otro.', 'error');
                isStepValid = false;
            }
            
            // 3. Validar Email (si se escribió uno)
            const emailInput = document.getElementById('email');
            if (emailInput.value.trim() !== '') {
                 const isEmailValid = await checkFieldValidity(
                    'email',
                    emailInput.value,
                    'check-email',
                    'email-availability'
                 );
                 if (!isEmailValid) {
                    showNotification('El correo ingresado ya está en uso.', 'error');
                    isStepValid = false;
                 }
            }
        }

        // Validación de Contraseña (Paso 3)
        if (isStepValid && step.dataset.step === "3") {
            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password_confirm').value;
            
            if (password.length < 6) {
                showNotification('La contraseña debe tener al menos 6 caracteres.', 'error');
                isStepValid = false;
            } else if (password !== passwordConfirm) {
                showNotification('Las contraseñas no coinciden.', 'error');
                isStepValid = false;
            }
        }
        
        // --- Validación de Información de Estudiante (Paso 5) ---
        if (step.dataset.step === "5") {
            const institucionInput = document.getElementById('institucion');
            const gradoInput = document.getElementById('grado_actual');
            
            if (!institucionInput.value.trim()) {
                showNotification('El campo "Institución Educativa" es obligatorio.', 'error');
                return false;
            }
            if (!gradoInput.value.trim()) {
                showNotification('El campo "Grado Actual" es obligatorio.', 'error');
                return false;
            }
        }
        
        return isStepValid;
    };

    const handleFormSubmission = async () => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            btnNext.disabled = true;
            btnNext.textContent = 'Procesando...';

            const response = await fetch('api/index.php?resource=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                form.style.display = 'none';
                document.querySelector('.form-navigation').style.display = 'none';
                formTitle.textContent = "¡Bienvenido!";
                
                const progressBarContainer = document.querySelector('.progress-bar-container');
                if (progressBarContainer) progressBarContainer.style.display = 'none';

                const successContainer = document.getElementById('success-container');
                successContainer.innerHTML = `<p>${result.message} Serás redirigido a tu panel en 3 segundos.</p>`;
                successContainer.style.display = 'block';

                setTimeout(() => {
                    window.location.href = 'dashboard.php';
                }, 3000);
            } else {
                 showNotification(result.error || 'Ocurrió un error inesperado.', 'error');
                 btnNext.disabled = false;
                 btnNext.textContent = 'Finalizar Registro';
            }
        } catch (error) {
            showNotification('Error de conexión. Inténtalo de nuevo.', 'error');
            console.error('Error en el registro:', error);
            btnNext.disabled = false;
            btnNext.textContent = 'Finalizar Registro';
        }
    };
    
    // --- BTNNEXT AHORA ES ASÍNCRONO ---
    btnNext.addEventListener('click', async () => {
        // Esperamos a que la validación (que puede incluir llamadas API) termine
        const isValid = await validateStep(currentStep);
        if (!isValid) return;
        
        const totalSteps = updateTotalSteps();
        if (currentStep < totalSteps - 1) {
            currentStep++;
            updateFormView();
        } else {
            handleFormSubmission();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateFormView();
        }
    });

    // --- LÓGICA DE BOTONES DE ESTUDIANTE MODIFICADA ---
    studentChoiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            const choice = button.dataset.studentChoice;
            isStudentCheckInput.value = choice === 'yes' ? '1' : '0';
            
            studentChoiceButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (choice === 'yes') {
                studentInfoStep.classList.remove('step-hidden');
                // Avanzamos al siguiente paso automáticamente
                currentStep++; 
            } else {
                studentInfoStep.classList.add('step-hidden');
                // Si presiona "No", nos quedamos en el paso actual
                // pero habilitamos el botón para que muestre "Finalizar Registro"
            }
            
            updateTotalSteps(); // Recalcula el total (5 si 'yes', 4 si 'no')
            updateFormView();   // Actualiza la UI (barra y paso activo)
            
            // Si eligió "No", habilitar el botón de siguiente/finalizar
            if (choice === 'no') {
                btnNext.disabled = false;
            }
        });
    });

    // Validaciones visuales (no bloqueantes) al salir del campo
    usernameInput.addEventListener('blur', () => checkAvailabilityVisual('username', usernameInput.value, 'check-username', 'username-availability'));
    phoneInput.addEventListener('blur', () => checkAvailabilityVisual('phone', phoneInput.value, 'check-phone', 'phone-availability'));
    emailInput.addEventListener('blur', () => checkAvailabilityVisual('email', emailInput.value, 'check-email', 'email-availability'));
    
    // Inicializar vista
    updateFormView();
});