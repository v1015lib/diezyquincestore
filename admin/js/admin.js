document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const sidemenu = document.getElementById('admin-sidemenu');
    const menuToggle = document.getElementById('admin-menu-toggle');

    if (menuToggle && sidemenu) {
        menuToggle.addEventListener('click', () => sidemenu.classList.toggle('active'));
    }

    // --- LÓGICA DE CARGA DE MÓDULOS Y ACCIONES ---
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
    
    // --- LÓGICA PARA OBTENER Y RENDERIZAR PRODUCTOS ---
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
                    const statusClass = (product.nombre_estado || '').toLowerCase() === 'activo' ? 'status-active' : 'status-inactive';
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

    // --- FUNCIÓN PARA GUARDAR CAMBIOS DE LA EDICIÓN EN TIEMPO REAL ---
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
            searchTimeout = setTimeout(() => fetchAndRenderProducts(event.target.value), 300);
        }
    });

    mainContent.addEventListener('change', (event) => {
        if (event.target.id === 'select-all-products' || event.target.classList.contains('product-checkbox')) {
            if (event.target.id === 'select-all-products') {
                mainContent.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = event.target.checked);
            }
            updateBatchActionsState();
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
    
    function updateBatchActionsState() {
        const checkedBoxes = mainContent.querySelectorAll('.product-checkbox:checked').length > 0;
        mainContent.querySelector('#batch-action-selector').disabled = !checkedBoxes;
        mainContent.querySelector('#batch-action-execute').disabled = !checkedBoxes;
    }

    // --- CARGA INICIAL ---
    loadModule('dashboard');
    sidemenu.querySelector('[data-module="dashboard"]').classList.add('active');
});