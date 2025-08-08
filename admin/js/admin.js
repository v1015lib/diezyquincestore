document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const sidemenu = document.getElementById('admin-sidemenu');
    const menuToggle = document.getElementById('admin-menu-toggle');

    if (menuToggle && sidemenu) {
        menuToggle.addEventListener('click', () => sidemenu.classList.toggle('active'));
    }

    // --- LÓGICA DE CARGA ---
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
                await fetchAndRenderProducts();
            }
        } catch (error) {
            actionContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }
    
    async function fetchAndRenderProducts(searchTerm = '') {
        const tableBody = document.getElementById('product-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="6">Buscando...</td></tr>';
        try {
            const apiUrl = `../api/index.php?resource=admin/getProducts&search=${encodeURIComponent(searchTerm)}`;
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);
            const data = await response.json();
            tableBody.innerHTML = '';
            if (data.success && data.products.length > 0) {
                data.products.forEach(product => {
                    const row = document.createElement('tr');
                    row.dataset.productId = product.id_producto;
                    // Guardamos el estado en minúsculas para comparaciones consistentes
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
                tableBody.innerHTML = '<tr><td colspan="6">No se encontraron productos para la búsqueda.</td></tr>';
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar: ${error.message}</td></tr>`;
        }
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

    // --- NUEVA FUNCIÓN MEJORADA PARA LAS ACCIONES ---
    function updateBatchActionsState() {
        const selectedRows = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr'));
        const batchSelector = mainContent.querySelector('#batch-action-selector');
        const batchButton = mainContent.querySelector('#batch-action-execute');

        if (!batchSelector || !batchButton) return;

        const activateOption = batchSelector.querySelector('option[value="activate"]');
        const deactivateOption = batchSelector.querySelector('option[value="deactivate"]');
        const totalSelected = selectedRows.length;

        // 1. Resetear todo al estado inicial
        batchSelector.disabled = true;
        batchButton.disabled = true;
        batchSelector.value = ''; // Importante: deseleccionar cualquier acción previa
        if (activateOption) activateOption.style.display = 'none';
        if (deactivateOption) deactivateOption.style.display = 'none';

        // Si no hay nada seleccionado, terminamos
        if (totalSelected === 0) return;

        // 2. Si hay selección, habilitar el menú para acciones generales (como 'Eliminar')
        batchSelector.disabled = false;

        // 3. Lógica de restricción para Activar/Inactivar
        const areAllActive = selectedRows.every(row => row.dataset.status === 'activo');
        const areAllInactive = selectedRows.every(row => row.dataset.status !== 'activo');
        
        // Si la selección es uniforme, muestra la opción de estado correspondiente
        if (areAllActive) {
            if (deactivateOption) deactivateOption.style.display = 'block';
        } else if (areAllInactive) {
            if (activateOption) activateOption.style.display = 'block';
        }
        // Si la selección es MIXTA, las opciones de estado permanecerán ocultas.
        // El botón de Ejecutar sigue deshabilitado por defecto.
    }

    // --- MANEJADORES DE EVENTOS (EVENT LISTENERS) ---
    
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
            searchTimeout = setTimeout(() => fetchAndRenderProducts(event.target.value), 300);
        }
    });

    mainContent.addEventListener('change', (event) => {
        const target = event.target;
        // Si se marca o desmarca un checkbox
        if (target.id === 'select-all-products' || target.classList.contains('product-checkbox')) {
            if (target.id === 'select-all-products') {
                mainContent.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = target.checked);
            }
            updateBatchActionsState();
        }
        
        // Si se elige una opción del menú de acciones
        if (target.id === 'batch-action-selector') {
            const batchButton = mainContent.querySelector('#batch-action-execute');
            // Habilita el botón "Ejecutar" SÓLO si se ha elegido una acción
            if (batchButton) {
                batchButton.disabled = !target.value; 
            }
        }
    });

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

    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
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
            const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);
            
            if (!action || productIds.length === 0) return;
            if (!confirm(`¿Estás seguro de ejecutar "${selector.options[selector.selectedIndex].text}" en ${productIds.length} productos?`)) return;
            
            target.textContent = 'Procesando...';
            target.disabled = true;
            try {
                const response = await fetch('../api/index.php?resource=admin/batchAction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: action, productIds: productIds })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error || 'Error en la API.');
                alert(result.message);

                await fetchAndRenderProducts(document.getElementById('product-search-input').value);
            } catch (error) {
                alert(`Error: ${error.message}`);
                target.disabled = false;
            } finally {
                // El estado se reseteará con la llamada a updateBatchActionsState que se dispara
                // al refrescar los productos y limpiar los checkboxes.
                target.textContent = 'Ejecutar';
                updateBatchActionsState();
            }
        }
    });

    // --- CARGA INICIAL ---
    loadModule('dashboard');
    sidemenu.querySelector('[data-module="dashboard"]').classList.add('active');
});