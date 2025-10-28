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

    let imageTargetInputId = null;
    const galleryCache = {
        images: [], // Almacenará todas las imágenes cargadas
        hasMore: true, // Recordará si quedan más imágenes por cargar
        page: 1, // Recordará la página siguiente a cargar
        searchTerm: '' // Guardará el último término de búsqueda
    };
    let isLoadingGallery = false;
    const bucketCache = { images: [], 
        page: 1, 
        hasMore: true, 
        isLoading: false 
    };
    window.bucketCache = bucketCache; // <-- Hacemos la caché accesible globalmente

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



/**
 * Aplica capitalización automática (primera letra de cada palabra) a un campo de texto.
 * @param {string} inputId El ID del elemento input al que se aplicará la capitalización.
 */
     function applyCapitalization(inputId) {
    const inputElement = document.getElementById(inputId);
    if (inputElement && inputElement.tagName === 'INPUT') {
        inputElement.addEventListener('input', () => {
            const start = inputElement.selectionStart; // Guarda posición del cursor
            const end = inputElement.selectionEnd;
            let value = inputElement.value;
            // Capitaliza la primera letra de cada palabra
            value = value.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
            inputElement.value = value;
            inputElement.setSelectionRange(start, end); // Restaura posición del cursor
        });
        console.log(`Capitalización aplicada a #${inputId}`); // Mensaje de confirmación
    } else {
        console.warn(`No se encontró el input con id #${inputId} o no es un elemento INPUT.`);
    }
}



// --- LÓGICA PARA MODAL DE CAMBIO DE PRECIO ---

    const priceModal = document.getElementById('price-modal');

    function openPriceModal() {
        if (!priceModal) return;
        priceModal.style.display = 'flex';
    }

    function closePriceModal() {
        if (!priceModal) return;
        priceModal.style.display = 'none';
        document.getElementById('modal-price-error-message').textContent = '';
        document.getElementById('modal-new-price').value = '';
    }

    if (priceModal) {
        priceModal.addEventListener('click', async (event) => {
            if (event.target.matches('.modal-close-btn, #modal-price-cancel-btn')) {
                closePriceModal();
            }
            if (event.target.id === 'modal-price-confirm-btn') {
                const newPrice = document.getElementById('modal-new-price').value;
                const errorDiv = document.getElementById('modal-price-error-message');

                if (newPrice === '' || isNaN(newPrice) || parseFloat(newPrice) < 0) {
                    errorDiv.textContent = 'Por favor, ingresa un precio válido.';
                    return;
                }

                const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);
                
                event.target.textContent = 'Guardando...';
                event.target.disabled = true;

                try {
                    const response = await fetch(`${API_BASE_URL}?resource=admin/changePriceMassive`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            productIds,
                            newPrice: parseFloat(newPrice)
                        })
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error);
                    
                    alert(result.message);
                    closePriceModal();
                    currentFilters.page = 1; // Resetea para ver los cambios
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

// AÑADE este bloque dentro del listener de 'click' en mainContent en admin/js/admin.js



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








// EN: admin/js/admin.js (REEMPLAZA ESTA FUNCIÓN)

async function renderOfferForm(product) {
    const container = document.getElementById('offer-form-container');
    container.classList.remove('hidden');

    // --- INICIO DE LA LÓGICA MEJORADA ---
    let tipoClienteOptions = '<option value="">Para todos los clientes</option>';
    try {
        // 1. Llama a la nueva API para obtener los tipos de cliente
        const response = await fetch(`${API_BASE_URL}?resource=admin/getCustomerTypes`);
        const result = await response.json();

        if (result.success && result.customer_types) {
            // 2. Construye las opciones del <select> con los datos recibidos
            result.customer_types.forEach(tipo => {
                const isSelected = product.oferta_tipo_cliente_id == tipo.id_tipo ? 'selected' : '';
                tipoClienteOptions += `<option value="${tipo.id_tipo}" ${isSelected}>Solo para ${tipo.nombre_tipo}</option>`;
            });
        }
    } catch (error) {
        console.error("Error al cargar tipos de cliente:", error);
        tipoClienteOptions += '<option value="">Error al cargar tipos</option>';
    }
    // --- FIN DE LA LÓGICA MEJORADA ---

    // El resto de la función para generar el HTML del formulario permanece casi igual
    const currentOfferPrice = parseFloat(product.precio_oferta || 0).toFixed(2);
    const isExclusive = parseInt(product.oferta_exclusiva, 10) === 1;
    let expiryDateValue = '';
    if (product.oferta_caducidad) {
        expiryDateValue = product.oferta_caducidad.slice(0, 16).replace(' ', 'T');
    }

    container.innerHTML = `
        <h4>Oferta para: ${product.nombre_producto}</h4>
        <p><strong>Precio de Venta Actual:</strong> $${parseFloat(product.precio_venta).toFixed(2)}</p>
        
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

            <div class="form-group">
                <label for="oferta_tipo_cliente_id">Exclusiva para Tipo de Cliente</label>
                <select id="oferta_tipo_cliente_id" name="oferta_tipo_cliente_id">
                    ${tipoClienteOptions}
                </select>
            </div>

            <div id="offer-feedback" class="form-message" style="margin-top: 1rem;"></div>

            <div class="form-navigation" style="justify-content: center; gap: 1rem;">
                <button type="submit" id="save-offer-btn" class="action-btn form-submit-btn">Guardar Oferta</button>
                <button type="button" id="remove-offer-btn" class="action-btn" style="background-color: #f8d7da;">Quitar Oferta</button>
            </div>
        </form>
    `;

    document.getElementById('offer-form').addEventListener('submit', handleOfferSave);
    document.getElementById('remove-offer-btn').addEventListener('click', handleOfferRemove);
}



// EN: admin/js/admin.js (REEMPLAZA ESTA FUNCIÓN)
async function handleOfferSave(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('offer-feedback');
    const submitButton = form.querySelector('#save-offer-btn');

    const data = {
        product_id: parseInt(form.querySelector('input[name="product_id"]').value, 10),
        precio_oferta: parseFloat(form.querySelector('#precio_oferta').value) || 0,
        oferta_exclusiva: form.querySelector('#oferta_exclusiva').checked,
        oferta_caducidad: form.querySelector('#oferta_caducidad').value,
        // --- INICIO DE LA MODIFICACIÓN ---
        oferta_tipo_cliente_id: form.querySelector('#oferta_tipo_cliente_id').value // Se añade el nuevo campo
        // --- FIN DE LA MODIFICACIÓN ---
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
    applyCapitalization('nombre');      
    applyCapitalization('apellido');    
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

// REEMPLAZA esta función completa en admin/js/admin.js



    function updateProcessorButtons() {
        const checkedBoxes = document.querySelectorAll('.processed-file-checkbox:checked').length;
        const uploadBtn = document.getElementById('upload-to-gallery-btn');
        const downloadBtn = document.getElementById('download-zip-btn');

        if (uploadBtn) uploadBtn.disabled = checkedBoxes === 0;
        if (downloadBtn) downloadBtn.disabled = checkedBoxes === 0;
    }

    // --- MANEJADORES DE EVENTOS EXISTENTES (MODIFICADOS) ---






async function fetchAndRenderProducts() {
    if (isLoading || currentFilters.page === -1) return;
    isLoading = true;

    // --- MODIFICACIÓN: Usa el DIV contenedor directamente ---
    const productContainer = document.getElementById('product-list-container');
    // Mantenemos la referencia al tbody por compatibilidad, pero en móvil usaremos el container
    const tableBody = document.getElementById('product-table-body');
    let loadingIndicator = document.getElementById('loading-indicator'); // Usa let para poder reasignar
    const showImagesCheckbox = document.getElementById('toggle-product-images');
    const showImages = showImagesCheckbox ? showImagesCheckbox.checked : true; // Default true para móvil

    const isMobile = window.innerWidth <= 768;

    // --- MODIFICACIÓN: Selecciona el contenedor correcto ---
    // En móvil, añadimos directamente a productContainer, antes del loadingIndicator
    // En escritorio, añadimos a tableBody
    const targetContainer = isMobile ? productContainer : tableBody;

    if (!productContainer || !tableBody || !loadingIndicator) { // Verifica los 3 elementos clave
        isLoading = false;
        console.error("Error: Contenedor de productos, tbody o indicador de carga no encontrado.");
        return;
    }

    // Ocultar/Mostrar la tabla real en desktop/mobile
    const productTable = productContainer.querySelector('.product-table');
    if (productTable) {
        productTable.style.display = isMobile ? 'none' : ''; // Oculta tabla en móvil, muestra en desktop
    }

    // --- MODIFICACIÓN: Limpia el contenedor correcto ---
    if (currentFilters.page === 1) {
        if (isMobile) {
            // En móvil, vaciamos el contenedor principal EXCEPTO la tabla oculta y el loading
             // Selecciona todos los hijos excepto la tabla y el indicador de carga
            Array.from(productContainer.children).forEach(child => {
                // Asegúrate de que la tabla y el loading no se eliminen
                if (!child.classList.contains('product-table') && child.id !== 'loading-indicator') {
                    productContainer.removeChild(child);
                }
            });
             // Asegura que el loading indicator exista si fue borrado accidentalmente
            if (!document.getElementById('loading-indicator')) {
                const newLoadingIndicator = document.createElement('div');
                newLoadingIndicator.id = 'loading-indicator';
                newLoadingIndicator.style.cssText = 'display: none; text-align: center; padding: 1rem;';
                newLoadingIndicator.textContent = 'Cargando más productos...';
                productContainer.appendChild(newLoadingIndicator);
                loadingIndicator = newLoadingIndicator; // Reasigna la referencia
            }
        } else {
             tableBody.innerHTML = ''; // Limpia solo el tbody en desktop
        }
    }


    // Mostrar/ocultar columnas de imagen solo en desktop
    if (!isMobile) {
        document.querySelectorAll('.product-image-col').forEach(col => {
            col.style.display = showImages ? '' : 'none';
        });
    }

    const skeletonRowCount = 10;
    // Skeleton loader adaptativo
    if (currentFilters.page === 1) { // Mostrar skeleton solo en la primera carga
        if (isMobile) {
            // Para móvil: skeleton como cards
            const skeletonCardHtml = `
                <div class="product-card skeleton-loader">
                    <div class="skeleton-pulse"></div>
                </div>
            `;
            for (let i = 0; i < skeletonRowCount; i++) {
                // Insertar antes del loading indicator
                loadingIndicator.insertAdjacentHTML('beforebegin', skeletonCardHtml);
            }
        } else {
             // Para desktop: skeleton como tabla (tu código original)
            const skeletonColCount = showImages ? 14 : 13;
            const skeletonRowHtml = `
                <tr class="skeleton-loader">
                    <td colspan="${skeletonColCount}" style="padding: 0; border: none;"><div class="skeleton-pulse"></div></td>
                </tr>
            `;
            for (let i = 0; i < skeletonRowCount; i++) {
                tableBody.insertAdjacentHTML('beforeend', skeletonRowHtml);
            }
        }
    }

    loadingIndicator.style.display = 'block';

    const { search, department, store, sort, page } = currentFilters;
    const apiUrl = `${API_BASE_URL}?resource=admin/getProducts&search=${encodeURIComponent(search)}&department=${department}&store=${store}&sort_by=${sort.by}&order=${sort.order}&page=${page}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);
        const data = await response.json();

        // Eliminar Skeletons
        productContainer.querySelectorAll('.skeleton-loader').forEach(s => s.remove());

        if (data.success && data.products.length > 0) {
            data.products.forEach(product => {
                const statusClass = (product.nombre_estado || '').toLowerCase() === 'activo' ? 'status-active' : 'status-inactive';
                const usaInventarioText = product.usa_inventario == 1 ? 'Sí' : 'No';
                const stockMinimo = parseInt(product.stock_minimo, 10);
                const stockActual = parseInt(product.stock_actual, 10);
                const stockClass = (product.usa_inventario == 1 && !isNaN(stockMinimo) && stockMinimo > 0 && stockActual < stockMinimo) ? 'stock-low' : '';
                const imageUrl = (product.url_imagen && product.url_imagen !== '0') ? product.url_imagen : 'img/favicon.png';

                if (isMobile) {
                    // --- RENDERIZADO PARA MÓVIL (DIVs) ---
                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.dataset.productId = product.id_producto;
                    card.dataset.status = (product.nombre_estado || '').toLowerCase();

                    // Construcción del HTML interno de la tarjeta
                    card.innerHTML = `
                        <div class="product-card-checkbox">
                            <input type="checkbox" class="product-checkbox">
                        </div>
                        ${showImages ? `
                        <div class="product-card-image">
                            <img src="${imageUrl}" alt="${product.nombre_producto}" loading="lazy">
                        </div>
                        ` : ''}
                        <div class="product-card-code">${product.codigo_producto}</div>
                        <div class="product-card-name editable" data-field="nombre_producto">${product.nombre_producto}</div>
                        <div class="product-card-details">
                            <span data-field="nombre_departamento">D: ${product.nombre_departamento || 'N/A'}</span> |
                            <span data-field="id_marca">M: ${product.nombre_marca || 'N/A'}</span>
                        </div>
                        <div class="product-card-tags" data-field="id_etiqueta">${product.todas_las_etiquetas || ''}</div>
                        <div class="product-card-price editable" data-field="precio_venta">$${parseFloat(product.precio_venta).toFixed(2)}</div>
                        <div class="product-card-stock ${stockClass}" data-field="stock_actual">
                            Stock: ${product.stock_actual ?? 'N/A'} ${usaInventarioText === 'Sí' ? `(Min: ${product.stock_minimo ?? 'N/A'})` : ''}
                        </div>
                        <div class="product-card-status" data-field="nombre_estado">
                            <span class="status-badge ${statusClass}">${product.nombre_estado}</span>
                        </div>
                        <div class="product-card-actions">
                            <button class="action-btn edit-product-btn">Editar</button>
                        </div>
                    `;
                     // Insertar la tarjeta ANTES del loading indicator
                    loadingIndicator.insertAdjacentElement('beforebegin', card);

                } else {
                    // --- RENDERIZADO PARA DESKTOP (TABLA - Tu código original) ---
                    const row = document.createElement('tr');
                    row.dataset.productId = product.id_producto;
                    row.dataset.status = (product.nombre_estado || '').toLowerCase();

                     const imageCell = showImages ?
                        `<td class="product-image-col">
                            <div class="product-table-img-container">
                                <img src="${imageUrl}" class="product-table-img" alt="${product.nombre_producto}" loading="lazy">
                            </div>
                        </td>` :
                        '<td class="product-image-col" style="display: none;"></td>';

                    row.innerHTML = `
                        <td><input type="checkbox" class="product-checkbox"></td>
                        ${imageCell}
                        <td data-field="codigo_producto">${product.codigo_producto}</td>
                        <td class="editable" data-field="nombre_producto">${product.nombre_producto}</td>
                        <td data-field="nombre_departamento">${product.nombre_departamento}</td>
                        <td class="editable" data-field="id_marca" data-id="${product.id_marca || ''}">${product.nombre_marca || 'N/A'}</td>
                        <td data-field="id_etiqueta">${product.todas_las_etiquetas || 'N/A'}</td>
                        <td class="editable" data-field="precio_venta">$${parseFloat(product.precio_venta).toFixed(2)}</td>
                        <td class="${stockClass}" data-field="stock_actual">${product.stock_actual ?? 'N/A'}</td>
                        <td data-field="stock_minimo">${product.stock_minimo ?? 'N/A'}</td>
                        <td data-field="stock_maximo">${product.stock_maximo ?? 'N/A'}</td>
                        <td>${usaInventarioText}</td>
                        <td data-field="nombre_estado"><span class="status-badge ${statusClass}">${product.nombre_estado}</span></td>
                        <td><button class="action-btn edit-product-btn">Editar</button></td>
                    `;
                    tableBody.appendChild(row); // Añade a tbody en desktop
                }
            });

            if (data.products.length < 50) {
                currentFilters.page = -1; // No hay más páginas
            } else {
                currentFilters.page++;
            }
        } else {
            if (currentFilters.page === 1) { // Solo muestra "No encontrado" si es la primera página
                 // --- MODIFICACIÓN: Mensaje adaptativo ---
                const noResultsMessage = isMobile ? '<p class="no-products-message">No se encontraron productos.</p>' : `<tr><td colspan="${showImages ? 14 : 13}">No se encontraron productos.</td></tr>`;
                // Inserta el mensaje antes del loading indicator en móvil, o en el tbody en desktop
                if (isMobile && loadingIndicator) { // Asegura que loadingIndicator exista
                    loadingIndicator.insertAdjacentHTML('beforebegin', noResultsMessage);
                } else if (!isMobile){
                    tableBody.innerHTML = noResultsMessage;
                }
            }
            currentFilters.page = -1; // Detiene la carga infinita
        }
        updateSortIndicators(); // Sigue siendo útil para desktop
        updateBatchActionsState(); // Sigue funcionando con los checkboxes

    } catch (error) {
        productContainer.querySelectorAll('.skeleton-loader').forEach(s => s.remove());
        if (currentFilters.page === 1) {
             // --- MODIFICACIÓN: Mensaje de error adaptativo ---
             const errorMessage = isMobile ? `<p class="error-message">Error al cargar: ${error.message}</p>` : `<tr><td colspan="${showImages ? 14 : 13}" style="color:red;">Error al cargar: ${error.message}</td></tr>`;
             // Inserta el mensaje antes del loading indicator en móvil, o en el tbody en desktop
             if (isMobile && loadingIndicator) { // Asegura que loadingIndicator exista
                 loadingIndicator.insertAdjacentHTML('beforebegin', errorMessage);
             } else if (!isMobile) {
                 tableBody.innerHTML = errorMessage;
             }
        }
        console.error("Error en fetchAndRenderProducts:", error);
    } finally {
        isLoading = false;
        if(loadingIndicator) loadingIndicator.style.display = 'none'; // Oculta solo si existe
    }
}
async function populateSelectWithOptions(select, resource, dataKey, keyField, valueField, defaultOptionText) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=${resource}`);
        const result = await response.json();
        if (result.success && result[dataKey]) {
            select.innerHTML = `<option value="">${defaultOptionText}</option>`;
            const data = result[dataKey];
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item[keyField];
                option.textContent = item[valueField];
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No hay opciones</option>';
        }
    } catch (error) {
        console.error(`Error loading options for ${resource}:`, error);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
}



// EN: admin/js/admin.js

function handleScroll() {
    const container = document.getElementById('main-content');
    if (!container) return;

    // --- MODIFICACIÓN CLAVE ---
    // Aumentamos el umbral para detectar el final (de 5 a 50 píxeles antes)
    const atTheBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100; // <-- CAMBIO AQUÍ

    if (atTheBottom && !isLoading && currentFilters.page !== -1) {
        fetchAndRenderProducts();
    }
}



// EN: admin/js/admin.js
// REEMPLAZA esta función completa para que acepte el parámetro selectorId

async function populateStoreFilter(selectorId = 'store-filter') {
    // ¡CORRECCIÓN AQUÍ! Se usa el parámetro selectorId
    const filterSelect = document.getElementById(selectorId); 
    
    if (!filterSelect) {
        // Esto no es un error, el elemento puede no existir en la página actual
        // console.warn(`Selector de tienda no encontrado: ${selectorId}`);
        return;
    }
    
    const currentValue = filterSelect.value;
    
    // Texto por defecto personalizado según el ID del selector
    let defaultOptionText = 'Todas las tiendas';
    if (selectorId === 'report-store-selector') {
        defaultOptionText = 'Seleccione una tienda';
    } else if (selectorId === 'stats-store-filter') {
        defaultOptionText = 'Todas las tiendas (Global)';
    }

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getTiendas`);
        const result = await response.json();
        
        if (result.success && result.tiendas.length > 0) {
            // Limpia las opciones
            filterSelect.innerHTML = `<option value="">${defaultOptionText}</option>`;

            result.tiendas.forEach(tienda => {
                const option = document.createElement('option');
                option.value = tienda.id_tienda;
                option.textContent = tienda.nombre_tienda;
                filterSelect.appendChild(option);
            });
            
            // Restaurar el valor seleccionado si aún existe
            if (currentValue) {
                filterSelect.value = currentValue;
            }

        } else {
             filterSelect.innerHTML = `<option value="">No hay tiendas</option>`;
        }
    } catch (error) {
        console.error('Error al cargar tiendas:', error);
        filterSelect.innerHTML = `<option value="">Error al cargar</option>`;
    }
}







    // --- LÓGICA DE MENÚ Y CARGA DE MÓDULOS ---

// admin/js/admin.js

// EN: admin/js/admin.js - REEMPLAZA ESTA SECCIÓN COMPLETA

function initializeSidemenu() {
    const sidemenu = document.getElementById('admin-sidemenu');
    const sideMenuFooter = document.querySelector('.sidemenu-footer');
    const menuToggle = document.getElementById('admin-menu-toggle');

    if (!sidemenu) {
        console.error('Error: No se encontró el elemento #admin-sidemenu');
        return;
    }

    // Lógica para el botón de hamburguesa (móvil)
    if (menuToggle) {
        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            sidemenu.classList.toggle('active');
        });
    }

    // ✅ COLAPSAR MENÚ - Contenedor padre es clickeable
    if (sideMenuFooter) {
        sideMenuFooter.addEventListener('click', () => {
            sidemenu.classList.toggle('collapsed');
            localStorage.setItem('sidemenuCollapsed', sidemenu.classList.contains('collapsed'));
        });
    }

    // Cerrar menú en móvil al hacer clic fuera
    document.addEventListener('click', (event) => {
        const isClickInsideMenu = sidemenu.contains(event.target);
        if (sidemenu.classList.contains('active') && !isClickInsideMenu) {
            sidemenu.classList.remove('active');
        }
    });
}

function checkSidemenuState() {
    const sidemenu = document.getElementById('admin-sidemenu');
    if (!sidemenu) return;

    // Si es escritorio y estaba colapsado, lo vuelve a colapsar
    if (window.innerWidth > 991 && localStorage.getItem('sidemenuCollapsed') === 'true') {
        sidemenu.classList.add('collapsed');
    }
}

// Llamar estas funciones al cargar
document.addEventListener('DOMContentLoaded', () => {
    initializeSidemenu();
    checkSidemenuState();
});

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


       if (moduleName === 'web_admin') {
            initializeWebAdminControls();
            return; // Detenemos aquí para no cargar una "acción" que ya no existe
        }
        let defaultAction = '';
        switch (moduleName) {
            case 'dashboard': defaultAction = 'dashboard/log_actividad'; break;
            case 'productos': defaultAction = 'productos/todos_los_productos'; break;
            case 'clientes': defaultAction = 'clientes/todos_los_clientes'; break;
            case 'departamentos': defaultAction = 'departamentos/gestion'; break;
            case 'utilidades': defaultAction = 'utilidades/generador_codigos'; break;
            case 'tarjetas': defaultAction = 'tarjetas/gestion'; break;
            case 'inventario': defaultAction = 'inventario/agregar_stock'; break;
            case 'estadisticas': defaultAction = 'estadisticas/resumen'; break;
            case 'usuarios': defaultAction = 'usuarios/gestion'; break;
            case 'pos': defaultAction = 'pos/vista_principal'; break; 
            case 'tiendas': defaultAction = 'tiendas/gestion'; break; 
            case 'proveedores': defaultAction = 'proveedores/gestion'; break;
            case 'marcas': defaultAction = 'marcas/gestion'; break;
            case 'etiquetas': defaultAction = 'etiquetas/gestion'; break;
            case 'listas_compras': defaultAction = 'listas_compras/gestion'; break;

        }
        if (defaultAction) {
            await loadActionContent(defaultAction);
        }
    } catch (error) {
        mainContent.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}




function initializeShoppingListManagement() {
    const startDateFilter = document.getElementById('list-start-date-filter');
    const endDateFilter = document.getElementById('list-end-date-filter');
    const listsTbody = document.getElementById('shopping-lists-tbody');

    if (!startDateFilter || !endDateFilter || !listsTbody) return;

    const fetchLists = () => {
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;
        if (startDate && endDate) {
            fetchAndRenderShoppingLists(startDate, endDate);
        }
    };

    fetchLists(); // Carga inicial
    
    startDateFilter.addEventListener('change', fetchLists);
    endDateFilter.addEventListener('change', fetchLists);

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
        } else if (target.classList.contains('export-csv-btn')) {
            // Nueva acción para exportar a CSV
            window.open(`../api/index.php?resource=admin/exportShoppingList&id=${listId}&format=csv`, '_blank');
        } else if (target.classList.contains('whatsapp-share-btn')) {
            // Nueva acción para compartir por WhatsApp
            shareListViaWhatsApp(listId);
        }
    });
}


// EN: admin/js/admin.js (Reemplaza esta función)
async function shareListViaWhatsApp(listId) {
    try {
        // Llama a la API para obtener los detalles, incluyendo el nombre del proveedor
        const response = await fetch(`${API_BASE_URL}?resource=admin/getShoppingListDetails&id_lista=${listId}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // --- Inicio de la Modificación ---
        // Se construye el mensaje más compacto
        let message = `*Lista: ${result.listName}*`; // Título

        // Añadir proveedor solo si existe
        if (result.providerName) {
            message += `\n*Proveedor:* ${result.providerName}`; // Proveedor en la siguiente línea
        }

        message += '\n\n--- Productos ---'; // Separador antes de los productos

        let total = 0;
        result.items.forEach(item => {
            const subtotal = item.cantidad * item.precio_compra;
            // Se usa \n para cada item, sin líneas extra
            message += `\n- ${item.cantidad} x ${item.nombre_producto} @ $${parseFloat(item.precio_compra).toFixed(2)} = $${subtotal.toFixed(2)}`;
            total += subtotal;
        });

        message += `\n\n*Total Estimado: $${total.toFixed(2)}*`; // Total al final
        // --- Fin de la Modificación ---

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

    } catch (error) {
        alert(`Error al preparar el mensaje para WhatsApp: ${error.message}`);
    }
}


async function fetchAndRenderShoppingLists(startDate, endDate) {
    const tableBody = document.getElementById('shopping-lists-tbody');
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getShoppingLists&startDate=${startDate}&endDate=${endDate}`);
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
                    <td class="action-buttons-cell">
                        <button class="action-btn btn-sm view-list-btn" title="Ver/Editar">📝</button>
                        <button class="action-btn btn-sm copy-list-btn" title="Copiar">📋</button>
                        <button class="action-btn btn-sm export-csv-btn" title="Exportar a Excel (CSV)">📄</button>
                        <button class="action-btn btn-sm whatsapp-share-btn" title="Compartir por WhatsApp">💬</button>
                        <button class="action-btn btn-sm delete-list-btn" title="Eliminar">❌</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No hay listas para el rango de fechas seleccionado.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar las listas.</td></tr>';
    }
}

function initializeCreateShoppingListForm() {
    const form = document.getElementById('create-shopping-list-form');
    if (!form) return;


        async function populateProviderSelect() {
        const select = document.getElementById('id_proveedor');
        if (!select) return;

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getProviders`);
            const result = await response.json();
            if (result.success && result.providers) {
                result.providers.forEach(provider => {
                    const option = document.createElement('option');
                    option.value = provider.id_proveedor;
                    option.textContent = provider.nombre_proveedor;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
        }
    }
    
    populateProviderSelect();
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

async function initializeListasCompras(container) {
    const listId = container.querySelector('.lista-compras-container')?.dataset.idLista;
    if (listId) {
        await loadAndRenderListView(listId);
        // Se llama a la función de redimensionamiento DESPUÉS de que la tabla está renderizada
        initializeResizableColumns('#list-items-table', 'shoppingListTableWidths');
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
            <td><input type="number" class="editable-field" data-field="cantidad" value="${item.cantidad}" min="0"></td>
            <td><button class="action-btn btn-sm btn-danger remove-item-btn">&times;</button></td>
        `;
        tbody.appendChild(row);
    });
}



// EN: admin/js/admin.js (REEMPLAZA ESTA FUNCIÓN)
function initializeListViewInteractions(listId) {
    const searchInput = document.getElementById('product-search-for-list');
    const searchResults = document.getElementById('product-search-results-list');
    const manualForm = document.getElementById('manual-add-product-form');
    const itemsTbody = document.getElementById('list-items-tbody');
    let searchTimer;
    
    // --- INICIO DE LA NUEVA LÓGICA ---
    let highlightedIndex = -1; // -1 significa que no hay nada seleccionado

    // Búsqueda de productos (con lógica de reinicio de selección)
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        highlightedIndex = -1; // Resetea la selección en cada nueva búsqueda
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

    // Nueva función para manejar el resaltado
    function highlightItem(index) {
        const items = searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        // Quita el resaltado anterior
        if (highlightedIndex > -1 && items[highlightedIndex]) {
            items[highlightedIndex].classList.remove('highlighted');
        }

        // Aplica el nuevo resaltado
        highlightedIndex = index;
        if (items[highlightedIndex]) {
            items[highlightedIndex].classList.add('highlighted');
            // Asegura que el item sea visible si la lista tiene scroll
            items[highlightedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Listener para las teclas de flecha y Enter
    searchInput.addEventListener('keydown', (e) => {
        const items = searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0 || searchResults.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex + 1) % items.length;
            highlightItem(highlightedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
            highlightItem(highlightedIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex > -1 && items[highlightedIndex]) {
                items[highlightedIndex].click(); // Simula un clic en el item seleccionado
            }
        }
    });
    // --- FIN DE LA NUEVA LÓGICA ---

    // El resto de la función (formulario manual, eventos de la tabla, etc.) permanece igual
    manualForm.onsubmit = async (e) => {
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
    };

    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });

    itemsTbody.addEventListener('change', async (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;
        const itemId = row.dataset.itemId;
        
        if (target.classList.contains('editable-field')) {
            await updateListItem(itemId, target.dataset.field, target.value);
        } else if (target.classList.contains('mark-item-checkbox')) {
            const response = await fetch(`${API_URL}?resource=admin/toggleListItemMark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_item_lista: itemId })
            });
            const result = await response.json();
            if (result.success) {
                row.classList.toggle('item-marked', result.newState);
            } else {
                target.checked = !target.checked;
            }
        }
    });
    
    itemsTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const row = e.target.closest('tr');
            await removeProductFromList(row.dataset.itemId, row);
        }
    });
    
    document.querySelector('.header-actions')?.addEventListener('click', async (e) => {
        if (e.target.id === 'save-and-exit-btn') {
            document.querySelector('.action-btn[data-action="listas_compras/gestion"]').click();
        } else if (e.target.id === 'copy-list-btn') {
            await copyShoppingList(listId);
        }
    });
}
















/*************************************************************************/
async function addProductToList(listId, productId) {
    await fetch(`${API_BASE_URL}?resource=admin/addProductToList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_lista: listId, id_producto: productId })
    });
    // Llama a la función principal que ahora también se encarga de reinicializar el resize
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
// EN: admin/js/admin.js (Reemplaza esta función completa)
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

            // --- INICIO DE LA CORRECCIÓN ---
            // 1. Obtener los elementos correctos de fecha
            const startDateInput = document.getElementById('list-start-date-filter');
            const endDateInput = document.getElementById('list-end-date-filter');

            // 2. Verificar que existan antes de leer sus valores
            const startDate = startDateInput ? startDateInput.value : null;
            const endDate = endDateInput ? endDateInput.value : null;

            // 3. Llamar a fetchAndRenderShoppingLists con ambas fechas (si existen)
            if (startDate && endDate) {
                fetchAndRenderShoppingLists(startDate, endDate);
            } else {
                // Si los filtros no están presentes, recarga la vista general de listas
                document.querySelector('.action-btn[data-action="listas_compras/gestion"]').click();
            }
            // --- FIN DE LA CORRECCIÓN ---

        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        // Muestra el error específico que vino de la API o del catch
        alert(`Error al copiar: ${error.message}`);
    }
}



async function deleteShoppingList(listId, rowElement) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta lista de compras? Esta acción es irreversible.')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteShoppingList`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_lista: listId })
        });
        const result = await response.json();
        if (result.success) {
            rowElement.remove();
            // Opcional: mostrar una alerta de éxito
            // alert(result.message); 
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert(`Error al eliminar la lista: ${error.message}`);
    }
}
// --- FIN: MÓDULO LISTAS DE COMPRAS ---
/*************************************************************************/
function initializeImageProcessor() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('image-upload-input');
    const startBtn = document.getElementById('start-processing-btn');
    
    // Si no estamos en la página del procesador, no hacemos nada.
    if (!dropZone || !fileInput || !startBtn) {
        return;
    }

    // Evento para cuando el usuario hace clic en la zona
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Eventos para el drag & drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Previene que el navegador abra el archivo
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        // Asigna los archivos soltados al input de archivo
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            updateDropZoneFileList(fileInput.files);
        }
    });
    
    // Actualiza la UI cuando se seleccionan archivos de forma normal
    fileInput.addEventListener('change', () => {
        updateDropZoneFileList(fileInput.files);
    });

    // Función para mostrar los nombres de los archivos seleccionados
    function updateDropZoneFileList(files) {
        const p = dropZone.querySelector('p');
        if (files.length > 0) {
            let fileNames = Array.from(files).map(f => f.name).join(', ');
            // Si la lista de nombres es muy larga, muestra un resumen
            if(fileNames.length > 100) {
                p.textContent = `${files.length} archivos seleccionados.`;
            } else {
                p.textContent = fileNames;
            }
        } else {
            p.textContent = 'Arrastra y suelta tus imágenes aquí, o haz clic para seleccionarlas.';
        }
    }
}

/***********************************************************************/

async function loadActionContent(actionPath) {
    const actionContent = document.getElementById('action-content');
    if (!actionContent) return;

    const mainContentContainer = document.getElementById('main-content');
    if(mainContentContainer) {
        mainContentContainer.removeEventListener('scroll', handleScroll);
    }
    if (typeof stopAdminScanner === 'function') stopAdminScanner(); // Detiene el escáner si está activo
    actionContent.innerHTML = '<p>Cargando...</p>';
    try {

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
                initializeResizableColumns('.product-table');
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
                fetchAndRenderInventoryHistory();break;
            case 'inventario/reportes_rapidos_gestion':
                await initializeInventoryReportManagement();
                break;
            case 'inventario/reportes_rapidos_ver':
                await initializeInventoryReportView(actionContent);
                break;
            case 'estadisticas/resumen': loadStatisticsWidgets(); break;
            case 'estadisticas/reportes_ventas': initReportesVentas(); break;
            case 'dashboard/ventas_por_usuario': await fetchAndRenderUserSales(); break;
            case 'usuarios/gestion': initializeUserManagement(); break;
            case 'usuarios/permisos': initializePermissionsManagement(); break;
            case 'pos/vista_principal': initializePOS(); break; 
            case 'pos/gestion_pedidos': initializeWebOrderManagement(); break;
            case 'web_admin/sliders': initializeWebAdminControls(); break;
            case 'listas_compras/gestion': initializeShoppingListManagement(); break; 
            case 'listas_compras/crear_lista': initializeCreateShoppingListForm(); break;
            case 'listas_compras/ver_lista': await initializeListasCompras(actionContent); break;
            case 'tiendas/gestion': initializeTiendaManagement(); break; 
            case 'proveedores/gestion': initializeProveedorManagement(); break;
            case 'marcas/gestion': initializeMarcaManagement(); break;
            case 'utilidades/procesador_imagenes': initializeImageProcessor(); break;
            case 'utilidades/generador_codigos': initializeBarcodeGenerator(); break;
            case 'utilidades/bucket_manager': initializeBucketManager(); break;
            case 'etiquetas/gestion': initializeEtiquetaManagement(); break; 
        }
    } catch (error) {
        actionContent.innerHTML = `<p style="color:red;">Error al cargar la acción: ${error.message}</p>`;
    }
}



async function populateDepartmentFilter(selectorId = 'department-filter') {
    const filterSelect = document.getElementById(selectorId);
    if (!filterSelect) return;
    try {
        // Devuelve todos los departamentos.
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

async function saveFieldUpdate(productId, field, value, cell, newDisplayText = null) {
    const originalText = cell.dataset.originalText || cell.innerHTML; // Usamos el texto guardado
    cell.textContent = 'Guardando...';
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateProductField`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId, field: field, value: value })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error del servidor.");

        // Usamos el newDisplayText si se proporciona (para los selects)
        if (newDisplayText !== null) {
            cell.textContent = newDisplayText || 'N/A';
        } else { // Lógica para los inputs
            cell.textContent = field === 'precio_venta' ? `$${parseFloat(value).toFixed(2)}` : value;
        }

        // Actualizamos el data-id para futuras ediciones del select
        if (field === 'id_marca' || field === 'id_etiqueta') {
            cell.dataset.id = value;
        }

    } catch (error) {
        console.error('Error al guardar:', error);
        cell.innerHTML = originalText;
        alert("Error al guardar el cambio.");
    }
}
    


function updateBatchActionsState() {
    // Busca los elementos relevantes DENTRO del contenedor principal 'mainContent'
    const selectedElements = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => {
        return cb.closest('tr') || cb.closest('.product-card');
    }).filter(el => el);
    const batchSelector = mainContent.querySelector('#batch-action-selector');
    const batchButton = mainContent.querySelector('#batch-action-execute');

    if (!batchSelector || !batchButton) return;

    const activateOption = batchSelector.querySelector('option[value="activate"]');
    const deactivateOption = batchSelector.querySelector('option[value="deactivate"]');
    const outOfStockOption = batchSelector.querySelector('option[value="mark-out-of-stock"]'); // <-- Obtener la nueva opción

    // Verificar si todas las opciones existen
    if (!activateOption || !deactivateOption || !outOfStockOption) {
         console.error("Falta una o más opciones de acción en lote (activate/deactivate/mark-out-of-stock).");
         return;
    }


    const totalSelected = selectedElements.length;

    // 1. Estado inicial: todo deshabilitado y opciones ocultas
    batchSelector.disabled = true;
    batchButton.disabled = true;
    batchSelector.value = ''; // Resetea la selección
    activateOption.style.display = 'none';
    deactivateOption.style.display = 'none';
    outOfStockOption.style.display = 'none'; // <-- Ocultar la nueva opción

    // 2. Si no hay nada seleccionado, no hacemos nada más
    if (totalSelected === 0) return;

    // 3. Habilitamos el selector ya que hay productos seleccionados
    batchSelector.disabled = false;

    // 4. Verificamos el estado de los productos seleccionados
    const areAllActive = selectedElements.every(el => el.dataset.status === 'activo');
    const areAllInactive = selectedElements.every(el => el.dataset.status !== 'activo');
    const areAnyActive = selectedElements.some(el => el.dataset.status === 'activo'); // <-- Nuevo: verificar si alguno está activo

    // 5. Mostramos las opciones correspondientes según la lógica
    if (areAllActive) {
        // Si todos están activos, mostrar 'Desactivar' y 'Marcar como Agotado'
        deactivateOption.style.display = 'block';
        outOfStockOption.style.display = 'block'; // <-- Mostrar la nueva opción
    } else if (areAllInactive) {
        // Si todos están inactivos, solo mostrar 'Activar'
        activateOption.style.display = 'block';
    } else if (areAnyActive) {
         // Si hay una mezcla, pero AL MENOS UNO está activo, mostrar 'Marcar como Agotado'
         outOfStockOption.style.display = 'block'; // <-- Mostrar la nueva opción
         // Podrías decidir mostrar también 'Desactivar' aquí si tiene sentido para tu flujo
         // deactivateOption.style.display = 'block';
    }
    // Si hay una mezcla donde ninguno está activo, solo se mostrará 'Activar' (cubierto por areAllInactive)

    // Habilitar el botón Ejecutar solo si hay una acción seleccionada en el desplegable
    batchButton.disabled = !batchSelector.value;
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
    const generateBarcodeBtn = form.querySelector('#generate-barcode-single');
    const productNameInput = form.querySelector('#nombre_producto'); // <--- AÑADIDA ESTA LÍNEA
    let typingTimer;

    //Capitalizar nombre del nombre del producto
    if (productNameInput) {
        productNameInput.addEventListener('input', () => {
            const start = productNameInput.selectionStart; // Guarda posición del cursor
            const end = productNameInput.selectionEnd;
            let value = productNameInput.value;
            // Capitaliza la primera letra de cada palabra
            value = value.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
            productNameInput.value = value;
            productNameInput.setSelectionRange(start, end); // Restaura posición del cursor
        });
    }

    // Validación en vivo del código (existente)
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

    // --- NUEVA LÓGICA PARA EL BOTÓN GENERAR CÓDIGO ---
    if (generateBarcodeBtn) {
        generateBarcodeBtn.addEventListener('click', async () => {
            const feedbackDiv = codeInput.closest('.form-group').querySelector('.validation-feedback');
            generateBarcodeBtn.disabled = true;
            generateBarcodeBtn.textContent = '...'; // Indicador visual
            feedbackDiv.textContent = 'Generando código único...';
            feedbackDiv.style.color = 'inherit';

            try {
                // Llama al mismo endpoint del generador, pero pidiendo solo 1 código
                const response = await fetch(`${API_BASE_URL}?resource=admin/generateEan13Codes&quantity=1`);
                const result = await response.json();

                if (result.success && result.codes && result.codes.length > 0) {
                    const uniqueCode = result.codes[0];
                    codeInput.value = uniqueCode; // Inserta el código en el input
                    feedbackDiv.textContent = 'Código generado y verificado como único.';
                    feedbackDiv.style.color = 'green';
                    submitButton.disabled = false; // Habilita el botón de guardar
                    // Dispara el evento 'keyup' para que se vuelva a validar si es necesario
                    codeInput.dispatchEvent(new Event('keyup'));
                } else {
                    throw new Error(result.error || 'No se pudo generar un código único.');
                }
            } catch (error) {
                feedbackDiv.textContent = `Error: ${error.message}`;
                feedbackDiv.style.color = 'red';
                submitButton.disabled = true; // Deshabilita guardar si hubo error
            } finally {
                generateBarcodeBtn.disabled = false;
                generateBarcodeBtn.textContent = 'Generar'; // Restaura el texto del botón
            }
        });
    }
    // --- FIN NUEVA LÓGICA ---

    initializeTagInput(); // Inicializador de etiquetas (existente)

    // Envío del formulario (existente)
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




// REEMPLAZA esta función completa en admin/js/admin.js
async function renderEditForm(product) {
    const container = document.getElementById('edit-product-container');
    const searchContainer = document.getElementById('product-search-container');
    const barcodeContainer = document.getElementById('barcode-display-container');

    if (!container || !searchContainer || !barcodeContainer) return;

    searchContainer.classList.add('hidden');
    container.classList.remove('hidden');
    barcodeContainer.innerHTML = '';

    // Carga la estructura HTML del formulario de agregar_producto.php
    const formResponse = await fetch('actions/productos/agregar_producto.php');
    container.innerHTML = await formResponse.text();

    // Selecciona el formulario recién cargado y le cambia el ID
    const form = container.querySelector('#add-product-form');
    form.id = 'edit-product-form';
    form.querySelector('.form-submit-btn').textContent = 'Actualizar Producto';

    // Añade el campo oculto con el ID del producto
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'id_producto';
    idInput.value = product.id_producto;
    form.appendChild(idInput);

    // Lista de campos a rellenar
    const fields = [
        'codigo_producto', 'nombre_producto', 'departamento', 'precio_compra',
        'precio_venta', 'precio_mayoreo', 'tipo_de_venta', 'estado',
        'proveedor','id_marca', 'stock_minimo', 'stock_maximo', 'url_imagen'
        // 'id_etiqueta' se maneja por separado
    ];

    // Rellena los campos del formulario con los datos del producto
    fields.forEach(field => {
        const inputId = (field === 'url_imagen') ? 'selected-image-url' : field;
        const formInput = form.querySelector(`#${inputId}`);
        if (formInput) {
            formInput.value = product[field] || '';
        }
    });

    // Muestra la previsualización de la imagen si existe
    if (product.url_imagen && product.url_imagen !== '0') {
        const previewImg = form.querySelector('#image-preview');
        const noImageText = form.querySelector('#no-image-text');
        if (previewImg && noImageText) {
            previewImg.src = product.url_imagen;
            previewImg.classList.remove('hidden');
            noImageText.classList.add('hidden');
        }
    }

    // Lógica para deshabilitar campos de inventario si no se usa (ajusta si es necesario)
    const usaInventario = parseInt(product.usa_inventario, 10) === 1;
    const stockInput = form.querySelector('#stock_actual'); // Asumiendo que existe un #stock_actual
    const usaInventarioCheckbox = form.querySelector('#usa_inventario_checkbox'); // Asumiendo que existe
    if (stockInput) stockInput.disabled = usaInventario;
    if (usaInventarioCheckbox) usaInventarioCheckbox.disabled = usaInventario;

    // Muestra el código de barras si es EAN-13 válido
    const productCode = product.codigo_producto.trim();
    if (/^[0-9]{13}$/.test(productCode)) {
        const downloadUrl = `../api/index.php?resource=admin/getBarcodeImage&code=${productCode}&download=true`;
        barcodeContainer.innerHTML = `
            <h4>Código de Barras EAN-13</h4>
            <img src="../api/index.php?resource=admin/getBarcodeImage&code=${productCode}" alt="Código de barras para ${productCode}">
            <a href="${downloadUrl}" class="action-btn" style="margin-top: 1rem; display: inline-block;">Descargar Código</a>
        `;
    } else {
        barcodeContainer.innerHTML = `
            <h4>Código de Barras</h4>
            <p>N/A (El código actual no es un EAN-13 válido de 13 dígitos)</p>
        `;
    }

    // Carga y selecciona las etiquetas existentes del producto
    try {
        const tagsResponse = await fetch(`${API_BASE_URL}?resource=admin/getProductTags&productId=${product.id_producto}`);
        const tagsResult = await tagsResponse.json();
        if (tagsResult.success && tagsResult.tags) {
            const tagSelect = form.querySelector('#id_etiqueta');
            if (tagSelect) {
                Array.from(tagSelect.options).forEach(option => option.selected = false);
                tagsResult.tags.forEach(tagId => {
                    const option = tagSelect.querySelector(`option[value="${tagId}"]`);
                    if (option) option.selected = true;
                });
            }
        }
    } catch (error) {
        console.error("Error al cargar etiquetas del producto:", error);
    }

    // Inicializa el input de etiquetas personalizado para este formulario
    initializeTagInput('#edit-product-form .tag-input-container');

    // --- INICIO: CÓDIGO INTEGRADO PARA HABILITAR 'GENERAR' EN EDITAR ---
    const editCodeInput = form.querySelector('#codigo_producto');
    const editGenerateBtn = form.querySelector('#generate-barcode-single'); // Busca el botón dentro del form
    const editFeedbackDiv = editCodeInput?.closest('.form-group')?.querySelector('.validation-feedback');
    const editSubmitButton = form.querySelector('.form-submit-btn');

    if (editGenerateBtn && editCodeInput && editFeedbackDiv && editSubmitButton) {
        editGenerateBtn.addEventListener('click', async () => {
            editGenerateBtn.disabled = true;
            editGenerateBtn.textContent = '...';
            editFeedbackDiv.textContent = 'Generando código único...';
            editFeedbackDiv.style.color = 'inherit';

            try {
                // Llama a la API para obtener un código único
                const response = await fetch(`${API_BASE_URL}?resource=admin/generateEan13Codes&quantity=1`);
                const result = await response.json();

                if (result.success && result.codes && result.codes.length > 0) {
                    const uniqueCode = result.codes[0];
                    editCodeInput.value = uniqueCode; // Actualiza el input del código
                    editFeedbackDiv.textContent = 'Código generado y verificado como único.';
                    editFeedbackDiv.style.color = 'green';
                    editSubmitButton.disabled = false; // Habilita guardar
                    // Dispara 'keyup' para la validación en vivo
                    editCodeInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                } else {
                    throw new Error(result.error || 'No se pudo generar un código único.');
                }
            } catch (error) {
                editFeedbackDiv.textContent = `Error: ${error.message}`;
                editFeedbackDiv.style.color = 'red';
                editSubmitButton.disabled = true; // Deshabilita guardar si hay error
            } finally {
                editGenerateBtn.disabled = false;
                editGenerateBtn.textContent = 'Generar'; // Restaura el texto
            }
        });
    } else {
        console.error("No se pudieron encontrar todos los elementos necesarios para el botón 'Generar' en el formulario de edición.");
    }
    // --- FIN: CÓDIGO INTEGRADO ---

    // Añade el listener para el envío del formulario de edición
    initializeEditProductFormSubmit(form);

    // --- NUEVA LÓGICA PARA CAPITALIZAR NOMBRE DE PRODUCTO (también en editar) ---
    const editProductNameInput = form.querySelector('#nombre_producto');
    if (editProductNameInput) {
        editProductNameInput.addEventListener('input', () => {
            const start = editProductNameInput.selectionStart;
            const end = editProductNameInput.selectionEnd;
            let value = editProductNameInput.value;
            value = value.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
            editProductNameInput.value = value;
            editProductNameInput.setSelectionRange(start, end);
        });
        // Aplicar capitalización inicial al cargar el valor
        editProductNameInput.dispatchEvent(new Event('input'));
    }
    // --- FIN NUEVA LÓGICA ---
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




/*****************************************************************************************/

// admin/js/admin.js

async function openImageGallery(targetInputId) {
        imageTargetInputId = targetInputId; // Se guarda el ID en la variable global

    if (!galleryModal) return;

    const grid = galleryModal.querySelector('.image-grid-container');
    const searchInput = document.getElementById('gallery-search-input');

    // Si el término de búsqueda actual es diferente al que está guardado en caché,
    // significa que es una nueva búsqueda y debemos reiniciar el caché.
    const newSearchTerm = searchInput.value.trim();
    if (galleryCache.searchTerm !== newSearchTerm) {
        galleryCache.images = [];
        galleryCache.page = 1;
        galleryCache.hasMore = true;
        galleryCache.searchTerm = newSearchTerm;
    }

    grid.innerHTML = ''; // Limpiamos la vista para redibujarla desde el caché

    // Si hay imágenes en el caché, las mostramos todas.
    if (galleryCache.images.length > 0) {
        galleryCache.images.forEach(image => {
            const item = document.createElement('div');
            item.className = 'image-grid-item';
            item.dataset.imageUrl = image.url;
            item.dataset.imageName = image.name;
            // LÍNEA CORREGIDA: Se elimina el timestamp
            item.innerHTML = `
                <img src="${image.url}" alt="${image.name}" loading="lazy">
                <p class="file-name">${image.name.replace('productos/', '')}</p> 
                <button class="delete-image-btn" title="Eliminar del bucket">&times;</button>
            `;
            grid.appendChild(item);
        });
    }

    // Si el caché está vacío Y aún hay imágenes por cargar, hacemos la primera petición.
    if (galleryCache.images.length === 0 && galleryCache.hasMore) {
        await loadImageGrid(galleryCache.searchTerm);
    }

    galleryModal.style.display = 'flex';

    // Re-inicializamos el listener de búsqueda por si se cerró antes.
    let searchDebounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            // Al buscar, se resetea todo para la nueva búsqueda
            galleryCache.images = [];
            galleryCache.page = 1;
            galleryCache.hasMore = true;
            galleryCache.searchTerm = searchInput.value.trim();
            grid.innerHTML = '';
            loadImageGrid(galleryCache.searchTerm);
        }, 300);
    });
}

async function loadImageGrid(searchTerm = '') {
    // Verificamos el estado desde el objeto caché
    if (isLoadingGallery || !galleryCache.hasMore) return;
    isLoadingGallery = true;

    const grid = galleryModal.querySelector('.image-grid-container');
    const loadingIndicator = document.createElement('p');
    loadingIndicator.textContent = 'Cargando imágenes...';

    if (galleryCache.page === 1) {
        grid.innerHTML = '';
    }
    if (grid.innerHTML === '') {
        grid.appendChild(loadingIndicator);
    }

    try {
        // Usamos la página guardada en el caché para la petición
        const apiUrl = `${API_BASE_URL}?resource=admin/getBucketImages&page=${galleryCache.page}&search=${encodeURIComponent(searchTerm)}`;
        const response = await fetch(apiUrl);
        const result = await response.json();

        if (grid.contains(loadingIndicator)) {
            loadingIndicator.remove();
        }

        if (result.success && result.images.length > 0) {
            // Añadimos las nuevas imágenes al caché y a la vista.
            galleryCache.images.push(...result.images);

            result.images.forEach(image => {
                const item = document.createElement('div');
                item.className = 'image-grid-item';
                item.dataset.imageUrl = image.url;
                item.dataset.imageName = image.name;
                 // LÍNEA CORREGIDA: Se elimina el timestamp
                item.innerHTML = `
                    <img src="${image.url}" alt="${image.name}" loading="lazy">
                    <p class="file-name">${image.name.replace('productos/', '')}</p> 
                    <button class="delete-image-btn" title="Eliminar del bucket">&times;</button>
                `;
                grid.appendChild(item);
            });
            // Actualizamos el estado del caché para la siguiente paginación
            galleryCache.page++;
            galleryCache.hasMore = result.has_more;
        } else {
            galleryCache.hasMore = false; // Ya no hay más imágenes que cargar
            if (galleryCache.page === 1) { 
                 grid.innerHTML = '<p style="padding: 1rem; text-align:center;">No hay imágenes que coincidan.</p>';
            }
        }
    } catch (error) {
        grid.innerHTML = `<p style="color:red;">Error al cargar las imágenes.</p>`;
    } finally {
        isLoadingGallery = false;
    }
}

    
    function closeImageGallery() {
        if (galleryModal) galleryModal.style.display = 'none';
    }



if (galleryModal) {
    const gridContainer = galleryModal.querySelector('.image-grid-container');
    gridContainer.addEventListener('scroll', () => {
        // Si el usuario ha llegado casi al final del scroll, carga más
        if (gridContainer.scrollTop + gridContainer.clientHeight >= gridContainer.scrollHeight - 100) {
            loadImageGrid();
        }
    });

    // --- LÓGICA PARA EL BOTÓN DE ACTUALIZAR GALERÍA ---
const refreshBtn = document.getElementById('refresh-gallery-btn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
        const grid = galleryModal.querySelector('.image-grid-container');
        const searchInput = document.getElementById('gallery-search-input');
        
        // 1. Mostrar feedback visual al usuario
        refreshBtn.textContent = '🔄...';
        refreshBtn.disabled = true;
        grid.innerHTML = '<p>Actualizando...</p>';

        // 2. Limpiar completamente la caché para forzar la recarga
        galleryCache.images = [];
        galleryCache.page = 1;
        galleryCache.hasMore = true;
        galleryCache.searchTerm = searchInput.value.trim(); // Mantiene el término de búsqueda actual

        // 3. Volver a cargar la galería desde la primera página
        await loadImageGrid(galleryCache.searchTerm);

        // 4. Restaurar el estado del botón
        refreshBtn.textContent = '🔄';
        refreshBtn.disabled = false;
    });
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


// EN: admin/js/admin.js

// REEMPLAZA ESTA FUNCIÓN EN: admin/js/admin.js

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
            
            // --- ✅ CORRECCIÓN APLICADA ---
            // Se pasa el objeto correcto 'stats.chart_data' a la función del gráfico.
            renderSalesChart(stats.chart_data);
            
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        salesWidget.innerHTML = `<p style="color:red;">Error al cargar resumen de ventas.</p>`;
        chartTitle.textContent = 'Error al cargar gráfico';
    }
}


//mainContent Global
mainContent.addEventListener('click', async (event) => {
    const target = event.target;

/*************************************************************/
//Abrir Lector de Barra para modulo Inventario
    if (event.target.id === 'scan-barcode-add-stock') { 


        startAdminScanner('product-search-for-stock', true); 
    }
    if (event.target.id === 'scan-barcode-adjust-stock') { 


        startAdminScanner('product-search-for-adjust', true); 
    }

    if (event.target.id === 'scan-barcode-allProducts') { 


        startAdminScanner('product-search-input', true); 
    }
    if (event.target.id === 'scan-barcode-add-item-report') { 


        startAdminScanner('report-product-code', false); 
    }


//Abrir Lector de Barra para modulo Inventario

/***********************************************************/

if (event.target.closest('#find-replace-modal')) {
        const modal = event.target.closest('#find-replace-modal');
        
        if (event.target.matches('.modal-close-btn, #modal-find-replace-cancel-btn')) {
            closeFindReplaceModal();
        }

        if (event.target.id === 'modal-find-replace-confirm-btn') {
            const findText = modal.querySelector('#find-text').value;
            const replaceText = modal.querySelector('#replace-text').value;
            const errorDiv = modal.querySelector('#modal-find-replace-error');

            if (findText === '') {
                errorDiv.textContent = 'El campo "Buscar Texto" no puede estar vacío.';
                return;
            }

            const productIds = Array.from(mainContent.querySelectorAll('.product-checkbox:checked')).map(cb => cb.closest('tr').dataset.productId);
            
            event.target.textContent = 'Procesando...';
            event.target.disabled = true;

            try {
                const response = await fetch(`${API_BASE_URL}?resource=admin/batchUpdateNames`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productIds, findText, replaceText })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);
                
                alert(result.message);
                closeFindReplaceModal();
                currentFilters.page = 1;
                await fetchAndRenderProducts();

            } catch (error) {
                errorDiv.textContent = `Error: ${error.message}`;
            } finally {
                event.target.textContent = 'Ejecutar Reemplazo';
                event.target.disabled = false;
            }
        }
    }

    // --- ✅ INICIO DE LA CORRECCIÓN ---
    if (target.id === 'open-gallery-btn') {
        openImageGallery('selected-image-url'); // Especifica el target del formulario de productos
        return;
    }

    // Listener para el botón de galería en el formulario de ANUNCIOS
    if (target.id === 'open-gallery-for-ads-btn') {
        openImageGallery('ads-url-imagen'); // Especifica el target del formulario de anuncios
        return;
    }

        if (target.classList.contains('delete-btn') && target.closest('.bucket-item')) {
        event.stopPropagation(); // Evita que se disparen otros eventos
        const itemToDelete = target.closest('.bucket-item');
        const imageName = itemToDelete.dataset.imageName;
        const feedbackDiv = document.getElementById('bucket-manager-feedback');

        if (confirm(`¿Estás seguro de que quieres eliminar esta imagen PERMANENTEMENTE del bucket?\n\nArchivo: ${imageName.replace('productos/', '')}`)) {
            feedbackDiv.innerHTML = '';
            try {
                const response = await fetch(`api/procesador_imagenes.php?resource=delete_bucket_image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: imageName })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);

                // Elimina la imagen de la vista y de la caché
                itemToDelete.remove();
                const indexInCache = bucketCache.images.findIndex(img => img.name === imageName);
                if (indexInCache > -1) {
                    bucketCache.images.splice(indexInCache, 1);
                }

                feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
                setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);

            } catch (error) {
                feedbackDiv.innerHTML = `<div class="message error">Error al eliminar: ${error.message}</div>`;
            }
        }
        return; // Detiene la ejecución para no interferir con otros listeners
    }

    if (target.classList.contains('processed-file-checkbox')) {
        // Se usa un pequeño retraso para asegurar que el estado 'checked' se actualice antes de la validación.
        setTimeout(updateProcessorButtons, 50); 
        return; // No es necesario que continúe con el resto de la función de clics.
    }
    
// --- LÓGICA PARA SUBIR IMÁGENES PROCESADAS DESDE "UTILIDADES" ---
    if (target.id === 'upload-to-gallery-btn') {
        const selectedFiles = Array.from(document.querySelectorAll('.processed-file-checkbox:checked'))
                                   .map(cb => cb.closest('.processed-file-item').dataset.fileName);
        
        const feedbackDiv = document.getElementById('results-feedback');

        if (selectedFiles.length === 0) {
            feedbackDiv.textContent = 'Por favor, selecciona al menos una imagen.';
            feedbackDiv.style.color = 'red';
            return;
        }

        target.disabled = true;
        target.textContent = 'Subiendo...';
        feedbackDiv.textContent = '';

        try {
            // Llama al 'case' que ahora usa DigitalOcean Spaces
            const response = await fetch(`api/procesador_imagenes.php?resource=uploadProcessedToBucket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: selectedFiles })
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }
            
            feedbackDiv.textContent = result.message;
            feedbackDiv.style.color = 'green';
            
            document.querySelectorAll('.processed-file-checkbox:checked').forEach(cb => cb.checked = false);
            updateProcessorButtons();

        } catch (error) {
            feedbackDiv.textContent = `Error: ${error.message}`;
            feedbackDiv.style.color = 'red';
        } finally {
            target.disabled = false;
            target.textContent = 'Subir a Galería';
        }
        return; 
    }
    // --- FIN DEL BLOQUE AÑADIDO ---



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

        if (action === 'change-price-massive') {
            openPriceModal();
            return;
        }
        if (action === 'find-replace-name') {
            openFindReplaceModal();
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
    const fileInput = document.getElementById('image-upload-input');
    
    if (fileInput.files.length === 0) {
        alert('Por favor, selecciona al menos una imagen para procesar.');
        return;
    }

    button.disabled = true;
    button.textContent = 'Subiendo imágenes...';
    outputConsole.textContent = 'Iniciando subida...\n';
    document.getElementById('results-container').classList.add('hidden');

    // Paso 1: Subir los archivos al servidor
    const formData = new FormData();
    for (const file of fileInput.files) {
        formData.append('images[]', file);
    }

    try {
        const uploadResponse = await fetch(`api/procesador_imagenes.php?resource=upload_for_processing`, {
            method: 'POST',
            body: formData
        });

        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) {
            throw new Error(`Error en la subida: ${uploadResult.error}`);
        }
        
        outputConsole.textContent += `${uploadResult.message}\nIniciando procesamiento...\n`;
        button.textContent = 'Procesando...';

        // Paso 2: Ejecutar el script de Python (si la subida fue exitosa)
        let processApiUrl = `api/procesador_imagenes.php?resource=run_processor`;
        if (rotationOption) {
            processApiUrl += `&rotate=${rotationOption}`;
        }

        const processResponse = await fetch(processApiUrl);
        const reader = processResponse.body.getReader();
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
        outputConsole.textContent += `\n\n--- ERROR CRÍTICO ---\n${error.message}`;
    } finally {
        button.disabled = false;
        button.textContent = 'Subir y Procesar';
        fileInput.value = ''; // Limpiar el selector de archivos
    }
    return;
}



if (target.id === 'clear-results-btn') {
    if (!confirm('¿Estás seguro de que quieres limpiar todos los resultados? Esto eliminará los archivos procesados del servidor.')) {
        return;
    }

    const feedbackDiv = document.getElementById('results-feedback');
    target.disabled = true;
    target.textContent = 'Limpiando...';
    feedbackDiv.textContent = '';

    try {
        const response = await fetch(`api/procesador_imagenes.php?resource=clear_processor_folders`, {
            method: 'POST' 
        });
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Limpiar la vista
        document.getElementById('processed-files-list').innerHTML = '';
        document.getElementById('results-container').classList.add('hidden');
        document.getElementById('processor-output').textContent = 'Consola limpiada.';

        // --- INICIO DE LA ADICIÓN ---
        const dropZoneP = document.querySelector('#drop-zone p');
        if (dropZoneP) {
            dropZoneP.textContent = 'Arrastra y suelta tus imágenes aquí, o haz clic para seleccionarlas.';
        }
        document.getElementById('image-upload-input').value = ''; // Resetea el input de archivos
        // --- FIN DE LA ADICIÓN ---

        feedbackDiv.textContent = result.message;
        feedbackDiv.style.color = 'green';
        setTimeout(() => feedbackDiv.innerHTML = '', 4000);

    } catch (error) {
        feedbackDiv.textContent = `Error: ${error.message}`;
        feedbackDiv.style.color = 'red';
    } finally {
        target.disabled = false;
        target.textContent = 'Limpiar';
    }
    return;
}



// AÑADE este bloque dentro del listener de 'click' en mainContent en admin/js/admin.js

// REEMPLAZA esta función en: admin/js/admin.js
// REEMPLAZA este bloque completo en admin/js/admin.js

if (target.id === 'download-zip-btn') {
    const selectedFiles = Array.from(document.querySelectorAll('.processed-file-checkbox:checked'))
                               .map(cb => cb.closest('.processed-file-item').dataset.fileName);
    
    if (selectedFiles.length === 0) {
        alert('Por favor, selecciona al menos una imagen para descargar.');
        return;
    }

    // Se crea un formulario invisible en la página.
    const downloadForm = document.createElement('form');
    downloadForm.method = 'POST';
    // Apunta directamente a nuestro nuevo script de descarga.
    downloadForm.action = 'api/download_images.php'; 
    downloadForm.target = '_blank'; // Evita que la página actual se recargue.

    // Se crea un campo oculto para enviar la lista de archivos.
    const filesInput = document.createElement('input');
    filesInput.type = 'hidden';
    filesInput.name = 'files';
    filesInput.value = JSON.stringify(selectedFiles);
    downloadForm.appendChild(filesInput);

    // Se añade el formulario a la página, se envía y se elimina inmediatamente.
    document.body.appendChild(downloadForm);
    downloadForm.submit();
    document.body.removeChild(downloadForm);
    
    return; // Finaliza la ejecución del evento de clic.
}

// AÑADE esta nueva función completa en admin/js/admin.js


/*********************************************************/
    
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
        let productCode = '';
        const card = target.closest('.product-card'); // Intenta encontrar la tarjeta (móvil)
        const row = target.closest('tr'); // Intenta encontrar la fila (escritorio)

        if (card) {
            // --- Lógica CORREGIDA para MÓVIL (Tarjeta) ---
            // Buscamos el div que contiene el código usando su clase específica
            const codeElement = card.querySelector('.product-card-code');
            if (codeElement) {
                productCode = codeElement.textContent.trim();
            } else {
                 console.error("Elemento .product-card-code no encontrado en la tarjeta.");
                 alert("Error: No se pudo encontrar el código del producto en la tarjeta.");
                 return; // Detiene si no encuentra el código
            }
        } else if (row) {
            // --- Lógica para ESCRITORIO (Tabla - Sin cambios) ---
            const codeCell = row.querySelector('td[data-field="codigo_producto"]');
            if (codeCell) {
                productCode = codeCell.textContent.trim();
            } else {
                console.error("Celda td[data-field='codigo_producto'] no encontrada en la fila.");
                alert("Error: No se pudo encontrar el código del producto en la tabla.");
                return; // Detiene si no encuentra el código
            }
        } else {
             console.error("No se encontró ni tarjeta (.product-card) ni fila (tr) para el botón editar.");
             alert("Error: No se pudo determinar la estructura del producto.");
             return; // Detiene si no encuentra ni card ni row
        }

        // --- Código común (ahora se ejecuta solo si productCode tiene valor) ---
        mainContent.querySelector('.action-ribbon .active')?.classList.remove('active');
        mainContent.querySelector('[data-action="productos/modificar_producto"]')?.classList.add('active');
        await loadActionContent('productos/modificar_producto'); // Carga la vista de modificar
        const searchInput = document.getElementById('product-search-to-edit');
        const searchForm = document.getElementById('product-search-form');
        if (searchInput && searchForm) {
            searchInput.value = productCode; // Pone el código en el buscador
            searchForm.dispatchEvent(new Event('submit')); // Simula el envío para cargar el producto
        } else {
             console.error("No se encontró el input o formulario de búsqueda para editar.");
             alert("Error al intentar cargar el formulario de edición.");
        }
        return; // Detiene la ejecución para este evento de clic
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
    if (target.id === 'toggle-product-images') {
        // Vuelve a renderizar la tabla con la nueva configuración de visibilidad de imágenes
        currentFilters.page = 1; 
        await fetchAndRenderProducts();
    }
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


    if (target.id === 'select-all-checkbox') {
        document.querySelectorAll('.processed-file-checkbox').forEach(checkbox => {
            checkbox.checked = target.checked;
        });
        // Actualizamos el estado de los botones de acción (Subir, ZIP, etc.)
        updateProcessorButtons();
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
if (selectedImage && imageTargetInputId) { // Se verifica que la variable exista
        const imageUrl = selectedImage.dataset.imageUrl;
        const targetInput = document.getElementById(imageTargetInputId); // Se usa la variable para encontrar el input
        
        if (targetInput) {
            targetInput.value = imageUrl; // Pone la URL en el input correcto

            // Si es el formulario de productos, también actualiza la previsualización
            if (imageTargetInputId === 'selected-image-url') {
                const formImagePreview = document.querySelector('#image-preview');
                const formImagePlaceholder = document.querySelector('#no-image-text');
                if(formImagePreview && formImagePlaceholder) {
                    formImagePreview.src = imageUrl;
                    formImagePreview.classList.remove('hidden');
                    formImagePlaceholder.classList.add('hidden');
                }
            }
        }
                    closeImageGallery();
                }
            }

if (target.id === 'gallery-upload-btn') {
    const fileInput = galleryModal.querySelector('#gallery-upload-input');
    const feedbackDiv = galleryModal.querySelector('#gallery-upload-feedback');
    const gridContainer = galleryModal.querySelector('.image-grid-container');

    if (fileInput.files.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('url_imagen[]', fileInput.files[i]);
        }
        
        target.textContent = 'Subiendo...';
        target.disabled = true;
        feedbackDiv.textContent = '';
        
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/uploadImage`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            feedbackDiv.textContent = result.message;
            feedbackDiv.style.color = 'green';
            fileInput.value = '';

            // --- INICIO DE LA LÓGICA MEJORADA ---
            // Añadir las nuevas imágenes al principio del caché y de la vista
            if (result.uploaded_images && result.uploaded_images.length > 0) {
                // Añadimos las nuevas imágenes al inicio del array del caché
                galleryCache.images.unshift(...result.uploaded_images);

                // Creamos y añadimos los elementos HTML al inicio de la galería
                result.uploaded_images.reverse().forEach(image => {
                    const item = document.createElement('div');
                    item.className = 'image-grid-item';
                    item.dataset.imageUrl = image.url;
                    item.dataset.imageName = image.name;
                    item.innerHTML = `
                        <img src="${image.url}" alt="${image.name}" loading="lazy">
                        <p class="file-name">${image.name.replace('productos/', '')}</p> 
                        <button class="delete-image-btn" title="Eliminar del bucket">&times;</button>
                    `;
                    gridContainer.prepend(item); // prepend lo añade al inicio
                });
            }

            // Cambiar a la pestaña de selección para ver la imagen subida
            galleryModal.querySelector('.gallery-tab-btn[data-tab="select"]').click();
            // --- FIN DE LA LÓGICA MEJORADA ---

        } catch (error) {
            feedbackDiv.textContent = `Error: ${error.message}`;
            feedbackDiv.style.color = 'red';
        } finally {
            target.textContent = 'Subir Imágenes';
            target.disabled = false;
        }
    } else {
        feedbackDiv.textContent = 'Selecciona uno o más archivos primero.';
    }
}




if (target.matches('.modal-close-btn') || target.id === 'gallery-cancel-btn') {
                closeImageGallery();
            }
        });
    }

mainContent.addEventListener('dblclick', async (event) => {


    const etiquetaCell = event.target.closest('td[data-field="id_etiqueta"]');
    if (etiquetaCell && !etiquetaCell.querySelector('input, select')) {
        
        // Busca el botón "Editar" en la misma fila y simula un clic
        const editButton = etiquetaCell.closest('tr').querySelector('.edit-product-btn');
        if (editButton) {
            editButton.click();
        }
        return; // Detiene la ejecución para no activar otros editores
    }
    const cell = event.target.closest('.editable');
    if (!cell || cell.querySelector('input, select')) return;

    const field = cell.dataset.field;
    const originalText = cell.textContent.trim();
    cell.dataset.originalText = originalText;

    // --- Lógica para menús desplegables (en la tabla de Productos) ---
    if (field === 'id_marca') { // <--- ¡CORREGIDO! Solo se activa para 'id_marca'
        const select = document.createElement('select');
        cell.innerHTML = '';
        cell.appendChild(select);

        const resource = (field === 'id_marca') ? 'admin/getMarcas' : 'admin/getEtiquetas';
        const dataKey = (field === 'id_marca') ? 'marcas' : 'etiquetas';
        const keyField = (field === 'id_marca') ? 'id_marca' : 'id_etiqueta';
        const valueField = (field === 'id_marca') ? 'nombre_marca' : 'nombre_etiqueta';

        await populateSelectWithOptions(select, resource, dataKey, keyField, valueField, `(Sin ${field === 'id_marca' ? 'marca' : 'etiqueta'})`);

        select.value = cell.dataset.id || '';
        select.focus();

        const saveAndClose = async () => {
            const newValue = select.value;
            const originalValue = cell.dataset.id || '';

            if (newValue === originalValue) {
                cell.textContent = originalText;
            } else {
                const row = cell.closest('tr');
                const productId = row.dataset.productId;
                const newText = select.options[select.selectedIndex].text;
                await saveFieldUpdate(productId, field, newValue, cell, newText);
            }
        };

        select.addEventListener('change', saveAndClose);
        select.addEventListener('focusout', () => {
            if (cell.contains(select)) {
                saveAndClose();
            }
        });
    }
    // --- Lógica genérica para campos de texto (para todas las demás celdas editables) ---
    else {
        const originalValue = cell.textContent.replace('$', '').trim();
        cell.innerHTML = `<input type="text" value="${originalValue}" data-original-value="${originalValue}">`;
        const input = cell.querySelector('input');
        input.focus();
        input.select();
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


// En admin/js/admin.js, reemplaza la función initializeWebAdminControls completa por esta:
async function initializeWebAdminControls() {
    // Apuntamos al contenedor general del módulo
    const moduleContainer = document.querySelector('.module-header')?.parentElement;
    if (!moduleContainer) return;

    // Función para guardar TODOS los ajustes
    const saveAllSettings = async () => {
        const settingsToSave = {};
        // Recolecta los valores de TODOS los campos de configuración
        moduleContainer.querySelectorAll('.admin-config-input, .switch').forEach(input => {
            const key = input.id;
            const value = input.type === 'checkbox' ? input.checked : (input.tagName === 'SELECT' ? parseInt(input.value, 10) : input.value);
            settingsToSave[key] = value;
        });

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/saveLayoutSettings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsToSave) // Envía el objeto completo
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            console.log('Configuración guardada con éxito.'); // Feedback en la consola
        } catch (error) {
            console.error('Error al guardar la configuración:', error);
        }
    };

    // Carga inicial de datos
    try {
        const response = await fetch(`${API_BASE_URL}?resource=layout-settings`);
        const result = await response.json();
        if (result.success && result.settings) {
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
        console.error('Error al cargar la configuración inicial:', error);
    }

    // Listener para los botones de las pestañas
    const tabButtons = moduleContainer.querySelectorAll('.action-ribbon .action-btn[data-tab]');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            moduleContainer.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(`tab-content-${button.dataset.tab}`).classList.add('active');
        });
    });

    // Listener para cualquier cambio en los campos para autoguardar
    moduleContainer.addEventListener('change', (event) => {
        if (event.target.matches('.switch, .admin-config-input')) {
            saveAllSettings();
        }
    });

    // Inicializar funcionalidad de anuncios si existe la pestaña
    if (document.getElementById('tab-content-ads')) {
        initializeAdsManagement();
    }
}


async function initializeAdsManagement() {
    const adsForm = document.getElementById('ads-form');
    const adsList = document.getElementById('ads-list');
    const cancelEditBtn = document.getElementById('cancel-edit');
    let editingAdId = null;

    // --- INICIO: Lógica del Generador de URL (ACTUALIZADA) ---
    const linkTypeSelector = document.getElementById('link-type-selector');
    const departmentGenerator = document.getElementById('department-link-generator');
    const productGenerator = document.getElementById('product-link-generator');
    const brandGenerator = document.getElementById('brand-link-generator'); // Nuevo
    const typeGenerator = document.getElementById('type-link-generator');   // Nuevo

    const departmentSelector = document.getElementById('department-selector');
    const productSearchInput = document.getElementById('product-search-input-ads');
    const productSearchResults = document.getElementById('product-search-results-ads');
    const brandSelector = document.getElementById('brand-selector');       // Nuevo

    const typeSelector = document.getElementById('type-selector'); // <-- MODIFICADO (antes era typeInput)    
    const linkDecoratorInput = document.getElementById('link-decorator');
    const urlEnlaceInput = document.getElementById('ads-url-enlace');
    
    let selectedProductId = null;
    let searchDebounce;
    let areBrandsLoaded = false; // Control para cargar marcas solo una vez
    let areEtiquetasLoaded = false;
    function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    // --- FUNCIÓN DE GENERACIÓN DE URL MODIFICADA --

async function loadEtiquetas() {
        if (areEtiquetasLoaded) return;
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getEtiquetas`);
            const result = await response.json();
            if (result.success && result.etiquetas) {
                typeSelector.innerHTML = '<option value="">-- Selecciona una etiqueta --</option>';
                result.etiquetas.forEach(etiqueta => {
                    const option = new Option(etiqueta.nombre_etiqueta, etiqueta.id_etiqueta);
                    typeSelector.add(option);
                });
                areEtiquetasLoaded = true;
            } else {
                typeSelector.innerHTML = '<option value="">Error al cargar</option>';
            }
        } catch (error) {
            typeSelector.innerHTML = '<option value="">Error de conexión</option>';
        }
    }


function generateUrl() {
    const path = window.location.pathname;
    const subdirectory = path.substring(0, path.indexOf('/admin'));
    const baseURL = window.location.origin + subdirectory + '/public_html/';

    const type = linkTypeSelector.value;
    const mainSlug = slugify(linkDecoratorInput.value.trim());
    const brandSlug = brandSelector.value ? slugify(brandSelector.options[brandSelector.selectedIndex].text) : '';
    
    // --- MODIFICACIÓN CLAVE ---
    // Se obtiene el texto de la etiqueta seleccionada en lugar de un input de texto.
    const typeSlug = typeSelector.value ? slugify(typeSelector.options[typeSelector.selectedIndex].text) : '';
    // --- FIN DE LA MODIFICACIÓN ---

    let generatedUrl = '';
    
    if (type === 'departamento') {
        if (mainSlug) generatedUrl = `${baseURL}departamento/${mainSlug}`;
    } else if (type === 'producto') {
        if (mainSlug) generatedUrl = `${baseURL}producto/${mainSlug}`;
    } else if (type === 'ofertas') {
        if (mainSlug) generatedUrl = `${baseURL}ofertas/${mainSlug}`;
    } else if (type === 'todos') {
        if (mainSlug) generatedUrl = `${baseURL}productos/${mainSlug}`;
    } 
    else if (type === 'marca') {
        if (brandSlug) {
            generatedUrl = `${baseURL}${brandSlug}`;
        }
    } else if (type === 'marca_tipo') {
        if (brandSlug && typeSlug) {
            generatedUrl = `${baseURL}${brandSlug}/${typeSlug}`;
        } else if (brandSlug) {
            generatedUrl = `${baseURL}${brandSlug}`;
        }
    }

    urlEnlaceInput.value = generatedUrl;
}


/*function generateUrl() {
    // En producción, la URL base es simplemente tu dominio.
    const baseURL = 'https://diezyquince.store/'; 

    const type = linkTypeSelector.value;
    const mainSlug = slugify(linkDecoratorInput.value.trim());
    const brandSlug = brandSelector.value ? slugify(brandSelector.options[brandSelector.selectedIndex].text) : '';
    
    // --- CORRECCIÓN ---
    // Se utiliza typeSelector para obtener el texto de la etiqueta seleccionada.
    const typeSlug = typeSelector.value ? slugify(typeSelector.options[typeSelector.selectedIndex].text) : '';

    let generatedUrl = '';

    if (type === 'departamento') {
        if (mainSlug) generatedUrl = `${baseURL}departamento/${mainSlug}`;
    } else if (type === 'producto') {
        if (mainSlug) generatedUrl = `${baseURL}producto/${mainSlug}`;
    } else if (type === 'ofertas') {
        if (mainSlug) generatedUrl = `${baseURL}ofertas/${mainSlug}`;
    } else if (type === 'todos') {
        if (mainSlug) generatedUrl = `${baseURL}productos/${mainSlug}`;
    } 
    else if (type === 'marca') {
        if (brandSlug) {
            generatedUrl = `${baseURL}${brandSlug}`;
        }
    } else if (type === 'marca_tipo') {
        if (brandSlug && typeSlug) {
            generatedUrl = `${baseURL}${brandSlug}/${typeSlug}`;
        } else if (brandSlug) {
            generatedUrl = `${baseURL}${brandSlug}`;
        }
    }

    urlEnlaceInput.value = generatedUrl;
}
   */ 
    // --- NUEVA FUNCIÓN PARA CARGAR MARCAS ---
async function loadBrands() {
    if (areBrandsLoaded) return;
    try {
        const response = await fetch(`${API_BASE_URL}?resource=get_marcas_para_anuncios`);
        const result = await response.json();
        if (result.success && result.marcas) {
            brandSelector.innerHTML = '<option value="">-- Selecciona una marca --</option>';
            result.marcas.forEach(marca => {
                // ✅ CORRECCIÓN AQUÍ: Cambiamos 'marca.marca' por 'marca.nombre_marca'
                const option = new Option(marca.nombre_marca, marca.id_marca);
                brandSelector.add(option);
            });
            areBrandsLoaded = true;
        } else {
            brandSelector.innerHTML = '<option value="">Error al cargar</option>';
        }
    } catch (error) {
        brandSelector.innerHTML = '<option value="">Error de conexión</option>';
    }
}

    async function populateDepartmentSelect() {
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getDepartments`);
            const result = await response.json();
            if (result.success && result.departments) {
                departmentSelector.innerHTML = '<option value="">-- Selecciona un departamento --</option>';
                result.departments.forEach(dept => {
                    const option = new Option(dept.departamento, dept.id_departamento);
                    departmentSelector.appendChild(option);
                });
            }
        } catch (error) {
            departmentSelector.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    // --- EVENT LISTENER DEL SELECTOR PRINCIPAL (MODIFICADO) ---
    if(linkTypeSelector) {
        linkTypeSelector.addEventListener('change', () => {
            const selectedType = linkTypeSelector.value;

            // Ocultar todos los generadores
            departmentGenerator.classList.add('hidden');
            productGenerator.classList.add('hidden');
            brandGenerator.classList.add('hidden');
            typeGenerator.classList.add('hidden');
            
            // Limpiar campos
            linkDecoratorInput.value = '';
            urlEnlaceInput.value = '';
            productSearchInput.value = '';
            typeSelector.value = '';
            selectedProductId = null;

            // Mostrar el generador correspondiente
            switch (selectedType) {
                case 'departamento':
                    departmentGenerator.classList.remove('hidden');
                    break;
                case 'producto':
                    productGenerator.classList.remove('hidden');
                    break;
                case 'marca':
                    brandGenerator.classList.remove('hidden');
                    loadBrands(); // Carga las marcas si es necesario
                    break;
                case 'marca_tipo':
                    brandGenerator.classList.remove('hidden');
                    typeGenerator.classList.remove('hidden');
                    loadBrands(); // Carga las marcas si es necesario
                    loadEtiquetas();
                    break;
                case 'ofertas':
                    linkDecoratorInput.value = 'ofertas-especiales';
                    generateUrl();
                    break;
                case 'todos':
                    linkDecoratorInput.value = 'catalogo-completo';
                    generateUrl();
                    break;
            }
        });
    }

    // --- EVENT LISTENERS (EXISTENTES Y NUEVOS) ---
    if (departmentSelector) {
        departmentSelector.addEventListener('change', (e) => {
            const selectedText = e.target.options[e.target.selectedIndex].text;
            linkDecoratorInput.value = slugify(selectedText);
            generateUrl();
        });
    }
    
    if (productSearchInput) {
        productSearchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            const query = productSearchInput.value.trim();
            if (query.length < 2) {
                productSearchResults.style.display = 'none';
                return;
            }
            searchDebounce = setTimeout(async () => {
                const response = await fetch(`${API_BASE_URL}?resource=admin/getProducts&search=${encodeURIComponent(query)}&limit=10`);
                const result = await response.json();
                productSearchResults.innerHTML = '';
                if (result.success && result.products.length > 0) {
                    result.products.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'search-result-item';
                        item.textContent = `(${p.codigo_producto}) ${p.nombre_producto}`;
                        item.dataset.productId = p.id_producto;
                        item.dataset.productName = p.nombre_producto;
                        productSearchResults.appendChild(item);
                    });
                    productSearchResults.style.display = 'block';
                } else {
                    productSearchResults.style.display = 'none';
                }
            }, 300);
        });
    }

    if (productSearchResults) {
        productSearchResults.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-result-item')) {
                productSearchInput.value = e.target.textContent;
                selectedProductId = e.target.dataset.productId;
                linkDecoratorInput.value = slugify(e.target.dataset.productName);
                productSearchResults.style.display = 'none';
                generateUrl();
            }
        });
    }
    
    // Nuevos listeners para marca y tipo
    if (brandSelector) {
brandSelector.addEventListener('change', (e) => {
        // Obtenemos el texto de la marca seleccionada
        const selectedText = e.target.options[e.target.selectedIndex].text;

        // Rellenamos el decorador con el nombre de la marca
        linkDecoratorInput.value = slugify(selectedText);

        // Ahora generamos la URL con el decorador ya establecido
        generateUrl();
    });    }
    if (typeSelector) {
        typeSelector.addEventListener('input', generateUrl);
    }

    if (linkDecoratorInput) {
        linkDecoratorInput.addEventListener('input', generateUrl);
    }
    
    document.addEventListener('click', (e) => {
        if (!productGenerator.contains(e.target)) {
            productSearchResults.style.display = 'none';
        }
    });

    populateDepartmentSelect();
    // --- FIN: Lógica del Generador de URL ---


    // Cargar anuncios al inicializar (sin cambios)
    await loadAds();

    // Event listener para el formulario (sin cambios)
    adsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAd();
    });

    // Event listener para cancelar edición (sin cambios)
    cancelEditBtn.addEventListener('click', () => {
        resetForm();
    });

    // Función para cargar anuncios (sin cambios)
    async function loadAds() {
        try {
            const response = await fetch('api/anuncios_web.php');
            const result = await response.json();
            
            if (result.success) {
                displayAds(result.data);
            } else {
                console.error('Error al cargar anuncios:', result.error);
            }
        } catch (error) {
            console.error('Error al cargar anuncios:', error);
        }
    }

    // Función para mostrar anuncios en la lista (sin cambios)
    function displayAds(ads) {
        adsList.innerHTML = '';
        if (ads.length === 0) {
            adsList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 2rem;">No hay anuncios registrados</p>';
            return;
        }
        ads.forEach(ad => {
            const adElement = createAdElement(ad);
            adsList.appendChild(adElement);
        });
    }

    // Función para crear elemento de anuncio (sin cambios)
    function createAdElement(ad) {
        const div = document.createElement('div');
        div.className = 'ad-item';
        div.innerHTML = `
            <div class="ad-item-header">
                <h5 class="ad-item-title">${ad.titulo}</h5>
                <span class="ad-item-type ${ad.tipo}">${ad.tipo === 'slider_principal' ? 'Carrusel Principal' : 'Columna Derecha'}</span>
            </div>
            <div class="ad-item-actions">
                <button class="btn-edit" onclick="editAd(${ad.id_anuncio})">Editar</button>
                <button class="btn-delete" onclick="deleteAd(${ad.id_anuncio})">Eliminar</button>
            </div>
            <div class="ad-item-details">
                <div><strong>URL Imagen:</strong> ${ad.url_imagen}</div>
                ${ad.url_enlace ? `<div><strong>URL Destino:</strong> ${ad.url_enlace}</div>` : ''}
                <div><strong>Orden:</strong> ${ad.orden}</div>
                <div><strong>Estado:</strong> ${ad.activo ? 'Activo' : 'Inactivo'}</div>
                <div><strong>Creado:</strong> ${new Date(ad.fecha_creacion).toLocaleDateString()}</div>
            </div>
            <div class="ad-preview">
                <img src="${ad.url_imagen}" alt="${ad.titulo}" onerror="this.style.display='none'">
            </div>
        `;
        return div;
    }

    // Función para guardar anuncio (sin cambios)
    async function saveAd() {
        const formData = new FormData(adsForm);
        const data = {
            titulo: formData.get('titulo'),
            url_imagen: formData.get('url_imagen'),
            url_enlace: formData.get('url_enlace') || null,
            tipo: formData.get('tipo'),
            orden: parseInt(formData.get('orden')) || 0,
            activo: formData.get('activo') ? 1 : 0
        };

        if (editingAdId) {
            data.id_anuncio = editingAdId;
        }

        try {
            const response = await fetch('api/anuncios_web.php', {
                method: editingAdId ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                resetForm();
                await loadAds();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error al guardar anuncio:', error);
            alert('Error al guardar el anuncio');
        }
    }

    // Función para editar anuncio (sin cambios)
    window.editAd = async function(id) {
        try {
            const response = await fetch('api/anuncios_web.php');
            const result = await response.json();
            if (result.success) {
                const ad = result.data.find(a => a.id_anuncio == id);
                if (ad) {
                    editingAdId = id;
                    document.getElementById('ads-titulo').value = ad.titulo;
                    document.getElementById('ads-url-imagen').value = ad.url_imagen;
                    document.getElementById('ads-url-enlace').value = ad.url_enlace || '';
                    document.getElementById('ads-tipo').value = ad.tipo;
                    document.getElementById('ads-orden').value = ad.orden;
                    document.getElementById('ads-activo').checked = ad.activo == 1;
                    
                    document.querySelector('#ads-form button[type="submit"]').textContent = 'Actualizar Anuncio';
                    cancelEditBtn.style.display = 'inline-block';
                    window.scrollTo(0, 0);
                }
            }
        } catch (error) {
            console.error('Error al cargar anuncio para editar:', error);
        }
    };

    // Función para eliminar anuncio (sin cambios)
    window.deleteAd = async function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este anuncio?')) return;
        try {
            const response = await fetch('api/anuncios_web.php', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id_anuncio: id })
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                await loadAds();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error al eliminar anuncio:', error);
            alert('Error al eliminar el anuncio');
        }
    };

    // --- FUNCIÓN PARA RESETEAR FORMULARIO (MODIFICADA) ---
    function resetForm() {
        adsForm.reset();
        editingAdId = null;
        document.querySelector('#ads-form button[type="submit"]').textContent = 'Guardar Anuncio';
        cancelEditBtn.style.display = 'none';

        // Resetear el generador de URL
        departmentGenerator.classList.add('hidden');
        productGenerator.classList.add('hidden');
        brandGenerator.classList.add('hidden'); // Ocultar nuevo campo
        typeGenerator.classList.add('hidden');  // Ocultar nuevo campo
        linkTypeSelector.value = 'manual';
        linkDecoratorInput.value = '';
        productSearchInput.value = '';
        typeSelector.value = '';

        selectedProductId = null;
    }
}


// PASO 2: REEMPLAZA CUALQUIER listener 'focusout' por este bloque único
mainContent.addEventListener('focusout', (event) => {
    if (event.target.tagName === 'INPUT' && event.target.parentElement.classList.contains('editable')) {
        const input = event.target;
        const cell = input.parentElement;
        const originalValue = input.dataset.originalValue;
        const newValue = input.value.trim();
        
        if (newValue === originalValue || newValue === '') {
            cell.textContent = originalValue;
            if (cell.dataset.field === 'precio_venta') {
                cell.textContent = `$${parseFloat(originalValue).toFixed(2)}`;
            }
            return;
        }

        const row = cell.closest('tr');
        const itemDiv = cell.closest('.bucket-item');

        if (row) {
            const productId = row.dataset.productId;
            const departmentId = row.dataset.departmentId;
            const tiendaId = row.dataset.tiendaId;
            const proveedorId = row.dataset.proveedorId;
            const marcaId = row.dataset.marcaId;
            const etiquetaId = row.dataset.etiquetaId; 
            const field = cell.dataset.field;

            if (productId) saveFieldUpdate(productId, field, newValue, cell);
            else if (departmentId) saveDepartmentFieldUpdate(departmentId, field, newValue, cell);
            else if (tiendaId) saveTiendaFieldUpdate(tiendaId, field, newValue, cell);
            else if (proveedorId) saveProveedorFieldUpdate(proveedorId, field, newValue, cell);
            else if (marcaId) saveMarcaFieldUpdate(marcaId, field, newValue, cell);
            else if (etiquetaId) saveEtiquetaFieldUpdate(etiquetaId, field, newValue, cell); 
            }else if (itemDiv) {
            saveBucketImageRename(itemDiv, newValue, cell);
        }
    }
});

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


// REEMPLAZA ESTA FUNCIÓN COMPLETA EN: admin/js/admin.js
function initializeDepartmentManagement() {
    const createForm = document.getElementById('create-department-form');
    
    if (!createForm) {
        fetchAndRenderDepartments();
        return;
    }

    const nameInput = document.getElementById('departamento');
    const codeInput = document.getElementById('codigo_departamento');
    const feedbackDiv = document.getElementById('create-department-feedback');
    // CORRECCIÓN CLAVE: El selector ahora busca un botón DENTRO del formulario
    const submitButton = createForm.querySelector('button[type="submit"]');

    async function preloadNextDepartmentCode() {
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/getNextDepartmentCode`);
            const result = await response.json();
            if (result.success) {
                codeInput.value = result.next_code;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error al obtener el siguiente código:", error);
            if(feedbackDiv) feedbackDiv.innerHTML = `<div class="message error">No se pudo generar un código. Recarga la página.</div>`;
        }
    }

    createForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // ¡Previene la recarga!
        
        if (!submitButton) {
            console.error("Error crítico: El botón de envío no fue encontrado.");
            feedbackDiv.innerHTML = `<div class="message error">Error de interfaz: Botón no encontrado.</div>`;
            return;
        }

        const data = {
            departamento: nameInput.value.trim(),
            codigo_departamento: codeInput.value.trim()
        };

        if (!data.departamento || !data.codigo_departamento) {
            feedbackDiv.innerHTML = `<div class="message error">Error: El nombre es obligatorio y el código no se pudo generar.</div>`;
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/createDepartment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }
            
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            createForm.reset(); 
            
            await fetchAndRenderDepartments(); 
            await preloadNextDepartmentCode(); 

            setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);
        } catch (error) {
            feedbackDiv.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Crear Departamento';
        }
    });

    // Carga inicial
    fetchAndRenderDepartments();
    preloadNextDepartmentCode();
    applyCapitalization('departamento');
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
            const responseText = await response.text();
            let result;

            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error("La respuesta del servidor no es un JSON válido:", responseText);
                throw new Error("El servidor devolvió un error inesperado. Revisa la consola del navegador (F12).");
            }

            if (result.success) {
                resultsDiv.innerHTML = `<div class="message success">${result.message} Iniciando descarga...</div>`;

                const link = document.createElement('a');
                link.href = `../api/${result.download_url}`;
                link.setAttribute('download', result.file_name);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // ✅ --- CAMBIO CLAVE --- ✅
                // En lugar de recargar toda la página, volvemos a cargar solo
                // el contenido de la acción de copias de seguridad.
                setTimeout(() => {
                    loadActionContent('utilidades/copia_seguridad');
                }, 2000);

            } else {
                let errorMessage = result.message || 'Ocurrió un error desconocido.';
                if (result.details) {
                    errorMessage += `<br><strong>Detalles:</strong><pre>${result.details}</pre>`;
                }
                throw new Error(errorMessage);
            }

        } catch (error) {
            resultsDiv.innerHTML = `<div class="message error">${error.message}</div>`;
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
        const response = await fetch('api/procesador_imagenes.php?resource=get_processed_images');
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
    const downloadBtn = document.getElementById('download-zip-btn'); // <-- LÍNEA AÑADIDA

    // Si no hay nada seleccionado, los botones se desactivan
    if (uploadBtn) uploadBtn.disabled = checkedBoxes === 0;
    if (downloadBtn) downloadBtn.disabled = checkedBoxes === 0;
}








    initializeSidemenu();
    checkSidemenuState();
    loadModule('dashboard');
    updateHeaderUserInfo();

















// REEMPLAZA ESTA FUNCIÓN EN: admin/js/admin.js

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
    
    // --- ✅ CORRECCIÓN APLICADA ---
    // Se añaden los parámetros de fecha a la llamada de esta función para que los filtros coincidan.
    await fetchAndRenderProductStats(startDateInput.value, endDateInput.value, initialStoreId);
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
                <ol style="padding-left: .5rem;">
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







// EN: admin/js/admin.js

function renderSalesChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (!ctx) return;

    if (window.mySalesChart instanceof Chart) {
        window.mySalesChart.destroy();
    }

    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); 
        return;
    }

    const chartColors = [
        'rgba(12, 10, 78, 1)',    
        'rgba(231, 76, 60, 1)',   
        'rgba(46, 204, 113, 1)',  
        'rgba(241, 196, 15, 1)',  
        'rgba(155, 89, 182, 1)',  
        'rgba(52, 152, 219, 1)'   
    ];
    
    const labels = chartData.labels;

    const datasets = chartData.datasets.map((storeData, index) => {
        const color = chartColors[index % chartColors.length];
        return {
            label: storeData.store_name,
            data: storeData.data,
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            borderWidth: 1,
            tension: 0,       // ✅ Suaviza la línea
            pointRadius: 1,     // ✅ Elimina los puntos visibles
            pointHoverRadius: 2, // ✅ El punto aparece al pasar el ratón
            fill: false
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
            maintainAspectRatio: true
        }
    });
}












async function loadStatisticsWidgets() {


    const endDateInput = document.getElementById('end-date');
    const startDateInput = document.getElementById('start-date');
    const storeFilter = document.getElementById('stats-store-filter');

    // Helper para formatear fecha a YYYY-MM-DD
    const formatDate = (date) => {
        // Añadimos una validación extra por si acaso
        if (!(date instanceof Date) || isNaN(date)) {
            console.error("Error en formatDate: Se recibió un valor inválido:", date);
            return ''; // Devolver vacío si la fecha no es válida
        }
        try {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("Excepción en formatDate:", e);
            return '';
        }
    };

    // --- MODIFICACIÓN AQUÍ: FECHAS POR DEFECTO AÑO ACTUAL ---
    const today = new Date();
    const currentYear = today.getFullYear();
    const startDate = new Date(currentYear, 0, 1); // currentYear, 0, 1 ----- 1 de Enero del año actual
    const endDate = today; // La fecha actual
 
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // Asignar las fechas a los inputs y verificar si existen
    if (startDateInput) {
        startDateInput.value = formattedStartDate;
    } else {
        console.error("Error crítico: Input #start-date NO encontrado en el DOM."); // DEBUG
    }
    if (endDateInput) {
        endDateInput.value = formattedEndDate;
    } 

    // Obtener el ID de tienda inicial (si existe)
    const initialStoreId = storeFilter ? storeFilter.value : null;

    // Cargar los widgets con las fechas por defecto
    // Asegurarse de que los inputs tengan valor antes de llamar a las funciones
    if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {

        await fetchAndRenderSalesSummary(startDateInput.value, endDateInput.value, initialStoreId);
        await fetchAndRenderProductStats(startDateInput.value, endDateInput.value, initialStoreId);
    } else {

        const salesWidget = document.getElementById('sales-summary-widget');
        if(salesWidget) salesWidget.innerHTML = '<p style="color:red;">Error al inicializar las fechas. Revisa la consola (F12).</p>';
    }

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
        // Se corrige el selector para que la lógica funcione correctamente
        if (!actionContent.querySelector('.lista-compras-container')) {
            // Se corrige el fetch para pasar el ID y cargar la vista correcta
            const response = await fetch(`actions/listas_compras/ver_lista.php?id=${listId}`);
            actionContent.innerHTML = await response.text();
        }

        const detailsResponse = await fetch(`${API_BASE_URL}?resource=admin/getShoppingListDetails&id_lista=${listId}`);
        const detailsResult = await detailsResponse.json();

        if (detailsResult.success) {
            document.getElementById('list-name-header').textContent = `Editando Lista: ${detailsResult.listName}`;
            renderListItems(detailsResult.items, existingItemIds); // Tu llamada original
            initializeListViewInteractions(listId); // Tu llamada original
            
            // --- ✅ LÍNEA INTEGRADA ---
            // Se añade la reinicialización del resize después de renderizar
            initializeResizableColumns('#list-items-table', 'shoppingListTableWidths'); 

        } else {
            throw new Error(detailsResult.error);
        }
    } catch (error) {
        actionContent.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
}




function renderListItems(items, existingItemIds) { // Se mantiene el parámetro que pasas
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
            <td><input type="number" class="editable-field" data-field="cantidad" value="${item.cantidad}" min="0"></td>
            <td><button class="action-btn btn-sm btn-danger remove-item-btn">&times;</button></td>
        `;
        tbody.appendChild(row);
    });
}

// Reemplaza también esta función completa en tu archivo admin.js




function initializeListViewInteractions(listId) {
    const searchInput = document.getElementById('product-search-for-list');
    const searchResults = document.getElementById('product-search-results-list');
    const manualForm = document.getElementById('manual-add-product-form');
    const itemsTbody = document.getElementById('list-items-tbody');
    let searchTimer;

    // Búsqueda de productos (sin cambios)
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

    // === INICIO DE LA CORRECCIÓN IMPORTANTE ===
    // Se reemplaza addEventListener por onsubmit para evitar envíos múltiples.
    // Esto asegura que la función de envío solo se defina UNA vez.
    manualForm.onsubmit = async (e) => {
        e.preventDefault(); // Previene que la página se recargue
        const feedbackDiv = document.getElementById('manual-add-feedback');
        const data = {
            id_lista: listId,
            nombre_producto: document.getElementById('manual_product_name').value,
            precio_compra: document.getElementById('manual_purchase_price').value,
            cantidad: 0 //Controla la cantidad cuando el item se agrega mnualmente a la lista
        };
        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/addManualProductToList`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            manualForm.reset(); // Limpia los campos del formulario
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            
            await loadAndRenderListView(listId); // Recarga la lista con el nuevo item
            
            setTimeout(() => { feedbackDiv.innerHTML = ''; }, 2500);
        } catch (error) {
            feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
        }
    };
    // === FIN DE LA CORRECCIÓN IMPORTANTE ===

    // Ocultar resultados de búsqueda si se hace clic fuera
    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });
    
    // Eventos de la tabla (editar, tachar, eliminar)
itemsTbody.addEventListener('change', async (e) => {
    const target = e.target;
    const row = target.closest('tr');
    if (!row) return;
    const itemId = row.dataset.itemId;

    if (target.classList.contains('editable-field')) {
        // Lógica para actualizar campos editables (sin cambios aquí)
        await updateListItem(itemId, target.dataset.field, target.value);

    } else if (target.classList.contains('mark-item-checkbox')) {
        // --- INICIO DE LA LÓGICA CORREGIDA PARA MARCAR/DESMARCAR ---
        try {
            // Llama a la API para cambiar el estado 'marcado' en la BD
            const response = await fetch(`${API_BASE_URL}?resource=admin/toggleListItemMark`, { // Se usa API_BASE_URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_item_lista: itemId })
            });
            const result = await response.json();

            // Si la API confirma el cambio
            if (result.success) {
                // 1. Aplica o quita la clase CSS para los estilos base de marcado/desmarcado
                row.classList.toggle('item-marked', result.newState);

                // 2. FORZAR ESTILOS VISUALES CON JAVASCRIPT:
                if (result.newState) {
                    // Si se MARCÓ: Opcionalmente, puedes forzar estilos aquí si la clase CSS falla
                    // row.style.textDecoration = 'line-through';
                    // row.style.backgroundColor = '#050421'; // Ajusta este color si es diferente
                    // row.style.color = 'white';
                    // row.style.opacity = '0.8';
                    // row.querySelectorAll('td, input').forEach(el => el.style.color = 'inherit');
                } else {
                    // Si se DESMARCÓ: Resetea explícitamente los estilos inline
                    row.style.textDecoration = '';
                    row.style.backgroundColor = '';
                    row.style.color = '';
                    row.style.opacity = '';

                    // Resetea estilos de celdas e inputs internos
                    row.querySelectorAll('td, input').forEach(el => {
                        el.style.color = '';
                        el.style.backgroundColor = '';
                    });
                }
            } else {
                // Si la API falla (devuelve success: false), revierte el checkbox
                target.checked = !target.checked;
                alert('Error al actualizar el estado del item: ' + (result.error || 'Error desconocido')); // Informa al usuario
            }
        } catch (error) {
            // Error de conexión o similar
            console.error("Error al marcar/desmarcar item:", error);
            target.checked = !target.checked; // Revierte el checkbox visualmente
            alert('Error de conexión al intentar actualizar el estado del item.'); // Informa al usuario
        }
    }
});
    
    itemsTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const row = e.target.closest('tr');
            await removeProductFromList(row.dataset.itemId, row);
        }
    });
    
    // Botones de la cabecera
    document.querySelector('.header-actions')?.addEventListener('click', async (e) => {
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
            document.querySelector('.action-btn[data-action="listas_compras/gestion"]').click();
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
    applyCapitalization('nombre_tienda');
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
    applyCapitalization('nombre_proveedor');
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







// EN: admin/js/admin.js (REEMPLAZA ESTA FUNCIÓN)
function initializeBarcodeGenerator() {
    const form = document.getElementById('generate-barcodes-form');
    const feedbackDiv = document.getElementById('generator-feedback');
    const resultsContainer = document.getElementById('results-container');
    const outputTextarea = document.getElementById('generated-codes-output');
    const copyBtn = document.getElementById('copy-codes-btn');
    const previewContainer = document.getElementById('barcode-preview-container');
    const downloadBtn = document.getElementById('download-barcodes-btn');

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
        previewContainer.innerHTML = '<p>Generando previsualizaciones...</p>';
        downloadBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}?resource=admin/generateEan13Codes&quantity=${quantity}`);
            const result = await response.json();

            if (result.success && result.codes) {
                const codes = result.codes;
                outputTextarea.value = codes.join('\n');
                resultsContainer.style.display = 'block';
                feedbackDiv.innerHTML = `<div class="message success">¡Se generaron ${codes.length} códigos con éxito!</div>`;
                
                previewContainer.innerHTML = '';
                codes.slice(0, 10).forEach(code => {
                    const barcodeApiUrl = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=EAN13&dpi=96`;
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'barcode-image-wrapper';
                    imgContainer.innerHTML = `
                        <img src="${barcodeApiUrl}" alt="Código de barras para ${code}">
                        <span>${code}</span>
                    `;
                    previewContainer.appendChild(imgContainer);
                });
                if(codes.length > 10) {
                    previewContainer.insertAdjacentHTML('beforeend', '<p>Mostrando 10 de ' + codes.length + ' códigos...</p>');
                }
                downloadBtn.disabled = false;
                
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

    // --- INICIO DE LA LÓGICA DE DESCARGA CORREGIDA ---
    downloadBtn.addEventListener('click', () => {
        const codes = outputTextarea.value.split('\n').filter(Boolean);
        if (codes.length === 0) return;

        const downloadForm = document.createElement('form');
        downloadForm.method = 'POST';
        // --- RUTA CORREGIDA ---
        downloadForm.action = '../api/download_barcodes.php'; 
        downloadForm.target = '_blank';

        const codesInput = document.createElement('input');
        codesInput.type = 'hidden';
        codesInput.name = 'codes';
        codesInput.value = JSON.stringify(codes);
        downloadForm.appendChild(codesInput);

        document.body.appendChild(downloadForm);
        downloadForm.submit();
        document.body.removeChild(downloadForm);
    });
    // --- FIN DE LA LÓGICA DE DESCARGA CORREGIDA ---
}





function initializeBucketManager() {
        const gridContainer = document.getElementById('bucket-image-grid');
        const loadingIndicator = document.getElementById('bucket-loading-indicator');
        const feedbackDiv = document.getElementById('bucket-manager-feedback');
        const selectAllCheckbox = document.getElementById('select-all-bucket-images');
        const downloadZipBtn = document.getElementById('download-bucket-zip-btn');

        if (!gridContainer) return;
        
        // Esta función ahora usará la variable 'bucketCache' que definimos arriba.
        async function loadBucketImages() {
            if (bucketCache.isLoading || !bucketCache.hasMore) return;
            bucketCache.isLoading = true;
            loadingIndicator.style.display = 'block';

            try {
                const response = await fetch(`api/procesador_imagenes.php?resource=get_bucket_images&page=${bucketCache.page}`);
                const result = await response.json();

                if (result.success && result.images.length > 0) {
                    result.images.forEach(image => {
                        // Evita duplicados si la función se llama accidentalmente
                        if (!bucketCache.images.some(img => img.name === image.name)) {
                            bucketCache.images.push(image);
                            gridContainer.appendChild(createBucketItemElement(image));
                        }
                    });
                    bucketCache.page++;
                    bucketCache.hasMore = result.has_more;
                } else {
                    bucketCache.hasMore = false;
                    if (bucketCache.page === 1) gridContainer.innerHTML = '<p style="text-align:center;">No hay imágenes.</p>';
                }
            } catch (error) {
                feedbackDiv.innerHTML = `<div class="message error">Error al cargar: ${error.message}</div>`;
            } finally {
                bucketCache.isLoading = false;
                loadingIndicator.style.display = 'none';
            }
        }
        
        function createBucketItemElement(image) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'bucket-item';
            itemDiv.dataset.imageName = image.name;
            itemDiv.innerHTML = `
                <input type="checkbox" class="file-selector bucket-file-checkbox">
                <img src="${image.url}" alt="${image.name}" loading="lazy">
                <p class="file-name editable" data-field="name">${image.name.replace('productos/', '')}</p>
                <div class="bucket-item-actions">
                    <a href="api/download_images.php?file=${encodeURIComponent(image.name)}" class="action-btn" title="Descargar">📥</a>
                    <button class="action-btn delete-btn" title="Eliminar">❌</button>
                </div>
            `;
            return itemDiv;
        }
        
        // Limpia la vista y la reconstruye desde la caché si ya hay imágenes
        gridContainer.innerHTML = '';
        if (bucketCache.images.length > 0) {
            bucketCache.images.forEach(image => {
                gridContainer.appendChild(createBucketItemElement(image));
            });
        }
        
        // Si no hay nada en caché, carga la primera página
        if (bucketCache.images.length === 0) {
            loadBucketImages();
        }

        gridContainer.addEventListener('scroll', () => {
            if (gridContainer.scrollTop + gridContainer.clientHeight >= gridContainer.scrollHeight - 150) {
                loadBucketImages();
            }
        });

        selectAllCheckbox.addEventListener('change', (e) => {
            gridContainer.querySelectorAll('.bucket-file-checkbox').forEach(cb => cb.checked = e.target.checked);
            downloadZipBtn.disabled = gridContainer.querySelectorAll('.bucket-file-checkbox:checked').length === 0;
        });

        downloadZipBtn.addEventListener('click', () => {
            const selectedFiles = Array.from(gridContainer.querySelectorAll('.bucket-file-checkbox:checked'))
                .map(cb => cb.closest('.bucket-item').dataset.imageName);
            if (selectedFiles.length === 0) return;
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'api/download_images.php';
            form.target = '_blank';
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'bucket_files';
            input.value = JSON.stringify(selectedFiles);
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        });
}





async function saveBucketImageRename(itemDiv, newValue, cell) {
    const feedbackDiv = document.getElementById('bucket-manager-feedback');
    const originalText = cell.querySelector('input').dataset.originalValue;
    const oldName = itemDiv.dataset.imageName;
    cell.textContent = 'Guardando...';

    try {
        const response = await fetch(`api/procesador_imagenes.php?resource=rename_bucket_image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName: oldName, newName: newValue })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        const newObjectKey = result.newName;
        const newBaseName = newObjectKey.replace('productos/', '');

        cell.textContent = newBaseName;
        itemDiv.dataset.imageName = newObjectKey;
        
        const img = itemDiv.querySelector('img');
        if (img) {
            const oldUrl = new URL(img.src);
            const newUrl = `${oldUrl.origin}/${newObjectKey}`;
            img.src = `${newUrl}?t=${new Date().getTime()}`;
        }
        
        const cachedImage = window.bucketCache.images.find(img => img.name === oldName);
        if (cachedImage) {
            cachedImage.name = newObjectKey;
            if (cachedImage.url) {
                 const cachedUrl = new URL(cachedImage.url);
                 cachedImage.url = `${cachedUrl.origin}/${newObjectKey}`;
            }
        }
        
        const downloadLink = itemDiv.querySelector('a');
        if (downloadLink) downloadLink.href = `api/download_images.php?file=${encodeURIComponent(newObjectKey)}`;

        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
        cell.textContent = originalText;
    }
}



function initializeResizableColumns(tableSelector, storageKey) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const headers = table.querySelectorAll('thead th');
    
    const savedWidths = JSON.parse(localStorage.getItem(storageKey));
    if (savedWidths) {
        headers.forEach(header => {
            const colId = header.dataset.sort || header.dataset.col;
            if (colId && savedWidths[colId]) {
                header.style.width = savedWidths[colId];
            }
        });
    }

    headers.forEach(header => {
        if (header.nextElementSibling) {
            const handle = document.createElement('div');
            handle.classList.add('resize-handle');
            header.appendChild(handle);
            handle.addEventListener('mousedown', startResize);
        }
    });

    let startX, startWidth, resizingHeader, resizingHandle;

    function startResize(e) {
        e.preventDefault();
        resizingHeader = e.target.parentElement;
        resizingHandle = e.target;
        resizingHandle.classList.add('resizing');
        startX = e.clientX;
        startWidth = resizingHeader.offsetWidth;

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    }

    function doResize(e) {
        if (resizingHeader) {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth > 50) { 
                resizingHeader.style.width = `${newWidth}px`;
            }
        }
    }

    function stopResize() {
        if(resizingHandle) resizingHandle.classList.remove('resizing');
        
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        
        saveWidths();

        resizingHeader = null;
        resizingHandle = null;
    }

    function saveWidths() {
        const widthsToSave = {};
        headers.forEach(header => {
            const colId = header.dataset.sort || header.dataset.col;
            if (colId && header.style.width) {
                widthsToSave[colId] = header.style.width;
            }
        });
        localStorage.setItem(storageKey, JSON.stringify(widthsToSave));
    }
}
// --- FIN: LÓGICA PARA REDIMENSIONAR COLUMNAS ---




// --- INICIO: LÓGICA COMPLETA PARA GESTOR DE MARCAS ---

function initializeMarcaManagement() {
    fetchAndRenderMarcas();

    const createForm = document.getElementById('create-marca-form');
    if (createForm) {
        createForm.addEventListener('submit', handleMarcaFormSubmit);
    }
    applyCapitalization('nombre_marca');
}

async function fetchAndRenderMarcas() {
    const tableBody = document.getElementById('marcas-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4">Cargando marcas...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getMarcas`);
        const result = await response.json();

        tableBody.innerHTML = '';
        if (result.success && result.marcas.length > 0) {
            result.marcas.forEach(marca => {
                const row = document.createElement('tr');
                row.dataset.marcaId = marca.id_marca;
                row.innerHTML = `
                    <td>${marca.id_marca}</td>
                    <td class="editable" data-field="nombre_marca">${marca.nombre_marca}</td>
                    <td>${marca.total_productos}</td>
                    <td>
                        <button class="action-btn delete-marca-btn" style="background-color: #f8d7da;">Eliminar</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No hay marcas registradas.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">Error al cargar las marcas.</td></tr>`;
    }
}

async function handleMarcaFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('create-marca-feedback');
    const submitButton = form.querySelector('.form-submit-btn');

    const data = {
        nombre_marca: form.querySelector('#nombre_marca').value,
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Creando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/createMarca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
        form.reset();
        fetchAndRenderMarcas();
        setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);

    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Crear Marca';
    }
}

async function saveMarcaFieldUpdate(marcaId, field, value, cell) {
    const originalText = cell.textContent;
    cell.textContent = 'Guardando...';
    
    const dataToSend = {
        id_marca: marcaId,
        nombre_marca: value
    };

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateMarca`, {
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

async function deleteMarca(marcaId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteMarca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_marca: marcaId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        document.querySelector(`tr[data-marca-id="${marcaId}"]`).remove();
        alert('Marca eliminada.');

    } catch (error) {
        alert(`Error al eliminar: ${error.message}`);
    }
}
// --- FIN: LÓGICA COMPLETA PARA GESTOR DE MARCAS ---

// --- INICIO: LÓGICA COMPLETA PARA GESTOR DE ETIQUETAS ---

function initializeEtiquetaManagement() {
    fetchAndRenderEtiquetas();

    const createForm = document.getElementById('create-etiqueta-form');
    if (createForm) {
        createForm.addEventListener('submit', handleEtiquetaFormSubmit);

    }
    applyCapitalization('nombre_etiqueta');
}

async function fetchAndRenderEtiquetas() {
    const tableBody = document.getElementById('etiquetas-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4">Cargando etiquetas...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getEtiquetas`);
        const result = await response.json();

        tableBody.innerHTML = '';
        if (result.success && result.etiquetas.length > 0) {
            result.etiquetas.forEach(etiqueta => {
                const row = document.createElement('tr');
                row.dataset.etiquetaId = etiqueta.id_etiqueta;
                row.innerHTML = `
                    <td>${etiqueta.id_etiqueta}</td>
                    <td class="editable" data-field="nombre_etiqueta">${etiqueta.nombre_etiqueta}</td>
                    <td>${etiqueta.total_productos}</td>
                    <td>
                        <button class="action-btn delete-etiqueta-btn" style="background-color: #f8d7da;">Eliminar</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No hay etiquetas registradas.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">Error al cargar las etiquetas.</td></tr>`;
    }
}

async function handleEtiquetaFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('create-etiqueta-feedback');
    const submitButton = form.querySelector('.form-submit-btn');

    const data = {
        nombre_etiqueta: form.querySelector('#nombre_etiqueta').value,
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Creando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/createEtiqueta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
        form.reset();
        fetchAndRenderEtiquetas();
        setTimeout(() => { feedbackDiv.innerHTML = ''; }, 3000);

    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Crear Etiqueta';
    }
}

async function saveEtiquetaFieldUpdate(etiquetaId, field, value, cell) {
    const originalText = cell.textContent;
    cell.textContent = 'Guardando...';
    
    const dataToSend = {
        id_etiqueta: etiquetaId,
        nombre_etiqueta: value
    };

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/updateEtiqueta`, {
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

async function deleteEtiqueta(etiquetaId) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteEtiqueta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_etiqueta: etiquetaId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        document.querySelector(`tr[data-etiqueta-id="${etiquetaId}"]`).remove();
        alert('Etiqueta eliminada.');

    } catch (error) {
        alert(`Error al eliminar: ${error.message}`);
    }
}






function openFindReplaceModal() {
    const modal = document.getElementById('find-replace-modal');
    if (!modal) {
        console.error("Error: El modal de 'Buscar y Reemplazar' no se encontró en la página.");
        return;
    }
    // Esta línea es clave: busca los checkboxes DENTRO del contenedor principal
    const selectedCount = mainContent.querySelectorAll('.product-checkbox:checked').length;
    modal.querySelector('#find-replace-count').textContent = selectedCount;
    modal.style.display = 'flex';
}

function closeFindReplaceModal() {
    const modal = document.getElementById('find-replace-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.querySelector('#modal-find-replace-error').textContent = '';
    modal.querySelector('#find-text').value = '';
    modal.querySelector('#replace-text').value = '';
}




function initializeTagInput(containerSelector = '.tag-input-container') {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const originalSelect = container.querySelector('.original-tag-select');
    const selectedTagsArea = container.querySelector('.selected-tags');
    const searchInput = container.querySelector('#tag-search-input');
    const suggestionsList = container.querySelector('.tag-suggestions');

    if (!originalSelect || !selectedTagsArea || !searchInput || !suggestionsList) {
        console.error("Faltan elementos para inicializar el Tag Input.");
        return;
    }

    let suggestions = Array.from(originalSelect.options).map(opt => ({
        id: opt.value,
        text: opt.textContent
    }));
    let highlightedIndex = -1;

    // Función para mostrar las píldoras de las etiquetas seleccionadas
    function renderSelectedTags() {
        selectedTagsArea.innerHTML = ''; // Limpia el área
        Array.from(originalSelect.selectedOptions).forEach(option => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.dataset.value = option.value;
            pill.textContent = option.textContent;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button'; // Evita que envíe el formulario
            removeBtn.className = 'tag-remove-btn';
            removeBtn.innerHTML = '&times;'; // Símbolo 'x'
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que el contenedor reciba el clic
                // Deselecciona en el select original y re-renderiza
                option.selected = false;
                renderSelectedTags();
                updateSuggestions(); // Actualiza sugerencias por si vuelve a estar disponible
            });

            pill.appendChild(removeBtn);
            selectedTagsArea.appendChild(pill);
        });
        // Ajustar el foco al input después de renderizar
        searchInput.focus();
    }

    // Función para mostrar/actualizar la lista de sugerencias
    function updateSuggestions() {
        const searchTerm = searchInput.value.toLowerCase();
        suggestionsList.innerHTML = ''; // Limpia sugerencias anteriores
        highlightedIndex = -1; // Resetea el índice resaltado

        const selectedValues = new Set(Array.from(originalSelect.selectedOptions).map(opt => opt.value));

        const filteredSuggestions = suggestions.filter(suggestion =>
            !selectedValues.has(suggestion.id) && // No mostrar si ya está seleccionada
            suggestion.text.toLowerCase().includes(searchTerm)
        );

        if (filteredSuggestions.length > 0 && searchTerm) {
            filteredSuggestions.forEach((suggestion, index) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.textContent = suggestion.text;
                item.dataset.value = suggestion.id;
                item.addEventListener('click', () => {
                    selectTag(suggestion.id);
                });
                suggestionsList.appendChild(item);
            });
            suggestionsList.style.display = 'block';
        } else {
            suggestionsList.style.display = 'none';
        }
    }

    // Función para seleccionar una etiqueta
    function selectTag(tagId) {
        const optionToSelect = originalSelect.querySelector(`option[value="${tagId}"]`);
        if (optionToSelect) {
            optionToSelect.selected = true; // Marca como seleccionada en el select original
            searchInput.value = ''; // Limpia el input de búsqueda
            renderSelectedTags(); // Actualiza las píldoras visuales
            updateSuggestions(); // Oculta/actualiza las sugerencias
            suggestionsList.style.display = 'none'; // Asegura que se oculte
        }
    }

    // --- Event Listeners ---

    // Al escribir en el input
    searchInput.addEventListener('input', updateSuggestions);

    // Al usar teclas en el input (Enter, Backspace, Flechas)
    searchInput.addEventListener('keydown', (e) => {
        const items = suggestionsList.querySelectorAll('.suggestion-item');
        if (suggestionsList.style.display === 'block' && items.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (highlightedIndex < items.length - 1) {
                    highlightedIndex++;
                    items.forEach(item => item.classList.remove('highlighted'));
                    items[highlightedIndex].classList.add('highlighted');
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (highlightedIndex > 0) {
                    highlightedIndex--;
                    items.forEach(item => item.classList.remove('highlighted'));
                    items[highlightedIndex].classList.add('highlighted');
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0 && items[highlightedIndex]) {
                    selectTag(items[highlightedIndex].dataset.value);
                }
            }
        } else if (e.key === 'Backspace' && searchInput.value === '') {
            // Si presiona Backspace y el input está vacío, elimina la última píldora
            const lastPill = selectedTagsArea.querySelector('.tag-pill:last-child');
            if (lastPill) {
                const lastValue = lastPill.dataset.value;
                const optionToDeselect = originalSelect.querySelector(`option[value="${lastValue}"]`);
                if (optionToDeselect) {
                    optionToDeselect.selected = false;
                    renderSelectedTags();
                    updateSuggestions();
                }
            }
        } else if (e.key === 'Escape') {
             suggestionsList.style.display = 'none'; // Oculta con Escape
             highlightedIndex = -1;
        }
    });

    // Poner foco en el input al hacer clic en el contenedor
    container.addEventListener('click', () => {
        searchInput.focus();
    });

    // Ocultar sugerencias si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            suggestionsList.style.display = 'none';
            highlightedIndex = -1;
        }
    });

    // Renderizar las etiquetas iniciales (importante para editar)
    renderSelectedTags();
    console.log("Tag Input Vanilla JS inicializado.");
}

// --- LÓGICA DEL ESCÁNER DE CÓDIGOS DE BARRAS (PARA ADMIN) ---
    let adminHtml5QrCode = null;
    let adminAudioCtx = null; // Para el sonido del beep
    let scanTargetInputId = null; // Para saber qué input rellenar
    let triggerSearchOnScan = false; // Para saber si buscar después de escanear

    const adminBarcodeScannerContainer = document.createElement('div');
    adminBarcodeScannerContainer.id = 'admin-barcode-scanner-container';
    adminBarcodeScannerContainer.style.cssText = `
        display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 3000; flex-direction: column;
        align-items: center; justify-content: center;
    `;
    adminBarcodeScannerContainer.innerHTML = `
        <div id="admin-qr-reader" style="width: 80%; max-width: 500px; background: white; padding: 20px; border-radius: 8px;"></div>
        <button id="admin-close-scanner-btn" class="btn btn-danger" style="margin-top: 15px;">Cerrar Escáner</button>
    `;
    document.body.appendChild(adminBarcodeScannerContainer);

    const adminQrReaderElement = document.getElementById('admin-qr-reader');
    const adminCloseScannerBtn = document.getElementById('admin-close-scanner-btn');

    // Inicializar AudioContext con interacción del usuario (si no existe ya)
    function initAdminAudioContext() {
        if (!adminAudioCtx && (window.AudioContext || window.webkitAudioContext)) {
            try {
                adminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                console.log("Admin AudioContext inicializado.");
            } catch (e) {
                console.error("No se pudo crear AudioContext para admin:", e);
            }
        }
    }

    // Función para reproducir sonido (copiada y adaptada de pos.js)
    function playAdminBeepSound() {
        if (!adminAudioCtx) return; // Si no hay contexto, no hacer nada
        try {
            const oscillator = adminAudioCtx.createOscillator();
            const gainNode = adminAudioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(adminAudioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, adminAudioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.5, adminAudioCtx.currentTime);
            oscillator.start();
            oscillator.stop(adminAudioCtx.currentTime + 0.1);
        } catch (e) {
            console.error("Error al reproducir beep en admin:", e);
        }
    }

    // Funciones de éxito y fallo del escaneo
    function onAdminScanSuccess(decodedText, decodedResult) {
        playAdminBeepSound(); // Reproducir sonido

        if (scanTargetInputId) {
            const targetInput = document.getElementById(scanTargetInputId);
            if (targetInput) {
                targetInput.value = decodedText;
                // Disparar evento 'input' para validaciones en vivo si existen
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('keyup', { bubbles: true })); // Para validaciones que usan keyup

                // Si se debe buscar automáticamente (Modificar Producto)
                if (triggerSearchOnScan) {
                    const form = targetInput.closest('form');
                    if (form) {
                        // Espera un breve momento para que la validación (si existe) se complete
                         setTimeout(() => form.dispatchEvent(new Event('submit')), 100);
                    }
                }
            }
        }
        stopAdminScanner();
    }

    function onAdminScanFailure(error) {
        // console.warn(`Admin Scan Error = ${error}`);
    }

    // Función para iniciar el escáner
    function startAdminScanner(targetId, autoSearch = false) {
        // Inicializar contexto de audio en el primer clic/interacción
        initAdminAudioContext();

        scanTargetInputId = targetId;
        triggerSearchOnScan = autoSearch;

        if (!adminHtml5QrCode) {
            try {
                adminHtml5QrCode = new Html5Qrcode("admin-qr-reader");
            } catch (e) {
                 showPOSNotificationModal('Error', 'No se pudo inicializar el lector de códigos. Asegúrate de que la página se cargó por HTTPS.', 'error');
                 console.error("Error al crear Html5Qrcode:", e);
                 return;
            }
        }

        adminBarcodeScannerContainer.style.display = 'flex';
        adminQrReaderElement.innerHTML = '<p>Iniciando cámara...</p>';

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        const preferredCameraConfig = { facingMode: "environment" };

        adminHtml5QrCode.start(preferredCameraConfig, config, onAdminScanSuccess, onAdminScanFailure)
            .catch(() => {
                adminHtml5QrCode.start({ }, config, onAdminScanSuccess, onAdminScanFailure) // Intenta con cámara por defecto
                    .catch(finalErr => {
                        console.error("Error final al iniciar el escáner admin:", finalErr);
                        adminQrReaderElement.innerHTML = `<p style="color: red;">Error: No se pudo acceder a la cámara. Revisa los permisos.</p>`;
                         showPOSNotificationModal('Error de Cámara', `No se pudo acceder a la cámara. Asegúrate de haber concedido los permisos necesarios. Detalles: ${finalErr}`, 'error');
                    });
            });
    }

    // Función para detener el escáner
function stopAdminScanner() {
    adminBarcodeScannerContainer.style.display = 'none';
    adminQrReaderElement.innerHTML = ''; // Limpia el contenido del lector

    // Guarda la referencia al input que debería enfocarse después
    const inputToFocus = scanTargetInputId ? document.getElementById(scanTargetInputId) : null;
    // Limpia las variables de estado inmediatamente
    scanTargetInputId = null;
    triggerSearchOnScan = false;

    if (adminHtml5QrCode) {
        const scannerInstance = adminHtml5QrCode; // Guarda la referencia actual
        adminHtml5QrCode = null; // Establece a null INMEDIATAMENTE para prevenir reintentos con la instancia vieja

        // Intenta detener usando la referencia guardada
        scannerInstance.stop()
            .then(() => {
                console.log("Admin Scanner detenido correctamente.");
            })
            .catch(err => {
                // Es común obtener un error si ya se estaba deteniendo o ya estaba detenido, usualmente se puede ignorar.
                console.warn("Advertencia al detener escáner admin (puede ser normal):", err);
            })
            .finally(() => {
                // Intenta devolver el foco DESPUÉS de que stop() haya terminado (o fallado)
                // Usamos un pequeño retraso por si acaso el navegador necesita tiempo para liberar la cámara.
                setTimeout(() => {
                    inputToFocus?.focus();
                }, 50); // Un retraso muy corto
            });
    } else {
         // Si ya era null, intenta enfocar igualmente si había un input objetivo
         setTimeout(() => {
            inputToFocus?.focus();
         }, 50);
    }
}

    // Listener para el botón de cerrar
    adminCloseScannerBtn.addEventListener('click', stopAdminScanner);

    // Event Delegation para los botones de escaneo en el mainContent
    mainContent.addEventListener('click', (event) => {
        if (event.target.id === 'scan-barcode-add-product') {
            startAdminScanner('codigo_producto', false); // Llama al escáner, apunta al input 'codigo_producto'
        }
        if (event.target.id === 'scan-barcode-modify-product') {
            startAdminScanner('product-search-to-edit', true); // Llama al escáner, apunta a 'product-search-to-edit' y activa autoSearch
        }
        // ...otros listeners de click en mainContent...
    });
 

/**
 * Obtiene los items de un reporte y los copia al portapapeles en formato TSV.
 * @param {string} reportId - ID del reporte a copiar.
 */
async function copyReportItemsToClipboard(reportId) {
    const feedbackDiv = document.getElementById('copy-feedback');
    if (!feedbackDiv) {
        console.error("Elemento copy-feedback no encontrado.");
        alert('Error: No se encontró el elemento para mostrar mensajes.');
        return;
    }

    feedbackDiv.textContent = 'Copiando...';
    feedbackDiv.style.backgroundColor = '#ffc107'; // Amarillo para 'cargando'
    feedbackDiv.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getInventoryReportDetails&id_reporte=${reportId}`);
        const result = await response.json();

        if (!result.success || !result.items) {
            throw new Error(result.error || 'No se pudieron obtener los items del reporte.');
        }

        if (result.items.length === 0) {
            feedbackDiv.textContent = 'El reporte está vacío.';
            feedbackDiv.style.backgroundColor = '#dc3545'; // Rojo para error/vacío
            setTimeout(() => { feedbackDiv.style.display = 'none'; }, 2000);
            return;
        }

        // Formatear los datos como TSV (Tab-Separated Values)
        let clipboardText = "Código\tNombre Producto\tPrecio Venta (Snapshot)\tCantidad Reportada\n"; // Encabezados
        result.items.forEach(item => {
            clipboardText += `${item.codigo_producto}\t`;
            clipboardText += `${item.nombre_producto}\t`;
            clipboardText += `$${parseFloat(item.precio_venta).toFixed(2)}\t`;
            clipboardText += `${item.cantidad_reportada}\n`;
        });

        // Copiar al portapapeles
        await navigator.clipboard.writeText(clipboardText);

        feedbackDiv.textContent = '¡Items copiados al portapapeles!';
        feedbackDiv.style.backgroundColor = '#28a745'; // Verde para éxito

    } catch (error) {
        console.error('Error al copiar items:', error);
        feedbackDiv.textContent = `Error: ${error.message}`;
        feedbackDiv.style.backgroundColor = '#dc3545'; // Rojo para error
    } finally {
        // Ocultar el mensaje después de unos segundos
        setTimeout(() => {
            feedbackDiv.style.display = 'none';
        }, 3000); // 3 segundos
    }
}


async function initializeInventoryReportManagement() {
    const createForm = document.getElementById('create-report-form');
    const reportsTbody = document.getElementById('inventory-reports-tbody');
    
    // Poblar selectores de tienda (si existen)
    if (USER_ROLE === 'administrador_global') {
        // Pobla el selector para crear reportes
        await populateStoreFilter('report-store-selector');
        // Pobla el selector para filtrar la vista
        await populateStoreFilter('view-report-store-filter');
        
        // Listener para el filtro de visualización
        const viewFilter = document.getElementById('view-report-store-filter');
        if (viewFilter) {
            viewFilter.addEventListener('change', () => {
                fetchAndRenderInventoryReports(viewFilter.value);
            });
        }
    }

    // Listener para el formulario de creación
    if (createForm) {
        createForm.addEventListener('submit', handleCreateInventoryReport);
    }

    // Listeners para la tabla (Ver / Eliminar)
    if (reportsTbody) {
        reportsTbody.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const row = target.closest('tr');
            const reportId = row.dataset.reportId;

            if (target.classList.contains('view-report-btn')) {
                // Carga la vista de "ver" para este reporte
                loadActionContent(`inventario/reportes_rapidos_ver&id=${reportId}`);
            } 
            else if (target.classList.contains('delete-report-btn')) {
                // Elimina el reporte
                if (confirm(`¿Estás seguro de que quieres eliminar este reporte? Esta acción es irreversible.`)) {
                    await deleteInventoryReport(reportId, row);
                }
            }
            else if (target.classList.contains('copy-items-btn')) {
                 await copyReportItemsToClipboard(reportId); // Llama a la nueva función
            }
        });
    }

    // Carga inicial de reportes
    fetchAndRenderInventoryReports();
}

/**
 * Busca y renderiza la lista de reportes en la tabla de gestión.
 * @param {string} storeId - (Opcional) ID de la tienda para filtrar (solo admin global).
 */
async function fetchAndRenderInventoryReports(storeId = '') {
    const tableBody = document.getElementById('inventory-reports-tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5">Cargando reportes...</td></tr>';

    try {
        let apiUrl = `${API_BASE_URL}?resource=admin/getInventoryReports`;
        if (storeId) {
            apiUrl += `&storeId=${storeId}`;
        }

        const response = await fetch(apiUrl);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        tableBody.innerHTML = '';
        if (result.reports.length > 0) {
            result.reports.forEach(report => {
                const row = document.createElement('tr');
                row.dataset.reportId = report.id_reporte;
                row.innerHTML = `
                    <td>${report.nombre_reporte}</td>
                    <td>${report.nombre_tienda}</td>
                    <td>${report.nombre_usuario}</td>
                    <td>${new Date(report.fecha_creacion).toLocaleString('es-SV')}</td>
                    <td class="action-buttons-cell">
                        <button class="action-btn btn-sm view-report-btn" title="Ver/Editar">📝 Ver</button>
                        <button class="action-btn btn-sm delete-report-btn" title="Eliminar" style="background-color: #f8d7da;">❌</button>
                    <button class="action-btn btn-sm copy-items-btn" title="Copiar Items al Portapapeles">📋</button>
                    
                    </td>

                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No se encontraron reportes.</td></tr>';
        }

    } catch (error) {
        tableBody.innerHTML = `<tr"><td colspan="5" style="color:red;">Error al cargar reportes: ${error.message}</td></tr>`;
    }
}

/**
 * Maneja el envío del formulario de creación de reportes.
 */
async function handleCreateInventoryReport(event) {
    event.preventDefault();
    const form = event.target;
    const feedbackDiv = document.getElementById('create-report-feedback');
    const submitButton = form.querySelector('.form-submit-btn');

    // Ya tienes estos valores correctamente capturados
    const reportNameInput = form.querySelector('#report-name');
    const storeIdInput = form.querySelector('#report-store-selector');

    const reportName = reportNameInput ? reportNameInput.value : '';
    const storeId = storeIdInput ? storeIdInput.value : '';

    // CORRECCIÓN: Validar que reportName no esté vacío
    if (!reportName.trim()) {
        feedbackDiv.innerHTML = `<div class="message error">El nombre del reporte es obligatorio.</div>`;
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Creando...';
    feedbackDiv.innerHTML = '';

    try {
        console.log("Datos a enviar:", { nombre_reporte: reportName, id_tienda: storeId });
        
        const response = await fetch(`${API_BASE_URL}?resource=admin/createInventoryReport`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre_reporte: reportName,  // ✅ Usar la variable capturada
                id_tienda: storeId            // ✅ Usar la variable capturada
            })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // Si se crea con éxito, redirige a la vista de "ver"
        loadActionContent(`inventario/reportes_rapidos_ver&id=${result.newReportId}`);

    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
        submitButton.disabled = false;
        submitButton.textContent = 'Crear e Iniciar Reporte';
    }
}

/**
 * Elimina un reporte de inventario.
 * @param {string} reportId - ID del reporte a eliminar.
 * @param {HTMLElement} rowElement - La fila de la tabla para eliminar de la vista.
 */
async function deleteInventoryReport(reportId, rowElement) {
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteInventoryReport`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_reporte: reportId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        rowElement.remove(); // Elimina la fila de la vista

    } catch (error) {
        alert(`Error al eliminar el reporte: ${error.message}`);
    }
}


// --- Funciones para la Vista de "Ver Reporte" ---

async function initializeInventoryReportView(container) {
    const reportContainer = container.querySelector('.lista-compras-container');
    const addProductForm = document.getElementById('add-product-to-report-form');
    const reportItemsTbody = document.getElementById('report-items-tbody'); // Añade referencia al tbody

    if (!reportContainer) {
        console.error("No se encontró el contenedor del reporte.");
        return;
    }

    const reportId = reportContainer.dataset.reportId;
    if (!reportId) {
        console.error("No se encontró el ID del reporte en el dataset.");
        return;
    }

    // Listener para el botón de salir (sin cambios)
    const exitBtn = document.getElementById('exit-report-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                loadActionContent(action);
            }
        });
    }

    // Listener para añadir producto (sin cambios)
    if (addProductForm) {
        // ... (tu lógica existente para añadir productos)
         const codeInput = document.getElementById('report-product-code');
        const qtyInput = document.getElementById('report-product-qty');
        let lastScanTime = 0;
        const SCAN_DELAY = 300; // Milisegundos de delay después del escaneo

        // Detectar cuando el código se completa (por escaneo o escritura)
        codeInput.addEventListener('input', () => {
            lastScanTime = Date.now();
        });

        // Prevenir envío inmediato del formulario
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const timeSinceLastInput = Date.now() - lastScanTime;

            // Si el envío es muy rápido después del input (escáner), esperamos un momento
            if (timeSinceLastInput < SCAN_DELAY) {
                // Enfocar el campo de cantidad para que el usuario pueda modificarlo
                qtyInput.select();

                // Mostrar mensaje temporal
                const feedbackDiv = document.getElementById('add-product-feedback');
                feedbackDiv.innerHTML = `<div class="message" style="background-color: #fff3cd; color: #856404;">Código escaneado. Verifica la cantidad y presiona "Añadir" o Enter nuevamente.</div>`;

                setTimeout(() => {
                    feedbackDiv.innerHTML = '';
                }, 2000);

                return; // No enviar aún
            }

            // Si ya pasó el delay o el usuario presionó Enter manualmente, procesar
            await handleAddProductToReport(reportId, addProductForm);
        });

        // ✅ ALTERNATIVA: Permitir Enter desde el campo de cantidad
        qtyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Forzar el envío ignorando el delay
                handleAddProductToReport(reportId, addProductForm);
            }
        });
    }

    // *** NUEVO: Listener para eliminar items ***
    if (reportItemsTbody) {
        reportItemsTbody.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-report-item-btn');
            if (deleteButton) {
                const row = deleteButton.closest('tr');
                const reportItemId = row.dataset.itemId;
                if (reportItemId) {
                    handleDeleteReportItem(reportItemId, row);
                }
            }
        });
    }
    // *** FIN NUEVO ***

    // Carga inicial de los detalles e items del reporte (sin cambios)
    await fetchAndRenderReportDetails(reportId);
}

/**
 * Busca los detalles y los items de un reporte específico y los renderiza.
 * @param {string} reportId - ID del reporte a cargar.
 */
async function fetchAndRenderReportDetails(reportId) {
    const header = document.getElementById('report-name-header');
    const tableBody = document.getElementById('report-items-tbody');

    if (!header || !tableBody) return;

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getInventoryReportDetails&id_reporte=${reportId}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        header.textContent = `Reporte: ${result.reportName}`;
        tableBody.innerHTML = ''; // Limpiar la tabla

        if (result.items.length > 0) {
            result.items.forEach(item => {
                const row = document.createElement('tr');
                // *** INICIO CORRECCIÓN: Añadir dataset.itemId ***
                row.dataset.itemId = item.id_item_reporte; 
                // *** FIN CORRECCIÓN ***
                
                const imageUrl = (item.url_imagen && item.url_imagen !== '0') ? item.url_imagen : 'img/favicon.png';
                
                // *** INICIO CORRECCIÓN: Añadir celda con botón de eliminar ***
                row.innerHTML = `
                    <td>
                        <div class="product-table-img-container">
                            <img src="${imageUrl}" class="product-table-img" alt="${item.nombre_producto}" loading="lazy">
                        </div>
                    </td>
                    <td>${item.codigo_producto}</td>
                    <td>${item.nombre_producto}</td>
                    <td>$${parseFloat(item.precio_venta).toFixed(2)}</td>
                    <td style="font-weight: bold; font-size: 1.1rem;">${item.cantidad_reportada}</td>
                    <td> 
                        <button class="action-btn btn-sm delete-report-item-btn" title="Eliminar Item">❌</button>
                    </td> 
                `;
                // *** FIN CORRECCIÓN ***
                tableBody.appendChild(row);
            });
        } else {
             // Ajustar colspan a 6 por la nueva columna
            tableBody.innerHTML = '<tr><td colspan="6">Aún no hay productos en este reporte.</td></tr>';
        }

    } catch (error) {
        header.textContent = 'Error al Cargar Reporte';
         // Ajustar colspan a 6 por la nueva columna
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">${error.message}</td></tr>`;
    }
}
/**
 * Maneja el envío del formulario para añadir un producto al reporte actual.
 * @param {string} reportId - ID del reporte al que se añadirá el producto.
 */
async function handleAddProductToReport(reportId, form) {
    const codeInput = document.getElementById('report-product-code');
    const qtyInput = document.getElementById('report-product-qty');
    const feedbackDiv = document.getElementById('add-product-feedback');
    const submitButton = form.querySelector('.form-submit-btn');

    const productCode = codeInput.value.trim();
    const quantity = qtyInput.value;

    if (!productCode || !quantity) {
        feedbackDiv.innerHTML = `<div class="message error">Debes ingresar un código y una cantidad.</div>`;
        return;
    }

    submitButton.disabled = true;
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/addProductToInventoryReport`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_reporte: reportId,
                codigo_producto: productCode,
                cantidad: quantity
            })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // Éxito: limpiar campos y recargar la lista de items
        codeInput.value = '';
        qtyInput.value = '1';
        codeInput.focus(); // Devolver el foco al input de código
        await fetchAndRenderReportDetails(reportId); // Recargar la lista

    } catch (error) {
        feedbackDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    } finally {
        submitButton.disabled = false;
    }
}

async function handleDeleteReportItem(reportItemId, rowElement) {
    /*if (!confirm('¿Estás seguro de que quieres eliminar este item del reporte?')) {
        return;
    }*/
    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/deleteInventoryReportItem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_item_reporte: reportItemId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        rowElement.remove(); // Elimina la fila de la tabla

    } catch (error) {
        alert(`Error al eliminar el item: ${error.message}`);
    }
}
// --- FIN: MÓDULO REPORTES RÁPIDOS DE INVENTARIO ---

// =================================================================
// INICIO: MÓDULO DE REPORTE DE VENTAS
// =================================================================

// Variable global para guardar la instancia del gráfico
let chartProductos = null;

// Helper para formatear a moneda
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});

/**
 * Inicializa el módulo de reportes con filtros de fecha
 */
function initReportesVentas() {
    console.log('Iniciando initReportesVentas...');
    
    const canvas = document.getElementById('grafico-pastel-productos');
    if (!canvas) {
        console.log('Canvas no encontrado, no estamos en la página de reportes');
        return;
    }
    
    console.log('Canvas encontrado:', canvas);
    
    // Destruir gráfico anterior si existe
    if (chartProductos) {
        chartProductos.destroy();
        chartProductos = null;
    }

    // Inicializar fechas por defecto (últimos 30 días)
    initializeDateFilters();
    
    // Event listeners para los filtros
    setupFilterListeners();
    
    // Cargar datos iniciales
    fetchReporteData();
}

/**
 * Inicializa los campos de fecha con valores por defecto
 */
function initializeDateFilters() {
    const fechaFin = document.getElementById('reporte-fecha-fin');
    const fechaInicio = document.getElementById('reporte-fecha-inicio');
    
    if (!fechaFin || !fechaInicio) return;
    
    // Fecha de hoy
    const hoy = new Date();
    fechaFin.value = hoy.toISOString().split('T')[0];
    
    // Hace 30 días
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    fechaInicio.value = hace30Dias.toISOString().split('T')[0];
    
    updatePeriodoText();
}

/**
 * Actualiza el texto que muestra el período seleccionado
 */
function updatePeriodoText() {
    const fechaInicio = document.getElementById('reporte-fecha-inicio')?.value;
    const fechaFin = document.getElementById('reporte-fecha-fin')?.value;
    const periodoSpan = document.getElementById('periodo-seleccionado');
    
    if (!fechaInicio || !fechaFin || !periodoSpan) return;
    
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    
    const opcionesFormato = { year: 'numeric', month: 'short', day: 'numeric' };
    const textoInicio = inicio.toLocaleDateString('es-SV', opcionesFormato);
    const textoFin = fin.toLocaleDateString('es-SV', opcionesFormato);
    
    periodoSpan.textContent = `Período: ${textoInicio} - ${textoFin}`;
}

/**
 * Configura los event listeners de los filtros
 */
function setupFilterListeners() {
    const btnAplicar = document.getElementById('aplicar-filtro-reporte');
    const btnLimpiar = document.getElementById('limpiar-filtro-reporte');
    
    if (btnAplicar) {
        btnAplicar.addEventListener('click', () => {
            updatePeriodoText();
            fetchReporteData();
        });
    }
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            initializeDateFilters();
            fetchReporteData();
        });
    }
}

/**
 * Busca los datos del reporte desde la API con filtros de fecha
 */
async function fetchReporteData() {
    const tbodyProd = document.querySelector('#tabla-reporte-productos tbody');
    const tbodyTop = document.querySelector('#tabla-reporte-departamentos tbody');
    
    // Obtener fechas de los filtros
    const fechaInicio = document.getElementById('reporte-fecha-inicio')?.value;
    const fechaFin = document.getElementById('reporte-fecha-fin')?.value;
    
    if (!fechaInicio || !fechaFin) {
        console.error('Fechas no definidas');
        return;
    }
    
    // Mostrar indicador de carga
    if (tbodyProd) tbodyProd.innerHTML = '<tr><td colspan="5">Cargando datos...</td></tr>';
    if (tbodyTop) tbodyTop.innerHTML = '<tr><td colspan="3">Cargando datos...</td></tr>';
    
    try {
        console.log('Fetch con fechas:', fechaInicio, fechaFin);
        
        const url = `${API_BASE_URL}?resource=admin/obtenerReporteVentas&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
        console.log('URL completa:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const result = await response.json();
        console.log('Datos recibidos:', result);

        if (result.success) {
            renderTablaProductosPorDia(result.data.productos_por_dia);
            renderTablaProductosTop(result.data.top_productos);
            renderGraficoProductos(result.data.top_productos);
        } else {
            throw new Error(result.message || 'Error desconocido en la API');
        }

    } catch (error) {
        console.error('Error al cargar el reporte de ventas:', error);
        
        const errorMessage = `Error al cargar: ${error.message}`;
        if (tbodyProd) {
            tbodyProd.innerHTML = `<tr><td colspan="5" style="color:red; padding: 1rem;">${errorMessage}</td></tr>`;
        }
        if (tbodyTop) {
            tbodyTop.innerHTML = `<tr><td colspan="3" style="color:red; padding: 1rem;">${errorMessage}</td></tr>`;
        }
    }
}

/**
 * Renderiza la tabla de productos vendidos por día
 */
function renderTablaProductosPorDia(productosPorDia) {
    const tbody = document.querySelector('#tabla-reporte-productos tbody');
    const tfootTotal = document.querySelector('#total-productos');
    
    if (!tbody || !tfootTotal) {
        console.error('Elementos de tabla de productos no encontrados');
        return;
    }

    tbody.innerHTML = '';
    let totalGeneral = 0;

    if (!productosPorDia || productosPorDia.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem;">No se encontraron ventas en el período seleccionado.</td></tr>';
        tfootTotal.textContent = currencyFormatter.format(0);
        return;
    }

    productosPorDia.forEach(p => {
        const total = parseFloat(p.total) || 0;
        totalGeneral += total;
        
        // Formatear fecha
        const fecha = new Date(p.fecha + 'T00:00:00');
        const fechaFormateada = fecha.toLocaleDateString('es-SV', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const row = `
            <tr>
                <td style="white-space: nowrap;">${fechaFormateada}</td>
                <td>${p.codigo_barras || 'N/A'}</td>
                <td>${p.nombre || 'Sin nombre'}</td>
                <td style="text-align: center;">${p.unidades || 0}</td>
                <td style="text-align: right; font-weight: 500;">${currencyFormatter.format(total)}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    tfootTotal.innerHTML = `<strong>${currencyFormatter.format(totalGeneral)}</strong>`;
}

/**
 * Renderiza la tabla de TOP productos
 */
function renderTablaProductosTop(topProductos) {
    const tbody = document.querySelector('#tabla-reporte-departamentos tbody');
    const tfootTotal = document.querySelector('#total-departamentos');
    
    if (!tbody || !tfootTotal) {
        console.error('Elementos de tabla de top productos no encontrados');
        return;
    }

    tbody.innerHTML = '';
    let totalGeneral = 0;

    if (!topProductos || topProductos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 1rem;">No se encontraron datos.</td></tr>';
        tfootTotal.textContent = currencyFormatter.format(0);
        return;
    }

    topProductos.forEach((p, index) => {
        const total = parseFloat(p.total) || 0;
        totalGeneral += total;
        
        // Medalla para el top 3
        let rankDisplay = `${index + 1}`;
        if (index === 0) rankDisplay = '🥇';
        else if (index === 1) rankDisplay = '🥈';
        else if (index === 2) rankDisplay = '🥉';
        
        const row = `
            <tr>
                <td style="text-align: center; font-size: 1.2rem;">${rankDisplay}</td>
                <td>${p.nombre || 'Sin nombre'}</td>
                <td style="text-align: right; font-weight: bold;">${currencyFormatter.format(total)}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    tfootTotal.innerHTML = `<strong>${currencyFormatter.format(totalGeneral)}</strong>`;
}

/**
 * Renderiza el gráfico de pastel de TOP productos
 */
function renderGraficoProductos(topProductos) {
    const canvas = document.getElementById('grafico-pastel-productos');
    
    if (!canvas) {
        console.error('Canvas para gráfico no encontrado');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('No se pudo obtener el contexto 2D del canvas');
        return;
    }

    console.log('Iniciando renderizado del gráfico...');

    // Destruir gráfico anterior si existe
    if (chartProductos) {
        chartProductos.destroy();
        chartProductos = null;
    }

    if (!topProductos || topProductos.length === 0) {
        console.log('No hay datos para el gráfico');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos para mostrar en el período seleccionado', canvas.width / 2, canvas.height / 2);
        return;
    }

    const labels = topProductos.map(p => p.nombre || 'Sin nombre');
    const data = topProductos.map(p => parseFloat(p.total) || 0);

    // Paleta de colores vibrante
    const colorPalette = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(201, 203, 207, 0.8)',
        'rgba(83, 102, 255, 0.8)',
        'rgba(255, 99, 255, 0.8)',
        'rgba(99, 255, 132, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(156, 39, 176, 0.8)',
        'rgba(0, 150, 136, 0.8)',
        'rgba(244, 67, 54, 0.8)',
        'rgba(33, 150, 243, 0.8)'
    ];

    const backgroundColors = data.map((_, index) => 
        colorPalette[index % colorPalette.length]
    );

    const borderColors = backgroundColors.map(color => 
        color.replace('0.8)', '1)')
    );

    try {
        chartProductos = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: {
                                size: 11
                            },
                            boxWidth: 15,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        
                                        let displayLabel = label;
                                        if (label.length > 30) {
                                            displayLabel = label.substring(0, 30) + '...';
                                        }
                                        
                                        return {
                                            text: displayLabel,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: isNaN(value),
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += currencyFormatter.format(context.parsed);
                                    
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    label += ` (${percentage}%)`;
                                }
                                return label;
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        padding: 12,
                        cornerRadius: 4,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        }
                    },
                    title: {
                        display: true,
                        text: 'Top 15 Productos Más Vendidos',
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    }
                }
            }
        });
        
        console.log('Gráfico renderizado exitosamente');
        
    } catch (error) {
        console.error('Error al crear el gráfico:', error);
    }
}

// =================================================================
// FIN: MÓDULO DE REPORTE DE VENTAS
// =================================================================

});

