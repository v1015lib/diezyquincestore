// admin/js/admin.js (PARTE 1 DE 2 - VERSIÓN COMPLETA Y FINAL)

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a Elementos del DOM ---
    const mainContent = document.getElementById('main-content');
    const sidemenu = document.getElementById('admin-sidemenu');
    const menuToggle = document.getElementById('admin-menu-toggle');
    const collapseBtn = document.getElementById('sidemenu-collapse-btn');
    const modal = document.getElementById('department-modal');
    const galleryModal = document.getElementById('image-gallery-modal');
    const inputSelector = document.getElementById('selector-imagen');
    const btnProcesar = document.getElementById('btn-procesar-imagen');
    const vistaPreviaContainer = document.getElementById('vista-previa-container');
    const API_BASE_URL = '../api/index.php';


    document.body.addEventListener('click', function(event) {
        // Busca si el clic fue en el enlace de logout
        const logoutLink = event.target.closest('a[href="api/logout.php"]');
        if (logoutLink) {
            // Antes de que la página redirija al logout, limpiamos el sessionStorage del POS.
            console.log('Cerrando sesión, limpiando datos del POS...');
            sessionStorage.removeItem('pos_selected_store_id');
            sessionStorage.removeItem('pos_selected_store_name');
        }
    });
    let currentFilters = {
        search: '',
        department: '',
        store: '', 
        page: 1,
        sort: {
            by: 'nombre_producto',
            order: 'ASC'
        }
    };

let isLoading = false;       




    async function updateHeaderUserInfo() {
        const adminInfoSpan = document.querySelector('.admin-info span');
        if (!adminInfoSpan) return;

        try {
            const response = await fetch(`${API_BASE_URL}?resource=get-session-info`);
            const result = await response.json();

            if (result.success) {
                let displayText = `Hola, ${result.nombre_usuario}`;
                if (result.nombre_tienda) {
                    displayText += ` (${result.nombre_tienda})`;
                }
                adminInfoSpan.textContent = displayText;
            }
        } catch (error) {
            console.error("No se pudo cargar la información del usuario para el header.");
        }
    }


async function fetchAndRenderActiveOffers() {
        const tableBody = document.getElementById('active-offers-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="5">Cargando ofertas...</td></tr>';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getActiveOffers`);
            const result = await response.json();

            tableBody.innerHTML = '';
            if (result.success && result.offers.length > 0) {
                result.offers.forEach(offer => {
                    const row = document.createElement('tr');
                    
                    let expiryText = 'No caduca';
                    if (offer.oferta_caducidad) {
                        const expiryDate = new Date(offer.oferta_caducidad);
                        // Formateamos la fecha para que sea más legible
                        expiryText = expiryDate.toLocaleDateString('es-SV', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                    }

                    row.innerHTML = `
                        <td>${offer.codigo_producto}</td>
                        <td>${offer.nombre_producto}</td>
                        <td>$${parseFloat(offer.precio_venta).toFixed(2)}</td>
                        <td style="font-weight: bold; color: green;">$${parseFloat(offer.precio_oferta).toFixed(2)}</td>
                        <td>${expiryText}</td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="5">No hay productos con ofertas activas en este momento.</td></tr>';
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" style="color:red;">Error al cargar la lista de ofertas.</td></tr>`;
        }
    }
       function initializeOfferManagement() {
        const searchForm = document.getElementById('product-search-form-offer');
        if (!searchForm) return;

        const searchInput = document.getElementById('product-search-for-offer');
        const feedbackDiv = document.getElementById('search-feedback-offer');
        const offerContainer = document.getElementById('offer-form-container');

        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const productCode = searchInput.value.trim();
            if (!productCode) return;

            feedbackDiv.textContent = 'Buscando...';
            feedbackDiv.style.color = 'inherit';
            offerContainer.classList.add('hidden');
            
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/getProductDetails&id=${encodeURIComponent(productCode)}`);
                const result = await response.json();

                if (result.success) {
                    feedbackDiv.textContent = '';
                    renderOfferForm(result.product);
                } else {
                    throw new Error(result.error || 'Producto no encontrado.');
                }
            } catch (error) {
                feedbackDiv.textContent = error.message;
                feedbackDiv.style.color = 'red';
            }
        });
    }
    function renderOfferForm(product) {
        const container = document.getElementById('offer-form-container');
        container.classList.remove('hidden');

        const currentOfferPrice = parseFloat(product.precio_oferta || 0).toFixed(2);
        const isExclusive = parseInt(product.oferta_exclusiva, 10) === 1;

        // --- INICIO DE LA LÓGICA PARA MANEJAR LA FECHA ---
        let expiryDateValue = '';
        if (product.oferta_caducidad) {
            // La fecha viene como 'YYYY-MM-DD HH:MM:SS'. El input necesita 'YYYY-MM-DDTHH:MM'.
            // Reemplazamos el espacio por una 'T' y quitamos los segundos.
            expiryDateValue = product.oferta_caducidad.slice(0, 16).replace(' ', 'T');
        }
        // --- FIN DE LA LÓGICA PARA MANEJAR LA FECHA ---

        container.innerHTML = `
            <h4>Oferta para: ${product.nombre_producto}</h4>
            <p><strong>Precio de Venta Actual:</strong> $${parseFloat(product.precio_venta).toFixed(2)}</p>
            <p><strong>Precio de Oferta Actual:</strong> $${currentOfferPrice}</p>
            
            <form id="offer-form">
                <input type="hidden" name="product_id" value="${product.id_producto}">
                
                <div class="form-group">
                    <label for="precio_oferta">Nuevo Precio de Oferta</label>
                    <input type="number" id="precio_oferta" name="precio_oferta" step="0.01" min="0" placeholder="0.00 para quitar" value="${currentOfferPrice > 0 ? currentOfferPrice : ''}">
                </div>

                <div class="form-group">
                    <label for="oferta_caducidad">Fecha de Caducidad (Opcional)</label>
                    <input type="datetime-local" id="oferta_caducidad" name="oferta_caducidad" value="${expiryDateValue}">
                </div>

                <div class="form-group setting-toggle" style="justify-content: flex-start;">
                    <label for="oferta_exclusiva">Oferta solo para usuarios registrados</label>
                    <input type="checkbox" id="oferta_exclusiva" name="oferta_exclusiva" class="switch" ${isExclusive ? 'checked' : ''}>
                </div>

                <div id="offer-feedback" class="form-message" style="margin-top: 1rem;"></div>

                <div class="form-navigation" style="justify-content: center; gap: 1rem;">
                    <button type="submit" id="save-offer-btn" class="action-btn form-submit-btn">Guardar Oferta</button>
                    <button type="button" id="remove-offer-btn" class="action-btn" style="background-color: #f8d7da;">Quitar Oferta</button>
                </div>
            </form>
        `;

        const offerForm = document.getElementById('offer-form');
        offerForm.addEventListener('submit', handleOfferSave);
        document.getElementById('remove-offer-btn').addEventListener('click', handleOfferRemove);
    }

    async function handleOfferSave(event) {
        event.preventDefault();
        const form = event.target;
        const feedbackDiv = document.getElementById('offer-feedback');
        const submitButton = form.querySelector('#save-offer-btn');

        const data = {
            product_id: parseInt(form.querySelector('input[name="product_id"]').value, 10),
            precio_oferta: parseFloat(form.querySelector('#precio_oferta').value) || 0,
            oferta_exclusiva: form.querySelector('#oferta_exclusiva').checked,
            oferta_caducidad: form.querySelector('#oferta_caducidad').value // Se envía directamente el valor del input
        };
        
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        feedbackDiv.textContent = '';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/manageOffer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                feedbackDiv.className = 'form-message success';
                feedbackDiv.textContent = result.message;
                // Actualizar la vista después de un momento
                setTimeout(() => {
                    document.getElementById('product-search-form-offer').dispatchEvent(new Event('submit'));
                }, 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            feedbackDiv.className = 'form-message error';
            feedbackDiv.textContent = error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Oferta';
        }
    }

    function handleOfferRemove(event) {
        document.getElementById('precio_oferta').value = 0;
        document.getElementById('oferta_caducidad').value = ''; // Limpiamos también la fecha
        document.getElementById('oferta_exclusiva').checked = false;
        document.getElementById('offer-form').dispatchEvent(new Event('submit'));
    }


// --- LÓGICA PARA CLIENTES ---


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





// EN: admin/js/admin.js

async function fetchAndRenderProducts() {
    if (isLoading || currentFilters.page === -1) return;
    isLoading = true;

    const tableBody = document.getElementById('product-table-body');
    const loadingIndicator = document.getElementById('loading-indicator');
    if (!tableBody || !loadingIndicator) {
        isLoading = false;
        return;
    }

    if (currentFilters.page === 1) {
        tableBody.innerHTML = ''; // Limpia la tabla solo si es una nueva búsqueda.
    }

    // --- INICIO: Skeleton Loader ---
    // Muestra filas de carga para mejorar la percepción de velocidad
    const skeletonRowCount = 10;
    const skeletonRowHtml = `
        <tr class="skeleton-loader">
            <td colspan="11" style="padding: 0; border: none;"><div class="skeleton-pulse"></div></td>
        </tr>
    `;
    for (let i = 0; i < skeletonRowCount; i++) {
        tableBody.insertAdjacentHTML('beforeend', skeletonRowHtml);
    }
    loadingIndicator.style.display = 'block';
    // --- FIN: Skeleton Loader ---

    const { search, department, store, sort, page } = currentFilters;
    const apiUrl = `${API_BASE_URL}?resource=admin/getProducts&search=${encodeURIComponent(search)}&department=${department}&store=${store}&sort_by=${sort.by}&order=${sort.order}&page=${page}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);
        const data = await response.json();

        // Elimina los skeletons antes de añadir los datos reales
        tableBody.querySelectorAll('.skeleton-loader').forEach(s => s.remove());

        if (data.success && data.products.length > 0) {
            data.products.forEach(product => {
                const row = document.createElement('tr');
                row.dataset.productId = product.id_producto;
                row.dataset.status = (product.nombre_estado || '').toLowerCase();
                const statusClass = (product.nombre_estado || '').toLowerCase() === 'activo' ? 'status-active' : 'status-inactive';
                const usaInventarioText = product.usa_inventario == 1 ? 'Sí' : 'No';
                const stockMinimo = parseInt(product.stock_minimo, 10);
                const stockActual = parseInt(product.stock_actual, 10);
                const stockClass = (product.usa_inventario == 1 && !isNaN(stockMinimo) && stockMinimo > 0 && stockActual < stockMinimo) ? 'stock-low' : '';

                row.innerHTML = `
                    <td><input type="checkbox" class="product-checkbox"></td>
                    <td>${product.codigo_producto}</td>
                    <td class="editable" data-field="nombre_producto">${product.nombre_producto}</td>
                    <td>${product.nombre_departamento}</td>
                    <td class="editable" data-field="precio_venta">$${parseFloat(product.precio_venta).toFixed(2)}</td>
                    <td class="${stockClass}">${product.stock_actual ?? 'N/A'}</td>
                    <td>${product.stock_minimo ?? 'N/A'}</td>
                    <td>${product.stock_maximo ?? 'N/A'}</td>
                    <td>${usaInventarioText}</td>
                    <td><span class="status-badge ${statusClass}">${product.nombre_estado}</span></td>
                    <td><button class="action-btn edit-product-btn">Editar</button></td>
                `;
                tableBody.appendChild(row);
            });

            if (data.products.length < data.limit) {
                currentFilters.page = -1;
            } else {
                currentFilters.page++;
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
        tableBody.querySelectorAll('.skeleton-loader').forEach(s => s.remove());
        if (page === 1) {
            tableBody.innerHTML = `<tr><td colspan="11" style="color:red;">Error al cargar: ${error.message}</td></tr>`;
        }
    } finally {
        isLoading = false;
        loadingIndicator.style.display = 'none';
    }
}





// EN: admin/js/admin.js

function handleScroll() {
    // Apuntamos al contenedor principal del contenido, que es el que ahora se desplaza
    const container = document.getElementById('main-content'); 
    if (!container) return;

    // --- MODIFICACIÓN CLAVE ---
    // Esta condición ahora solo se cumple si el usuario está
    // prácticamente al final del scroll (con un margen de 5px).
    const atTheBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5;

    if (atTheBottom && !isLoading && currentFilters.page !== -1) {
        fetchAndRenderProducts(); // Llama a cargar la siguiente página de productos
    }
}



// EN: admin/js/admin.js
// AÑADE esta nueva función (puede ser después de populateDepartmentFilter)

async function populateStoreFilter() {
    const filterSelect = document.getElementById('store-filter');
    if (!filterSelect) return;
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getTiendas`);
        const result = await response.json();
        if (result.success && result.tiendas.length > 0) {
            filterSelect.innerHTML = `<option value="">Todas las tiendas</option>`;
            result.tiendas.forEach(tienda => {
                const option = document.createElement('option');
                option.value = tienda.id_tienda;
                option.textContent = tienda.nombre_tienda;
                filterSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar tiendas:', error);
        filterSelect.innerHTML = `<option value="">Error al cargar</option>`;
    }
}







    // --- LÓGICA DE MENÚ Y CARGA DE MÓDULOS ---

// admin/js/admin.js

function initializeSidemenu() {
    // Lógica para el botón de hamburguesa (abrir/cerrar)
    if (menuToggle && sidemenu) {
        menuToggle.addEventListener('click', (event) => {
            // Detenemos la propagación para que el clic no llegue al 'document'
            event.stopPropagation(); 
            sidemenu.classList.toggle('active');
        });
    }

    // Lógica para el botón de colapsar en escritorio (sin cambios)
    if (collapseBtn && sidemenu) {
        collapseBtn.addEventListener('click', () => {
            sidemenu.classList.toggle('sidemenu-collapsed');
            localStorage.setItem('sidemenuCollapsed', sidemenu.classList.contains('sidemenu-collapsed'));
        });
    }

    // --- NUEVA LÓGICA ---
    // Añadimos un listener a todo el documento para detectar clics
    document.addEventListener('click', (event) => {
        // Verificamos si el menú está activo Y si el clic fue FUERA del menú
        const isClickInsideMenu = sidemenu.contains(event.target);

        if (sidemenu.classList.contains('active') && !isClickInsideMenu) {
            sidemenu.classList.remove('active');
        }
    });
}

    function checkSidemenuState() {
        if (window.innerWidth > 991 && localStorage.getItem('sidemenuCollapsed') === 'true') {
            sidemenu.classList.add('sidemenu-collapsed');
        }
    }

// REEMPLAZA ESTA FUNCIÓN COMPLETA
// REEMPLAZA ESTA FUNCIÓN EN admin.js
// REEMPLAZA ESTA FUNCIÓN EN admin.js
async function loadModule(moduleName) {
    mainContent.innerHTML = '<h2>Cargando...</h2>';
    try {
        const response = await fetch(`modules/${moduleName}.php`);
        if (!response.ok) throw new Error('Módulo no encontrado.');
        mainContent.innerHTML = await response.text();

        // Determina qué acción cargar por defecto para cada módulo
        let defaultAction = '';
        switch (moduleName) {
            case 'dashboard': defaultAction = 'dashboard/log_actividad'; break;
            case 'productos': defaultAction = 'productos/todos_los_productos'; break;
            case 'clientes': defaultAction = 'clientes/todos_los_clientes'; break;
            case 'departamentos': defaultAction = 'departamentos/gestion'; break;
            case 'utilidades': defaultAction = 'utilidades/copia_seguridad'; break;
            case 'tarjetas': defaultAction = 'tarjetas/gestion'; break;
            case 'inventario': defaultAction = 'inventario/agregar_stock'; break;
            case 'estadisticas': defaultAction = 'estadisticas/resumen'; break;
            case 'usuarios': defaultAction = 'usuarios/gestion'; break;
            case 'pos': defaultAction = 'pos/vista_principal'; break; 
            case 'web_admin': defaultAction = 'web_admin/sliders'; break;
            case 'tiendas': defaultAction = 'tiendas/gestion'; break; 
            case 'proveedores': defaultAction = 'proveedores/gestion'; break;
            case 'listas_compras': defaultAction = 'listas_compras/gestion'; break; // ESTA ES LA LÍNEA CORRECTA Y ÚNICA

        }
        if (defaultAction) {
            await loadActionContent(defaultAction);
        }
    } catch (error) {
        mainContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

/*************************************************************************/
//Listas de compras funciones

// REEMPLAZA TODO EL BLOQUE DE FUNCIONES DE LISTAS DE COMPRAS CON ESTO

/*************************************************************************/
// --- INICIO: MÓDULO LISTAS DE COMPRAS (BLOQUE CORREGIDO Y SIMPLIFICADO) ---

function initializeShoppingListManagement() {
    const dateFilter = document.getElementById('list-date-filter');
    const listsTbody = document.getElementById('shopping-lists-tbody');
    if (!dateFilter || !listsTbody) return;
    if (!dateFilter.value) dateFilter.valueAsDate = new Date();
    
    fetchAndRenderShoppingLists(dateFilter.value);
    dateFilter.addEventListener('change', () => fetchAndRenderShoppingLists(dateFilter.value));

    listsTbody.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;
        const listId = target.closest('tr')?.dataset.listId;
        if (!listId) return;

        if (target.classList.contains('view-list-btn')) {
            loadActionContent(`listas_compras/ver_lista&id=${listId}`);
        } else if (target.classList.contains('delete-list-btn')) {
            deleteShoppingList(listId, target.closest('tr'));
        } else if (target.classList.contains('copy-list-btn')) {
            copyShoppingList(listId);
        }
    });
}

async function fetchAndRenderShoppingLists(date) {
    const tableBody = document.getElementById('shopping-lists-tbody');
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getShoppingLists&date=${date}`);
        const result = await response.json();
        tableBody.innerHTML = '';
        if (result.success && result.lists.length > 0) {
            result.lists.forEach(list => {
                const row = document.createElement('tr');
                row.dataset.listId = list.id_lista;
                row.innerHTML = `
                    <td>${list.nombre_lista}</td>
                    <td>${list.fecha_creacion}</td>
                    <td>${list.nombre_usuario}</td>
                    <td>${list.nombre_proveedor || '<em>N/A</em>'}</td>
                    <td>
                        <button class="action-btn btn-sm view-list-btn">Ver / Editar</button>
                        <button class="action-btn btn-sm delete-list-btn">Eliminar</button>
                        <button class="action-btn btn-sm copy-list-btn">Copiar</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No hay listas para la fecha seleccionada.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar las listas.</td></tr>';
    }
}

function initializeCreateShoppingListForm() {
    const form = document.getElementById('create-shopping-list-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const listName = document.getElementById('nombre_lista').value;
        const providerId = document.getElementById('id_proveedor').value;
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/createShoppingList`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_lista: listName, id_proveedor: providerId })
            });
            const result = await response.json();
            if (result.success) {
                loadActionContent(`listas_compras/ver_lista&id=${result.newListId}`);
            } else { throw new Error(result.error); }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

function initializeListasCompras(container) {
    const listId = container.querySelector('.lista-compras-container')?.dataset.idLista;
    if (listId) {
        loadAndRenderListView(listId);
    } else {
        console.error("Error: No se pudo encontrar el ID de la lista.");
    }
}

async function loadAndRenderListView(listId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getShoppingListDetails&id_lista=${listId}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        document.getElementById('list-name-header').textContent = `Editando: ${result.listName}`;
        renderListItems(result.items);
        initializeListViewInteractions(listId); 
    } catch (error) {
        document.getElementById('action-content').innerHTML = `<p class="message error">${error.message}</p>`;
    }
}

function renderListItems(items) {
    const tbody = document.getElementById('list-items-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.itemId = item.id_item_lista;
        if (parseInt(item.marcado, 10) === 1) {
            row.classList.add('item-marked');
        }
        
        row.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="mark-item-checkbox" ${parseInt(item.marcado, 10) === 1 ? 'checked' : ''}>
            </td>
            <td>${item.nombre_producto}</td>
            <td><input type="number" class="editable-field" data-field="precio_compra" value="${parseFloat(item.precio_compra).toFixed(2)}" step="0.01"></td>
            <td><input type="number" class="editable-field" data-field="cantidad" value="${item.cantidad}" min="1"></td>
            <td><button class="action-btn btn-sm btn-danger remove-item-btn">&times;</button></td>
        `;
        tbody.appendChild(row);
    });
}

function initializeListViewInteractions(listId) {
    const searchInput = document.getElementById('product-search-for-list');
    const searchResults = document.getElementById('product-search-results-list');
    const manualForm = document.getElementById('manual-add-product-form');
    const itemsTbody = document.getElementById('list-items-tbody');
    let searchTimer;

    // Búsqueda de productos
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimer = setTimeout(async () => {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getProducts&search=${encodeURIComponent(query)}`);
            const result = await response.json();
            searchResults.innerHTML = '';
            if (result.success && result.products.length > 0) {
                searchResults.style.display = 'block';
                result.products.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'search-result-item';
                    div.innerHTML = `<span>${p.nombre_producto}</span> <strong>Stock: ${p.stock_actual || 0}</strong>`;
                    div.addEventListener('click', async () => {
                        await addProductToList(listId, p.id_producto);
                        searchInput.value = '';
                        searchResults.style.display = 'none';
                    });
                    searchResults.appendChild(div);
                });
            } else {
                searchResults.style.display = 'none';
            }
        }, 300);
    });

    // Añadir producto manualmente
    manualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const feedbackDiv = document.getElementById('manual-add-feedback');
        const data = {
            id_lista: listId,
            nombre_producto: document.getElementById('manual_product_name').value,
            // El campo ahora se llama precio_compra, pero le pasamos el precio de venta
            precio_compra: document.getElementById('manual_purchase_price').value,
            cantidad: 1 // Siempre se añade con cantidad 1
        };
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/addManualProductToList`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            manualForm.reset();
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            await loadAndRenderListView(listId);
            setTimeout(() => { feedbackDiv.innerHTML = '' }, 2500);
        } catch (error) {
            feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
        }
    });

    // Ocultar resultados de búsqueda si se hace clic fuera
    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Eventos de la tabla (editar, tachar)
    itemsTbody.addEventListener('change', async (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;
        const itemId = row.dataset.itemId;
        
        if (target.classList.contains('editable-field')) {
            const field = target.dataset.field;
            const value = target.value;
            await updateListItem(itemId, field, value);
        } else if (target.classList.contains('mark-item-checkbox')) {
            const response = await fetch(`${API_BASE_URL}?resource=admin/toggleListItemMark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_item_lista: itemId })
            });
            const result = await response.json();
            if (result.success) {
                row.classList.toggle('item-marked', result.newState);
            } else {
                target.checked = !target.checked; // Revertir si hay error
            }
        }
    });
    
    // Eliminar item de la lista
    itemsTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const row = e.target.closest('tr');
            const itemId = row.dataset.itemId;
            await removeProductFromList(itemId, row);
        }
    });
    
    // Botones de la cabecera (Guardar y Salir, Copiar)
    const headerActions = document.querySelector('.header-actions');
    headerActions.addEventListener('click', async (e) => {
        if (e.target.id === 'save-and-exit-btn') {
            document.querySelector('.action-btn[data-action="listas_compras/gestion"]').click();
        } else if (e.target.id === 'copy-list-btn') {
            await copyShoppingList(listId);
        }
    });
}


async function addProductToList(listId, productId) {
    await fetch(`${API_BASE_URL}?resource=admin/addProductToList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_lista: listId, id_producto: productId })
    });
    await loadAndRenderListView(listId);
}

async function updateListItem(itemId, field, value) {
     try {
        await fetch(`${API_BASE_URL}?resource=admin/updateListItem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_item_lista: itemId, field: field, value: value })
        });
    } catch(error) {
        console.error("Error al actualizar item:", error);
    }
}

async function removeProductFromList(itemId, rowElement) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/removeProductFromList`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_item_lista: itemId })
        });
        const result = await response.json();
        if (result.success) {
            rowElement.remove();
        } else { throw new Error(result.error); }
    } catch (error) {
        alert("Error al eliminar el producto: " + error.message);
    }
}

async function copyShoppingList(listId) {
    if (!confirm('¿Seguro que quieres copiar esta lista? Se creará una nueva lista para hoy con los mismos productos.')) return;
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/copyShoppingList`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_lista: listId })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            document.querySelector('.action-btn[data-action="listas_compras/gestion"]').click();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert(`Error al copiar: ${error.message}`);
    }
}

// --- FIN: MÓDULO LISTAS DE COMPRAS ---
/*************************************************************************/


/***********************************************************************/

// REEMPLAZA ESTA FUNCIÓN COMPLETA EN: admin/js/admin.js

async function loadActionContent(actionPath) {
    const actionContent = document.getElementById('action-content');
    if (!actionContent) return;

    const mainContentContainer = document.getElementById('main-content');
    if(mainContentContainer) {
        mainContentContainer.removeEventListener('scroll', handleScroll);
    }
    
    actionContent.innerHTML = '<p>Cargando...</p>';
    try {
        // --- INICIO DE LA CORRECCIÓN CLAVE ---
        // Se separa la ruta de la acción de sus parámetros de consulta (query string).
        const [path, ...queryParts] = actionPath.split('&');
        const queryString = queryParts.join('&');
        const finalUrl = `actions/${path}.php${queryString ? '?' + queryString : ''}`;
        // --- FIN DE LA CORRECCIÓN CLAVE ---

        const response = await fetch(finalUrl); // Se usa la URL corregida.
        if (!response.ok) throw new Error('Acción no encontrada.');
        actionContent.innerHTML = await response.text();

        // El resto de la lógica para inicializar los módulos permanece igual.
        let defaultAction = '';
        switch (path) { // Se usa 'path' en lugar de 'actionPath' para el switch.
            case 'dashboard/log_actividad': fetchAndRenderActivityLog(); break;
            case 'productos/todos_los_productos':
                currentFilters.page = 1;
                await populateDepartmentFilter();
                if (USER_ROLE === 'administrador_global') await populateStoreFilter();
                await fetchAndRenderProducts();
                mainContentContainer?.addEventListener('scroll', handleScroll);
                break;
            case 'productos/agregar_producto': initializeAddProductForm(); break;
            case 'productos/modificar_producto': initializeProductSearchForEdit(); break;
            case 'productos/eliminar_producto': initializeProductSearchForDelete(); break;
            case 'productos/crear_oferta': initializeOfferManagement(); break;
            case 'productos/ofertas_activas': await fetchAndRenderActiveOffers(); break;
            case 'clientes/todos_los_clientes': await fetchAndRenderCustomers(); break;
            case 'clientes/nuevo_cliente': initializeAddCustomerForm(); break;
            case 'departamentos/gestion': initializeDepartmentManagement(); break;
            case 'utilidades/copia_seguridad': initializeBackupControls(); break;
            case 'tarjetas/gestion': initializeCardManagement(); break;
            case 'tarjetas/reporte_clientes': fetchAndRenderCardReport(); break;
            case 'tarjetas/recargar': initializeCardRecharge(); break;
            case 'inventario/agregar_stock': initializeInventoryForm('stock'); break;
            case 'inventario/ajuste_inventario': initializeInventoryForm('adjust'); break;
            case 'inventario/historial_movimientos':
                await populateMovementTypeFilter();
                fetchAndRenderInventoryHistory();
                break;
            case 'estadisticas/resumen': loadStatisticsWidgets(); break;
            case 'dashboard/ventas_por_usuario': await fetchAndRenderUserSales(); break;
            case 'usuarios/gestion': initializeUserManagement(); break;
            case 'usuarios/permisos': initializePermissionsManagement(); break;
            case 'pos/vista_principal': initializePOS(); break; 
            case 'pos/gestion_pedidos': initializeWebOrderManagement(); break;
            case 'web_admin/sliders': initializeWebAdminControls(); break;
            case 'listas_compras/gestion': initializeShoppingListManagement(); break; 
            case 'listas_compras/crear_lista': initializeCreateShoppingListForm(); break;
            case 'listas_compras/ver_lista': initializeListasCompras(actionContent); break;
            case 'tiendas/gestion': initializeTiendaManagement(); break; 
            case 'proveedores/gestion': initializeProveedorManagement(); break;
            case 'utilidades/generador_codigos': initializeBarcodeGenerator(); break;
        }
    } catch (error) {
        actionContent.innerHTML = `<p style="color:red;">Error al cargar la acción: ${error.message}</p>`;
    }
}



async function populateDepartmentFilter(selectorId = 'department-filter') {
    const filterSelect = document.getElementById(selectorId);
    if (!filterSelect) return;
    try {
        // CORRECCIÓN: Se apunta al endpoint correcto que devuelve todos los departamentos.
        const response = await fetch(`${API_BASE_URL}?resource=admin/getDepartments`);
        const result = await response.json(); // La API devuelve un objeto { success: true, departments: [...] }

        // Se verifica la estructura de la respuesta de la API
        if (result.success && result.departments && result.departments.length > 0) {
            // MEJORA: El texto inicial es más claro para un filtro.
            filterSelect.innerHTML = `<option value="">Todos los departamentos</option>`;
            result.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id_departamento;
                option.textContent = dept.departamento; // Se usa la propiedad correcta del objeto
                filterSelect.appendChild(option);
            });
        } else {
             filterSelect.innerHTML = `<option value="">No hay departamentos</option>`;
        }
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
        // Se añade un mensaje de error en el propio select si la petición falla.
        filterSelect.innerHTML = `<option value="">Error al cargar</option>`;
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

    // 1. Estado inicial: todo deshabilitado y opciones ocultas
    batchSelector.disabled = true;
    batchButton.disabled = true;
    batchSelector.value = ''; // Resetea la selección
    activateOption.style.display = 'none';
    deactivateOption.style.display = 'none';

    // 2. Si no hay nada seleccionado, no hacemos nada más
    if (totalSelected === 0) return;

    // 3. Habilitamos el selector ya que hay productos seleccionados
    batchSelector.disabled = false;

    // 4. Verificamos el estado de los productos seleccionados
    // dataset.status viene de la fila <tr> que se genera en fetchAndRenderProducts
    const areAllActive = selectedRows.every(row => row.dataset.status === 'activo');
    const areAllInactive = selectedRows.every(row => row.dataset.status !== 'activo');
    
    // 5. Mostramos la opción correspondiente según la lógica
    if (areAllActive) {
        // Si todos están activos, solo mostramos la opción para desactivar
        deactivateOption.style.display = 'block';
    } else if (areAllInactive) {
        // Si todos están inactivos, solo mostramos la opción para activar
        activateOption.style.display = 'block';
    }
    // Si hay una mezcla de activos e inactivos, ninguna opción se mostrará.
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






// admin/js/admin.js

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

        // REEMPLAZA ESTA FUNCIÓN COMPLETA EN admin/js/admin.js









    async function renderEditForm(product) {
    const container = document.getElementById('edit-product-container');
    const searchContainer = document.getElementById('product-search-container');
    if (!container || !searchContainer) return;

    // Oculta la búsqueda y muestra el contenedor del formulario.
    searchContainer.classList.add('hidden');
    container.classList.remove('hidden');

    // Carga el HTML del formulario de "agregar producto" para reutilizarlo.
    const formResponse = await fetch('actions/productos/agregar_producto.php');
    const formHtml = await formResponse.text();
    container.innerHTML = formHtml;

    // Adapta el formulario para la edición.
    const form = container.querySelector('#add-product-form');
    form.id = 'edit-product-form'; // Cambia el ID para evitar conflictos.
    form.querySelector('.form-submit-btn').textContent = 'Actualizar Producto';

    // --- CORRECCIÓN CLAVE ---
    // Crea y añade un campo oculto con el ID del producto DENTRO del formulario.
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'id_producto'; // El nombre que el PHP espera en $_POST.
    idInput.value = product.id_producto;
    form.appendChild(idInput); // Se añade al final del formulario.

    // Rellena todos los campos del formulario con los datos del producto.
    const fields = [
        'codigo_producto', 'nombre_producto', 'departamento', 'precio_compra',
        'precio_venta', 'precio_mayoreo', 'tipo_de_venta', 'estado',
        'proveedor', 'stock_minimo', 'stock_maximo', 'url_imagen'
    ];
    
    fields.forEach(field => {
        const input = form.querySelector(`#${field}`);
        if (input) {
            // Renombramos 'url_imagen' a 'selected-image-url' para que coincida con el ID del input oculto de la imagen.
            const inputId = (field === 'url_imagen') ? 'selected-image-url' : field;
            const formInput = form.querySelector(`#${inputId}`);
            if (formInput) {
                formInput.value = product[field] || '';
            }
        }
    });

    // Muestra la previsualización de la imagen si existe.
    if (product.url_imagen) {
        form.querySelector('#image-preview').src = product.url_imagen;
        form.querySelector('#image-preview').classList.remove('hidden');
        form.querySelector('#no-image-text').classList.add('hidden');
    }

    // Deshabilita la edición de campos de inventario si ya se está usando.
    const usaInventario = parseInt(product.usa_inventario, 10) === 1;
    const stockInput = form.querySelector('#stock_actual');
    const usaInventarioCheckbox = form.querySelector('#usa_inventario_checkbox');
    if (stockInput) stockInput.disabled = usaInventario;
    if (usaInventarioCheckbox) usaInventarioCheckbox.disabled = usaInventario;

    // Adjunta el evento de envío al formulario ya modificado.
    initializeEditProductFormSubmit(form);
}





// EN: admin/js/admin.js
// REEMPLAZA esta función para añadir el código de depuración.

function initializeEditProductFormSubmit(form) {
    if (!form) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('.form-submit-btn');
        const messagesDiv = form.querySelector('#form-messages');
        const formData = new FormData(form);

        // --- INICIO DEL CÓDIGO DE DEPURACIÓN ---
        console.log("--- Depuración: Datos que se enviarán al servidor ---");
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        console.log("--------------------------------------------------");
        // --- FIN DEL CÓDIGO DE DEPURACIÓN ---

        submitButton.disabled = true;
        submitButton.textContent = 'Actualizando...';
        messagesDiv.innerHTML = '';
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/updateProduct`, { method: 'POST', body: formData });
            
            // --- INICIO DE DEPURACIÓN DE RESPUESTA ---
            const responseText = await response.text();
            console.log("Respuesta del servidor (texto plano):", responseText);
            // --- FIN DE DEPURACIÓN DE RESPUESTA ---

            const result = JSON.parse(responseText); // Intentamos convertir el texto a JSON
            
            if (result.success) {
                messagesDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                setTimeout(() => {
                    document.querySelector('.action-btn[data-action="productos/todos_los_productos"]').click();
                }, 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            messagesDiv.innerHTML = `<div class="message error">Error al procesar la respuesta: ${error.message}. Revisa la consola para más detalles.</div>`;
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
            // 1. Lógica existente para cargar el módulo
            sidemenu.querySelectorAll('.nav-link.active').forEach(link => link.classList.remove('active'));
            navLink.classList.add('active');
            loadModule(moduleToLoad);

            // 2. Nueva lógica para cerrar el menú en pantallas pequeñas
            if (window.innerWidth <= 991) {
                sidemenu.classList.remove('active');
            }
        }
    }
});

    let searchTimeout;





let departmentFilters = {
    sort: {
        by: 'departamento',
        order: 'ASC'
    }
};

// Función para actualizar los indicadores visuales de ordenación
function updateDepartmentSortIndicators() {
    document.querySelectorAll('#departments-list-container th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === departmentFilters.sort.by) {
            th.classList.add(departmentFilters.sort.order === 'ASC' ? 'sort-asc' : 'sort-desc');
        }
    });
}






// admin/js/admin.js (PARTE 2 DE 2 - VERSIÓN COMPLETA Y FINAL)
mainContent.addEventListener('click', async (event) => {
    const target = event.target;


        const departmentSortableHeader = event.target.closest('#departments-list-container th.sortable');
    if (departmentSortableHeader) {
        const sortBy = departmentSortableHeader.dataset.sort;
        if (departmentFilters.sort.by === sortBy) {
            departmentFilters.sort.order = departmentFilters.sort.order === 'ASC' ? 'DESC' : 'ASC';
        } else {
            departmentFilters.sort.by = sortBy;
            departmentFilters.sort.order = 'ASC';
        }
        await fetchAndRenderDepartments();
        return;
    }
    if (target.id === 'filter-stats-btn') {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const storeFilter = document.getElementById('stats-store-filter');

        const start = startDateInput.value;
        const end = endDateInput.value;
        const storeId = storeFilter ? storeFilter.value : null;

        if (start && end) {
            // Llama a las funciones para actualizar los widgets con los filtros seleccionados
            await fetchAndRenderSalesSummary(start, end, storeId);
            await fetchAndRenderProductStats(start, end, storeId); // Pasamos también las fechas
        } else {
            alert('Por favor, selecciona un rango de fechas válido.');
        }
        return; 
    }




    if (target.classList.contains('edit-user-btn')) {
        const row = target.closest('tr');
        const userId = row.dataset.userId;
        const username = row.querySelector('td:first-child').textContent;
        const currentRol = row.dataset.rol;
        const currentStoreId = row.dataset.storeId;

        openEditUserModal(userId, username, currentRol, currentStoreId);
        return;
    }

    if (target.id === 'open-gallery-btn') {
        openImageGallery();
        return;
    }

    if (target.id === 'batch-action-execute') {
        const selector = mainContent.querySelector('#batch-action-selector');
        const action = selector.value;
        const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);

        if (!action || productIds.length === 0) {
            alert('Por favor, selecciona una acción y al menos un producto.');
            return;
        }

        if (action === 'change-department') {
            openDepartmentModal();
            return;
        }

        let confirmationMessage = '';
        switch (action) {
            case 'delete':
                confirmationMessage = `¿Estás seguro de que quieres eliminar ${productIds.length} producto(s) seleccionados? Esta acción es irreversible.`;
                break;
            case 'activate':
                confirmationMessage = `¿Estás seguro de que quieres activar ${productIds.length} producto(s) seleccionados?`;
                break;
            case 'deactivate':
                confirmationMessage = `¿Estás seguro de que quieres desactivar ${productIds.length} producto(s) seleccionados?`;
                break;
            default:
                confirmationMessage = `¿Estás seguro de que quieres ejecutar la acción "${action}" en ${productIds.length} producto(s)?`;
        }

        if (confirm(confirmationMessage)) {
            try {
                target.disabled = true;
                target.textContent = 'Procesando...';
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
            } finally {
                target.disabled = false;
                target.textContent = 'Ejecutar';
            }
        }
        return;
    }

    if (target.classList.contains('reactivate-user-btn')) {
        const row = target.closest('tr');
        const userId = row.dataset.userId;
        const username = row.querySelector('td:first-child').textContent;
        if (confirm(`¿Estás seguro de que quieres reactivar al usuario "${username}"?`)) {
            reactivateUser(userId);
        }
        return;
    }

    const sortableHeader = target.closest('th.sortable');
    if (sortableHeader) {
        const sortBy = sortableHeader.dataset.sort;
        if (currentFilters.sort.by === sortBy) {
            currentFilters.sort.order = currentFilters.sort.order === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentFilters.sort.by = sortBy;
            currentFilters.sort.order = 'ASC';
        }
        currentFilters.page = 1;
        await fetchAndRenderProducts();
        return;
    }

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

    if (target.id === 'start-processing-btn') {
        const button = event.target;
        const outputConsole = document.getElementById('processor-output');
        const rotationOption = document.getElementById('rotation-option').value; 
        
        button.disabled = true;
        button.textContent = 'Procesando...';
        outputConsole.textContent = 'Iniciando...\n';
        document.getElementById('results-container').classList.add('hidden');

        try {
            let apiUrl = '../api/index.php?resource=run_processor';
            if (rotationOption) {
                apiUrl += `&rotate=${rotationOption}`;
            }

            const response = await fetch(apiUrl);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                outputConsole.textContent += decoder.decode(value, { stream: true });
                outputConsole.scrollTop = outputConsole.scrollHeight;
            }
            
            outputConsole.textContent += '\n\n--- PROCESO FINALIZADO ---';
            await showProcessedFiles();

        } catch (error) {
            outputConsole.textContent += `\n\n--- ERROR ---\n${error.message}`;
        } finally {
            button.disabled = false;
            button.textContent = 'Iniciar Proceso';
        }
        return;
    }
    
    if (target.classList.contains('delete-tienda-btn')) {
        const row = target.closest('tr');
        const tiendaId = row.dataset.tiendaId;
        const tiendaName = row.querySelector('td:first-child').textContent;
        if (confirm(`¿Estás seguro de que quieres eliminar la tienda "${tiendaName}"?`)) {
            deleteTienda(tiendaId);
        }
        return;
    }

    if (target.classList.contains('delete-department-btn')) {
        const row = target.closest('tr');
        const departmentId = row.dataset.departmentId;
        const departmentName = row.querySelector('.editable').textContent;
        if (confirm(`¿Estás seguro de que quieres eliminar el departamento "${departmentName}"?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/deleteDepartment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: departmentId })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);
                row.remove();
                alert(result.message);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
        return;
    }

    if (target.classList.contains('update-order-status-btn')) {
        const cartId = target.dataset.cartId;
        const newStatusId = target.dataset.newStatusId;
        const actionText = target.textContent.trim();
        if (confirm(`¿Estás seguro de que quieres "${actionText}" el pedido #${cartId}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/updateOrderStatus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cart_id: cartId, status_id: newStatusId })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);
                fetchAndRenderWebOrders();
            } catch (error) {
                alert(`Error al actualizar el pedido: ${error.message}`);
            }
        }
        return;
    }

    if (target.classList.contains('edit-customer-btn')) {
        const customerId = target.closest('tr').dataset.customerId;
        mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
        mainContent.querySelector('[data-action="clientes/modificar_cliente"]')?.classList.add('active');
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
                    row.remove();
                    alert(result.message);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                alert(`Error al eliminar: ${error.message}`);
            }
        }
        return;
    }

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

    if (target.classList.contains('delete-proveedor-btn')) {
        const row = target.closest('tr');
        const proveedorId = row.dataset.proveedorId;
        const proveedorName = row.querySelector('td:nth-child(2)').textContent;
        if (confirm(`¿Estás seguro de que quieres eliminar al proveedor "${proveedorName}"?`)) {
            deleteProveedor(proveedorId);
        }
        return;
    }
});











mainContent.addEventListener('input', (event) => {
    clearTimeout(searchTimeout);

    // Búsqueda de productos
    if (event.target.id === 'product-search-input') {
        const searchTerm = event.target.value;
        // Si el campo de búsqueda se vacía, el refresco es inmediato.
        // Si se está escribiendo, se mantiene una pequeña espera.
        const delay = searchTerm === '' ? 0 : 300;

        searchTimeout = setTimeout(async () => {
            currentFilters.search = searchTerm;
            currentFilters.page = 1;
            await fetchAndRenderProducts();
        }, delay);
    }
    
    // Búsqueda de clientes (sin cambios)
    if (event.target.id === 'customer-search-input') {
        searchTimeout = setTimeout(async () => {
            await fetchAndRenderCustomers(event.target.value);
        }, 300);
    }
});

// REEMPLAZA este event listener completo en admin/js/admin.js
// EN: admin/js/admin.js

mainContent.addEventListener('change', async (event) => {
    const target = event.target; // <--- LÍNEA AÑADIDA

    if (target.id === 'activity-date-filter') {
        fetchAndRenderActivityLog();
        return;
    }
    
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
        if (target.id === 'store-filter') {
        currentFilters.store = target.value;
        currentFilters.page = 1;
        await fetchAndRenderProducts();
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
    
mainContent.addEventListener('dblclick', (event) => {
    const cell = event.target.closest('td.editable');
    // Se asegura de que la celda sea editable y no tenga ya un input dentro
    if (cell && !cell.querySelector('input')) {
        const originalValue = cell.textContent.trim();
        // Reemplaza el texto por un campo de input
        cell.innerHTML = `<input type="text" value="${originalValue}" data-original-value="${originalValue}">`;
        const input = cell.querySelector('input');
        input.focus(); // Pone el cursor dentro del input
        input.select(); // Selecciona todo el texto
    }
});

// 2. Detecta cuando se hace clic fuera del input para guardar
mainContent.addEventListener('focusout', (event) => {
    const input = event.target;
    if (input.tagName === 'INPUT' && input.parentElement.classList.contains('editable')) {
        const cell = input.parentElement;
        const originalValue = input.dataset.originalValue;
        const newValue = input.value.trim();
        const row = cell.closest('tr');

        // Solo guarda si el valor es nuevo y no está vacío
        if (newValue !== originalValue && newValue !== '') {
            // Verifica si es una fila de departamento
            if (row.dataset.departmentId) {
                const departmentId = row.dataset.departmentId;
                const field = cell.dataset.field;
                // Llama a la función que se comunica con la API
                saveDepartmentFieldUpdate(departmentId, field, newValue, cell);
            }
            // Aquí podrías añadir un 'else if (row.dataset.productId)' para editar productos
        } else {
            // Si no hay cambios, restaura el valor original
            cell.textContent = originalValue;
        }
    }
});

// 3. Función que envía los datos a la API para guardar en la base de datos
async function saveDepartmentFieldUpdate(departmentId, field, value, cell) {
    const originalText = cell.textContent;
    cell.textContent = 'Guardando...'; // Feedback visual para el usuario
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateDepartment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: departmentId, name: value })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        // Si la API confirma, actualiza la celda con el nuevo valor
        cell.textContent = value;
    } catch (error) {
        console.error('Error al guardar:', error);
        cell.textContent = originalText; // Si falla, revierte el cambio
        alert("Error al guardar el cambio.");
    }
}
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
// --- LÓGICA DEL MÓDULO DE TARJETAS ---

function initializeCardManagement() {
    const createForm = document.getElementById('create-cards-form');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateCards);
    }
    fetchAndRenderCards();
}

async function fetchAndRenderCards() {
    const unassignedBody = document.getElementById('unassigned-cards-tbody');
    const assignedBody = document.getElementById('assigned-cards-tbody');
    if (!unassignedBody || !assignedBody) return;

    unassignedBody.innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';
    assignedBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getCards`);
        const result = await response.json();

        if (result.success) {
            // Renderizar tarjetas sin asignar
            unassignedBody.innerHTML = '';
            if (result.unassigned.length > 0) {
                result.unassigned.forEach(card => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${card.numero_tarjeta}</td>
                        <td>${new Date(card.fecha_emision).toLocaleDateString('es-SV')}</td>
                        <td>
                            <button class="action-btn assign-btn" data-card-id="${card.id_tarjeta}" data-card-number="${card.numero_tarjeta}">Asignar</button>
                            <button class="action-btn delete-card-btn" data-card-id="${card.id_tarjeta}" style="background-color:#f8d7da;">&times;</button>
                        </td>
                    `;
                    unassignedBody.appendChild(row);
                });
            } else {
                unassignedBody.innerHTML = '<tr><td colspan="3">No hay tarjetas disponibles para asignar.</td></tr>';
            }

            // Renderizar tarjetas asignadas
            assignedBody.innerHTML = '';
             if (result.assigned.length > 0) {
                result.assigned.forEach(card => {
                    const row = document.createElement('tr');
                    const statusClass = card.nombre_estado === 'Activo' ? 'status-active' : 'status-inactive';
                    row.innerHTML = `
                        <td>${card.numero_tarjeta}</td>
                        <td>${card.nombre_usuario} (${card.nombre} ${card.apellido || ''})</td>
                        <td>$${parseFloat(card.saldo).toFixed(2)}</td>
                        <td><span class="status-badge ${statusClass}">${card.nombre_estado}</span></td>
                        <td>
                            </td>
                    `;
                    assignedBody.appendChild(row);
                });
            } else {
                assignedBody.innerHTML = '<tr><td colspan="5">No hay tarjetas asignadas a clientes.</td></tr>';
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        unassignedBody.innerHTML = `<tr><td colspan="3" style="color:red;">Error al cargar tarjetas.</td></tr>`;
        assignedBody.innerHTML = `<tr><td colspan="5" style="color:red;">Error al cargar tarjetas.</td></tr>`;
    }
}

async function handleCreateCards(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('create-cards-feedback');
    const quantity = form.querySelector('#quantity').value;
    const button = form.querySelector('button');

    button.disabled = true;
    button.textContent = 'Creando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/createCards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: parseInt(quantity) })
        });
        const result = await response.json();
        if (result.success) {
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            form.reset();
            fetchAndRenderCards(); // Recargar listas
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Crear Tarjetas';
    }
}

async function fetchAndRenderCardReport() {
    const reportBody = document.getElementById('card-report-tbody');
    if (!reportBody) return;
    reportBody.innerHTML = '<tr><td colspan="5">Cargando reporte...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getCardReport`);
        const result = await response.json();
        reportBody.innerHTML = '';
        if (result.success && result.report.length > 0) {
            result.report.forEach(row => {
                const tr = document.createElement('tr');
                 const statusClass = row.nombre_estado === 'Activo' ? 'status-active' : 'status-inactive';
                tr.innerHTML = `
                    <td>${row.nombre_usuario}</td>
                    <td>${row.nombre} ${row.apellido || ''}</td>
                    <td>${row.numero_tarjeta}</td>
                    <td>$${parseFloat(row.saldo).toFixed(2)}</td>
                    <td><span class="status-badge ${statusClass}">${row.nombre_estado}</span></td>
                `;
                reportBody.appendChild(tr);
            });
        } else {
            reportBody.innerHTML = '<tr><td colspan="5">No hay datos para mostrar en el reporte.</td></tr>';
        }
    } catch (error) {
        reportBody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar el reporte.</td></tr>';
    }
}


//Asignacion de tarjeta
let selectedCardId = null;

mainContent.addEventListener('click', event => {
    if (event.target.classList.contains('assign-btn')) {
        selectedCardId = event.target.dataset.cardId;
        const cardNumber = event.target.dataset.cardNumber;
        openAssignModal(cardNumber);
    }
    if (event.target.classList.contains('delete-card-btn')) {
        const cardId = event.target.dataset.cardId;
        if (confirm('¿Seguro que quieres eliminar esta tarjeta? Esta acción es irreversible.')) {
            deleteCard(cardId);
        }
    }
});

function openAssignModal(cardNumber) {
    const modal = document.getElementById('assign-card-modal');
    if (!modal) return;
    modal.querySelector('#assign-modal-title').textContent = `Asignar Tarjeta: ${cardNumber}`;
    modal.querySelector('#customer-assign-search').value = '';
    modal.querySelector('#customer-search-results').innerHTML = '<p>Ingrese un término de búsqueda para encontrar clientes.</p>';
    modal.style.display = 'flex';
}

function closeAssignModal() {
    const modal = document.getElementById('assign-card-modal');
    if (modal) modal.style.display = 'none';
    selectedCardId = null;
}

let searchCustomerTimeout;
document.addEventListener('input', event => {
    if (event.target.id === 'customer-assign-search') {
        clearTimeout(searchCustomerTimeout);
        searchCustomerTimeout = setTimeout(() => {
            searchCustomersToAssign(event.target.value);
        }, 300);
    }
});

async function searchCustomersToAssign(searchTerm) {
    const resultsContainer = document.getElementById('customer-search-results');
    resultsContainer.innerHTML = '<p>Buscando...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getCustomersWithoutCard&search=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();
        resultsContainer.innerHTML = '';
        if (result.success && result.customers.length > 0) {
            const list = document.createElement('ul');
            list.className = 'customer-assign-list';
            result.customers.forEach(customer => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${customer.nombre} ${customer.apellido || ''} (${customer.nombre_usuario})</span> <button class="action-btn select-customer-btn" data-customer-id="${customer.id_cliente}">Seleccionar</button>`;
                list.appendChild(li);
            });
            resultsContainer.appendChild(list);
        } else {
            resultsContainer.innerHTML = '<p>No se encontraron clientes sin tarjeta para esta búsqueda.</p>';
        }
    } catch (error) {
        resultsContainer.innerHTML = '<p style="color:red">Error al buscar clientes.</p>';
    }
}

document.addEventListener('click', event => {
    if (event.target.classList.contains('select-customer-btn')) {
        const customerId = event.target.dataset.customerId;
        assignCardToCustomer(selectedCardId, customerId);
    }
     if (event.target.matches('#assign-card-modal .modal-close-btn, #modal-cancel-btn-card')) {
        closeAssignModal();
    }
});

async function assignCardToCustomer(cardId, customerId) {
    const feedbackDiv = document.getElementById('assign-modal-feedback');
    feedbackDiv.innerHTML = '';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/assignCard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id: cardId, customer_id: customerId })
        });
        const result = await response.json();
        if (result.success) {
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            setTimeout(() => {
                closeAssignModal();
                fetchAndRenderCards();
            }, 1500);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    }
}

async function deleteCard(cardId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteCard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id: cardId })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            fetchAndRenderCards(); // Recargar la lista
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}
    
// --- LÓGICA PARA RECARGAR TARJETAS ---

function initializeCardRecharge() {
    const searchForm = document.getElementById('card-search-form-recharge');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchCardToRecharge);
    }
}

async function handleSearchCardToRecharge(event) {
    event.preventDefault();
    const searchInput = document.getElementById('card-search-input');
    const feedbackDiv = document.getElementById('search-feedback-recharge');
    const formContainer = document.getElementById('recharge-form-container');
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) return;

    feedbackDiv.textContent = 'Buscando...';
    formContainer.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getCardDetails&search=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();
        if (result.success) {
            feedbackDiv.textContent = '';
            renderRechargeForm(result.card);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        feedbackDiv.textContent = error.message;
        feedbackDiv.style.color = 'red';
    }
}

function renderRechargeForm(card) {
    const container = document.getElementById('recharge-form-container');
    container.classList.remove('hidden');
    container.innerHTML = `
        <h4>Recargar Tarjeta: ${card.numero_tarjeta}</h4>
        <p><strong>Cliente:</strong> ${card.nombre} ${card.apellido || ''} (${card.nombre_usuario})</p>
        <p><strong>Saldo Actual:</strong> <span style="font-weight:bold; color:green;">$${parseFloat(card.saldo).toFixed(2)}</span></p>
        
        <form id="recharge-form">
            <input type="hidden" name="card_id" value="${card.id_tarjeta}">
            <div class="form-group">
                <label for="recharge-amount">Monto a Recargar</label>
                <input type="number" id="recharge-amount" name="amount" step="0.01" min="0.01" required>
            </div>
            <div id="recharge-feedback" class="form-message" style="margin-top:1rem;"></div>
            <button type="submit" class="action-btn form-submit-btn">Aplicar Recarga</button>
        </form>
    `;

    document.getElementById('recharge-form').addEventListener('submit', handleRechargeSubmit);
}

async function handleRechargeSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('recharge-feedback');
    const button = form.querySelector('button[type="submit"]');
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Se asegura de que los valores sean numéricos antes de enviarlos
    const cardId = parseInt(form.querySelector('input[name="card_id"]').value, 10);
    const amount = parseFloat(form.querySelector('#recharge-amount').value);
    // --- FIN DE LA CORRECCIÓN ---

    button.disabled = true;
    button.textContent = 'Procesando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/rechargeCard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id: cardId, amount: amount }) // Ahora se envían números
        });
        const result = await response.json();

        if (result.success) {
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            setTimeout(() => {
                 document.getElementById('card-search-form-recharge').dispatchEvent(new Event('submit'));
            }, 1500);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Aplicar Recarga';
    }
}
    
    // --- LÓGICA DEL MÓDULO DE DEPARTAMENTOS ---

// --- LÓGICA DEL MÓDULO DE DEPARTAMENTOS (CORREGIDA) ---

function initializeDepartmentManagement() {
    fetchAndRenderDepartments();

    const createForm = document.getElementById('create-department-form');
    if (createForm) {
        createForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const feedbackDiv = document.getElementById('create-department-feedback');
            // CORRECCIÓN: Se busca el id "departamento"
            const nameInput = document.getElementById('departamento'); 
            const codeInput = document.getElementById('codigo_departamento');
            
            const data = {
                // CORRECCIÓN: La propiedad enviada a la API es "departamento"
                departamento: nameInput.value.trim(), 
                codigo_departamento: codeInput.value.trim()
            };

            feedbackDiv.textContent = 'Guardando...';
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/createDepartment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);
                
                feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                nameInput.value = '';
                codeInput.value = '';
                fetchAndRenderDepartments();
                setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);
            } catch (error) {
                feedbackDiv.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
            }
        });
    }
}







async function fetchAndRenderDepartments() {
    const tableBody = document.getElementById('departments-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    try {
        // Se añaden los parámetros de ordenación a la URL de la API
        const apiUrl = `${API_BASE_URL}?resource=admin/getDepartments&sort_by=${departmentFilters.sort.by}&order=${departmentFilters.sort.order}`;
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        tableBody.innerHTML = '';
        if (result.success && result.departments.length > 0) {
            result.departments.forEach(dept => {
                const row = document.createElement('tr');
                row.dataset.departmentId = dept.id_departamento;
                
                row.innerHTML = `
                    <td>${dept.id_departamento}</td>
                    <td class="editable" data-field="departamento">${dept.departamento}</td>
                    <td>${dept.codigo_departamento}</td>
                    <td>${dept.total_productos}</td>
                    <td><button class="action-btn delete-department-btn">&times;</button></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No hay departamentos creados.</td></tr>';
        }
        updateDepartmentSortIndicators(); // Actualiza los indicadores visuales
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar los departamentos.</td></tr>';
    }
}


// Listener para guardar cambios al editar en línea
async function saveDepartmentFieldUpdate(departmentId, field, value, cell) {
    const originalText = cell.innerHTML;
    cell.textContent = 'Guardando...';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateDepartment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: departmentId, name: value }) // El único campo editable es el nombre
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        cell.textContent = value;
    } catch (error) {
        console.error('Error al guardar:', error);
        cell.innerHTML = originalText;
        alert("Error al guardar el cambio.");
    }
}

// Sobrescribimos el listener de focusout para que también maneje la tabla de departamentos
// EN admin/js/admin.js (REEMPLAZA ESTA FUNCIÓN COMPLETA)

mainContent.addEventListener('focusout', (event) => {
    // Verifica si el elemento que perdió el foco es un input dentro de una celda editable
    if (event.target.tagName === 'INPUT' && event.target.parentElement.classList.contains('editable')) {
        const input = event.target;
        const cell = input.parentElement;
        const originalValue = input.dataset.originalValue;
        const newValue = input.value.trim();
        const row = cell.closest('tr');

        // Si el valor no cambió o está vacío, simplemente revierte al texto original
        if (newValue === originalValue || newValue === '') {
            cell.textContent = originalValue;
            // Si era un precio, añade el símbolo de dólar de nuevo
            if (cell.dataset.field === 'precio_venta') {
                cell.textContent = `$${parseFloat(originalValue).toFixed(2)}`;
            }
            return;
        }

        // Determina qué tipo de fila es (producto, departamento o tienda)
        const productId = row.dataset.productId;
        const departmentId = row.dataset.departmentId;
        const tiendaId = row.dataset.tiendaId; // Se define la variable que faltaba
        const proveedorId = row.dataset.proveedorId; // <-- AÑADIDO
        
        const field = cell.dataset.field;

        // Llama a la función de guardado correspondiente
        if (productId) {
            saveFieldUpdate(productId, field, newValue, cell);
        } else if (departmentId) {
            saveDepartmentFieldUpdate(departmentId, field, newValue, cell);
        } else if (tiendaId) {
            saveTiendaFieldUpdate(tiendaId, field, newValue, cell);
        }else if (proveedorId) { // <-- AÑADIDO
            saveProveedorFieldUpdate(proveedorId, field, newValue, cell);
        }
    }
});



function initializeBackupControls() {
    const startBtn = document.getElementById('start-backup-btn');
    const resultsDiv = document.getElementById('backup-results');

    if (!startBtn) return;

    startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        startBtn.textContent = 'Generando...';
        resultsDiv.innerHTML = '<p>Creando la copia de seguridad, por favor espera...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/createBackup`);
            
            // --- INICIO DE LA CORRECCIÓN CLAVE ---
            // 1. Leemos la respuesta como texto, sin asumir que es JSON.
            const responseText = await response.text();
            let result;

            // 2. Intentamos convertir el texto a JSON.
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                // Si falla, el problema es que el servidor envió HTML.
                // Mostramos ese HTML para ver el error de PHP.
                console.error("La respuesta del servidor no es un JSON válido:", responseText);
                throw new Error("El servidor devolvió un error inesperado. Revisa la consola del navegador (F12) para ver la respuesta HTML completa.");
            }
            // --- FIN DE LA CORRECCIÓN CLAVE ---

            if (result.success) {
                resultsDiv.innerHTML = `
                    <div class="message success">${result.message}</div>
                    <p><strong>Archivo:</strong> ${result.file_name}</p>
                    <a href="../api/${result.download_url}" class="action-btn modal-btn-primary" download>Descargar Copia de Seguridad</a>
                `;
            } else {
                // Si es un JSON de error, mostramos los detalles que envía PHP.
                let errorMessage = result.message || 'Ocurrió un error desconocido.';
                if (result.details) {
                    errorMessage += `<br><strong style='margin-top:1rem;display:block;'>Detalles del error:</strong><pre style='background-color:#f8d7da;padding:0.5rem;border-radius:4px;white-space:pre-wrap;text-align:left;'>${result.details}</pre>`;
                }
                throw new Error(errorMessage);
            }

        } catch (error) {
            resultsDiv.innerHTML = `<div class="message error">${error.message}</div>`;
        } finally {
            startBtn.disabled = false;
            startBtn.textContent = 'Iniciar Creación de Copia de Seguridad';
        }
    });
}




// EN: admin/js/admin.js
// REEMPLAZA la función 'initializeInventoryForm' con esta versión:

// EN: admin/js/admin.js
// REEMPLAZA esta función completa para añadir la validación que faltaba.

function initializeInventoryForm(type) {
    const searchForm = document.getElementById(`product-search-form-${type}`);
    if (!searchForm) return;

    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const searchInput = document.getElementById(`product-search-for-${type}`);
        const feedbackDiv = document.getElementById(`search-feedback-${type}`);
        const formContainer = document.getElementById(`${type}-form-container`);
        const productCode = searchInput.value.trim();

        if (!productCode) return;

        feedbackDiv.textContent = 'Buscando producto...';
        feedbackDiv.style.color = 'inherit';
        formContainer.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getProductDetails&id=${encodeURIComponent(productCode)}`);
            const result = await response.json();

            if (result.success) {
                // --- INICIO DE LA CORRECCIÓN CLAVE ---
                // Se añade una validación específica para el tipo 'adjust'.
                if (type === 'adjust' && result.product.usa_inventario != 1) {
                    // Si se intenta ajustar un producto sin inventario, se lanza el error aquí.
                    throw new Error('Este producto no tiene el inventario habilitado. Debes agregar stock primero.');
                }
                // Si el tipo es 'stock' o si el producto sí usa inventario, el código continúa.
                // --- FIN DE LA CORRECCIÓN CLAVE ---
                
                feedbackDiv.textContent = '';
                renderInventoryActionForm(result.product, type);
            } else {
                throw new Error(result.error || 'Producto no encontrado.');
            }
        } catch (error) {
            feedbackDiv.textContent = error.message;
            feedbackDiv.style.color = 'red';
        }
    });
}



async function renderInventoryActionForm(product, type) {
    const container = document.getElementById(`${type}-form-container`);
    container.classList.remove('hidden');

    let title, label, inputName, buttonText, placeholder, minVal;
    if (type === 'stock') {
        title = 'Agregar Stock';
        label = 'Cantidad a Agregar';
        inputName = 'quantity';
        buttonText = 'Agregar';
        placeholder = 'Ej: 50';
        minVal = '1';
    } else { // type === 'adjust'
        title = 'Ajustar Inventario';
        label = 'Valor del Ajuste (+/-)';
        inputName = 'adjustment_value';
        buttonText = 'Ajustar';
        placeholder = 'Ej: 10 (sumar) o -10 (restar)';
        minVal = '';
    }

    // --- INICIO DE LA LÓGICA DE VISUALIZACIÓN MEJORADA ---
    let tiendaInputHtml = '';
    let stockDetailsHtml = `<p><strong>Stock Actual:</strong> <span style="font-weight:bold; color:green;">${product.stock_actual}</span></p>`;

    if (USER_ROLE === 'administrador_global') {
        // Mostrar desglose de stock por tienda si existe
        if (product.stock_por_tienda && product.stock_por_tienda.length > 0) {
            stockDetailsHtml += '<ul>';
            product.stock_por_tienda.forEach(tienda => {
                stockDetailsHtml += `<li>${tienda.nombre_tienda}: ${tienda.stock}</li>`;
            });
            stockDetailsHtml += '</ul>';
        }

        // Crear el selector de tiendas para el admin
        tiendaInputHtml = `
            <div class="form-group">
                <label for="id_tienda">Aplicar a Tienda:</label>
                <select id="id_tienda" name="id_tienda" required>
                    <option value="">Cargando tiendas...</option>
                </select>
            </div>
        `;
    } 
    // --- FIN DE LA LÓGICA DE VISUALIZACIÓN MEJORADA ---

    container.innerHTML = `
        <h4>${title}: ${product.nombre_producto}</h4>
        <p><strong>Código:</strong> ${product.codigo_producto}</p>
        <div id="stock-details">
            ${stockDetailsHtml}
        </div>
        
        <form id="${type}-action-form">
            <input type="hidden" name="product_id" value="${product.id_producto}">
            ${tiendaInputHtml} 
            <div class="form-group">
                <label for="${inputName}">${label}</label>
                <input type="number" id="${inputName}" name="${inputName}" ${minVal ? `min="${minVal}"` : ''} required placeholder="${placeholder}">
            </div>
            <div class="form-group">
                <label for="notes">Notas (Opcional)</label>
                <input type="text" id="notes" name="notes" placeholder="Ej: Compra a proveedor X / Conteo físico">
            </div>
            <div id="${type}-feedback" class="form-message" style="margin-top:1rem;"></div>
            <button type="submit" class="action-btn form-submit-btn">${buttonText}</button>
        </form>
    `;

    // Si es admin, poblamos el selector de tiendas
    if (USER_ROLE === 'administrador_global') {
        const tiendaSelect = document.getElementById('id_tienda');
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getTiendas`);
            const result = await response.json();
            if (result.success) {
                tiendaSelect.innerHTML = '<option value="">Seleccione una tienda</option>';
                result.tiendas.forEach(tienda => {
                    const option = document.createElement('option');
                    option.value = tienda.id_tienda;
                    option.textContent = tienda.nombre_tienda;
                    tiendaSelect.appendChild(option);
                });
            }
        } catch (e) {
            tiendaSelect.innerHTML = '<option value="">Error al cargar tiendas</option>';
        }
    }

    document.getElementById(`${type}-action-form`).addEventListener('submit', handleInventoryActionSubmit);
}

/*************************************************************************/

async function handleInventoryActionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const type = form.id.replace('-action-form', '');
    
    let resource;
    let data;

    const formData = new FormData(form);
    const rawData = Object.fromEntries(formData.entries());

    switch(type) {
        case 'stock': 
            resource = 'addStock'; 
            data = rawData;
            break;
        case 'adjust': 
            resource = 'adjustInventory'; 
            data = { 
                product_id: rawData.product_id,
                adjustment_value: rawData.adjustment_value,
                notes: rawData.notes,
                id_tienda: rawData.id_tienda
            };
            break;
    }

    const feedbackDiv = document.getElementById(`${type}-feedback`);
    const button = form.querySelector('button[type="submit"]');

    button.disabled = true;
    button.textContent = 'Procesando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/${resource}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (!response.ok) {
             throw new Error(result.error || 'Ocurrió un error en el servidor.');
        }

        if (result.success) {
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            setTimeout(() => {
                document.getElementById(`product-search-form-${type}`).dispatchEvent(new Event('submit'));
            }, 1500);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        if (!feedbackDiv.querySelector('.success')) {
            button.disabled = false;
            let originalButtonText = '';
            switch(type) {
                case 'stock': originalButtonText = 'Agregar'; break;
                case 'adjust': originalButtonText = 'Ajustar'; break;
            }
            button.textContent = originalButtonText;
        }
    }
}


async function populateMovementTypeFilter() {
    const filterSelect = document.getElementById('movement-type-filter');
    if (!filterSelect) return;

    try {
        // 1. Llama al nuevo endpoint que creamos en la API
        const response = await fetch(`${API_BASE_URL}?resource=admin/getMovementStates`);
        const result = await response.json();

        if (result.success && result.states) {
            filterSelect.innerHTML = '<option value="">Todos los Movimientos</option>';

            // 2. Crea las opciones dinámicamente con los datos de la base de datos
            result.states.forEach(state => {
                // Mapeamos los nombres a etiquetas más amigables
                let label = state.nombre_estado;
                if (state.nombre_estado === 'Entrada de Inventario') label = 'Ingresos';
                if (state.nombre_estado === 'Salida de Inventario') label = 'Salidas';
                if (state.nombre_estado === 'Ajuste de Inventario') label = 'Ajustes';

                const option = document.createElement('option');
                option.value = state.id_estado; // El valor es el ID real de la tabla
                option.textContent = label;
                filterSelect.appendChild(option);
            });
        } else {
            throw new Error(result.error || 'No se pudieron cargar los filtros.');
        }
    } catch(e) {
        filterSelect.innerHTML = `<option value="">Error al cargar</option>`;
    }
}






// EN: admin/js/admin.js
// REEMPLAZA esta función completa
// En admin/js/admin.js, reemplaza la función fetchAndRenderInventoryHistory
async function fetchAndRenderInventoryHistory() {
    const tableBody = document.getElementById('inventory-history-tbody');
    if (!tableBody) return;

    const searchTerm = document.getElementById('inventory-history-search').value;
    const startDate = document.getElementById('start-date-filter').value;
    const endDate = document.getElementById('end-date-filter').value;
    const movementTypeId = document.getElementById('movement-type-filter').value;
    const storeId = document.getElementById('store-filter')?.value || '';

    tableBody.innerHTML = '<tr><td colspan="9">Cargando historial...</td></tr>'; // Aumentado a 9 columnas

    try {
        const params = new URLSearchParams({
            search: searchTerm,
            startDate: startDate,
            endDate: endDate,
            movementTypeId: movementTypeId,
            storeId: storeId
        });
        
        const response = await fetch(`${API_BASE_URL}?resource=admin/getInventoryHistory&${params.toString()}`);
        const result = await response.json();

        tableBody.innerHTML = '';
        if (result.success && result.history.length > 0) {
            result.history.forEach(mov => {
                const row = document.createElement('tr');
                let cantidadClass = '';
                if (mov.cantidad > 0) cantidadClass = 'stock-add';
                if (mov.cantidad < 0) cantidadClass = 'stock-remove';
                
                // Se añade la celda para 'nombre_tienda'
                row.innerHTML = `
                    <td>${new Date(mov.fecha).toLocaleString('es-SV')}</td>
                    <td>${mov.nombre_producto} (${mov.codigo_producto})</td>
                    <td>${mov.tipo_movimiento}</td>
                    <td class="${cantidadClass}">${mov.cantidad}</td>
                    <td>${mov.stock_anterior}</td>
                    <td>${mov.stock_nuevo}</td>
                    <td>${mov.nombre_tienda || 'N/A'}</td> 
                    <td>${mov.nombre_usuario || 'Sistema'}</td>
                    <td>${mov.notas || ''}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="9">No se encontraron movimientos para los filtros seleccionados.</td></tr>'; // Aumentado a 9
        }
    } catch (error) {
        tableBody.innerHTML = `<td colspan="9" style="color:red;">Error: ${error.message}</td>`; // Aumentado a 9
    }
}

// Agrega el listener para la búsqueda en el historial
mainContent.addEventListener('input', (event) => {
    // ... (tu código existente de input listener)
    if (event.target.id === 'inventory-history-search') {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchAndRenderInventoryHistory(event.target.value);
        }, 300);
    }
       if (event.target.classList.contains('inventory-history-filter')) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchAndRenderInventoryHistory();
        }, 400);
    }
});

    mainContent.addEventListener('change', (event) => {
    // ... tu código existente
    if (event.target.classList.contains('inventory-history-filter')) {
       fetchAndRenderInventoryHistory();
    }
});


async function showProcessedFiles() {
    const listContainer = document.getElementById('processed-files-list');
    const resultsContainer = document.getElementById('results-container');
    if (!listContainer || !resultsContainer) return;

    try {
        // Llama a tu API para obtener la lista de imágenes
        const response = await fetch('../api/index.php?resource=get_processed_images');
        const data = await response.json();

        listContainer.innerHTML = ''; // Limpia la lista anterior
        if (data.success && data.files.length > 0) {
            resultsContainer.classList.remove('hidden'); // Muestra el contenedor de resultados
            data.files.forEach(file => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'processed-file-item';
                itemDiv.dataset.fileName = file.name;

                // Crea el HTML para cada imagen en la lista
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
            // Oculta los resultados si no hay archivos
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

    // Si no hay nada seleccionado, los botones se desactivan
    if (uploadBtn) uploadBtn.disabled = checkedBoxes === 0;
    if (downloadBtn) downloadBtn.disabled = checkedBoxes === 0;
}








    initializeSidemenu();
    checkSidemenuState();
    loadModule('dashboard');
    updateHeaderUserInfo();







async function fetchAndRenderSalesSummary(startDate, endDate, storeId = null) {
    const salesWidget = document.getElementById('sales-summary-widget');
    const chartTitle = document.getElementById('sales-chart-title');
    if (!salesWidget || !chartTitle) return;

    salesWidget.innerHTML = `<p>Calculando...</p>`;
    chartTitle.textContent = `Gráfico de Ventas (cargando...)`;

    try {
        const params = new URLSearchParams({ startDate, endDate });
        if (storeId) {
            params.append('storeId', storeId);
        }
        
        const response = await fetch(`${API_BASE_URL}?resource=admin/getSalesStats&${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            const stats = result.stats;
            const formattedStartDate = new Date(startDate + 'T00:00:00').toLocaleDateString('es-SV');
            const formattedEndDate = new Date(endDate + 'T00:00:00').toLocaleDateString('es-SV');
            
            salesWidget.innerHTML = `
                <p style="font-size: 2rem; font-weight: 400; color: #0C0A4E; margin-bottom: 5px;">$${stats.total_revenue}</p>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; color: #6c757d;">
                    ${stats.sales_by_payment.map(item => `
                        <li style="display: flex; justify-content: space-between; padding: 0.2rem 0;">
                            <span>${item.nombre_metodo}:</span>
                            <strong>${item.count} ventas</strong>
                        </li>
                    `).join('') || '<li>No hay ventas por método de pago.</li>'}
                    
                    <li style="display: flex; justify-content: space-between; padding: 0.2rem 0; margin-top: 8px; border-top: 1px solid #eee;">
                        <span>Promedio por Venta:</span>
                        <strong>$${stats.average_sale}</strong>
                    </li>
                </ul>
            `;
            
            chartTitle.textContent = `Historial de Ventas (${formattedStartDate} - ${formattedEndDate})`;

            // --- CORRECCIÓN CLAVE ---
            // Se usa la nueva propiedad 'daily_sales_by_store' que envía la API.
            renderSalesChart(stats.daily_sales_by_store);
            
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        salesWidget.innerHTML = `<p style="color:red;">Error al cargar resumen de ventas.</p>`;
        chartTitle.textContent = 'Error al cargar gráfico';
    }
}










async function loadStatisticsWidgets() {
    const endDateInput = document.getElementById('end-date');
    const startDateInput = document.getElementById('start-date');
    const storeFilter = document.getElementById('stats-store-filter');

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    startDateInput.value = formatDate(startDate);
    endDateInput.value = formatDate(endDate);
    
    // Se obtiene el valor inicial del filtro de tienda al cargar.
    const initialStoreId = storeFilter ? storeFilter.value : null;

    // Se cargan los datos iniciales con el rango de fechas y la tienda por defecto.
    await fetchAndRenderSalesSummary(startDateInput.value, endDateInput.value, initialStoreId);
    await fetchAndRenderProductStats(initialStoreId);
}




async function fetchAndRenderProductStats(storeId = null) {
    const topProductsWidget = document.getElementById('top-products-widget');
    const lowStockWidget = document.getElementById('low-stock-widget');
    if (!topProductsWidget || !lowStockWidget) return;

    topProductsWidget.innerHTML = `<p>Cargando...</p>`;
    lowStockWidget.innerHTML = `<p>Cargando...</p>`;

    try {
        // Se añade el filtro de tienda a la consulta.
        const params = new URLSearchParams();
        if (storeId) {
            params.append('storeId', storeId);
        }

        const response = await fetch(`${API_BASE_URL}?resource=admin/getProductStats&${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            const stats = result.stats;
            topProductsWidget.innerHTML = `
                <ol style="padding-left: 1.5rem;">
                    ${stats.top_products.map(p => `
                        <li style="margin-bottom: 0.5rem;">
                            ${p.nombre_producto} - <strong>$${parseFloat(p.total_sold).toFixed(2)}</strong>
                        </li>
                    `).join('') || '<li>No hay datos.</li>'}
                </ol>
            `;
            lowStockWidget.innerHTML = `
                <ul style="list-style: none; padding: 0;">
                    ${stats.low_stock_products.map(p => `
                         <li style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 0.3rem 0;">
                            <span>${p.nombre_producto}</span>
                            <strong style="color: #c0392b;">Stock: ${p.stock_actual} (Mín: ${p.stock_minimo})</strong>
                        </li>
                    `).join('') || '<li>No hay productos con bajo stock.</li>'}
                </ul>
            `;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        topProductsWidget.innerHTML = `<p style="color:red;">Error al cargar productos.</p>`;
        lowStockWidget.innerHTML = `<p style="color:red;">Error al cargar stock.</p>`;
    }
}



















// En tu archivo: admin/js/admin.js

// En tu archivo: admin/js/admin.js




// En: admin/js/admin.js

// admin/js/admin.js

// ... (otras funciones del archivo)

function renderSalesChart(dailySalesByStore) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (!ctx) return;

    if (window.mySalesChart instanceof Chart) {
        window.mySalesChart.destroy();
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // Si no hay datos para graficar, se limpia el área y se detiene la función para evitar errores.
    if (!Array.isArray(dailySalesByStore) || dailySalesByStore.length === 0 || !dailySalesByStore[0].data || dailySalesByStore[0].data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); 
        return;
    }
    // --- FIN DE LA CORRECCIÓN ---

    const chartColors = [
        'rgba(12, 10, 78, 1)',    
        'rgba(231, 76, 60, 1)',   
        'rgba(46, 204, 113, 1)',  
        'rgba(241, 196, 15, 1)',  
        'rgba(155, 89, 182, 1)',  
        'rgba(52, 152, 219, 1)'   
    ];

    const labels = dailySalesByStore[0].data.map(sale => {
        return new Date(sale.fecha + 'T00:00:00').toLocaleDateString('es-SV', { 
            month: 'short', 
            day: 'numeric' 
        });
    });

    const datasets = dailySalesByStore.map((storeData, index) => {
        const color = chartColors[index % chartColors.length];
        return {
            label: storeData.store_name,
            data: storeData.data.map(sale => sale.daily_total),
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            borderWidth: 2,
            tension: 0.1,
            fill: true
        };
    });

    window.mySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets 
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            // --- CORRECCIÓN CLAVE ---
            // Se establece en 'false' para que el gráfico se ajuste mejor a su contenedor.
            maintainAspectRatio: true
        }
    });
}


async function loadStatisticsWidgets() {
    const endDateInput = document.getElementById('end-date');
    const startDateInput = document.getElementById('start-date');
    const storeFilter = document.getElementById('stats-store-filter');

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    startDateInput.value = formatDate(startDate);
    endDateInput.value = formatDate(endDate);
    
    const initialStoreId = storeFilter ? storeFilter.value : null;

    await fetchAndRenderSalesSummary(startDateInput.value, endDateInput.value, initialStoreId);
    // --- CORRECCIÓN: Se envían las fechas a ambas funciones para consistencia ---
    await fetchAndRenderProductStats(startDateInput.value, endDateInput.value, initialStoreId);
}


async function fetchAndRenderProductStats(startDate, endDate, storeId = null) {
    const topProductsWidget = document.getElementById('top-products-widget');
    const lowStockWidget = document.getElementById('low-stock-widget');
    if (!topProductsWidget || !lowStockWidget) return;

    topProductsWidget.innerHTML = `<p>Cargando...</p>`;
    lowStockWidget.innerHTML = `<p>Cargando...</p>`;

    try {
        // --- CORRECCIÓN: Se añaden los filtros de fecha a la consulta ---
        const params = new URLSearchParams({ startDate, endDate });
        if (storeId) {
            params.append('storeId', storeId);
        }

        const response = await fetch(`${API_BASE_URL}?resource=admin/getProductStats&${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            const stats = result.stats;
            topProductsWidget.innerHTML = `
                <ol style="padding-left: 1.5rem;">
                    ${stats.top_products.map(p => `
                        <li style="margin-bottom: 0.5rem;">
                            ${p.nombre_producto} - <strong>$${parseFloat(p.total_sold).toFixed(2)}</strong>
                        </li>
                    `).join('') || '<li>No hay datos.</li>'}
                </ol>
            `;
            lowStockWidget.innerHTML = `
                <ul style="list-style: none; padding: 0;">
                    ${stats.low_stock_products.map(p => `
                         <li style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 0.3rem 0;">
                            <span>${p.nombre_producto}</span>
                            <strong style="color: #c0392b;">Stock: ${p.stock_actual} (Mín: ${p.stock_minimo})</strong>
                        </li>
                    `).join('') || '<li>No hay productos con bajo stock.</li>'}
                </ul>
            `;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        topProductsWidget.innerHTML = `<p style="color:red;">Error al cargar productos.</p>`;
        lowStockWidget.innerHTML = `<p style="color:red;">Error al cargar stock.</p>`;
    }
}

// ... (resto de las funciones del archivo)




/*****************************************************************/
/*****************************************************************/
async function fetchAndRenderUserSales() {
    const tableBody = document.getElementById('user-sales-tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="3">Cargando datos...</td></tr>';

    try {
        // Llama al endpoint 'admin/userSalesStats'
        const response = await fetch(`${API_BASE_URL}?resource=admin/userSalesStats`);
        const result = await response.json();

        tableBody.innerHTML = '';
        if (result.success && result.stats.length > 0) {
            result.stats.forEach(stat => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${stat.nombre_usuario}</td>
                    <td>$${parseFloat(stat.total_vendido).toFixed(2)}</td>
                    <td>${stat.numero_ventas}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="3">No se encontraron ventas para los usuarios en el rango de fechas.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Error al cargar las estadísticas de ventas.</td></tr>`;
    }
}

async function fetchAndRenderActivityLog() {
    const tableBody = document.getElementById('activity-log-tbody');
    const dateFilter = document.getElementById('activity-date-filter');
    if (!tableBody || !dateFilter) return;

    // Si el campo de fecha está vacío, establece la fecha de hoy.
    if (!dateFilter.value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Los meses son base 0
        const day = String(today.getDate()).padStart(2, '0');
        dateFilter.value = `${year}-${month}-${day}`;
    }
        
        const selectedDate = dateFilter.value;
        tableBody.innerHTML = '<tr><td colspan="4">Cargando registro de actividad...</td></tr>';

        try {
            // LA CORRECCIÓN CLAVE: Se añade el parámetro &date=${selectedDate} a la URL.
            const response = await fetch(`${API_BASE_URL}?resource=admin/activityLog&date=${selectedDate}`);
            const result = await response.json();

            tableBody.innerHTML = '';
            if (result.success && result.log.length > 0) {
                result.log.forEach(entry => {
                    const row = document.createElement('tr');
                    const entryDate = new Date(entry.fecha).toLocaleString('es-SV', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                    });
                    row.innerHTML = `
                        <td>${entryDate}</td>
                        <td>${entry.nombre_usuario}</td>
                        <td>${entry.tipo_accion}</td>
                        <td style="white-space: pre-wrap;">${entry.descripcion}</td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="4">No hay actividad para mostrar en la fecha seleccionada.</td></tr>';
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">Error al cargar el registro de actividad.</td></tr>`;
        }
    }


    /**************************************************************************************/





function initializeUserManagement() {
    fetchAndRenderUsers();

    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleUserFormSubmit);
        initializeLiveUserValidation();
    }
    
    // Listeners para los dos modales
    const permissionsModal = document.getElementById('permissions-modal');
    if (permissionsModal) {
        document.getElementById('manage-roles-btn').addEventListener('click', () => permissionsModal.style.display = 'flex');
        permissionsModal.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => permissionsModal.style.display = 'none'));
        permissionsModal.querySelector('#role-select').addEventListener('change', handleRoleSelectChange);
        permissionsModal.querySelector('#permissions-form').addEventListener('submit', handlePermissionsFormSubmit);
    }
    
    const editUserModal = document.getElementById('edit-user-modal');
    if(editUserModal) {
        editUserModal.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => editUserModal.style.display = 'none'));
        editUserModal.querySelector('#edit-user-form').addEventListener('submit', handleEditUserFormSubmit);
    }
}

function initializePermissionsManagement() {
    const permissionsModal = document.getElementById('permissions-manager-container');
    if (!permissionsModal) return;

    const roleSelect = permissionsModal.querySelector('#role-select');
    const permissionsForm = permissionsModal.querySelector('#permissions-form');

    if (roleSelect) {
        roleSelect.addEventListener('change', handleRoleSelectChange);
    }
    if (permissionsForm) {
        permissionsForm.addEventListener('submit', handlePermissionsFormSubmit);
    }
}


async function fetchAndRenderUsers() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getUsers`);
        const result = await response.json();
        tableBody.innerHTML = '';
        if (result.success && result.users.length > 0) {
            result.users.forEach(user => {
                const row = document.createElement('tr');
                row.dataset.userId = user.id_usuario;
                row.dataset.rol = user.rol;
                row.dataset.storeId = user.id_tienda;
                const displayRol = user.rol.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isActivo = user.estado.toLowerCase() === 'activo';
                let actionButtons = '';
                if (isActivo) {
                    actionButtons += `<button class="action-btn edit-user-btn" data-user-id="${user.id_usuario}" title="Editar Rol/Tienda">Editar</button>`;
                }
                if (user.nombre_usuario !== 'admin') {
                    if (isActivo) {
                        actionButtons += `<button class="action-btn delete-user-btn" data-user-id="${user.id_usuario}" title="Desactivar">Desactivar</button>`;
                    } else {
                        actionButtons = `<button class="action-btn reactivate-user-btn" data-user-id="${user.id_usuario}" title="Reactivar">Reactivar</button>`;
                    }
                }
                row.innerHTML = `
                    <td>${user.nombre_usuario}</td>
                    <td>${user.nombre_tienda || 'N/A'}</td>
                    <td>${displayRol}</td>
                    <td><span class="status-badge status-${user.estado.toLowerCase()}">${user.estado}</span></td>
                    <td><div class="action-buttons">${actionButtons}</div></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No hay empleados registrados.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar usuarios.</td></tr>';
    }
}











// Reemplaza la función handleUserFormSubmit en tu archivo admin.js
// Reemplaza esta función en: admin/js/admin.js

function initializeLiveUserValidation() {
    const usernameInput = document.getElementById('new_nombre_usuario');
    const form = usernameInput ? usernameInput.closest('form') : null;
    const feedbackDiv = document.getElementById('create-user-feedback');
    const submitButton = form ? form.querySelector('.form-submit-btn') : null;
    if (!usernameInput || !form || !feedbackDiv || !submitButton) return;
    let debounceTimer;
    usernameInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const username = usernameInput.value.trim();
        submitButton.disabled = true;
        if (username.length < 4) {
            feedbackDiv.innerHTML = ''; return;
        }
        debounceTimer = setTimeout(async () => {
            feedbackDiv.className = 'form-message';
            feedbackDiv.textContent = 'Verificando...';
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/check-username&username=${encodeURIComponent(username)}`);
                const result = await response.json();
                if (result.is_available) {
                    feedbackDiv.className = 'form-message success';
                    feedbackDiv.textContent = 'Nombre de usuario disponible.';
                    submitButton.disabled = false;
                } else {
                    feedbackDiv.className = 'form-message error';
                    feedbackDiv.textContent = 'Este nombre de usuario ya está en uso.';
                    submitButton.disabled = true;
                }
            } catch (error) {
                feedbackDiv.className = 'form-message error';
                feedbackDiv.textContent = 'Error al verificar el usuario.';
                submitButton.disabled = true;
            }
        }, 500);
    });
}



async function handleUserFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('create-user-feedback');
    const submitButton = form.querySelector('.form-submit-btn');
    const data = {
        nombre_usuario: form.querySelector('#new_nombre_usuario').value,
        password: form.querySelector('#new_password').value,
        rol: form.querySelector('#rol_usuario').value,
        id_tienda: form.querySelector('#id_tienda_usuario').value
    };
    submitButton.disabled = true;
    submitButton.textContent = 'Creando...';
    feedbackDiv.innerHTML = '';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/createUser`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
        form.reset();
        fetchAndRenderUsers();
        setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);
    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Crear Empleado';
    }
}

function openEditUserModal(userId, username, currentRol, currentStoreId) {
    const modal = document.getElementById('edit-user-modal');
    if (!modal) return;
    document.getElementById('edit-user-modal-title').textContent = `Editar Empleado: ${username}`;
    document.getElementById('edit-user-id-input').value = userId;
    document.getElementById('edit_rol_usuario').value = currentRol;
    document.getElementById('edit_id_tienda_usuario').value = currentStoreId;
    modal.style.display = 'flex';
}

async function handleEditUserFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('edit-user-modal-feedback');
    const submitButton = form.querySelector('button[type="submit"]');
    const data = {
        id_usuario: form.querySelector('#edit-user-id-input').value,
        rol: form.querySelector('#edit_rol_usuario').value,
        id_tienda: form.querySelector('#edit_id_tienda_usuario').value,
    };
    submitButton.disabled = true;
    feedbackDiv.innerHTML = '';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateUserRole`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
        setTimeout(() => {
            document.getElementById('edit-user-modal').style.display = 'none';
            fetchAndRenderUsers();
        }, 1200);
    } catch(error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
    }
}

// --- NUEVA --- (Para cargar permisos cuando se elige un rol en el modal)
async function handleRoleSelectChange(event) {
    const roleName = event.target.value;
    const container = document.getElementById('permissions-checkbox-container');
    const allModules = ['dashboard', 'tiendas', 'proveedores', 'pos', 'listas_compras', 'productos', 'departamentos', 'clientes', 'usuarios', 'tarjetas', 'inventario', 'estadisticas', 'web_admin', 'utilidades'];
    container.innerHTML = '';
    if (!roleName) return;
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getRolePermissions&rol=${roleName}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        const permissions = result.permissions;
container.innerHTML = allModules.map(module => {
    const label = module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const isChecked = permissions[module] ? 'checked' : '';
    // --- INICIO DE LA CORRECCIÓN ---
    // Se cambia el orden: primero el input y luego el label.
    // Se elimina la clase "switch" para usar el checkbox nativo.
    return `
        <div class="form-group setting-toggle">
            <label for="perm-${module}">${label}</label>
            <input type="checkbox" id="perm-${module}" name="permisos[${module}]" ${isChecked}>
        </div>`;
    // --- FIN DE LA CORRECCIÓN ---
}).join('');
    } catch (error) {
        container.innerHTML = `<p style="color:red">${error.message}</p>`;
    }
}



function renderPermissionsModal(userId, username, permissions, currentRol) {
    const modal = document.getElementById('permissions-modal');
    if (!modal) return;
    
    document.getElementById('permissions-modal-title').textContent = `Permisos para: ${username}`;
    document.getElementById('edit-user-id').value = userId;

    const container = document.getElementById('permissions-checkbox-container');
    const modalBody = modal.querySelector('.modal-body');

    const modules = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'tiendas', label: 'Gestión de Tiendas' },
        { id: 'proveedores', label: 'Proveedores' },
        { id: 'pos', label: 'Punto de Venta' },
        { id: 'listas_compras', label: 'Listas de Compras' },
        { id: 'productos', label: 'Productos' },
        { id: 'departamentos', label: 'Departamentos' },
        { id: 'clientes', label: 'Clientes' },
        { id: 'usuarios', label: 'Gestión de Usuarios' },
        { id: 'tarjetas', label: 'Tarjetas' },
        { id: 'inventario', label: 'Inventario' },
        { id: 'estadisticas', label: 'Estadísticas' },
        { id: 'web_admin', label: 'Web Admin' },
        { id: 'utilidades', label: 'Utilidades' }
    ];

    const isSuperAdmin = username === 'admin';
    const disabledAttribute = isSuperAdmin ? 'disabled' : '';
    const helpText = isSuperAdmin ? '<small>El rol del administrador principal no puede ser modificado.</small>' : '';

    // --- INICIO DE LA CORRECCIÓN CLAVE ---
    // 1. Se define la lista de roles SIN 'administrador_global'.
    const roles = [
        { value: 'cajero', text: 'Cajero (POS)' },
        { value: 'bodeguero', text: 'Bodeguero (Inventario)' },
        { value: 'admin_tienda', text: 'Admin de Tienda' },
        { value: 'empleado', text: 'Empleado (Personalizado)' }
    ];
    // --- FIN DE LA CORRECCIÓN CLAVE ---

    // 2. Se genera el HTML para las opciones del select dinámicamente.
    let rolOptionsHtml = roles.map(rol => 
        `<option value="${rol.value}" ${currentRol === rol.value ? 'selected' : ''}>${rol.text}</option>`
    ).join('');

    const rolSelectorHtml = `
        <div class="form-group" id="rol-selector-container" style="border-top: 1px solid #dee2e6; padding-top: 1rem; margin-top: 1rem;">
            <label for="edit-rol-usuario">Rol del Usuario</label>
            <select id="edit-rol-usuario" name="rol" ${disabledAttribute}>
                ${rolOptionsHtml}
            </select>
            ${helpText}
        </div>
    `;

    // Se renderizan los checkboxes de permisos.
    container.innerHTML = modules.map(module => `
        <div class="form-group setting-toggle" style="justify-content: flex-start;">
            <label for="perm-${module.id}">${module.label}</label>
            <input type="checkbox" id="perm-${module.id}" name="permisos[${module.id}]" class="switch" ${permissions[module.id] ? 'checked' : ''}>
        </div>
    `).join('');

    // Se asegura de reemplazar el selector de rol si ya existía, en lugar de duplicarlo.
    const oldRolSelector = modalBody.querySelector('#rol-selector-container');
    if (oldRolSelector) {
        oldRolSelector.remove();
    }
    
    modalBody.insertAdjacentHTML('beforeend', rolSelectorHtml);

    modal.style.display = 'flex';
}






function closePermissionsModal() {
    const modal = document.getElementById('permissions-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // ✨ CORRECCIÓN: Se limpia el mensaje al cerrar el modal.
        const feedbackDiv = document.getElementById('permissions-modal-feedback');
        if (feedbackDiv) {
            feedbackDiv.innerHTML = '';
        }
    }
}


async function handlePermissionsFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('permissions-modal-feedback');
    const submitButton = form.querySelector('button[type="submit"]');
    const roleName = form.querySelector('#role-select').value;
    if (!roleName) {
        feedbackDiv.innerHTML = `<div class="message error">Debes seleccionar un rol.</div>`;
        return;
    }
    const permissions = {};
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const key = cb.name.match(/\[(.*?)\]/)[1];
        permissions[key] = cb.checked;
    });
    const data = { nombre_rol: roleName, permisos: permissions };
    submitButton.disabled = true;
    feedbackDiv.innerHTML = '';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateRolePermissions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
        setTimeout(() => {
             feedbackDiv.innerHTML = ``;
        }, 2000);
    } catch(error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
    }
}


mainContent.addEventListener('click', (event) => {
    if (event.target.classList.contains('edit-permissions-btn')) {
        const row = event.target.closest('tr');
        const userId = row.dataset.userId;
        const username = row.querySelector('td:first-child').textContent;
        const permissions = JSON.parse(row.dataset.permissions);
        renderPermissionsModal(userId, username, permissions);

        const currentRol = row.dataset.rol; // <--- Se obtiene el rol de la fila
        renderPermissionsModal(userId, username, permissions, currentRol); // <--- Se pasa a la función
     
    }
    if (event.target.classList.contains('delete-user-btn')) {
        const row = event.target.closest('tr');
        const userId = row.dataset.userId;
        const username = row.querySelector('td:first-child').textContent;
        if (confirm(`¿Estás seguro de que quieres dar de baja al usuario "${username}"? (Se podra dar de alta en un futuro).`)) {
            deleteUser(userId);
        }
    }
});











async function deleteUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteUser`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: userId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // Mensaje de confirmación
        alert('Usuario dado de baja correctamente.');

        // --- LA CORRECCIÓN CLAVE ---
        // En lugar de quitar la fila, recargamos toda la tabla para
        // que se actualice y muestre el nuevo estado del usuario.
        fetchAndRenderUsers();

    } catch (error) {
        alert(`Error al dar de baja al usuario: ${error.message}`);
    }
}
// En admin/js/admin.js, puedes agregarlas al final del archivo

function initializeWebOrderManagement() {
    fetchAndRenderWebOrders();

    // Event listeners para los nuevos filtros
    const searchInput = document.getElementById('web-order-search-input');
    const dateFilters = document.querySelectorAll('.web-order-filter');
    let searchTimeout;

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchAndRenderWebOrders();
            }, 300); // Espera 300ms antes de buscar
        });
    }

    if (dateFilters) {
        dateFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                fetchAndRenderWebOrders();
            });
        });
    }
}


async function fetchAndRenderWebOrders() {
    const tableBody = document.getElementById('web-orders-tbody');
    if (!tableBody) return;

    // Obtener valores de los filtros
    const searchTerm = document.getElementById('web-order-search-input')?.value || '';
    const startDate = document.getElementById('start-date-filter-web')?.value || '';
    const endDate = document.getElementById('end-date-filter-web')?.value || '';

    tableBody.innerHTML = '<tr><td colspan="6">Cargando pedidos...</td></tr>';

    try {
        const params = new URLSearchParams({
            search: searchTerm,
            startDate: startDate,
            endDate: endDate
        });
        const response = await fetch(`${API_BASE_URL}?resource=admin/getWebOrders&${params.toString()}`);
        const result = await response.json();

        tableBody.innerHTML = '';
        if (result.success && result.orders.length > 0) {
            result.orders.forEach(order => {
                const row = document.createElement('tr');
                let actionsHtml = '';
                const orderStatus = order.nombre_estado;

                if (orderStatus === 'En Proceso') {
                    actionsHtml = `
                        <button class="action-btn btn-sm update-order-status-btn" data-cart-id="${order.id_carrito}" data-new-status-id="10" style="background-color: #28a745;">Finalizar</button>
                        <button class="action-btn btn-sm update-order-status-btn" data-cart-id="${order.id_carrito}" data-new-status-id="11" style="background-color: #dc3545;">Cancelar</button>
                    `;
                } else if (orderStatus === 'Entregado' || orderStatus === 'Cancelado') {
                    actionsHtml = `<button class="action-btn btn-sm update-order-status-btn" data-cart-id="${order.id_carrito}" data-new-status-id="8" style="background-color: #ffc107; color: black;">Revertir a En Proceso</button>`;
                }

                row.innerHTML = `
                    <td>${order.numero_orden_cliente || order.id_carrito}</td>
                    <td>${order.nombre_usuario}</td>
                    <td>${new Date(order.fecha_creacion).toLocaleString('es-SV')}</td>
                    <td>$${parseFloat(order.total).toFixed(2)}</td>
                    <td><span class="status-badge">${orderStatus}</span></td>
                    <td>${actionsHtml}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6">No hay pedidos web para los filtros seleccionados.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar los pedidos web.</td></tr>`;
    }
}










/**********************************************************************************/






// --- INICIO: MÓDULO LISTAS DE COMPRAS ---











async function loadAndRenderListView(listId) {
    const actionContent = document.getElementById('action-content');
    const itemsTbody = actionContent.querySelector('#list-items-tbody');
    
    const existingItemIds = new Set();
    if (itemsTbody) {
        itemsTbody.querySelectorAll('tr').forEach(row => {
            if (row.dataset.itemId) {
                existingItemIds.add(row.dataset.itemId);
            }
        });
    }

    try {
        if (!actionContent.querySelector('#view-list-container')) {
            const response = await fetch(`actions/listas_compras/ver_lista.php`);
            actionContent.innerHTML = await response.text();
        }

        const detailsResponse = await fetch(`${API_BASE_URL}?resource=admin/getShoppingListDetails&id_lista=${listId}`);
        const detailsResult = await detailsResponse.json();

        if (detailsResult.success) {
            document.getElementById('list-name-header').textContent = `Editando Lista: ${detailsResult.listName}`;
            renderListItems(detailsResult.items, existingItemIds);
            initializeListViewInteractions(listId);
        } else {
            throw new Error(detailsResult.error);
        }
    } catch (error) {
        actionContent.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
}




function renderListItems(items) {
    const tbody = document.getElementById('list-items-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('tr');
        row.dataset.itemId = item.id_item_lista;
        
        row.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="mark-item-checkbox" ${parseInt(item.marcado, 10) === 1 ? 'checked' : ''}>
            </td>
            <td>${item.nombre_producto}</td>
            <td><input type="number" class="editable-field" data-field="precio_compra" value="${parseFloat(item.precio_compra).toFixed(2)}" step="0.01">$</td>
            <td><input type="number" class="editable-field" data-field="cantidad" value="${item.cantidad}" min="1"></td>
            <td><button class="action-btn btn-sm btn-danger remove-item-btn">&times;</button></td>
        `;
        tbody.appendChild(row);
    });
}
// Reemplaza también esta función completa en tu archivo admin.js


// REEMPLAZA esta función completa en tu archivo admin.js

function initializeListViewInteractions(listId) {
    const searchInput = document.getElementById('product-search-for-list');
    const searchResults = document.getElementById('product-search-results-list');
    const manualForm = document.getElementById('manual-add-product-form');
    const itemsTbody = document.getElementById('list-items-tbody');
    let searchTimer;

    // Búsqueda de productos
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const query = searchInput.value.trim();
        if (query.length < 2) { searchResults.style.display = 'none'; return; }
        
        searchTimer = setTimeout(async () => {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getProducts&search=${encodeURIComponent(query)}`);
            const result = await response.json();
            searchResults.innerHTML = '';
            if (result.success && result.products.length > 0) {
                searchResults.style.display = 'block';
                result.products.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'search-result-item';
                    div.innerHTML = `<span>${p.nombre_producto}</span> <strong>Stock: ${p.stock_actual || 0}</strong>`;
                    div.addEventListener('click', async () => {
                        await addProductToList(listId, p.id_producto);
                        searchInput.value = '';
                        searchResults.style.display = 'none';
                    });
                    searchResults.appendChild(div);
                });
            } else {
                searchResults.style.display = 'none';
            }
        }, 300);
    });

    // Añadir producto manualmente
    manualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const feedbackDiv = document.getElementById('manual-add-feedback');
        const data = {
            id_lista: listId,
            nombre_producto: document.getElementById('manual_product_name').value,
            precio_compra: document.getElementById('manual_purchase_price').value,
            cantidad: 1
        };
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/addManualProductToList`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            manualForm.reset();
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            await loadAndRenderListView(listId);
            setTimeout(() => { feedbackDiv.innerHTML = '' }, 2500);
        } catch (error) {
            feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
        }
    });

    // *** INICIO DE LA CORRECCIÓN CLAVE ***
    // Eventos de la tabla (editar campos y marcar/desmarcar)
    itemsTbody.addEventListener('change', async (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;
        const itemId = row.dataset.itemId;
        
        // Si se cambia un campo de texto/número
        if (target.classList.contains('editable-field')) {
            const field = target.dataset.field;
            const value = target.value;
            await updateListItem(itemId, field, value);
        } 
        // Si se hace clic en el checkbox de tachar
        else if (target.classList.contains('mark-item-checkbox')) {
            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/toggleListItemMark`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_item_lista: itemId })
                });
                const result = await response.json();
                if (result.success) {
                    // Aplica o quita la clase 'item-marked' según la respuesta de la API
                    row.classList.toggle('item-marked', result.newState);
                }
            } catch (error) {
                console.error('Error al marcar el item:', error);
                target.checked = !target.checked; // Revierte el checkbox si hay un error
            }
        }
    });
    // *** FIN DE LA CORRECCIÓN CLAVE ***
    
    // Eliminar item de la lista
    itemsTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const row = e.target.closest('tr');
            const itemId = row.dataset.itemId;
            await removeProductFromList(itemId, row);
        }
    });
    
    // Ocultar resultados de búsqueda si se hace clic fuera
    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });
    
    // Botones de la cabecera
    const headerActions = document.querySelector('.header-actions');
    headerActions.addEventListener('click', async (e) => {
        if (e.target.id === 'save-and-exit-btn') {
            document.querySelector('.action-btn[data-action="listas_compras/gestion"]').click();
        } else if (e.target.id === 'copy-list-btn') {
            await copyShoppingList(listId);
        }
    });
}



async function addProductToList(listId, productId) {
    await fetch(`${API_BASE_URL}?resource=admin/addProductToList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_lista: listId, id_producto: productId })
    });
    loadAndRenderListView(listId);
}

async function updateListItem(itemId, field, value) {
    await fetch(`${API_BASE_URL}?resource=admin/updateListItem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_item_lista: itemId, field: field, value: value })
    });
    // No es necesario recargar toda la lista para este cambio
}

async function removeProductFromList(itemId) {
    await fetch(`${API_BASE_URL}?resource=admin/removeProductFromList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_item_lista: itemId })
    });
    document.querySelector(`tr[data-item-id="${itemId}"]`).remove();
}

async function copyShoppingList(listId) {
    if (!confirm('¿Seguro que quieres copiar esta lista? Se creará una nueva lista para hoy con los mismos productos.')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/copyShoppingList`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_lista: listId })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            fetchAndRenderShoppingLists(document.getElementById('list-date-filter').value);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert(`Error al copiar: ${error.message}`);
    }
}



// --- FIN: MÓDULO LISTAS DE COMPRAS ---
/**********************************************************************************/













function initializeTiendaManagement() {
    fetchAndRenderTiendas();

    const createForm = document.getElementById('create-tienda-form');
    if (createForm) {
        createForm.addEventListener('submit', handleTiendaFormSubmit);
    }
}

async function fetchAndRenderTiendas() {
    const tableBody = document.getElementById('tiendas-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4">Cargando tiendas...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getTiendas`);
        const result = await response.json();

        tableBody.innerHTML = '';
        if (result.success && result.tiendas.length > 0) {
            result.tiendas.forEach(tienda => {
                const row = document.createElement('tr');
                row.dataset.tiendaId = tienda.id_tienda;
                row.innerHTML = `
                    <td class="editable" data-field="nombre_tienda">${tienda.nombre_tienda}</td>
                    <td class="editable" data-field="direccion">${tienda.direccion || ''}</td>
                    <td class="editable" data-field="telefono">${tienda.telefono || ''}</td>
                    <td>
                        <button class="action-btn delete-tienda-btn" style="background-color: #f8d7da;">Eliminar</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No hay tiendas registradas.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">Error al cargar tiendas.</td></tr>`;
    }
}

async function handleTiendaFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('create-tienda-feedback');
    const submitButton = form.querySelector('.form-submit-btn');

    const data = {
        nombre_tienda: form.querySelector('#nombre_tienda').value,
        direccion: form.querySelector('#direccion_tienda').value,
        telefono: form.querySelector('#telefono_tienda').value,
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Creando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/createTienda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
        form.reset();
        fetchAndRenderTiendas(); // Recargar la lista
        setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);

    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Crear Tienda';
    }
}

async function deleteTienda(tiendaId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteTienda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_tienda: tiendaId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        document.querySelector(`tr[data-tienda-id="${tiendaId}"]`).remove();
        alert('Tienda eliminada.');

    } catch (error) {
        alert(`Error al eliminar: ${error.message}`);
    }
}

async function saveTiendaFieldUpdate(tiendaId, field, value, cell) {
    const originalText = cell.textContent;
    cell.textContent = 'Guardando...';
    
    // Obtenemos todos los datos de la fila para enviarlos juntos
    const row = cell.closest('tr');
    const dataToSend = {
        id_tienda: tiendaId,
        nombre_tienda: row.querySelector('[data-field="nombre_tienda"]').textContent,
        direccion: row.querySelector('[data-field="direccion"]').textContent,
        telefono: row.querySelector('[data-field="telefono"]').textContent
    };
    // Actualizamos el valor que acaba de cambiar
    dataToSend[field] = value;

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateTienda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        cell.textContent = value;
    } catch (error) {
        console.error('Error al guardar:', error);
        cell.textContent = originalText;
        alert("Error al guardar el cambio.");
    }
}






/******************************************************************/
// EN: admin/js/admin.js -> AÑADIR AL FINAL DEL ARCHIVO

// --- INICIO: LÓGICA PARA PROVEEDORES ---

function initializeProveedorManagement() {
    fetchAndRenderProveedores();
    const createForm = document.getElementById('create-proveedor-form');
    if (createForm) {
        createForm.addEventListener('submit', handleProveedorFormSubmit);
    }
}

async function fetchAndRenderProveedores() {
    const tableBody = document.getElementById('proveedores-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5">Cargando proveedores...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getProveedores`);
        const result = await response.json();
        tableBody.innerHTML = '';
        if (result.success && result.proveedores.length > 0) {
            result.proveedores.forEach(proveedor => {
                const row = document.createElement('tr');
                row.dataset.proveedorId = proveedor.id_proveedor;
                row.innerHTML = `
                    <td>${proveedor.codigo_proveedor}</td>
                    <td class="editable" data-field="nombre_proveedor">${proveedor.nombre_proveedor}</td>
                    <td class="editable" data-field="telefono">${proveedor.telefono || ''}</td>
                    <td class="editable" data-field="direccion">${proveedor.direccion || ''}</td>
                    <td>
                        <button class="action-btn delete-proveedor-btn" style="background-color: #f8d7da;">Eliminar</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No hay proveedores registrados.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="5" style="color:red;">Error al cargar proveedores.</td></tr>`;
    }
}

async function handleProveedorFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('create-proveedor-feedback');
    const submitButton = form.querySelector('.form-submit-btn');

    const data = {
        codigo_proveedor: form.querySelector('#codigo_proveedor').value,
        nombre_proveedor: form.querySelector('#nombre_proveedor').value,
        telefono: form.querySelector('#telefono_proveedor').value,
        direccion: form.querySelector('#direccion_proveedor').value,
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Creando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/createProveedor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
        form.reset();
        fetchAndRenderProveedores();
        setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);

    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Crear Proveedor';
    }
}

async function deleteProveedor(proveedorId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteProveedor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_proveedor: proveedorId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        document.querySelector(`tr[data-proveedor-id="${proveedorId}"]`).remove();
        alert('Proveedor eliminado.');

    } catch (error) {
        alert(`Error al eliminar: ${error.message}`);
    }
}

async function saveProveedorFieldUpdate(proveedorId, field, value, cell) {
    const originalText = cell.textContent;
    cell.textContent = 'Guardando...';
    
    const row = cell.closest('tr');
    const dataToSend = {
        id_proveedor: proveedorId,
        nombre_proveedor: row.querySelector('[data-field="nombre_proveedor"]').textContent,
        telefono: row.querySelector('[data-field="telefono"]').textContent,
        direccion: row.querySelector('[data-field="direccion"]').textContent
    };
    dataToSend[field] = value;

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateProveedor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        cell.textContent = value;
    } catch (error) {
        console.error('Error al guardar:', error);
        cell.textContent = originalText;
        alert("Error al guardar el cambio.");
    }
}

// --- FIN: LÓGICA PARA PROVEEDORES ---

async function reactivateUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/reactivateUser`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: userId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        alert('Usuario reactivado.');
        fetchAndRenderUsers(); // Recargamos la tabla para que se actualice

    } catch (error) {
        alert(`Error al reactivar: ${error.message}`);
    }
}


function initializeBarcodeGenerator() {
    const form = document.getElementById('generate-barcodes-form');
    const feedbackDiv = document.getElementById('generator-feedback');
    const resultsContainer = document.getElementById('results-container');
    const outputTextarea = document.getElementById('generated-codes-output');
    const copyBtn = document.getElementById('copy-codes-btn');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('.form-submit-btn');
        const quantity = document.getElementById('quantity').value;

        submitButton.disabled = true;
        submitButton.textContent = 'Generando...';
        feedbackDiv.innerHTML = '';
        resultsContainer.style.display = 'none';
        outputTextarea.value = '';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/generateEan13Codes&quantity=${quantity}`);
            const result = await response.json();

            if (result.success && result.codes) {
                outputTextarea.value = result.codes.join('\n');
                resultsContainer.style.display = 'block';
                feedbackDiv.innerHTML = `<div class="message success">¡Se generaron ${result.codes.length} códigos con éxito!</div>`;
            } else {
                throw new Error(result.error || 'No se pudieron generar los códigos.');
            }
        } catch (error) {
            feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Generar Códigos';
        }
    });

    copyBtn.addEventListener('click', () => {
        outputTextarea.select();
        document.execCommand('copy');
        feedbackDiv.innerHTML = `<div class="message success">Códigos copiados al portapapeles.</div>`;
        setTimeout(() => { feedbackDiv.innerHTML = ''; }, 2000);
    });
}

});

