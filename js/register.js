import { showNotification } from './notification_handler.js';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    if (!form) return;

    const steps = Array.from(form.querySelectorAll('.form-step'));
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const stepIndicator = document.getElementById('current-step-indicator');
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const formMessage = document.getElementById('form-message');
    
    // --- Campos y elementos específicos ---
    const studentChoiceButtons = document.querySelectorAll('.btn-choice');
    const isStudentCheckInput = document.getElementById('is_student_check');
    const studentInfoStep = document.querySelector('[data-step="4"]');
    const finalStep = document.querySelector('[data-step="5"]');
    
    // --- Campos de validación en tiempo real ---
    const usernameInput = document.getElementById('nombre_usuario');
    const phoneInput = document.getElementById('telefono');
    const emailInput = document.getElementById('email');

    // --- Checkbox "Seleccionar Todos" ---
    const selectAllCheckbox = document.getElementById('select_all_prefs');
    const preferencesCheckboxes = form.querySelectorAll('input[name="preferencias[]"]:not(#select_all_prefs)');

    let currentStep = 0;

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

        stepIndicator.textContent = currentStep + 1;
        document.getElementById('form-subtitle').querySelector('span:last-of-type').textContent = totalSteps;

        btnPrev.style.display = currentStep > 0 ? 'inline-block' : 'none';
        btnNext.textContent = currentStep === totalSteps - 1 ? 'Finalizar Registro' : 'Siguiente';
    };
    
    const validateStep = (stepIndex) => {
        const step = steps.filter(s => !s.classList.contains('step-hidden'))[stepIndex];
        if (!step) return false;

        const inputs = Array.from(step.querySelectorAll('input[required], select[required]'));
        let isStepValid = true;

        // --- INICIO DE LA MODIFICACIÓN ---
    const nameRegex = /^[a-zA-Z\s]*$/; // Expresión regular para letras y espacios
    const nombreInput = document.getElementById('nombre');
    const apellidoInput = document.getElementById('apellido');

    if (step.dataset.step === "1") {
        if (!nameRegex.test(nombreInput.value)) {
            showNotification('El nombre solo puede contener letras y espacios.', 'error');
            return false; // Detiene la validación si el nombre es inválido
        }
        if (apellidoInput.value && !nameRegex.test(apellidoInput.value)) {
            showNotification('El apellido solo puede contener letras y espacios.', 'error');
            return false; // Detiene la validación si el apellido es inválido
        }
    }
    // --- FIN DE LA MODIFICACIÓN ---
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                showNotification(`El campo "${input.labels[0].innerText.replace('*','').trim()}" es obligatorio.`, 'error');
                isStepValid = false;
            }
        });

        if (isStepValid && step.dataset.step === "2") {
            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password_confirm').value;
            if (password !== passwordConfirm) {
                showNotification('Las contraseñas no coinciden.', 'error');
                isStepValid = false;
            }
        }
        
        return isStepValid;
    };

    const handleFormSubmission = async () => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.preferencias = formData.getAll('preferencias[]');

        // Si "Seleccionar Todos" está marcado, su valor "all" se enviará.
        // Si no, se enviará la lista de IDs de los departamentos seleccionados.

        try {
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
                formSubtitle.style.display = 'none';
                const successContainer = document.getElementById('success-container');
                successContainer.innerHTML = `<p>${result.message} Serás redirigido a tu panel en 3 segundos.</p>`;
                successContainer.style.display = 'block';

                setTimeout(() => {
                    window.location.href = 'dashboard.php';
                }, 3000);
            } else {
                 showNotification(result.error || 'Ocurrió un error inesperado.', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión. Inténtalo de nuevo.', 'error');
            console.error('Error en el registro:', error);
        }
    };
    
    const checkAvailability = async (field, value, endpoint, messageElementId) => {
        const messageElement = document.getElementById(messageElementId);
        if (!value) {
            messageElement.textContent = '';
            return;
        }
        try {
            const response = await fetch(`api/index.php?resource=${endpoint}&${field}=${encodeURIComponent(value)}`);
            const result = await response.json();
            if (result.is_available) {
                messageElement.textContent = 'Disponible';
                messageElement.className = 'form-message success';
            } else {
                messageElement.textContent = 'No disponible';
                messageElement.className = 'form-message error';
            }
        } catch (error) {
            messageElement.textContent = 'Error al verificar';
            messageElement.className = 'form-message error';
        }
    };
    
    // --- Event Listeners ---
    
    btnNext.addEventListener('click', () => {
        if (!validateStep(currentStep)) return;
        
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

    studentChoiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            const choice = button.dataset.studentChoice;
            isStudentCheckInput.value = choice === 'yes' ? '1' : '0';
            
            studentChoiceButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (choice === 'yes') {
                studentInfoStep.classList.remove('step-hidden');
            } else {
                studentInfoStep.classList.add('step-hidden');
            }
            
            // Avanza automáticamente al siguiente paso visible
            const totalSteps = updateTotalSteps();
            if (currentStep < totalSteps - 1) {
                currentStep++;
                updateFormView();
            }
        });
    });

    usernameInput.addEventListener('blur', () => checkAvailability('username', usernameInput.value, 'check-username', 'username-availability'));
    phoneInput.addEventListener('blur', () => checkAvailability('phone', phoneInput.value, 'check-phone', 'phone-availability'));
    emailInput.addEventListener('blur', () => checkAvailability('email', emailInput.value, 'check-email', 'email-availability'));
    
    // Lógica para el checkbox "Seleccionar Todos"
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            preferencesCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });

        preferencesCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (!this.checked) {
                    selectAllCheckbox.checked = false;
                } else {
                    const allChecked = Array.from(preferencesCheckboxes).every(cb => cb.checked);
                    selectAllCheckbox.checked = allChecked;
                }
            });
        });
    }

    // Inicializar vista
    updateFormView();
});