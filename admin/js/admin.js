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



    // =================================================================
// INICIO: DEFINICIÓN DE TEMAS PARA GRÁFICOS
// =================================================================

// Variable para guardar el tema actual
let currentChartTheme = 'light'; 

// Objeto que contiene todos nuestros temas disponibles
const chartThemes = {
    // TEMA CLARO (el que ya tienes)
    light: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        gridColor: 'rgba(0, 0, 0, 0.1)',
        fontColor: '#666',
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
        }
    },
    // TEMA OSCURO (un nuevo estilo)
    dark: {
        backgroundColor: 'rgba(40, 42, 54, 0.8)', // Un fondo oscuro
        gridColor: 'rgba(255, 255, 255, 0.15)', // Líneas de la cuadrícula claras
        fontColor: '#f8f8f2', // Texto claro
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#282a36',
            bodyColor: '#282a36',
        }
    },
    // TEMA "OCÉANO" (otro ejemplo)
    ocean: {
        backgroundColor: 'rgba(235, 245, 251, 0.8)',
        gridColor: 'rgba(11, 117, 187, 0.1)',
        fontColor: '#0b75bb',
        tooltip: {
            backgroundColor: '#0b75bb',
            titleColor: '#fff',
            bodyColor: '#fff',
        }
    }
};

/**
 * Función que genera las opciones completas para un gráfico,
 * combinando el tema seleccionado con opciones generales.
 * @param {string} themeName - El nombre del tema (ej. 'light', 'dark').
 * @returns {object} - El objeto de opciones para Chart.js.
 */
function getChartOptions(themeName = 'light') {
    const theme = chartThemes[themeName] || chartThemes.light;

    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: theme.fontColor, // Color de texto del eje Y
                    callback: function(value) {
                        return '$' + value.toLocaleString();
                    }
                },
                grid: {
                    color: theme.gridColor // Color de las líneas de la cuadrícula
                }
            },
            x: {
                ticks: {
                    color: theme.fontColor // Color de texto del eje X
                },
                grid: {
                    color: theme.gridColor
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: theme.tooltip.backgroundColor,
                titleColor: theme.tooltip.titleColor,
                bodyColor: theme.tooltip.bodyColor,
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed.y !== null) {
                            label += '$' + context.parsed.y.toLocaleString('es-SV', { minimumFractionDigits: 2 });
                        }
                        return label;
                    }
                }
            }
        }
    };
}

// =================================================================
// FIN: DEFINICIÓN DE TEMAS PARA GRÁFICOS
// =================================================================
// =================================================================
// INICIO: FUNCIONES DE ANÁLISIS TÉCNICO
// =================================================================

/**
 * Calcula la Media Móvil Simple (SMA).
 * @param {number[]} data - Array de valores numéricos (ej. ventas diarias).
 * @param {number} period - El número de períodos para calcular la media (ej. 7 días).
 * @returns {number[]} - Un array con los valores de la media móvil. Tendrá 'period-1' valores nulos al inicio.
 */
function calculateSMA(data, period) {
    let sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push(null); // No hay suficientes datos para los primeros días
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            sma.push(sum / period);
        }
    }
    return sma;
}

/**
 * Calcula las Bandas de Bollinger.
 * @param {number[]} data - Array de valores numéricos.
 * @param {number} period - El período para la media móvil y la desviación estándar (ej. 20).
 * @param {number} stdDevMultiplier - El número de desviaciones estándar (normalmente 2).
 * @returns {object} - Un objeto con tres arrays: upper, middle (SMA), y lower.
 */
function calculateBollingerBands(data, period, stdDevMultiplier) {
    let middle = calculateSMA(data, period);
    let upper = [];
    let lower = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            upper.push(null);
            lower.push(null);
        } else {
            let slice = data.slice(i - period + 1, i + 1);
            let sumOfSquares = slice.reduce((sum, value) => sum + Math.pow(value - middle[i], 2), 0);
            let stdDev = Math.sqrt(sumOfSquares / period);
            
            upper.push(middle[i] + (stdDev * stdDevMultiplier));
            lower.push(middle[i] - (stdDev * stdDevMultiplier));
        }
    }
    return { upper, middle, lower };
}

// =================================================================
// FIN: FUNCIONES DE ANÁLISIS TÉCNICO
// =================================================================
    
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

        if (event.target.id === 'start-processing-btn') {
        const button = event.target;
        const outputConsole = document.getElementById('processor-output');
        const rotationOption = document.getElementById('rotation-option').value; 
        
        // Desactiva el botón y muestra que está trabajando
        button.disabled = true;
        button.textContent = 'Procesando...';
        outputConsole.textContent = 'Iniciando...\n';
        document.getElementById('results-container').classList.add('hidden');

        try {
            // Llama a la API que ejecuta el script de procesamiento en el backend
            let apiUrl = '../api/index.php?resource=run_processor';
            if (rotationOption) {
                apiUrl += `&rotate=${rotationOption}`; // Añade el parámetro de rotación
            }

            const response = await fetch(apiUrl);
            // Lee y muestra la salida del proceso en tiempo real
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                outputConsole.textContent += decoder.decode(value, { stream: true });
                outputConsole.scrollTop = outputConsole.scrollHeight;
            }
            
            outputConsole.textContent += '\n\n--- PROCESO FINALIZADO ---';
            await showProcessedFiles(); // Muestra los resultados

        } catch (error) {
            outputConsole.textContent += `\n\n--- ERROR ---\n${error.message}`;
        } finally {
            button.disabled = false;
            button.textContent = 'Iniciar Proceso';
        }
    }

    /**
     * CASO 2: Cuando se selecciona/deselecciona una imagen de la lista.
     */
    if (event.target.closest('.processed-file-item')) {
        const item = event.target.closest('.processed-file-item');
        const checkbox = item.querySelector('.processed-file-checkbox');
        // Permite hacer clic en cualquier parte del item para marcar el checkbox
        if (event.target.tagName !== 'INPUT') {
            checkbox.checked = !checkbox.checked;
        }
        item.classList.toggle('selected', checkbox.checked);
        updateProcessorButtons(); // Actualiza el estado de los botones
    }

    /**
     * CASO 3: Cuando se hace clic en "Subir a Galería" (al bucket).
     */
    if (event.target.id === 'upload-to-gallery-btn') {
        // Obtiene los nombres de los archivos seleccionados
        const selectedFiles = Array.from(document.querySelectorAll('.processed-file-checkbox:checked'))
            .map(cb => cb.closest('.processed-file-item').dataset.fileName);
        
        const feedbackDiv = document.getElementById('results-feedback');
        const button = event.target;
        if (selectedFiles.length === 0) return;

        feedbackDiv.textContent = `Subiendo ${selectedFiles.length} archivo(s) a la galería...`;
        button.disabled = true;

        try {
            // Llama a la API que sube los archivos al bucket de Google Cloud
            const response = await fetch('../api/index.php?resource=admin/uploadProcessedToBucket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: selectedFiles })
            });
            const result = await response.json();

            if (!response.ok || !result.success) throw new Error(result.error || 'Error del servidor.');

            feedbackDiv.textContent = result.message;
            feedbackDiv.style.color = 'green';
        } catch (error) {
            feedbackDiv.textContent = `Error al subir: ${error.message}`;
            feedbackDiv.style.color = 'red';
        }
    }

    /**
     * CASO 4: Cuando se hace clic en "Descargar ZIP".
     */
    if (event.target.id === 'download-zip-btn') {
        const files = Array.from(document.querySelectorAll('.processed-file-checkbox:checked'))
            .map(cb => cb.closest('.processed-file-item').dataset.fileName);
        
        // Llama a la API que genera y devuelve un ZIP
        const response = await fetch('../api/index.php?resource=download_processed_images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // Obtiene el nombre del archivo de las cabeceras de la respuesta
            const disposition = response.headers.get('Content-Disposition');
            const fileNameMatch = disposition.match(/filename="(.+?)"/);
            a.download = fileNameMatch ? fileNameMatch[1] : 'imagenes.zip';
            document.body.appendChild(a);
            a.click(); // Inicia la descarga
            window.URL.revokeObjectURL(url);
        } else {
            alert('Error al crear el archivo ZIP.');
        }
    }

    /**
     * CASO 5: Cuando se hace clic en "Limpiar Resultados".
     */
    if (event.target.id === 'clear-results-btn') {
        document.getElementById('processed-files-list').innerHTML = '';
        document.getElementById('results-container').classList.add('hidden');
    }
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
        }else if (moduleName === 'clientes') {
            await loadActionContent('clientes/todos_los_clientes');
        }else if (moduleName === 'departamentos') { 
            await loadActionContent('departamentos/gestion');
        }else if (moduleName === 'utilidades') {
            await loadActionContent('utilidades/copia_seguridad');

        }else if (moduleName === 'tarjetas') {
            await loadActionContent('tarjetas/gestion');
        }else if (moduleName === 'inventario') {
            await loadActionContent('inventario/agregar_stock');
        }else if (moduleName === 'estadisticas') { 
            await loadActionContent('estadisticas/resumen');
        }
        else if (moduleName === 'web_admin') {
            await loadActionContent('web_admin/sliders');
        const activeButton = mainContent.querySelector('.action-btn[data-action="web_admin/sliders"]');
            if (activeButton) {
                activeButton.classList.add('active');
            }
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
        }else if (actionPath === 'inventario/historial_movimientos') {
            await populateMovementTypeFilter(); 
            fetchAndRenderInventoryHistory();
        }else if (actionPath === 'clientes/todos_los_clientes') {
            await fetchAndRenderCustomers();
        }else if (actionPath === 'clientes/nuevo_cliente') {
            initializeAddCustomerForm();
        }else if (actionPath.startsWith('web_admin/')) {
            initializeWebAdminControls();
        } else if (actionPath === 'productos/crear_oferta') {
                initializeOfferManagement();
        } else if (actionPath === 'productos/ofertas_activas') { 
                await fetchAndRenderActiveOffers();
        }else if (actionPath === 'tarjetas/gestion') {
            initializeCardManagement();
        } else if (actionPath === 'tarjetas/reporte_clientes') {
            fetchAndRenderCardReport();
        }else if (actionPath === 'tarjetas/reporte_clientes') {
            fetchAndRenderCardReport();            
        } else if (actionPath === 'tarjetas/recargar') {
            initializeCardRecharge();
        }else if (actionPath === 'departamentos/gestion') {
            initializeDepartmentManagement();
        }if (actionPath === 'utilidades/copia_seguridad') {
            initializeBackupControls();
        }else if (actionPath === 'inventario/agregar_stock') {
            initializeInventoryForm('stock');
        } else if (actionPath === 'inventario/ajuste_inventario') {
            initializeInventoryForm('adjust');
        } else if (actionPath === 'inventario/historial_movimientos') {
            fetchAndRenderInventoryHistory();
        }else if (actionPath === 'estadisticas/resumen') {
            initializeStatisticsSummary();
        } else if (actionPath === 'estadisticas/reporte_de_ventas') {
            initializeSalesReports();
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


// --- Lógica para el modal de asignación ---
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
    const cardId = form.querySelector('input[name="card_id"]').value;
    const amount = form.querySelector('#recharge-amount').value;

    button.disabled = true;
    button.textContent = 'Procesando...';
    feedbackDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/rechargeCard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id: cardId, amount: amount })
        });
        const result = await response.json();

        if (result.success) {
            feedbackDiv.innerHTML = `<div class="message success">${result.message}</div>`;
            // Volver a buscar la tarjeta para mostrar el saldo actualizado
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
    tableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}?resource=admin/getDepartments`);
        const result = await response.json();
        
        tableBody.innerHTML = '';
        if (result.success && result.departments.length > 0) {
            result.departments.forEach(dept => {
                const row = document.createElement('tr');
                row.dataset.departmentId = dept.id_departamento;
                
                // CORRECCIÓN: Se accede a la propiedad "departamento" del objeto que viene de la API.
                row.innerHTML = `
                    <td>${dept.id_departamento}</td>
                    <td class="editable" data-field="departamento">${dept.departamento}</td>
                    <td>${dept.codigo_departamento}</td>
                    <td><button class="action-btn delete-department-btn">&times;</button></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No hay departamentos creados.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="4" style="color:red;">Error al cargar los departamentos.</td></tr>';
    }
}
// Delegación de eventos para los botones de eliminar
mainContent.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-department-btn')) {
        const row = event.target.closest('tr');
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
                
                row.remove(); // Elimina la fila visualmente
                alert(result.message);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    }
    // ... (El resto de tu listener de click puede continuar aquí)
});

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
mainContent.addEventListener('focusout', (event) => {
    if (event.target.tagName === 'INPUT' && event.target.parentElement.classList.contains('editable')) {
        const input = event.target;
        const cell = input.parentElement;
        const originalValue = input.dataset.originalValue;
        const newValue = input.value.trim();
        
        // Determinar si es un producto o un departamento
        const productRow = cell.closest('tr[data-product-id]');
        const departmentRow = cell.closest('tr[data-department-id]');

        if (newValue !== originalValue && newValue !== '') {
             if (productRow) {
                const field = cell.dataset.field;
                const productId = productRow.dataset.productId;
                saveFieldUpdate(productId, field, newValue, cell);
             } else if (departmentRow) {
                const field = cell.dataset.field;
                const departmentId = departmentRow.dataset.departmentId;
                saveDepartmentFieldUpdate(departmentId, field, newValue, cell);
             }
        } else {
             if (productRow) {
                cell.textContent = cell.dataset.field === 'precio_venta' ? `$${parseFloat(originalValue).toFixed(2)}` : originalValue;
             } else if(departmentRow) {
                cell.textContent = originalValue;
             }
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
                if (result.product.usa_inventario != 1) {
                    throw new Error('Este producto no tiene activada la gestión de inventario.');
                }
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

function renderInventoryActionForm(product, type) {
    const container = document.getElementById(`${type}-form-container`);
    container.classList.remove('hidden');

    let title, label, inputName, buttonText, placeholder, minVal;

    switch(type) {
        case 'stock':
            title = 'Agregar Stock';
            label = 'Cantidad a Agregar';
            inputName = 'quantity';
            buttonText = 'Agregar';
            placeholder = 'Ej: 50';
            minVal = '1';
            break;
        case 'adjust':
            title = 'Ajustar Inventario';
            label = 'Valor del Ajuste (+/-)';
            inputName = 'adjustment_value';
            buttonText = 'Ajustar';
            placeholder = 'Ej: 10 (sumar) o -10 (restar)';
            minVal = ''; // Permite negativos
            break;
    }

    container.innerHTML = `
        <h4>${title}: ${product.nombre_producto}</h4>
        <p><strong>Código:</strong> ${product.codigo_producto}</p>
        <p><strong>Stock Actual:</strong> <span style="font-weight:bold; color:green;">${product.stock_actual}</span></p>
        
        <form id="${type}-action-form">
            <input type="hidden" name="product_id" value="${product.id_producto}">
            <div class="form-group">
                <label for="${inputName}">${label}</label>
                <input type="number" id="${inputName}" name="${inputName}" ${minVal ? `min="${minVal}"` : ''} required placeholder="${placeholder}">
            </div>
            <div class="form-group">
                <label for="notes">Notas (Opcional)</label>
                <input type="text" id="notes" name="notes" placeholder="Ej: Conteo físico / Merma">
            </div>
            <div id="${type}-feedback" class="form-message" style="margin-top:1rem;"></div>
            <button type="submit" class="action-btn form-submit-btn">${buttonText}</button>
        </form>
    `;

    document.getElementById(`${type}-action-form`).addEventListener('submit', handleInventoryActionSubmit);
}


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
                notes: rawData.notes
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






async function fetchAndRenderInventoryHistory() {
    const tableBody = document.getElementById('inventory-history-tbody');
    if (!tableBody) return;

    const searchTerm = document.getElementById('inventory-history-search').value;
    const startDate = document.getElementById('start-date-filter').value;
    const endDate = document.getElementById('end-date-filter').value;
    const movementTypeId = document.getElementById('movement-type-filter').value;

    tableBody.innerHTML = '<tr><td colspan="8">Cargando historial...</td></tr>';

    try {
        // CORRECCIÓN: Se eliminó el parámetro 'movementType' que ya no se usa.
        const params = new URLSearchParams({
            search: searchTerm,
            startDate: startDate,
            endDate: endDate,
            movementTypeId: movementTypeId 
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
                
                row.innerHTML = `
                    <td>${new Date(mov.fecha).toLocaleString('es-SV')}</td>
                    <td>${mov.nombre_producto} (${mov.codigo_producto})</td>
                    <td>${mov.tipo_movimiento}</td>
                    <td class="${cantidadClass}">${mov.cantidad}</td>
                    <td>${mov.stock_anterior}</td>
                    <td>${mov.stock_nuevo}</td>
                    <td>${mov.nombre_usuario || 'Sistema'}</td>
                    <td>${mov.notas || ''}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="8">No se encontraron movimientos para los filtros seleccionados.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<td colspan="8" style="color:red;">Error: ${error.message}</td>`;
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



console.log('Módulo de Estadísticas: admin.js cargado y listo.');

// Revisa si el contenedor del RESUMEN de estadísticas existe en la página
const summaryContainer = document.getElementById('statistics-summary');
if (summaryContainer) {
    console.log('Vista de Resumen de Estadísticas detectada. Llamando a loadSummaryData()...');
    loadSummaryData();
}

// Revisa si el contenedor de los REPORTES de ventas existe en la página
const reportsContainer = document.getElementById('sales-report-content');
if (reportsContainer) {
    console.log('Vista de Reportes de Ventas detectada. Iniciando...');
    loadSalesReport('daily'); // Carga el reporte diario por defecto

    // Asigna los eventos de clic a los botones de filtro
    document.getElementById('report-daily').addEventListener('click', () => loadSalesReport('daily'));
    document.getElementById('report-weekly').addEventListener('click', () => loadSalesReport('weekly'));
    document.getElementById('report-monthly').addEventListener('click', () => loadSalesReport('monthly'));
    document.getElementById('report-quarterly').addEventListener('click', () => loadSalesReport('quarterly'));
    document.getElementById('report-yearly').addEventListener('click', () => loadSalesReport('yearly'));
}

/**
 * Carga los datos del resumen general desde la API.
 */
function loadSummaryData() {
    console.log("Intentando fetch a 'api/?resource=getSummary'");
    fetch(`${API_BASE_URL}?resource=getSummary`)
        .then(response => {
            console.log('Respuesta del servidor recibida para el resumen. Status:', response.status);
            if (!response.ok) {
                throw new Error(`Error HTTP! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos del resumen recibidos y procesados:', data);
            if (data.error) {
                console.error('La API devolvió un error:', data.error);
                document.querySelector('#statistics-summary h2').textContent = 'Error al cargar datos.';
                return;
            }
            document.getElementById('total-clientes').textContent = data.total_clientes;
            document.getElementById('ventas-diarias').textContent = '$' + parseFloat(data.ventas_diarias).toFixed(2);
            document.getElementById('ventas-semanales').textContent = '$' + parseFloat(data.ventas_semanales).toFixed(2);
            document.getElementById('ventas-mensuales').textContent = '$' + parseFloat(data.ventas_mensuales).toFixed(2);
            document.getElementById('ventas-trimestrales').textContent = '$' + parseFloat(data.ventas_trimestrales).toFixed(2);
            document.getElementById('ventas-anuales').textContent = '$' + parseFloat(data.ventas_anuales).toFixed(2);
        })
        .catch(error => {
            console.error('Falló el fetch para el resumen:', error);
            document.querySelector('#statistics-summary h2').textContent = 'Error de conexión. Revisa la consola (F12).';
        });
}

/**
 * Carga el reporte de ventas por departamento.
 * @param {string} period - El período a consultar ('daily', 'weekly', etc.)
 */
   function loadSalesReport(period) {
        const reportContent = document.getElementById('sales-report-content');
        const reportTitle = document.getElementById('report-title');
        reportContent.innerHTML = '<tr><td colspan="2">Cargando...</td></tr>';
        const periodNames = {
            daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual',
            quarterly: 'Trimestral', yearly: 'Anual'
        };
        reportTitle.textContent = `Ventas por Depto. (${periodNames[period] || ''})`;

        fetch(`${API_BASE_URL}?resource=getSalesReport&period=${period}`)
            .then(response => response.json())
            .then(data => {
                reportContent.innerHTML = '';
                if (data.error) throw new Error(data.error);
                if (data.length > 0) {
                    let totalGeneral = 0;
                    data.forEach(item => {
                        const total = parseFloat(item.total_por_departamento);
                        totalGeneral += total;
                        const row = `<tr><td>${item.departamento}</td><td>$${total.toFixed(2)}</td></tr>`;
                        reportContent.insertAdjacentHTML('beforeend', row);
                    });
                    const totalRow = `<tr class="total-row"><td><strong>Total General</strong></td><td><strong>$${totalGeneral.toFixed(2)}</strong></td></tr>`;
                    reportContent.insertAdjacentHTML('beforeend', totalRow);
                } else {
                    reportContent.innerHTML = '<tr><td colspan="2">No hay datos.</td></tr>';
                }
            }).catch(error => console.error('Error en Reporte:', error));
    }


// =================================================================
// FIN DEL CÓDIGO DE ESTADÍSTICAS
// =================================================================


    initializeSidemenu();
    checkSidemenuState();
    loadModule('dashboard');








// =================================================================
// INICIO DEL ÚNICO BLOQUE DE CÓDIGO PARA ESTADÍSTICAS
// (Elimina todas las otras versiones de estas funciones)
// =================================================================

function initializeStatisticsSummary() {
    console.log("Vista de Resumen de Estadísticas inicializada.");
    loadSummaryData();
    
    // Dibuja los gráficos iniciales
    requestAnimationFrame(() => {
        renderWeeklySalesChart();
        renderAnnualSalesChart();
    });

    // --- NUEVO: Listeners para los controles ---
    const themeSelector = document.getElementById('theme-selector');
    if(themeSelector) {
        themeSelector.addEventListener('change', (event) => {
            currentChartTheme = event.target.value;
            // Redibuja ambos gráficos con el nuevo tema
            renderWeeklySalesChart();
            renderAnnualSalesChart();
        });
    }
    
    document.querySelectorAll('.chart-type-btn').forEach(button => {
        button.addEventListener('click', () => {
            const chartToUpdate = button.dataset.chart;
            const newType = button.dataset.type;

            if (chartToUpdate === 'weeklySalesChart') {
                renderWeeklySalesChart(newType);
            } else if (chartToUpdate === 'annualSalesChart') {
                renderAnnualSalesChart(newType);
            }
        });
    });
}

function initializeSalesReports() {
    console.log("Vista de Reportes de Ventas inicializada.");
    loadSalesReport('daily');
    loadMonthlyBreakdown();

    // Asigna eventos a los botones de filtro de reportes
    document.getElementById('report-daily')?.addEventListener('click', () => loadSalesReport('daily'));
    document.getElementById('report-weekly')?.addEventListener('click', () => loadSalesReport('weekly'));
    document.getElementById('report-monthly')?.addEventListener('click', () => loadSalesReport('monthly'));
    document.getElementById('report-quarterly')?.addEventListener('click', () => loadSalesReport('quarterly'));
    document.getElementById('report-yearly')?.addEventListener('click', () => loadSalesReport('yearly'));
}

function loadSummaryData() {
    fetch(`${API_BASE_URL}?resource=getSummary`)
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            document.getElementById('total-clientes').textContent = data.total_clientes;
            document.getElementById('ventas-diarias').textContent = '$' + parseFloat(data.ventas_diarias).toFixed(2);
            document.getElementById('ventas-semanales').textContent = '$' + parseFloat(data.ventas_semanales).toFixed(2);
            document.getElementById('ventas-mensuales').textContent = '$' + parseFloat(data.ventas_mensuales).toFixed(2);
            document.getElementById('ventas-trimestrales').textContent = '$' + parseFloat(data.ventas_trimestrales).toFixed(2);
            document.getElementById('ventas-anuales').textContent = '$' + parseFloat(data.ventas_anuales).toFixed(2);
        }).catch(error => {
            console.error('Error cargando el resumen:', error);
        });
}

// REEMPLAZA ESTAS DOS FUNCIONES

function renderWeeklySalesChart(chartType = 'line') {
    const canvasContainer = document.getElementById('weeklySalesChartContainer');
    if (!canvasContainer) return;
    canvasContainer.innerHTML = '<canvas id="weeklySalesChart"></canvas>'; // Reinicia el canvas
    const ctx = document.getElementById('weeklySalesChart').getContext('2d');

    fetch(`${API_BASE_URL}?resource=getWeeklySalesChartData`)
        .then(response => response.json())
        .then(chartData => {
            if (chartData.error) throw new Error(chartData.error);
            
            // Usamos nuestra nueva función para obtener el estilo
            const options = getChartOptions(currentChartTheme);

            new Chart(ctx, {
                type: chartType, // Acepta un tipo de gráfico dinámico
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Ventas Semanales',
                        data: chartData.data.map(item => item.value),
                        fill: true,
                        backgroundColor: 'rgba(59, 125, 221, 0.2)',
                        borderColor: 'rgba(59, 125, 221, 1)',
                        tension: 0.3
                    }]
                },
                options: options // Aplicamos las opciones del tema
            });
        })
        .catch(error => console.error('Error en gráfico semanal:', error));
}

function renderAnnualSalesChart(chartType = 'line') {
    const canvasContainer = document.getElementById('annualSalesChartContainer');
    if (!canvasContainer) return;
    canvasContainer.innerHTML = '<canvas id="annualSalesChart"></canvas>';
    const ctx = document.getElementById('annualSalesChart').getContext('2d');

    fetch(`${API_BASE_URL}?resource=getAnnualSalesChartData`)
        .then(response => response.json())
        .then(chartData => {
            if (chartData.error) throw new Error(chartData.error);

            // Usamos nuestra nueva función para obtener el estilo
            const options = getChartOptions(currentChartTheme);

            new Chart(ctx, {
                type: chartType, // Acepta un tipo de gráfico dinámico
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Ventas Anuales',
                        data: chartData.data.map(item => item.value),
                        fill: true,
                        backgroundColor: 'rgba(22, 163, 74, 0.2)',
                        borderColor: 'rgba(22, 163, 74, 1)',
                        tension: 0.3
                    }]
                },
                options: options // Aplicamos las opciones del tema
            });
        })
        .catch(error => console.error('Error en gráfico anual:', error));
}
function loadSalesReport(period) {
    const reportContent = document.getElementById('sales-report-content');
    const reportTitle = document.getElementById('report-title');
    if (!reportContent || !reportTitle) return;

    reportContent.innerHTML = '<tr><td colspan="2">Cargando...</td></tr>';
    const periodNames = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' };
    reportTitle.textContent = `Ventas por Depto. (${periodNames[period] || ''})`;

    fetch(`${API_BASE_URL}?resource=getSalesReport&period=${period}`)
        .then(response => response.json())
        .then(data => {
            reportContent.innerHTML = '';
            if (data.error) throw new Error(data.error);
            if (data.length > 0) {
                let totalGeneral = data.reduce((sum, item) => sum + parseFloat(item.total_por_departamento), 0);
                data.forEach(item => {
                    reportContent.innerHTML += `<tr><td>${item.departamento}</td><td>$${parseFloat(item.total_por_departamento).toFixed(2)}</td></tr>`;
                });
                reportContent.innerHTML += `<tr class="total-row"><td><strong>Total General</strong></td><td><strong>$${totalGeneral.toFixed(2)}</strong></td></tr>`;
            } else {
                reportContent.innerHTML = '<tr><td colspan="2">No hay datos para este período.</td></tr>';
            }
        }).catch(error => {
            console.error('Error en Reporte:', error);
            reportContent.innerHTML = '<tr><td colspan="2" style="color:red">Error al cargar el reporte.</td></tr>';
        });
}

function loadMonthlyBreakdown() {
    const breakdownContent = document.getElementById('monthly-breakdown-content');
    const breakdownTitle = document.getElementById('monthly-breakdown-title');
    const breakdownTotal = document.getElementById('monthly-breakdown-total');
    if (!breakdownContent || !breakdownTitle || !breakdownTotal) return;

    fetch(`${API_BASE_URL}?resource=getMonthlyBreakdown`)
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

            const now = new Date();
            const monthName = now.toLocaleString('es-ES', { month: 'long' });
            breakdownTitle.textContent = `Desglose de Ventas de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${now.getFullYear()}`;
            breakdownContent.innerHTML = '';
            let monthlyTotal = 0;

            if (data.length > 0) {
                data.forEach(item => {
                    const dailyTotal = parseFloat(item.total_diario);
                    monthlyTotal += dailyTotal;
                    const dateParts = item.fecha.split('-');
                    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                    breakdownContent.innerHTML += `<tr><td>${formattedDate}</td><td>$${dailyTotal.toFixed(2)}</td></tr>`;
                });
            } else {
                breakdownContent.innerHTML = '<tr><td colspan="2">No hay ventas registradas este mes.</td></tr>';
            }
            breakdownTotal.innerHTML = `<strong>$${monthlyTotal.toFixed(2)}</strong>`;
        }).catch(error => {
            console.error('Error en Desglose Mensual:', error);
        });
}

// =================================================================
// FIN DEL BLOQUE DE CÓDIGO PARA ESTADÍSTICAS
// =================================================================







});

