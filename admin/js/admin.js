// admin/js/admin.js (PARTE 1 DE 2 - VERSIÓN COMPLETA Y FINAL)

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a Elementos del DOM ---
    const mainContent = document.getElementById('main-content');
    const sidemenu = document.getElementById('admin-sidemenu');
    const menuToggle = document.getElementById('admin-menu-toggle');
    const collapseBtn = document.getElementById('sidemenu-collapse-btn');
    const modal = document.getElementById('department-modal');
    const galleryModal = document.getElementById('image-gallery-modal');

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


async function showProcessedFiles() {
    const listContainer = document.getElementById('processed-files-list');
    const resultsContainer = document.getElementById('results-container');
    if (!listContainer || !resultsContainer) return;

    try {
        const response = await fetch('../api/index.php?resource=get_processed_images');
        const data = await response.json();

        listContainer.innerHTML = ''; // Limpiamos la lista anterior
        if (data.success && data.files.length > 0) {
            resultsContainer.classList.remove('hidden');
            data.files.forEach(file => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'processed-file-item';
                itemDiv.dataset.fileName = file.name;

                // --- MEJORA: Se crea un enlace de descarga ---
                const downloadLink = document.createElement('a');
                downloadLink.href = file.url;
                downloadLink.download = file.name; // Este atributo fuerza la descarga
                downloadLink.title = `Descargar ${file.name}`;
                downloadLink.innerHTML = `<img src="${file.url}?t=${new Date().getTime()}" alt="${file.name}">`;

                // Se crea la etiqueta con el checkbox por separado
                const label = document.createElement('label');
                label.innerHTML = `
                    <input type="checkbox" class="processed-file-checkbox">
                    ${file.name}
                `;
                
                // Se añaden ambos elementos al contenedor del item
                itemDiv.appendChild(downloadLink);
                itemDiv.appendChild(label);
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

    mainContent.addEventListener('click', async (event) => {
        // ... tu código de click existente para otros módulos ...

        if (event.target.id === 'start-processing-btn') {
            // (La lógica que ya te había proporcionado para ejecutar el script y mostrar la consola)
            // Aquí añadimos la llamada para mostrar los archivos al finalizar
            const button = event.target;
            const outputConsole = document.getElementById('processor-output');
            
            button.disabled = true;
            button.textContent = 'Procesando...';
            outputConsole.textContent = 'Iniciando...\n';
            document.getElementById('results-container').classList.add('hidden');

            try {
                const response = await fetch('../api/index.php?resource=run_processor');
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    outputConsole.textContent += decoder.decode(value, { stream: true });
                    outputConsole.scrollTop = outputConsole.scrollHeight;
                }
                outputConsole.textContent += '\n\n--- PROCESO FINALIZADO ---';
                await showProcessedFiles(); // ¡Importante! Muestra los archivos al terminar
            } catch (error) {
                outputConsole.textContent += `\n\n--- ERROR ---\n${error.message}`;
            } finally {
                button.disabled = false;
                button.textContent = 'Iniciar Proceso';
            }
        }

        if (event.target.closest('.processed-file-item')) {
            const item = event.target.closest('.processed-file-item');
            const checkbox = item.querySelector('.processed-file-checkbox');
            if (event.target.tagName !== 'INPUT') {
                checkbox.checked = !checkbox.checked;
            }
            item.classList.toggle('selected', checkbox.checked);
            updateProcessorButtons();
        }

        if (event.target.id === 'upload-to-gallery-btn') {
            const selectedFiles = Array.from(document.querySelectorAll('.processed-file-checkbox:checked'))
                .map(cb => cb.closest('.processed-file-item').dataset.fileName);
            const feedbackDiv = document.getElementById('results-feedback');
            const button = event.target;
            
            if (selectedFiles.length === 0) return;

            feedbackDiv.textContent = `Subiendo ${selectedFiles.length} archivo(s) a la galería...`;
            feedbackDiv.style.color = 'inherit';
            button.disabled = true;

            try {
                // --- MEJORA: LLAMADA REAL A LA API ---
                const response = await fetch('../api/index.php?resource=admin/uploadProcessedToBucket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: selectedFiles })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Error desconocido del servidor.');
                }

                feedbackDiv.textContent = result.message;
                feedbackDiv.style.color = 'green';

            } catch (error) {
                feedbackDiv.textContent = `Error al subir: ${error.message}`;
                feedbackDiv.style.color = 'red';
            } finally {
                // Aunque no lo reactivamos, es buena práctica dejarlo.
                // Podrías decidir reactivarlo si quieres que el usuario reintente.
                // button.disabled = false; 
            }
        }


        if (event.target.id === 'download-zip-btn') {
            const files = Array.from(document.querySelectorAll('.processed-file-checkbox:checked'))
                .map(cb => cb.closest('.processed-file-item').dataset.fileName);
                
            const response = await fetch('../api/index.php?resource=download_processed_images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files })
            });

            if(response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Extrae el nombre del archivo de la cabecera
                const disposition = response.headers.get('Content-Disposition');
                const fileNameMatch = disposition.match(/filename="(.+?)"/);
                a.download = fileNameMatch ? fileNameMatch[1] : 'imagenes.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Error al crear el archivo ZIP.');
            }
        }

        if (event.target.id === 'clear-results-btn') {
            document.getElementById('processed-files-list').innerHTML = '';
            document.getElementById('results-container').classList.add('hidden');
            // Aquí podrías añadir una llamada a la API para borrar los archivos del servidor si lo deseas.
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
        const apiUrl = `../api/index.php?resource=admin/getProducts&search=${encodeURIComponent(search)}&department_id=${department}&sort_by=${sort.by}&order=${sort.order}&page=${page}`;

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
            const response = await fetch('../api/index.php?resource=departments');
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
                    const response = await fetch(`../api/index.php?resource=admin/checkProductCode&code=${encodeURIComponent(code)}`);
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
                const response = await fetch('../api/index.php?resource=admin/createProduct', { method: 'POST', body: formData });
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
                const response = await fetch(`../api/index.php?resource=admin/getProductDetails&id=${encodeURIComponent(productCode)}`);
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
                    const response = await fetch(`../api/index.php?resource=admin/checkProductCode&code=${encodeURIComponent(newCode)}&current_id=${product.id_producto}`);
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
                const response = await fetch('../api/index.php?resource=admin/updateProduct', { method: 'POST', body: formData });
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
                const response = await fetch(`../api/index.php?resource=admin/getProductDetails&id=${encodeURIComponent(productCode)}`);
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
            const response = await fetch('../api/index.php?resource=admin/deleteProduct', {
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
            const response = await fetch('../api/index.php?resource=admin/getBucketImages');
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
    mainContent.addEventListener('input', (event) => {
        if (event.target.id === 'product-search-input') {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                currentFilters.search = event.target.value;
                currentFilters.page = 1;
                await fetchAndRenderProducts();
            }, 300);
        }
    });

    mainContent.addEventListener('change', async (event) => {
        const target = event.target;
        if (target.id === 'select-all-products' || target.classList.contains('product-checkbox')) {
            if (target.id === 'select-all-products') {
                mainContent.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = target.checked);
            }
            updateBatchActionsState();
        }
        
        if (target.id === 'batch-action-selector') {
            const batchButton = mainContent.querySelector('#batch-action-execute');
            if(batchButton) batchButton.disabled = !target.value;
        }

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

    mainContent.addEventListener('click', async (event) => {
        const target = event.target;

        if (target.id === 'batch-action-execute') {
            const selector = mainContent.querySelector('#batch-action-selector');
            const action = selector.value;
            const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);
            if (!action || productIds.length === 0) return;
            if (action === 'change-department') { 
                await openDepartmentModal(); 
                return; 
            }
            if (!confirm(`¿Estás seguro de ejecutar la acción en ${productIds.length} productos?`)) return;
            target.textContent = 'Procesando...';
            target.disabled = true;
            try {
                const response = await fetch('../api/index.php?resource=admin/batchAction', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, productIds })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);
                alert(result.message);
                currentFilters.page = 1;
                await fetchAndRenderProducts();
            } catch (error) {
                alert(`Error: ${error.message}`);
            } finally {
                target.textContent = 'Ejecutar';
                updateBatchActionsState();
            }
        }

        if (target.classList.contains('edit-product-btn')) {
            const productCode = target.closest('tr').querySelector('td:nth-child(2)').textContent;
            document.querySelector('.action-btn.active')?.classList.remove('active');
            document.querySelector('[data-action="productos/modificar_producto"]')?.classList.add('active');
            await loadActionContent('productos/modificar_producto');
            const searchInput = document.getElementById('product-search-to-edit');
            const searchForm = document.getElementById('product-search-form');
            if (searchInput && searchForm) {
                searchInput.value = productCode;
                searchForm.dispatchEvent(new Event('submit'));
            }
            return;
        }

        if (target.id === 'open-gallery-btn') {
            openImageGallery();
        }

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

        const actionButton = target.closest('.action-btn');
        if (actionButton && actionButton.id !== 'batch-action-execute') {
            const actionToLoad = actionButton.dataset.action;
            if (actionToLoad) {
                document.querySelector('.action-btn.active')?.classList.remove('active');
                actionButton.classList.add('active');
                loadActionContent(actionToLoad);
            }
        }
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
                    const response = await fetch('../api/index.php?resource=admin/batchAction', {
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
                        const response = await fetch('../api/index.php?resource=admin/deleteBucketImage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: imageName }) });
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
                        const response = await fetch('../api/index.php?resource=admin/uploadImage', { method: 'POST', body: formData });
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

    // --- Carga Inicial de la Aplicación ---
    initializeSidemenu();
    checkSidemenuState();
    loadModule('dashboard');
});