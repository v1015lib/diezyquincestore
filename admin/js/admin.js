// Reemplaza todo el contenido de admin/js/admin.js con esto

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias y Estado Global ---
    const mainContent = document.getElementById('main-content');
    const sidemenu = document.getElementById('admin-sidemenu');
    const menuToggle = document.getElementById('admin-menu-toggle');
    const modal = document.getElementById('department-modal');
    
    // Objeto para mantener el estado actual de los filtros y ordenamiento
    let currentFilters = {
        search: '',
        department: '',
        sort: {
            by: 'nombre_producto',
            order: 'ASC'
        }
    };
    if (menuToggle && sidemenu) {
        menuToggle.addEventListener('click', () => {
            sidemenu.classList.toggle('active');
        });
    }
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
            }
        } catch (error) {
            actionContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }

    // --- NUEVA FUNCIÓN PARA CARGAR EL FILTRO DE DEPARTAMENTOS ---
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
    
    // --- Lógica de Productos (ACTUALIZADA PARA USAR EL ESTADO GLOBAL) ---
    async function fetchAndRenderProducts() {
        const tableBody = document.getElementById('product-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="6">Buscando...</td></tr>';
        
        // Construimos la URL con todos los filtros del estado actual
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
    
    // El resto de funciones (saveFieldUpdate, modales, etc.) no necesitan grandes cambios
    // ... (pegar aquí el resto de funciones sin cambios: updateSortIndicators, saveFieldUpdate, updateBatchActionsState, openDepartmentModal, closeModal) ...
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


    // --- MANEJADORES DE EVENTOS (ACTUALIZADOS) ---
    
    // Menú lateral
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

    // Búsqueda en tiempo real
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

    // Checkboxes y selección de acción en lote
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

        // --- NUEVO LISTENER PARA EL FILTRO DE DEPARTAMENTO ---
        if (target.id === 'department-filter') {
            currentFilters.department = target.value;
            fetchAndRenderProducts();
        }
    });
    
    // Clics generales (ordenamiento, acciones, etc.)
    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
        
        // Clic en encabezados para ordenar
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

        // Clics en cinta de opciones
        const actionButton = target.closest('.action-btn');
        if (actionButton && actionButton.id !== 'batch-action-execute') {
            const actionToLoad = actionButton.dataset.action;
            if (actionToLoad) {
                mainContent.querySelectorAll('.action-btn.active').forEach(btn => btn.classList.remove('active'));
                actionButton.classList.add('active');
                loadActionContent(actionToLoad);
            }
        }

        // Clic en "Ejecutar"
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
    
    // Eventos del modal
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

    // Edición en línea
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