// public_html/js/dashboard_preferences.js

// Importamos el manejador de notificaciones que ya usas en otros scripts
import { showNotification } from './notification_handler.js';

document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos los elementos del HTML que cargamos en dashboard.php
    const checklistContainer = document.getElementById('departments-checklist');
    const preferencesForm = document.getElementById('preferences-form');
    const saveButton = document.getElementById('save-preferences-btn');

    // Si el formulario no existe en la vista actual, no hacemos nada.
    if (!preferencesForm) {
        return; 
    }

    /**
     * Carga todos los departamentos y las preferencias guardadas del usuario.
     */
    const loadPreferences = async () => {
        try {
            // 1. Obtener todos los departamentos disponibles
            // Usamos ../index.php porque la API está en el root, no en /public_html/
            const deptsResponse = await fetch('api/index.php?resource=departments');
            if (!deptsResponse.ok) {
                throw new Error('No se pudieron cargar los departamentos.');
            }
            // La API 'departments' devuelve un array simple
            const allDepartments = await deptsResponse.json(); 

            // 2. Obtener las preferencias guardadas del cliente
            const prefsResponse = await fetch('api/index.php?resource=get-client-preferences');
            if (!prefsResponse.ok) {
                const err = await prefsResponse.json();
                throw new Error(err.error || 'No se pudieron cargar tus preferencias.');
            }
            const prefsResult = await prefsResponse.json();
            
            // Convertimos los IDs guardados a un Set para una búsqueda más rápida
            const savedPreferences = new Set(prefsResult.preferences.map(id => parseInt(id, 10))); 

            // 3. Renderizar la lista de checkboxes
            renderChecklist(allDepartments, savedPreferences);

        } catch (error) {
            checklistContainer.innerHTML = `<p style="color: var(--color-error);">${error.message}</p>`;
            showNotification(error.message, 'error');
        }
    };

    /**
     * Dibuja los checkboxes en el contenedor.
     * @param {Array} allDepartments - Lista de todos los departamentos.
     * @param {Set} savedPreferences - Set de IDs de departamentos guardados.
     */
    const renderChecklist = (allDepartments, savedPreferences) => {
        if (!allDepartments || allDepartments.length === 0) {
            checklistContainer.innerHTML = '<p>No hay departamentos disponibles.</p>';
            return;
        }

        // Crear el HTML de los checkboxes
        let checklistHTML = allDepartments.map(dept => {
            // Verificamos si el ID de este departamento está en nuestro Set de guardados
            const isChecked = savedPreferences.has(parseInt(dept.id_departamento, 10));
            return `
                <div class="form-group-checkbox">
                    <input 
                        type="checkbox" 
                        id="dept-${dept.id_departamento}" 
                        name="departamentos[]" 
                        value="${dept.id_departamento}"
                        ${isChecked ? 'checked' : ''}
                    >
                    <label for="dept-${dept.id_departamento}">${dept.departamento}</label>
                </div>
            `;
        }).join(''); // Unimos todo el HTML
        
        checklistContainer.innerHTML = checklistHTML;
    };

    /**
     * Manejador para guardar el formulario.
     */
    preferencesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveButton.disabled = true;
        saveButton.textContent = 'Guardando...';

        // Obtener todos los IDs de los checkboxes que están MARCADOS
        const checkedBoxes = checklistContainer.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value, 10));

        try {
            // Enviamos la lista de IDs a la API que creamos
            const response = await fetch('api/index.php?resource=save-client-preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ department_ids: selectedIds })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo guardar.');
            }

            // Usamos tu manejador de notificaciones
            showNotification(result.message, 'success');

        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Guardar Preferencias';
        }
    });

    // Iniciar la carga de datos tan pronto como la página esté lista
    loadPreferences();
});




















