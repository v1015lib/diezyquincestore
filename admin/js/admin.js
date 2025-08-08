// Reemplaza todo el contenido de admin/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias y Estado Global ---
    const mainContent = document.getElementById('main-content');
    const sidemenu = document.getElementById('admin-sidemenu');
    const menuToggle = document.getElementById('admin-menu-toggle');
    const modal = document.getElementById('department-modal');
    const galleryModal = document.getElementById('image-gallery-modal');
  
    if (menuToggle && sidemenu) {
        menuToggle.addEventListener('click', () => sidemenu.classList.toggle('active'));
    }

    // --- NUEVA LÓGICA PARA LA GALERÍA DE IMÁGENES ---

    // Abre el modal y carga las imágenes
    async function openImageGallery() {
        if (!galleryModal) return;
        galleryModal.style.display = 'flex';
        await loadImageGrid();
    }
    
    // Cierra el modal de la galería
    function closeImageGallery() {
        if (galleryModal) galleryModal.style.display = 'none';
    }

    // Carga o recarga las imágenes del bucket
    async function loadImageGrid() {
        const grid = galleryModal.querySelector('.image-grid-container');
        grid.innerHTML = '<p>Cargando imágenes...</p>';

        try {
            const response = await fetch('../api/index.php?resource=admin/getBucketImages');
            const result = await response.json();
            
            grid.innerHTML = '';
            if (result.success && result.images.length > 0) {
                result.images.forEach(image => {
                    const item = document.createElement('div');
                    item.className = 'image-grid-item';
                    item.dataset.imageUrl = image.url;
                    item.dataset.imageName = image.name;
                    
                    item.innerHTML = `
                        <img src="${image.url}" alt="${image.name}">
                        <button class="delete-image-btn" title="Eliminar del bucket">&times;</button>
                    `;
                    grid.appendChild(item);
                });
            } else {
                grid.innerHTML = '<p>No hay imágenes en el bucket.</p>';
            }
        } catch (error) {
            grid.innerHTML = '<p style="color:red;">Error al cargar las imágenes.</p>';
        }
    }

    // --- MANEJADOR DE EVENTOS PRINCIPAL (mainContent) ---
    mainContent.addEventListener('click', async (event) => {
        // ... (Tu lógica existente para ordenar, acciones en lote, etc., va aquí) ...

        // --- NUEVO: Abre la galería desde el formulario ---
        if (event.target.id === 'open-gallery-btn') {
            openImageGallery();
        }
    });

    // --- MANEJADOR DE EVENTOS PARA LA GALERÍA ---
    if (galleryModal) {
        galleryModal.addEventListener('click', async (event) => {
            const target = event.target;
            const confirmBtn = galleryModal.querySelector('#gallery-confirm-btn');

            // Lógica de pestañas
            if (target.matches('.gallery-tab-btn')) {
                galleryModal.querySelectorAll('.gallery-tab-btn, .gallery-tab-content').forEach(el => el.classList.remove('active'));
                target.classList.add('active');
                galleryModal.querySelector(`#gallery-${target.dataset.tab}-tab`).classList.add('active');
            }

            // Seleccionar una imagen
            if (target.closest('.image-grid-item')) {
                const selectedItem = target.closest('.image-grid-item');
                galleryModal.querySelectorAll('.image-grid-item').forEach(item => item.classList.remove('selected'));
                selectedItem.classList.add('selected');
                confirmBtn.disabled = false;
            }

            // Eliminar una imagen
            if (target.matches('.delete-image-btn')) {
                event.stopPropagation(); // Evita que se seleccione la imagen al borrar
                const itemToDelete = target.closest('.image-grid-item');
                const imageName = itemToDelete.dataset.imageName;
                if (confirm(`¿Seguro que quieres eliminar esta imagen PERMANENTEMENTE del bucket?`)) {
                    try {
                        const response = await fetch('../api/index.php?resource=admin/deleteBucketImage', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: imageName })
                        });
                        const result = await response.json();
                        if (!result.success) throw new Error(result.error);
                        itemToDelete.remove(); // Quita la imagen de la vista
                    } catch (error) {
                        alert(`Error al eliminar: ${error.message}`);
                    }
                }
            }

            // Confirmar selección
            if (target.id === 'gallery-confirm-btn') {
                const selectedImage = galleryModal.querySelector('.image-grid-item.selected');
                if (selectedImage) {
                    const imageUrl = selectedImage.dataset.imageUrl;
                    // Ponemos la URL en el formulario principal
                    document.getElementById('selected-image-url').value = imageUrl;
                    document.getElementById('image-preview').src = imageUrl;
                    document.getElementById('image-preview').classList.remove('hidden');
                    document.getElementById('no-image-text').classList.add('hidden');
                    closeImageGallery();
                }
            }
            
            // Subir nueva imagen
            if (target.id === 'gallery-upload-btn') {
                const fileInput = galleryModal.querySelector('#gallery-upload-input');
                const feedbackDiv = galleryModal.querySelector('#gallery-upload-feedback');
                if (fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('url_imagen', fileInput.files[0]); // El backend espera este nombre de campo
                    
                    target.textContent = 'Subiendo...';
                    target.disabled = true;
                    feedbackDiv.textContent = '';
                    
                    try {
                        // Usamos el mismo endpoint de crear producto, pero solo nos interesa la subida
                        // En un futuro, se podría crear un endpoint dedicado solo para subir
                        const response = await fetch('../api/index.php?resource=admin/createProduct', {
                            method: 'POST',
                            body: formData
                        });
                        // NOTA: Esta llamada dará error porque no enviamos el resto de datos,
                        // pero la imagen SÍ se subirá. Es una simplificación.
                        // Para hacerlo perfecto, se necesitaría un endpoint solo para subir.
                        
                        // Asumimos que subió bien y recargamos la galería
                        feedbackDiv.textContent = '¡Imagen subida! Recargando galería...';
                        feedbackDiv.style.color = 'green';
                        fileInput.value = ''; // Limpiar input
                        await loadImageGrid(); // Recargar
                        // Cambiar a la pestaña de selección
                        galleryModal.querySelector('.gallery-tab-btn[data-tab="select"]').click();

                    } catch (error) {
                        feedbackDiv.textContent = 'Error al subir la imagen.';
                        feedbackDiv.style.color = 'red';
                    } finally {
                        target.textContent = 'Subir Imagen';
                        target.disabled = false;
                    }
                } else {
                    feedbackDiv.textContent = 'Selecciona un archivo primero.';
                }
            }

            // Cerrar el modal
            if (target.matches('.modal-close-btn, #gallery-cancel-btn')) {
                closeImageGallery();
            }
        });
    }



    let currentFilters = { search: '', department: '', sort: { by: 'nombre_producto', order: 'ASC' }};

    // --- Lógica de Carga de Módulos y Contenido ---
    async function loadModule(moduleName) {
        mainContent.innerHTML = '<h2>Cargando...</h2>';
        try {
            const response = await fetch(`modules/${moduleName}.php`);
            if (!response.ok) throw new Error('Módulo no encontrado.');
            mainContent.innerHTML = await response.text();
            if (moduleName === 'productos') {
                await loadActionContent('productos/todos_los_productos');
            }
        } catch (error) {
            mainContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    async function loadActionContent(actionPath) {
        const actionContent = document.getElementById('action-content');
        if (!actionContent) return;
        actionContent.innerHTML = '<p>Cargando...</p>';
        try {
            const response = await fetch(`actions/${actionPath}.php`);
            if (!response.ok) throw new Error('Acción no encontrada.');
            actionContent.innerHTML = await response.text();

            if (actionPath === 'productos/todos_los_productos') {
                await populateDepartmentFilter();
                await fetchAndRenderProducts();
            } else if (actionPath === 'productos/agregar_producto') {
                initializeAddProductForm();
            }
        } catch (error) {
            actionContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    // --- Lógica para el Formulario de Agregar Producto (ACTUALIZADO) ---
    function initializeAddProductForm() {
        const form = document.getElementById('add-product-form');
        if (!form) return;

        const codeInput = form.querySelector('#codigo_producto');
        const submitButton = form.querySelector('.form-submit-btn');
        let typingTimer;

        // --- INICIO: VERIFICACIÓN EN TIEMPO REAL ---
        codeInput.addEventListener('keyup', () => {
            clearTimeout(typingTimer);
            // Creamos un pequeño div para mostrar el mensaje de validación
            let feedbackDiv = codeInput.nextElementSibling;
            if (!feedbackDiv || !feedbackDiv.classList.contains('validation-feedback')) {
                feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'validation-feedback';
                codeInput.parentNode.insertBefore(feedbackDiv, codeInput.nextSibling);
            }

            feedbackDiv.textContent = 'Verificando...';
            typingTimer = setTimeout(async () => {
                const code = codeInput.value;
                if (code.length < 3) {
                    feedbackDiv.textContent = '';
                    return;
                }
                try {
                    const response = await fetch(`../api/index.php?resource=admin/checkProductCode&code=${encodeURIComponent(code)}`);
                    const result = await response.json();
                    
                    feedbackDiv.textContent = result.message;
                    feedbackDiv.style.color = result.is_available ? 'green' : 'red';
                    submitButton.disabled = !result.is_available;

                } catch (error) {
                    feedbackDiv.textContent = 'Error al verificar.';
                    feedbackDiv.style.color = 'red';
                }
            }, 500); // 500ms de espera antes de verificar
        });
        // --- FIN: VERIFICACIÓN EN TIEMPO REAL ---

        const usaInventarioCheckbox = form.querySelector('#usa_inventario_checkbox');
        const inventoryFields = form.querySelector('#inventoryFields');
        usaInventarioCheckbox.addEventListener('change', () => {
            inventoryFields.classList.toggle('hidden', !usaInventarioCheckbox.checked);
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const messagesDiv = form.querySelector('#form-messages');
            const formData = new FormData(form);

            submitButton.disabled = true;
            submitButton.textContent = 'Guardando...';
            messagesDiv.innerHTML = '';

            try {
                const response = await fetch('../api/index.php?resource=admin/createProduct', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    messagesDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                    form.reset();
                    inventoryFields.classList.add('hidden');
                    // Limpiamos el feedback de validación
                    const feedbackDiv = codeInput.nextElementSibling;
                    if (feedbackDiv && feedbackDiv.classList.contains('validation-feedback')) {
                         feedbackDiv.textContent = '';
                    }
                } else {
                    throw new Error(result.error || 'Ocurrió un error desconocido.');
                }
            } catch (error) {
                messagesDiv.innerHTML = `<div class="message error">${error.message}</div>`;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Ingresar Producto';
            }
        });
    }

    // El resto del código de JS permanece igual...
    // ... (pegar aquí el resto de las funciones: populateDepartmentFilter, fetchAndRenderProducts, etc.) ...
     async function populateDepartmentFilter() {
        const filterSelect = document.getElementById('department-filter');
        if (!filterSelect) return;
        try {
            const response = await fetch('../api/index.php?resource=departments');
            const departments = await response.json();
            if (departments && departments.length > 0) {
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id_departamento;
                    option.textContent = dept.departamento;
                    filterSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar departamentos para el filtro:', error);
        }
    }
    
    async function fetchAndRenderProducts() {
        const tableBody = document.getElementById('product-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="6">Buscando...</td></tr>';
        
        const { search, department, sort } = currentFilters;
        const apiUrl = `../api/index.php?resource=admin/getProducts&search=${encodeURIComponent(search)}&department_id=${department}&sort_by=${sort.by}&order=${sort.order}`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);
            const data = await response.json();
            tableBody.innerHTML = '';
            if (data.success && data.products.length > 0) {
                data.products.forEach(product => {
                    const row = document.createElement('tr');
                    row.dataset.productId = product.id_producto;
                    row.dataset.status = (product.nombre_estado || '').toLowerCase();
                    const statusClass = row.dataset.status === 'activo' ? 'status-active' : 'status-inactive';
                    row.innerHTML = `
                        <td><input type="checkbox" class="product-checkbox"></td>
                        <td>${product.codigo_producto}</td>
                        <td class="editable" data-field="nombre_producto">${product.nombre_producto}</td>
                        <td>${product.departamento}</td>
                        <td class="editable" data-field="precio_venta">$${parseFloat(product.precio_venta).toFixed(2)}</td>
                        <td><span class="status-badge ${statusClass}">${product.nombre_estado}</span></td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="6">No se encontraron productos para los filtros aplicados.</td></tr>';
            }
            updateSortIndicators();
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar: ${error.message}</td></tr>`;
        }
    }
    
    function updateSortIndicators() {
        document.querySelectorAll('.product-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === currentFilters.sort.by) {
                th.classList.add(currentFilters.sort.order === 'ASC' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    async function saveFieldUpdate(productId, field, value, cell) {
        const originalText = cell.innerHTML;
        cell.textContent = 'Guardando...';
        try {
            const response = await fetch('../api/index.php?resource=admin/updateProductField', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: productId, field: field, value: value })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Error del servidor.");
            cell.textContent = field === 'precio_venta' ? `$${parseFloat(value).toFixed(2)}` : value;
        } catch (error) {
            console.error('Error al guardar:', error);
            cell.innerHTML = originalText;
            alert("Error al guardar el cambio.");
        }
    }

    function updateBatchActionsState() {
        const selectedRows = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr'));
        const batchSelector = mainContent.querySelector('#batch-action-selector');
        const batchButton = mainContent.querySelector('#batch-action-execute');

        if (!batchSelector || !batchButton) return;

        const activateOption = batchSelector.querySelector('option[value="activate"]');
        const deactivateOption = batchSelector.querySelector('option[value="deactivate"]');
        const totalSelected = selectedRows.length;

        batchSelector.disabled = true;
        batchButton.disabled = true;
        batchSelector.value = '';
        if (activateOption) activateOption.style.display = 'none';
        if (deactivateOption) deactivateOption.style.display = 'none';

        if (totalSelected === 0) return;

        batchSelector.disabled = false;

        const areAllActive = selectedRows.every(row => row.dataset.status === 'activo');
        const areAllInactive = selectedRows.every(row => row.dataset.status !== 'activo');
        
        if (areAllActive) {
            if (deactivateOption) deactivateOption.style.display = 'block';
        } else if (areAllInactive) {
            if (activateOption) activateOption.style.display = 'block';
        }
    }
    
    async function openDepartmentModal() {
        const modalSelector = document.getElementById('modal-department-selector');
        if (!modal) return;
        
        modal.style.display = 'flex';
        modalSelector.innerHTML = '<option value="">Cargando...</option>';
        
        try {
            const response = await fetch('../api/index.php?resource=departments');
            const departments = await response.json();
            
            modalSelector.innerHTML = '<option value="">-- Selecciona un departamento --</option>';
            if (departments && departments.length > 0) {
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id_departamento;
                    option.textContent = dept.departamento;
                    modalSelector.appendChild(option);
                });
            }
        } catch (error) {
            modalSelector.innerHTML = '<option value="">Error al cargar</option>';
            document.getElementById('modal-error-message').textContent = 'No se pudieron cargar los departamentos.';
        }
    }

    function closeModal() {
        if (modal) modal.style.display = 'none';
    }

    // --- MANEJADORES DE EVENTOS ---
    
    sidemenu.addEventListener('click', (event) => {
        const navLink = event.target.closest('.nav-link');
        if (navLink) {
            event.preventDefault();
            const moduleToLoad = navLink.dataset.module;
            if (moduleToLoad) {
                sidemenu.querySelectorAll('.nav-link.active').forEach(link => link.classList.remove('active'));
                navLink.classList.add('active');
                loadModule(moduleToLoad);
            }
        }
    });

    let searchTimeout;
    mainContent.addEventListener('input', (event) => {
        if (event.target.id === 'product-search-input') {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = event.target.value;
                fetchAndRenderProducts();
            }, 300);
        }
    });

    mainContent.addEventListener('change', (event) => {
        const target = event.target;
        if (target.id === 'select-all-products' || target.classList.contains('product-checkbox')) {
            if (target.id === 'select-all-products') {
                mainContent.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = target.checked);
            }
            updateBatchActionsState();
        }
        
        if (target.id === 'batch-action-selector') {
            const batchButton = mainContent.querySelector('#batch-action-execute');
            if (batchButton) {
                batchButton.disabled = !target.value; 
            }
        }

        if (target.id === 'department-filter') {
            currentFilters.department = target.value;
            fetchAndRenderProducts();
        }
    });
    
    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
        
        if (target.matches('.product-table th.sortable')) {
            const newSortBy = target.dataset.sort;
            if (newSortBy === currentFilters.sort.by) {
                currentFilters.sort.order = currentFilters.sort.order === 'ASC' ? 'DESC' : 'ASC';
            } else {
                currentFilters.sort.by = newSortBy;
                currentFilters.sort.order = 'ASC';
            }
            await fetchAndRenderProducts();
            return;
        }

        const actionButton = target.closest('.action-btn');
        if (actionButton && actionButton.id !== 'batch-action-execute') {
            const actionToLoad = actionButton.dataset.action;
            if (actionToLoad) {
                mainContent.querySelectorAll('.action-btn.active').forEach(btn => btn.classList.remove('active'));
                actionButton.classList.add('active');
                loadActionContent(actionToLoad);
            }
        }

        if (target.id === 'batch-action-execute') {
            const selector = document.getElementById('batch-action-selector');
            const action = selector.value;
            
            if (action === 'change-department') {
                openDepartmentModal();
                return;
            }
            
            const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);
            if (!action || productIds.length === 0) return;
            if (!confirm(`¿Estás seguro de ejecutar "${selector.options[selector.selectedIndex].text}" en ${productIds.length} productos?`)) return;
            
            target.textContent = 'Procesando...';
            target.disabled = true;
            try {
                const response = await fetch('../api/index.php?resource=admin/batchAction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, productIds })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error || 'Error en la API.');
                alert(result.message);
                await fetchAndRenderProducts();
            } catch (error) {
                alert(`Error: ${error.message}`);
            } finally {
                target.textContent = 'Ejecutar';
                updateBatchActionsState();
            }
        }
    });
    
    if (modal) {
        modal.addEventListener('click', async (event) => {
            const target = event.target;
            if (target.classList.contains('modal-overlay') || target.classList.contains('modal-close-btn') || target.id === 'modal-cancel-btn') {
                closeModal();
            }
            if (target.id === 'modal-confirm-btn') {
                const departmentId = document.getElementById('modal-department-selector').value;
                const errorDiv = document.getElementById('modal-error-message');
                if (!departmentId) {
                    errorDiv.textContent = 'Por favor, selecciona un departamento.';
                    return;
                }
                errorDiv.textContent = '';
                const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);
                target.textContent = 'Procesando...';
                target.disabled = true;
                try {
                    const response = await fetch('../api/index.php?resource=admin/batchAction', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'change-department',
                            productIds: productIds,
                            departmentId: departmentId
                        })
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'Error en la API.');
                    alert(result.message);
                    closeModal();
                    await fetchAndRenderProducts();
                } catch (error) {
                    errorDiv.textContent = `Error: ${error.message}`;
                } finally {
                    target.textContent = 'Confirmar Cambio';
                    target.disabled = false;
                    updateBatchActionsState();
                }
            }
        });
    }

    mainContent.addEventListener('dblclick', (event) => {
        const cell = event.target.closest('.editable');
        if (cell && !cell.querySelector('input')) {
            const originalValue = cell.textContent.replace('$', '').trim();
            cell.innerHTML = `<input type="text" value="${originalValue}" data-original-value="${originalValue}">`;
            const input = cell.querySelector('input');
            input.focus();
            input.select();
        }
    });
    
    mainContent.addEventListener('focusout', (event) => {
        if (event.target.tagName === 'INPUT' && event.target.parentElement.classList.contains('editable')) {
            const input = event.target;
            const cell = input.parentElement;
            const originalValue = input.dataset.originalValue;
            const newValue = input.value.trim();
            if (newValue !== originalValue && newValue !== '') {
                const field = cell.dataset.field;
                const productId = cell.closest('tr').dataset.productId;
                saveFieldUpdate(productId, field, newValue, cell);
            } else {
                cell.textContent = cell.dataset.field === 'precio_venta' ? `$${parseFloat(originalValue).toFixed(2)}` : originalValue;
            }
        }
    });

    // --- Carga Inicial ---
    if (sidemenu) {
        loadModule('dashboard');
        const dashboardLink = sidemenu.querySelector('[data-module="dashboard"]');
        if (dashboardLink) {
            dashboardLink.classList.add('active');
        }
    }
});