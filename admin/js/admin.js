// admin/js/admin.js (PARTE 1 DE 2 - VERSIÓN COMPLETA Y FINAL)

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a Elementos del DOM ---
    const mainContent = document.getElementById('main-content');
    const sidemenu = document.getElementById('admin-sidemenu');
    const menuToggle = document.getElementById('admin-menu-toggle');
    const collapseBtn = document.getElementById('sidemenu-collapse-btn');
    const modal = document.getElementById('department-modal');
    const galleryModal = document.getElementById('image-gallery-modal');
    const API_BASE_URL = '../api/index.php';



    // --- Estado Global de la Aplicación ---
    let currentFilters = {
        search: '',
        department: '',
        page: 1,
        sort: {
            by: 'nombre_producto',
            order: 'ASC'
        }
    };
    let isLoading = false;
// PEGA ESTE BLOQUE DESPUÉS DE LA FUNCIÓN fetchAndRenderProducts()

// --- LÓGICA PARA CLIENTES ---

// REEMPLAZA esta función completa en admin/js/admin.js

async function fetchAndRenderCustomers(searchTerm = '') {
    const tableBody = document.getElementById('customer-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="9">Buscando clientes...</td></tr>'; // Aumentado a 9 columnas

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getCustomers&search=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();

        tableBody.innerHTML = '';
        if (data.success && data.customers.length > 0) {
            data.customers.forEach(customer => {
                const row = document.createElement('tr');
                row.dataset.customerId = customer.id_cliente;
                
                let statusClass = 'status-inactive';
                if (customer.estado_tarjeta_id === 1) statusClass = 'status-active';
                if (customer.estado_tarjeta_id === 24) statusClass = 'status-unassigned';
                
                // Se añade la nueva celda <td> con el botón de eliminar
                row.innerHTML = `
                    <td>${customer.nombre_usuario}</td>
                    <td>${customer.nombre} ${customer.apellido || ''}</td>
                    <td>${customer.email}</td>
                    <td>${customer.telefono}</td>
                    <td>${customer.tipo_cliente}</td>
                    <td>${customer.numero_tarjeta}</td>
                    <td><span class="status-badge ${statusClass}">${customer.estado_tarjeta}</span></td>
                    <td><button class="action-btn edit-customer-btn">Editar</button></td>
                    <td><button class="action-btn delete-customer-btn">&times;</button></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="9">No se encontraron clientes.</td></tr>'; // Aumentado a 9
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="9" style="color:red;">Error al cargar clientes: ${error.message}</td></tr>`; // Aumentado a 9
    }
}

function handleCustomerTypeChange() {
    const typeSelector = document.getElementById('id_tipo_cliente');
    if (!typeSelector) return;
    
    const studentFields = document.getElementById('student-fields');
    const taxpayerFields = document.getElementById('taxpayer-fields');
    const selectedType = parseInt(typeSelector.value);

    studentFields.classList.toggle('hidden', selectedType !== 2);
    taxpayerFields.classList.toggle('hidden', selectedType !== 3);
    
    studentFields.querySelectorAll('input').forEach(input => input.required = selectedType === 2);
    taxpayerFields.querySelectorAll('input').forEach(input => input.required = selectedType === 3);
}

function setupLiveValidation(form) {
    let typingTimer;
    const fieldsToValidate = {
        'nombre_usuario': { resource: 'check-username', param: 'username' },
        'email': { resource: 'check-email', param: 'email' },
        'telefono': { resource: 'check-phone', param: 'phone' }
    };

    form.querySelectorAll('input[id="nombre_usuario"], input[id="email"], input[id="telefono"]').forEach(input => {
        input.addEventListener('keyup', () => {
            clearTimeout(typingTimer);
            const feedbackDiv = input.closest('.form-group').querySelector('.validation-feedback');
            const validationConfig = fieldsToValidate[input.id];
            const submitButton = form.querySelector('.form-submit-btn');
            if (!validationConfig || !feedbackDiv) return;
            
            const originalValue = input.dataset.originalValue || '';
            const currentValue = input.value.trim();

            if (currentValue === originalValue) {
                feedbackDiv.textContent = '';
                submitButton.disabled = false;
                return;
            }

            feedbackDiv.textContent = 'Verificando...';
            feedbackDiv.style.color = 'inherit';

            typingTimer = setTimeout(async () => {
                if (currentValue.length < 4) {
                    feedbackDiv.textContent = '';
                    return;
                }
                
                try {
                    const apiUrl = `${API_BASE_URL}?resource=${validationConfig.resource}&${validationConfig.param}=${encodeURIComponent(currentValue)}`;
                    
                    const response = await fetch(apiUrl);
                    const result = await response.json();
                    
                    feedbackDiv.textContent = result.is_available ? 'Disponible' : 'Ya en uso';
                    feedbackDiv.style.color = result.is_available ? 'green' : 'red';
                    submitButton.disabled = !result.is_available;

                } catch (error) {
                    feedbackDiv.textContent = 'Error al verificar.';
                    feedbackDiv.style.color = 'red';
                }
            }, 500);
        });
    });
}

// REEMPLAZA esta función completa en admin/js/admin.js

function initializeAddCustomerForm() {
    const form = document.getElementById('add-customer-form');
    if (!form) return;
    
    const typeSelector = document.getElementById('id_tipo_cliente');
    typeSelector.addEventListener('change', handleCustomerTypeChange);
    handleCustomerTypeChange();
    setupLiveValidation(form);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('.form-submit-btn');
        const messagesDiv = form.querySelector('#form-messages');
        const formData = new FormData(form);

        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        messagesDiv.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/createCustomer`, { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                messagesDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                
                // Redirigir a la lista de clientes después de un breve momento
                setTimeout(() => {
                    document.querySelector('.action-btn[data-action="clientes/todos_los_clientes"]').click();
                }, 1500); // 1.5 segundos para que el usuario lea el mensaje

            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }
        } catch (error) {
             messagesDiv.innerHTML = `<div class="message error">${error.message}</div>`;
             // Solo reactivar el botón si hubo un error
             submitButton.disabled = false;
             submitButton.textContent = 'Guardar Cliente';
        }
    });
}

async function renderEditCustomerForm(customer) {
    const container = document.getElementById('edit-customer-container');
    const searchContainer = document.getElementById('customer-search-container');
    if (!container || !searchContainer) return;

    searchContainer.style.display = 'none';
    container.classList.remove('hidden');

    const response = await fetch('actions/clientes/nuevo_cliente.php');
    container.innerHTML = await response.text();

    const form = container.querySelector('#add-customer-form');
    form.id = 'edit-customer-form';
    
    form.querySelector('.form-submit-btn').textContent = 'Actualizar Cliente';
    const passwordInput = form.querySelector('#password');
    passwordInput.placeholder = "Dejar en blanco para no cambiar";
    passwordInput.required = false;

    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'id_cliente';
    idInput.value = customer.id_cliente;
    form.prepend(idInput);

    Object.keys(customer).forEach(key => {
        const input = form.querySelector(`#${key}`);
        if (input) {
            input.value = customer[key] || '';
            input.dataset.originalValue = customer[key] || '';
        }
    });

    const typeSelector = document.getElementById('id_tipo_cliente');
    typeSelector.addEventListener('change', handleCustomerTypeChange);
    handleCustomerTypeChange();
    setupLiveValidation(form);
    
    form.addEventListener('submit', async (event) => {
         event.preventDefault();
        const submitButton = form.querySelector('.form-submit-btn');
        const messagesDiv = form.querySelector('#form-messages');
        const formData = new FormData(form);

        submitButton.disabled = true;
        submitButton.textContent = 'Actualizando...';
        messagesDiv.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/updateCustomer`, { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                messagesDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                setTimeout(async () => {
                     document.querySelector('.action-btn[data-action="clientes/todos_los_clientes"]').click();
                }, 1500);
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }
        } catch (error) {
             messagesDiv.innerHTML = `<div class="message error">${error.message}</div>`;
             submitButton.disabled = false;
             submitButton.textContent = 'Actualizar Cliente';
        }
    });
}

    // REEMPLAZA esta función completa en admin/js/admin.js

async function showProcessedFiles() {
    const listContainer = document.getElementById('processed-files-list');
    const resultsContainer = document.getElementById('results-container');
    if (!listContainer || !resultsContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}?resource=get_processed_images`);
        const data = await response.json();

        listContainer.innerHTML = '';
        if (data.success && data.files.length > 0) {
            resultsContainer.classList.remove('hidden');
            data.files.forEach(file => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'processed-file-item';
                itemDiv.dataset.fileName = file.name;

                // --- MEJORA: La imagen ya no es un enlace de descarga ---
                // Ahora al hacer clic en la imagen, solo se seleccionará/deseleccionará.
                itemDiv.innerHTML = `
                    <img src="${file.url}?t=${new Date().getTime()}" alt="${file.name}" style="cursor: pointer;">
                    <div class="file-info">
                        <label>
                            <input type="checkbox" class="processed-file-checkbox">
                            ${file.name}
                        </label>
                        <a href="${file.url}" download="${file.name}" class="download-icon" title="Descargar ${file.name}">📥</a>
                    </div>
                `;
                
                listContainer.appendChild(itemDiv);
            });
        } else {
            resultsContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error al obtener archivos procesados:', error);
    }
}

    function updateProcessorButtons() {
        const checkedBoxes = document.querySelectorAll('.processed-file-checkbox:checked').length;
        const uploadBtn = document.getElementById('upload-to-gallery-btn');
        const downloadBtn = document.getElementById('download-zip-btn');

        if (uploadBtn) uploadBtn.disabled = checkedBoxes === 0;
        if (downloadBtn) downloadBtn.disabled = checkedBoxes === 0;
    }

    // --- MANEJADORES DE EVENTOS EXISTENTES (MODIFICADOS) ---

 // REEMPLAZA este event listener completo en admin/js/admin.js

mainContent.addEventListener('click', async (event) => {
    const target = event.target;

    // --- Lógica de la cinta de opciones (Ribbon) ---
    const actionButton = target.closest('.action-btn[data-action]');
    if (actionButton && !actionButton.id.startsWith('batch-action')) {
        const currentModule = document.querySelector('.nav-link.active')?.dataset.module;
        const actionToLoad = actionButton.dataset.action;
        if (actionToLoad && actionToLoad.startsWith(currentModule)) {
            mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
            actionButton.classList.add('active');
            await loadActionContent(actionToLoad);
        }
        return; 
    }

    // --- Lógica para la tabla de Productos ---
    if (target.matches('.product-table th.sortable')) {
        const newSortBy = target.dataset.sort;
        if (newSortBy === currentFilters.sort.by) {
            currentFilters.sort.order = currentFilters.sort.order === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentFilters.sort.by = newSortBy;
            currentFilters.sort.order = 'ASC';
        }
        currentFilters.page = 1;
        await fetchAndRenderProducts();
        return;
    }

    if (target.id === 'batch-action-execute') {
        const selector = document.getElementById('batch-action-selector');
        const action = selector.value;
        const productIds = Array.from(document.querySelectorAll('.product-checkbox:checked'))
            .map(cb => cb.closest('tr').dataset.productId);

        if (!action || productIds.length === 0) return;

        if (action === 'change-department') {
            await openDepartmentModal();
        } else {
            if (confirm(`¿Estás seguro de que quieres ejecutar la acción sobre ${productIds.length} productos?`)) {
                try {
                    const response = await fetch(`${API_BASE_URL}?resource=admin/batchAction`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action, productIds })
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error);
                    alert(result.message);
                    currentFilters.page = 1; 
                    await fetchAndRenderProducts();
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
        return;
    }
    
    // --- Lógica para el botón de editar Cliente ---
    if (target.classList.contains('edit-customer-btn')) {
        const customerId = target.closest('tr').dataset.customerId;
        mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
        mainContent.querySelector('[data-action="clientes/modificar_cliente"]')?.classList.add('active');
        await loadActionContent('clientes/modificar_cliente');
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getCustomerDetails&id=${customerId}`);
            const result = await response.json();
            if (result.success) await renderEditCustomerForm(result.customer);
            else throw new Error(result.error);
        } catch (error) {
            document.getElementById('edit-customer-container').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
        }
        return;
    }
    
    // --- Lógica para el botón de editar Producto ---
    if (target.classList.contains('edit-product-btn')) {
        const productCode = target.closest('tr').querySelector('td:nth-child(2)').textContent;
        mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
        mainContent.querySelector('[data-action="productos/modificar_producto"]')?.classList.add('active');
        await loadActionContent('productos/modificar_producto');
        const searchInput = document.getElementById('product-search-to-edit');
        const searchForm = document.getElementById('product-search-form');
        if (searchInput && searchForm) {
            searchInput.value = productCode;
            searchForm.dispatchEvent(new Event('submit'));
        }
        return;
    }
    
    // --- Lógica para abrir la galería de imágenes ---
    if (target.id === 'open-gallery-btn') {
        openImageGallery();
        return;
    }
});


    // --- LÓGICA DE CARGA Y RENDERIZADO DE PRODUCTOS (SCROLL INFINITO) ---
    async function fetchAndRenderProducts() {
        if (isLoading) return;
        isLoading = true;

        const tableBody = document.getElementById('product-table-body');
        const loadingIndicator = document.getElementById('loading-indicator');
        if (!tableBody || !loadingIndicator) {
            isLoading = false;
            return;
        }

        if (currentFilters.page === 1) {
            tableBody.innerHTML = `<tr><td colspan="11">Buscando...</td></tr>`;
        }
        loadingIndicator.style.display = 'block';

        const { search, department, sort, page } = currentFilters;
        const apiUrl = `${API_BASE_URL}?resource=admin/getProducts&search=${encodeURIComponent(search)}&department_id=${department}&sort_by=${sort.by}&order=${sort.order}&page=${page}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);
            
            const data = await response.json();

            if (page === 1) {
                tableBody.innerHTML = '';
            }

            if (data.success && data.products.length > 0) {
                data.products.forEach(product => {
                    const row = document.createElement('tr');
                    row.dataset.productId = product.id_producto;
                    row.dataset.status = (product.nombre_estado || '').toLowerCase();
                    const statusClass = (product.nombre_estado || '').toLowerCase() === 'activo' ? 'status-active' : 'status-inactive';
                    const usaInventarioText = product.usa_inventario == 1 ? 'Sí' : 'No';
                    const stockClass = (product.usa_inventario == 1 && parseInt(product.stock_actual) <= parseInt(product.stock_minimo)) ? 'stock-low' : '';
                    row.innerHTML = `
                        <td><input type="checkbox" class="product-checkbox"></td>
                        <td>${product.codigo_producto}</td>
                        <td class="editable" data-field="nombre_producto">${product.nombre_producto}</td>
                        <td>${product.departamento}</td>
                        <td class="editable" data-field="precio_venta">$${parseFloat(product.precio_venta).toFixed(2)}</td>
                        <td class="${stockClass}">${product.stock_actual}</td>
                        <td>${product.stock_minimo}</td>
                        <td>${product.stock_maximo}</td>
                        <td>${usaInventarioText}</td>
                        <td><span class="status-badge ${statusClass}">${product.nombre_estado}</span></td>
                        <td><button class="action-btn edit-product-btn">Editar</button></td>
                    `;
                    tableBody.appendChild(row);
                });

                if (data.products.length < 25) { // Ajusta el '25' si cambias el límite en la API
                    currentFilters.page = -1;
                }

            } else {
                if (page === 1) {
                    tableBody.innerHTML = `<tr><td colspan="11">No se encontraron productos.</td></tr>`;
                }
                currentFilters.page = -1;
            }

            updateSortIndicators();
            updateBatchActionsState();

        } catch (error) {
            if (page === 1) {
                tableBody.innerHTML = `<tr><td colspan="11" style="color:red;">Error al cargar: ${error.message}</td></tr>`;
            }
        } finally {
            isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    }

    // --- LÓGICA DE MENÚ Y CARGA DE MÓDULOS ---

    function initializeSidemenu() {
        if (menuToggle && sidemenu) {
            menuToggle.addEventListener('click', () => sidemenu.classList.toggle('active'));
        }
        if (collapseBtn && sidemenu) {
            collapseBtn.addEventListener('click', () => {
                sidemenu.classList.toggle('sidemenu-collapsed');
                localStorage.setItem('sidemenuCollapsed', sidemenu.classList.contains('sidemenu-collapsed'));
            });
        }
    }

    function checkSidemenuState() {
        if (window.innerWidth > 991 && localStorage.getItem('sidemenuCollapsed') === 'true') {
            sidemenu.classList.add('sidemenu-collapsed');
        }
    }

// REEMPLAZA ESTA FUNCIÓN COMPLETA
async function loadModule(moduleName) {
    mainContent.innerHTML = '<h2>Cargando...</h2>';
    try {
        const response = await fetch(`modules/${moduleName}.php`);
        if (!response.ok) throw new Error('Módulo no encontrado.');
        mainContent.innerHTML = await response.text();

        if (moduleName === 'productos') {
            await loadActionContent('productos/todos_los_productos');
        } else if (moduleName === 'clientes') {
            await loadActionContent('clientes/todos_los_clientes');
        } else if (moduleName === 'web_admin') {
            // --- INICIO DE LA CORRECCIÓN ---
            // 1. Usamos el nombre de la acción correcto: 'web_admin/sliders'
            await loadActionContent('web_admin/sliders');
            
            // 2. Marcamos el botón correcto como activo.
            const activeButton = mainContent.querySelector('.action-btn[data-action="web_admin/sliders"]');
            if (activeButton) {
                activeButton.classList.add('active');
            }
            // --- FIN DE LA CORRECCIÓN ---
        }
        
    } catch (error) {
        mainContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}
// REEMPLAZA ESTA FUNCIÓN COMPLETA
async function loadActionContent(actionPath) {
    const actionContent = document.getElementById('action-content');
    if (!actionContent) return;
    actionContent.innerHTML = '<p>Cargando...</p>';
    try {
        const response = await fetch(`actions/${actionPath}.php`);
        if (!response.ok) throw new Error('Acción no encontrada.');
        actionContent.innerHTML = await response.text();

        // Lógica post-carga para PRODUCTOS
        if (actionPath === 'productos/todos_los_productos') {
            currentFilters.page = 1;
            await populateDepartmentFilter();
            await fetchAndRenderProducts();
            document.getElementById('product-list-container')?.addEventListener('scroll', handleScroll);
        } else if (actionPath === 'productos/agregar_producto') {
            initializeAddProductForm();
        } else if (actionPath === 'productos/modificar_producto') {
            initializeProductSearchForEdit();
        } else if (actionPath === 'productos/eliminar_producto') {
            initializeProductSearchForDelete();
        }
        // Lógica post-carga para CLIENTES
        else if (actionPath === 'clientes/todos_los_clientes') {
            await fetchAndRenderCustomers();
        }else if (actionPath === 'clientes/nuevo_cliente') {
            initializeAddCustomerForm();
        }else if (actionPath.startsWith('web_admin/')) {
            initializeWebAdminControls();
        }

    } catch (error) {
        actionContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}
    // admin/js/admin.js (PARTE 2 DE 2 - VERSIÓN COMPLETA Y FINAL)

    // --- FUNCIONES AUXILIARES Y DE FORMULARIOS ---

    async function populateDepartmentFilter(selectorId = 'department-filter') {
        const filterSelect = document.getElementById(selectorId);
        if (!filterSelect) return;
        try {
            const response = await fetch(`${API_BASE_URL}?resource=departments`);
            const departments = await response.json();
            if (departments && departments.length > 0) {
                filterSelect.innerHTML = `<option value="">Selecciona un departamento</option>`;
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id_departamento;
                    option.textContent = dept.departamento;
                    filterSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar departamentos:', error);
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
            const response = await fetch(`${API_BASE_URL}?resource=admin/updateProductField`, {
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
        if (!activateOption || !deactivateOption) return;

        const totalSelected = selectedRows.length;

        batchSelector.disabled = true;
        batchButton.disabled = true;
        batchSelector.value = '';
        activateOption.style.display = 'none';
        deactivateOption.style.display = 'none';

        if (totalSelected === 0) return;

        batchSelector.disabled = false;

        const areAllActive = selectedRows.every(row => row.dataset.status === 'activo');
        const areAllInactive = selectedRows.every(row => row.dataset.status !== 'activo');
        
        if (areAllActive) {
            deactivateOption.style.display = 'block';
        } else if (areAllInactive) {
            activateOption.style.display = 'block';
        }
    }

    function resetProductForm(form) {
        if (!form) return;
        form.reset();
        const inventoryFields = form.querySelector('#inventoryFields');
        if (inventoryFields) inventoryFields.classList.add('hidden');
        const imagePreview = form.querySelector('#image-preview');
        const noImageText = form.querySelector('#no-image-text');
        if (imagePreview && noImageText) {
            imagePreview.src = '';
            imagePreview.classList.add('hidden');
            noImageText.classList.remove('hidden');
        }
        const feedbackDiv = form.querySelector('.validation-feedback');
        if (feedbackDiv) feedbackDiv.textContent = '';
    }

    function initializeAddProductForm() {
        const form = document.getElementById('add-product-form');
        if (!form) return;
        const codeInput = form.querySelector('#codigo_producto');
        const submitButton = form.querySelector('.form-submit-btn');
        let typingTimer;
        codeInput.addEventListener('keyup', () => {
            clearTimeout(typingTimer);
            let feedbackDiv = codeInput.closest('.form-group').querySelector('.validation-feedback');
            if (!feedbackDiv) {
                feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'validation-feedback';
                codeInput.closest('.form-group').appendChild(feedbackDiv);
            }
            feedbackDiv.textContent = 'Verificando...';
            typingTimer = setTimeout(async () => {
                const code = codeInput.value.trim();
                if (code.length < 3) {
                    feedbackDiv.textContent = '';
                    submitButton.disabled = false;
                    return;
                }
                try {
                    const response = await fetch(`${API_BASE_URL}?resource=admin/checkProductCode&code=${encodeURIComponent(code)}`);
                    const result = await response.json();
                    feedbackDiv.textContent = result.message;
                    feedbackDiv.style.color = result.is_available ? 'green' : 'red';
                    submitButton.disabled = !result.is_available;
                } catch (error) {
                    feedbackDiv.textContent = 'Error al verificar.';
                    feedbackDiv.style.color = 'red';
                }
            }, 500);
        });
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
                const response = await fetch(`${API_BASE_URL}?resource=admin/createProduct`, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success) {
                    messagesDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                    resetProductForm(form);
                    setTimeout(() => { messagesDiv.innerHTML = ''; }, 3000);
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
    
    function initializeProductSearchForEdit() {
        const searchForm = document.getElementById('product-search-form');
        if (!searchForm) return;
        const searchInput = document.getElementById('product-search-to-edit');
        const feedbackDiv = document.getElementById('search-feedback');
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const productCode = searchInput.value.trim();
            if (!productCode) return;
            feedbackDiv.textContent = 'Buscando...';
            feedbackDiv.style.color = 'inherit';
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/getProductDetails&id=${encodeURIComponent(productCode)}`);
                const result = await response.json();
                if (result.success) {
                    feedbackDiv.textContent = '';
                    await renderEditForm(result.product);
                } else {
                    throw new Error(result.error || 'Producto no encontrado.');
                }
            } catch (error) {
                feedbackDiv.textContent = error.message;
                feedbackDiv.style.color = 'red';
            }
        });
    }

    async function renderEditForm(product) {
        const container = document.getElementById('edit-product-container');
        const searchContainer = document.getElementById('product-search-container');
        if (!container || !searchContainer) return;

        searchContainer.classList.add('hidden');
        container.classList.remove('hidden');

        const formResponse = await fetch('actions/productos/agregar_producto.php');
        const formHtml = await formResponse.text();
        container.innerHTML = formHtml;

        const form = container.querySelector('#add-product-form');
        form.id = 'edit-product-form';
        form.querySelector('.form-submit-btn').textContent = 'Actualizar Producto';

        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.name = 'id_producto';
        idInput.value = product.id_producto;
        form.prepend(idInput);
        
        const codeInput = form.querySelector('#codigo_producto');
        const originalCode = product.codigo_producto;
        codeInput.value = originalCode;
        form.querySelector('#nombre_producto').value = product.nombre_producto;
        form.querySelector('#departamento').value = product.departamento;
        form.querySelector('#precio_compra').value = product.precio_compra;
        form.querySelector('#precio_venta').value = product.precio_venta;
        form.querySelector('#precio_mayoreo').value = product.precio_mayoreo;
        form.querySelector('#tipo_de_venta').value = product.tipo_de_venta;
        form.querySelector('#estado').value = product.estado;
        form.querySelector('#proveedor').value = product.proveedor;

        if (product.url_imagen) {
            form.querySelector('#selected-image-url').value = product.url_imagen;
            form.querySelector('#image-preview').src = product.url_imagen;
            form.querySelector('#image-preview').classList.remove('hidden');
            form.querySelector('#no-image-text').classList.add('hidden');
        }

        const usaInventarioCheckbox = form.querySelector('#usa_inventario_checkbox');
        const inventoryFields = form.querySelector('#inventoryFields');
        if (product.usa_inventario == 1) {
            usaInventarioCheckbox.checked = true;
            inventoryFields.classList.remove('hidden');
            form.querySelector('#stock_actual').value = product.stock_actual;
            form.querySelector('#stock_minimo').value = product.stock_minimo;
            form.querySelector('#stock_maximo').value = product.stock_maximo;
            
            if (parseInt(product.stock_actual) > 0) {
                usaInventarioCheckbox.disabled = true;
                const helpText = document.createElement('small');
                helpText.textContent = 'El stock debe ser 0 para desactivar esta opción.';
                usaInventarioCheckbox.closest('.form-group').appendChild(helpText);
            }
        }
        
        usaInventarioCheckbox.addEventListener('change', () => {
            inventoryFields.classList.toggle('hidden', !usaInventarioCheckbox.checked);
        });
        
        const submitButton = form.querySelector('.form-submit-btn');
        let typingTimer;
        codeInput.addEventListener('keyup', () => {
            clearTimeout(typingTimer);
            let feedbackDiv = codeInput.closest('.form-group').querySelector('.validation-feedback');
             if (!feedbackDiv) {
                feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'validation-feedback';
                codeInput.closest('.form-group').appendChild(feedbackDiv);
            }
            const newCode = codeInput.value.trim();
            if (newCode === originalCode) {
                feedbackDiv.textContent = '';
                submitButton.disabled = false;
                return;
            }
            feedbackDiv.textContent = 'Verificando...';
            typingTimer = setTimeout(async () => {
                if (newCode.length < 3) {
                    feedbackDiv.textContent = '';
                    submitButton.disabled = false;
                    return;
                }
                try {
                    const response = await fetch(`${API_BASE_URL}?resource=admin/checkProductCode&code=${encodeURIComponent(newCode)}&current_id=${product.id_producto}`);
                    const result = await response.json();
                    feedbackDiv.textContent = result.message;
                    feedbackDiv.style.color = result.is_available ? 'green' : 'red';
                    submitButton.disabled = !result.is_available;
                } catch (error) {
                    feedbackDiv.textContent = 'Error al verificar.';
                    feedbackDiv.style.color = 'red';
                }
            }, 500);
        });
        initializeEditProductFormSubmit();
    }
    
    function initializeEditProductFormSubmit() {
        const form = document.getElementById('edit-product-form');
        if (!form) return;
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = form.querySelector('.form-submit-btn');
            const messagesDiv = form.querySelector('#form-messages');
            const formData = new FormData(form);
            submitButton.disabled = true;
            submitButton.textContent = 'Actualizando...';
            messagesDiv.innerHTML = '';
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/updateProduct`, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success) {
                    messagesDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                    setTimeout(() => {
                        const container = document.getElementById('edit-product-container');
                        const searchContainer = document.getElementById('product-search-container');
                        if (container && searchContainer) {
                            container.innerHTML = '';
                            container.classList.add('hidden');
                            searchContainer.classList.remove('hidden');
                            document.getElementById('product-search-to-edit').value = '';
                            messagesDiv.innerHTML = '';
                        }
                    }, 1500);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                messagesDiv.innerHTML = `<div class="message error">${error.message}</div>`;
            } finally {
                if (!messagesDiv.querySelector('.success')) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Actualizar Producto';
                }
            }
        });
    }
// --- LÓGICA PARA ELIMINAR PRODUCTO (RESTAURADA) ---
    function initializeProductSearchForDelete() {
        const searchForm = document.getElementById('product-search-form-delete');
        if (!searchForm) return;

        const searchInput = document.getElementById('product-search-to-delete');
        const feedbackDiv = document.getElementById('search-feedback-delete');
        const container = document.getElementById('delete-product-container');

        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // <-- ESTA LÍNEA EVITA QUE LA PÁGINA SE RECARGUE
            const productCode = searchInput.value.trim();
            if (!productCode) return;

            feedbackDiv.textContent = 'Buscando...';
            feedbackDiv.style.color = 'inherit';
            container.classList.add('hidden');
            container.innerHTML = '';

            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/getProductDetails&id=${encodeURIComponent(productCode)}`);
                const result = await response.json();

                if (result.success) {
                    feedbackDiv.textContent = '';
                    renderDeleteView(result.product);
                } else {
                    throw new Error(result.error || 'Producto no encontrado.');
                }
            } catch (error) {
                feedbackDiv.textContent = error.message;
                feedbackDiv.style.color = 'red';
            }
        });
    }

    function renderDeleteView(product) {
        const container = document.getElementById('delete-product-container');
        container.classList.remove('hidden');

        const canBeDeleted = parseInt(product.stock_actual, 10) === 0;
        let deleteButtonHtml = '';
        let warningMessageHtml = '';

        if (canBeDeleted) {
            deleteButtonHtml = `<button id="confirm-delete-btn" class="action-btn form-submit-btn" data-product-id="${product.id_producto}">Eliminar Producto Permanentemente</button>`;
        } else {
            warningMessageHtml = `
                <div class="message error">
                    No se puede eliminar. Stock actual: <strong>${product.stock_actual}</strong>.
                    <br>
                    Por favor, realiza un ajuste de inventario a cero para poder eliminarlo.
                </div>`;
            deleteButtonHtml = `<button class="action-btn form-submit-btn" disabled>Eliminar Producto</button>`;
        }

        container.innerHTML = `
            <h4>Detalles del Producto</h4>
            <div class="product-summary">
                <p><strong>Código:</strong> ${product.codigo_producto}</p>
                <p><strong>Nombre:</strong> ${product.nombre_producto}</p>
                <p><strong>Departamento:</strong> ${product.nombre_departamento}</p>
                <p><strong>Stock Actual:</strong> <strong class="${!canBeDeleted ? 'stock-low' : ''}">${product.stock_actual}</strong></p>
            </div>
            <div id="delete-feedback"></div>
            ${warningMessageHtml}
            <div class="form-group" style="justify-content: center; margin-top: 1rem;">
                ${deleteButtonHtml}
            </div>
        `;

        if (canBeDeleted) {
            document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteConfirmation);
        }
    }

    async function handleDeleteConfirmation(event) {
        const button = event.target;
        const productId = button.dataset.productId;
        const feedbackDiv = document.getElementById('delete-feedback');

        if (!confirm('¿Estás SEGURO de que quieres eliminar este producto? Esta acción es irreversible.')) {
            return;
        }

        button.disabled = true;
        button.textContent = 'Eliminando...';
        feedbackDiv.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/deleteProduct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_producto: productId })
            });
            const result = await response.json();

            if (result.success) {
                feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                document.getElementById('delete-product-container').innerHTML = feedbackDiv.innerHTML;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            feedbackDiv.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
            button.disabled = false;
            button.textContent = 'Eliminar Producto Permanentemente';
        }
    }

    // --- ⭐ FUNCIONES DE LA GALERÍA RESTAURADAS ⭐ ---
    async function openImageGallery() {
        if (!galleryModal) return;
        galleryModal.style.display = 'flex';
        await loadImageGrid();
    }
    
    function closeImageGallery() {
        if (galleryModal) galleryModal.style.display = 'none';
    }

    async function loadImageGrid() {
        const grid = galleryModal.querySelector('.image-grid-container');
        grid.innerHTML = '<p>Cargando imágenes...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getBucketImages`);
            const result = await response.json();
            grid.innerHTML = '';
            if (result.success && result.images.length > 0) {
                result.images.forEach(image => {
                    const item = document.createElement('div');
                    item.className = 'image-grid-item';
                    item.dataset.imageUrl = image.url;
                    item.dataset.imageName = image.name;
                    item.innerHTML = `<img src="${image.url}" alt="${image.name}"><button class="delete-image-btn" title="Eliminar del bucket">&times;</button>`;
                    grid.appendChild(item);
                });
            } else {
                grid.innerHTML = '<p>No hay imágenes en el bucket.</p>';
            }
        } catch (error) {
            grid.innerHTML = `<p style="color:red;">Error al cargar las imágenes.</p>`;
        }
    }

    // --- MANEJADORES DE EVENTOS GLOBALES ---
    
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
// REEMPLAZA ESTE EVENT LISTENER
mainContent.addEventListener('input', (event) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        if (event.target.id === 'product-search-input') {
            currentFilters.search = event.target.value;
            currentFilters.page = 1;
            await fetchAndRenderProducts();
        }
        if (event.target.id === 'customer-search-input') {
            await fetchAndRenderCustomers(event.target.value);
        }
    }, 300);
    
});

// REEMPLAZA este event listener completo en admin/js/admin.js

mainContent.addEventListener('change', async (event) => {
    const target = event.target;
    
    // Lógica para seleccionar todos los productos y actualizar acciones en lote
    if (target.id === 'select-all-products' || target.classList.contains('product-checkbox')) {
        if (target.id === 'select-all-products') {
            mainContent.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = target.checked);
        }
        updateBatchActionsState();
    }
    
    // Lógica para habilitar el botón de ejecutar al cambiar la acción
    if (target.id === 'batch-action-selector') {
        const batchButton = mainContent.querySelector('#batch-action-execute');
        if(batchButton) batchButton.disabled = !target.value;
    }

    // Lógica para el filtro de departamento
    if (target.id === 'department-filter') {
        currentFilters.department = target.value;
        currentFilters.page = 1;
        await fetchAndRenderProducts();
    }
});

    const handleScroll = async () => {
        const container = document.getElementById('product-list-container');
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (clientHeight + scrollTop >= scrollHeight - 15) {
            if (!isLoading && currentFilters.page !== -1) {
                currentFilters.page++;
                await fetchAndRenderProducts();
            }
        }
    };

// REEMPLAZA ESTE EVENT LISTENER
mainContent.addEventListener('click', async (event) => {
    const target = event.target;

    // --- Lógica para el botón de editar cliente ---
    if (target.classList.contains('edit-customer-btn')) {
        const customerId = target.closest('tr').dataset.customerId;
        
        // Cambia visualmente la pestaña activa en la cinta de opciones
        mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
        mainContent.querySelector('[data-action="clientes/modificar_cliente"]')?.classList.add('active');
        
        // Carga el módulo de modificación y luego los datos del cliente
        await loadActionContent('clientes/modificar_cliente');
        
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getCustomerDetails&id=${customerId}`);
            const result = await response.json();
            if (result.success) {
                await renderEditCustomerForm(result.customer);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
             document.getElementById('edit-customer-container').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
        }
        return; // Detiene la ejecución para no interferir con otros listeners
    }

    // --- Lógica para el botón de editar producto (y otros existentes) ---
    if (target.classList.contains('edit-product-btn')) {
        const productCode = target.closest('tr').querySelector('td:nth-child(2)').textContent;
        mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
        mainContent.querySelector('[data-action="productos/modificar_producto"]')?.classList.add('active');
        await loadActionContent('productos/modificar_producto');
        const searchInput = document.getElementById('product-search-to-edit');
        const searchForm = document.getElementById('product-search-form');
        if (searchInput && searchForm) {
            searchInput.value = productCode;
            searchForm.dispatchEvent(new Event('submit'));
        }
        return;
    }
       if (target.classList.contains('delete-customer-btn')) {
        const row = target.closest('tr');
        const customerId = row.dataset.customerId;
        const customerName = row.querySelector('td:nth-child(2)').textContent;

        if (confirm(`¿Estás seguro de que quieres eliminar al cliente "${customerName}"? Esta acción es irreversible.`)) {
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/deleteCustomer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_cliente: customerId })
                });
                
                const result = await response.json();

                if (result.success) {
                    // Elimina la fila de la tabla para una respuesta visual inmediata
                    row.remove();
                    alert(result.message); // O muestra una notificación más sutil
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                alert(`Error al eliminar: ${error.message}`);
            }
        }
        return;
    }
    // --- Lógica general para los botones de la cinta de opciones ---
    const actionButton = target.closest('.action-btn[data-action]');
    if (actionButton && !actionButton.id.startsWith('batch-action')) {
        const currentModule = document.querySelector('.nav-link.active')?.dataset.module;
        const actionToLoad = actionButton.dataset.action;

        // Solo procesa si el botón pertenece al módulo activo
        if (actionToLoad.startsWith(currentModule)) {
            mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
            actionButton.classList.add('active');
            loadActionContent(actionToLoad);
        }
    }
    
    // Aquí iría el resto de tu lógica de 'click' para (procesador de imágenes, acciones en lote, etc.)
});
    
    async function openDepartmentModal() {
        if (!modal) return;
        await populateDepartmentFilter('modal-department-selector');
        modal.style.display = 'flex';
    }

    function closeDepartmentModal() {
        if (!modal) return;
        modal.style.display = 'none';
        document.getElementById('modal-error-message').textContent = '';
    }

    if (modal) {
        modal.addEventListener('click', async (event) => {
            if (event.target.matches('.modal-close-btn, #modal-cancel-btn')) {
                closeDepartmentModal();
            }
            if (event.target.id === 'modal-confirm-btn') {
                const selector = document.getElementById('modal-department-selector');
                const departmentId = selector.value;
                const errorDiv = document.getElementById('modal-error-message');
                if (!departmentId) {
                    errorDiv.textContent = 'Por favor, selecciona un departamento.';
                    return;
                }
                const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);
                event.target.textContent = 'Guardando...';
                event.target.disabled = true;
                try {
                    const response = await fetch(`${API_BASE_URL}?resource=admin/batchAction`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'change-department', productIds, departmentId })
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error);
                    alert(result.message);
                    closeDepartmentModal();
                    currentFilters.page = 1;
                    await fetchAndRenderProducts();
                } catch (error) {
                    errorDiv.textContent = `Error: ${error.message}`;
                } finally {
                    event.target.textContent = 'Confirmar Cambio';
                    event.target.disabled = false;
                }
            }
        });
    }

    if (galleryModal) {
        galleryModal.addEventListener('click', async (event) => {
            const target = event.target;
            const confirmBtn = galleryModal.querySelector('#gallery-confirm-btn');
            if (target.matches('.gallery-tab-btn')) {
                galleryModal.querySelectorAll('.gallery-tab-btn, .gallery-tab-content').forEach(el => el.classList.remove('active'));
                target.classList.add('active');
                galleryModal.querySelector(`#gallery-${target.dataset.tab}-tab`).classList.add('active');
            }
            if (target.closest('.image-grid-item')) {
                const selectedItem = target.closest('.image-grid-item');
                galleryModal.querySelectorAll('.image-grid-item').forEach(item => item.classList.remove('selected'));
                selectedItem.classList.add('selected');
                confirmBtn.disabled = false;
            }
            if (target.matches('.delete-image-btn')) {
                event.stopPropagation();
                const itemToDelete = target.closest('.image-grid-item');
                const imageName = itemToDelete.dataset.imageName;
                if (confirm(`¿Seguro que quieres eliminar esta imagen PERMANENTEMENTE del bucket?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteBucketImage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: imageName }) });
                        const result = await response.json();
                        if (!result.success) throw new Error(result.error);
                        itemToDelete.remove();
                    } catch (error) {
                        alert(`Error al eliminar: ${error.message}`);
                    }
                }
            }
            if (target.id === 'gallery-confirm-btn') {
                const selectedImage = galleryModal.querySelector('.image-grid-item.selected');
                if (selectedImage) {
                    const imageUrl = selectedImage.dataset.imageUrl;
                    const formImageUrlInput = document.querySelector('#selected-image-url');
                    const formImagePreview = document.querySelector('#image-preview');
                    const formImagePlaceholder = document.querySelector('#no-image-text');
                    if(formImageUrlInput && formImagePreview && formImagePlaceholder) {
                        formImageUrlInput.value = imageUrl;
                        formImagePreview.src = imageUrl;
                        formImagePreview.classList.remove('hidden');
                        formImagePlaceholder.classList.add('hidden');
                    }
                    closeImageGallery();
                }
            }
            if (target.id === 'gallery-upload-btn') {
                const fileInput = galleryModal.querySelector('#gallery-upload-input');
                const feedbackDiv = galleryModal.querySelector('#gallery-upload-feedback');
                if (fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('url_imagen', fileInput.files[0]);
                    target.textContent = 'Subiendo...';
                    target.disabled = true;
                    feedbackDiv.textContent = '';
                    try {
                        const response = await fetch(`${API_BASE_URL}?resource=admin/uploadImage`, { method: 'POST', body: formData });
                        const result = await response.json();
                        if (!result.success) throw new Error(result.error);
                        feedbackDiv.textContent = '¡Imagen subida! Recargando...';
                        feedbackDiv.style.color = 'green';
                        fileInput.value = '';
                        await loadImageGrid();
                        galleryModal.querySelector('.gallery-tab-btn[data-tab="select"]').click();
                    } catch (error) {
                        feedbackDiv.textContent = `Error: ${error.message}`;
                        feedbackDiv.style.color = 'red';
                    } finally {
                        target.textContent = 'Subir Imagen';
                        target.disabled = false;
                    }
                } else {
                    feedbackDiv.textContent = 'Selecciona un archivo primero.';
                }
            }
            if (target.matches('.modal-close-btn') || target.id === 'gallery-cancel-btn') {
                closeImageGallery();
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
        async function initializeWebAdminControls() {
        const container = document.getElementById('action-content');
        if (!container) return;

        // 1. Cargar los ajustes actuales de la API
        try {
            const response = await fetch(`${API_BASE_URL}?resource=layout-settings`);
            const result = await response.json();
            if (result.success && result.settings) {
                // 2. Poblar TODOS los campos (interruptores, textos, selectores)
                for (const key in result.settings) {
                    const input = document.getElementById(key);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = result.settings[key];
                        } else {
                            input.value = result.settings[key];
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error al cargar la configuración de la web:', error);
        }
        
        // 3. Crear un único listener para guardar cualquier cambio
        container.addEventListener('change', async (event) => {
            // Se activa si se toca un interruptor o cualquier campo de configuración
            if (event.target.matches('.switch, .admin-config-input')) {
                const settingsToSave = {};
                
                // Recolectar datos de interruptores de la vista actual
                container.querySelectorAll('.switch').forEach(s => {
                    settingsToSave[s.id] = s.checked;
                });
                // Recolectar datos de otros inputs y selects de la vista actual
                container.querySelectorAll('.admin-config-input').forEach(i => {
                    const value = i.tagName === 'SELECT' ? parseInt(i.value, 10) : i.value;
                    settingsToSave[i.id] = value;
                });
                
                // 4. Enviar el objeto completo a la API para que lo guarde
                try {
                    const response = await fetch(`${API_BASE_URL}?resource=admin/saveLayoutSettings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settingsToSave)
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error);
                    
                    console.log('Configuración guardada:', result.message);

                } catch (error) {
                    console.error('Error al guardar la configuración:', error);
                }
            }
        });
    }

    // --- Carga Inicial de la Aplicación ---
    initializeSidemenu();
    checkSidemenuState();
    loadModule('dashboard');
});

