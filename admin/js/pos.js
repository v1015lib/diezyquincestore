function initializePOS() {
    let audioCtx = null;
    let currentTicket = [];
    let currentSaleId = null;
    let currentClientId = 1;
    let currentClientName = 'Público en General';
    let cardOwnerId = null;
    let activeTicketRowIndex = -1;
    let selectedStoreId = null;
    let highlightedSearchIndex = -1; // Para la navegación del modal de búsqueda
    // Referencias a elementos del DOM (sin cambios)
    const productInput = document.getElementById('pos-product-input');
    const openSearchModalBtn = document.getElementById('open-search-modal-btn');
    const productSearchModal = document.getElementById('product-search-modal');
    const modalSearchInput = document.getElementById('modal-product-search-input');
    const modalSearchResultsContainer = document.getElementById('modal-search-results-container');
    const notificationModal = document.getElementById('pos-notification-modal');
    const notificationTitle = document.getElementById('pos-notification-title');
    const notificationMessage = document.getElementById('pos-notification-message');
    const notificationOkBtn = document.getElementById('pos-notification-ok-btn');
    const ticketTableBody = document.querySelector('#ticket-table tbody');
    const totalAmountInput = document.getElementById('total-amount');
    const pagaConInput = document.getElementById('paga-con');
    const changeAmountSpan = document.getElementById('change-amount');
    const cobrarBtn = document.getElementById('cobrar-btn');
    const cancelSaleBtn = document.getElementById('cancel-sale-btn');
    const assignClientBtn = document.getElementById('assign-client-btn');
    const clientNameSpan = document.getElementById('client-name');
    const clientModal = document.getElementById('assign-client-modal');
    const clientSearchInput = document.getElementById('client-search');
    const clientSearchResults = document.getElementById('client-search-results');
    const paymentMethodSelect = document.getElementById('payment-method-select');
    const cardPaymentDetails = document.getElementById('card-payment-details');
    const cardNumberInput = document.getElementById('card-number-input');
    const cardBalanceFeedback = document.getElementById('card-balance-feedback');
    const openCheckoutModalBtn = document.getElementById('open-checkout-modal-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutTicketList = document.getElementById('checkout-ticket-list');
    const footerTotalAmount = document.getElementById('footer-total-amount');
    const openHistoryModalBtn = document.getElementById('open-history-modal-btn');
    const salesHistoryModal = document.getElementById('sales-history-modal');
    const salesHistoryDateInput = document.getElementById('sales-history-date');
    const salesSummaryTbody = document.querySelector('#sales-history-summary-table tbody');
    const saleDetailHeader = document.getElementById('sale-detail-header');
    const saleDetailItems = document.getElementById('sale-detail-items');
    const saleDetailFooter = document.getElementById('sale-detail-footer');
    const ticketHistorySearchInput = document.getElementById('ticket-history-search-input');

    const storeSelectionModal = document.getElementById('store-selection-modal');
    const storeSelect = document.getElementById('pos-store-select');
    const confirmStoreBtn = document.getElementById('confirm-store-selection-btn');
    const storeIndicator = document.getElementById('pos-store-indicator');
    const storeNameDisplay = document.getElementById('store-name-display');
    const changeStoreBtn = document.getElementById('change-store-btn');

    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const barcodeScannerContainer = document.getElementById('barcode-scanner-container');
    const closeScannerBtn = document.getElementById('close-scanner-btn');
    const qrReaderElement = document.getElementById('qr-reader');
    let html5QrCode = null;

    let debounceTimer;
    const API_URL = '../api/index.php';

if (storeSelectionModal) {
    storeSelectionModal.addEventListener('click', (e) => {
        // Cierra el modal si se hace clic en el fondo, en la '×' o en el botón "Cancelar"
        if (e.target.id === 'store-selection-modal' || e.target.classList.contains('close-button') || e.target.id === 'cancel-store-selection-btn') {
            storeSelectionModal.style.display = 'none';
        }
    });
}


/**
     * Manejador de la tecla Escape para cerrar modales.
     * Cierra el modal de mayor prioridad que esté visible.
     * @param {Event} e - El evento de teclado.
     * @param {Array<Object>} priorityList - Un array de objetos {element, action} en orden de prioridad.
     */
    function handleModalEscape(e, priorityList) {
        // Recorremos la lista de modales en orden de prioridad
        for (const modal of priorityList) {
            
            // Comprueba si el elemento del modal existe Y está visible
            if (modal.element && modal.element.style.display === 'block') {
                
                e.preventDefault(); // Previene cualquier otra acción por defecto de 'Escape'
                
                modal.action();     // Ejecuta la acción de cierre específica
                
                return;             // Detiene el bucle. Solo cierra un modal a la vez.
            }
        }
    }

// --- INICIO: LISTA DE PRIORIDAD PARA CIERRE DE MODALES ---
    // Define el orden en que se deben cerrar los modales con 'Escape' (de mayor a menor prioridad)
    const escapePriorityList = [
        {
            element: notificationModal,
            action: () => closePOSNotificationModal()
        },
        {
            element: salesHistoryModal,
            action: () => { salesHistoryModal.style.display = 'none'; }
        },
        {
            element: clientModal, // Se abre desde el modal de checkout
            action: () => { clientModal.style.display = 'none'; }
        },
        {
            element: productSearchModal,
            action: () => {
                closeProductSearchModal();
                productInput.focus();
            }
        },
        {
            element: checkoutModal,
            action: () => closeCheckoutModal()
        },
        {
            element: storeSelectionModal,
            action: () => { storeSelectionModal.style.display = 'none'; }
        }
    ];
    // --- FIN: LISTA DE PRIORIDAD ---


/**
     * Resalta un item en la lista de resultados de búsqueda del modal.
     * @param {number} index - El índice del item a resaltar.
     */
    function highlightSearchResult(index) {
        const resultsList = document.getElementById('modal-search-results-list');
        if (!resultsList) return;
        
        const items = resultsList.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        // Quitar resaltado anterior
        items.forEach(item => item.classList.remove('search-result-highlighted'));

        // Validar índice y ajustar si se sale de los límites
        if (index < 0) {
            index = items.length - 1; // Loop al final
        }
        if (index >= items.length) {
            index = 0; // Loop al inicio
        }
        
        highlightedSearchIndex = index; // Actualizar índice global
        
        // Aplicar nuevo resaltado
        const activeItem = items[highlightedSearchIndex];
        if (activeItem) {
            activeItem.classList.add('search-result-highlighted');
            // Asegurarse de que el item sea visible en el scroll
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    // Añadir listeners de teclado al input de búsqueda del modal
    if (modalSearchInput) {
        modalSearchInput.addEventListener('keydown', (e) => {
            const resultsList = document.getElementById('modal-search-results-list');
            if (!resultsList) return;
            const items = resultsList.querySelectorAll('.search-result-item');
            if (items.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    highlightSearchResult(highlightedSearchIndex + 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    highlightSearchResult(highlightedSearchIndex - 1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (highlightedSearchIndex >= 0 && items[highlightedSearchIndex]) {
                        items[highlightedSearchIndex].click(); // Simular clic en el item resaltado
                    }
                    break;
            }
        });
    }


function playBeepSound() {
        try {
            // Crea un contexto de audio (si no existe ya)
            const audioCtx = window.AudioContext || window.webkitAudioContext || new (window.AudioContext || window.webkitAudioContext)();
            
            // Crea un oscilador (genera el tono)
            const oscillator = audioCtx.createOscillator();
            // Crea un nodo de ganancia (controla el volumen)
            const gainNode = audioCtx.createGain();

            // Conecta el oscilador a la ganancia, y la ganancia a la salida (altavoces)
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Configura el sonido del beep
            oscillator.type = 'sine'; // Tipo de onda (sine es suave)
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Frecuencia del tono (La A5)
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Volumen (0 a 1)

            // Inicia el sonido
            oscillator.start();

            // Detiene el sonido después de un corto tiempo (ej. 100ms)
            oscillator.stop(audioCtx.currentTime + 0.1); // Duración del beep

        } catch (e) {
            console.error("Error al reproducir el sonido:", e);
             // Puedes ignorar errores si el navegador no soporta AudioContext
        }
    }
// --- Lógica del Escáner de Códigos de Barras ---

    function onScanSuccess(decodedText, decodedResult) {
        // Poner el código escaneado en el input
        productInput.value = decodedText;
        
        // Simular Enter para buscar el producto
        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', charCode: 13, keyCode: 13, bubbles: true });
        productInput.dispatchEvent(enterEvent);
        
        // Cerrar el escáner
        stopScanner();
    }

    function onScanFailure(error) {
        // Opcional: Manejar errores o simplemente ignorarlos si no se detecta código
        // console.warn(`Error de escaneo = ${error}`);
    }



    function onScanSuccess(decodedText, decodedResult) {
        
        playBeepSound(); // <<<--- LLAMA A LA FUNCIÓN DEL SONIDO AQUÍ ---<<<
        

        // Poner el código escaneado en el input
        productInput.value = decodedText;
        
        // Simular Enter para buscar el producto
        const enterEvent = new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', charCode: 13, keyCode: 13, bubbles: true });
        productInput.dispatchEvent(enterEvent);
        
        // Cerrar el escáner
        stopScanner();
    }
function startScanner() {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        // --- Mostrar el contenedor ANTES de intentar iniciar la cámara ---
        barcodeScannerContainer.style.display = 'flex';
        qrReaderElement.innerHTML = '<p>Iniciando cámara...</p>'; // Mensaje mientras carga

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        const preferredCameraConfig = { facingMode: "environment" }; // Priorizar cámara trasera

        html5QrCode.start(
            preferredCameraConfig,
            config,
            onScanSuccess,
            onScanFailure
        ).catch((err) => {
            console.warn("Fallo al iniciar cámara trasera, intentando con cámara por defecto:", err);
            // Intento con cámara por defecto si falla la trasera
            html5QrCode.start(
                { }, // Sin especificar 'facingMode'
                config,
                onScanSuccess,
                onScanFailure
            ).catch(finalErr => {
                 console.error("Error final al iniciar el escáner:", finalErr);
                 // --- Mostrar notificación al usuario ---
                 qrReaderElement.innerHTML = `<p style="color: red;">Error: No se pudo acceder a la cámara. Revisa los permisos.</p>`;
                 // No ocultamos el contenedor aquí, para que el usuario vea el error y pueda cerrarlo manualmente.
                 // barcodeScannerContainer.style.display = 'none';
                 showPOSNotificationModal('Error de Cámara', `No se pudo acceder a la cámara. Asegúrate de haber concedido los permisos necesarios en tu navegador. Detalles: ${finalErr}`, 'error');
            });
        });
    }

    // Asegúrate de que el botón de cerrar siempre funcione
function stopScanner() {
        // Oculta el contenedor inmediatamente
        barcodeScannerContainer.style.display = 'none';
        qrReaderElement.innerHTML = ''; // Limpia el contenido del lector

        // Intenta detener el escáner si está activo
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                console.log("Escáner detenido correctamente.");
            }).catch((err) => {
                // A menudo puede dar error si ya se estaba deteniendo, es seguro ignorarlo
                console.warn("Error menor al intentar detener el escáner (puede ser normal):", err);
            }).finally(() => {
                 html5QrCode = null; // Resetea la instancia por si acaso
                 // productInput.focus(); // <<--- ELIMINA O COMENTA ESTA LÍNEA ---<<<
            });
        } else {
             // productInput.focus(); // <<--- TAMBIÉN ELIMINA O COMENTA ESTA LÍNEA ---<<<
        }
    }

    // Añade el listener SOLO si el botón existe
    if (scanBarcodeBtn) {
        scanBarcodeBtn.addEventListener('click', startScanner);
    } else {
        console.warn("El botón para escanear ('scan-barcode-btn') no se encontró.");
    }

    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', stopScanner);
    } else {
         console.warn("El botón para cerrar el escáner ('close-scanner-btn') no se encontró.");
    }

    if (scanBarcodeBtn) {
        scanBarcodeBtn.addEventListener('click', startScanner);
    }
    
    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', stopScanner);
    }

    // --- Fin Lógica del Escáner ---
    async function setupPOSForRole() {
        if (USER_ROLE === 'administrador_global') {
            changeStoreBtn.style.display = 'inline-block'; // Muestra el botón de "Cambiar Tienda"
            const storedStoreId = sessionStorage.getItem('pos_selected_store_id');
            const storedStoreName = sessionStorage.getItem('pos_selected_store_name');

            if (storedStoreId && storedStoreName) {
                selectedStoreId = storedStoreId;
                storeNameDisplay.textContent = `Operando desde: ${storedStoreName}`;
                enablePOSControls();
                await startOrResumeSale(selectedStoreId);
            } else {
                // Si no hay tienda seleccionada, el POS carga pero no está operativo
                storeNameDisplay.textContent = 'Seleccione una tienda para operar';
                storeSelectionModal.style.display = 'block'; // Sugiere al usuario elegir una tienda
            }
        } else {
            // Para otros roles, la tienda es fija
            changeStoreBtn.style.display = 'none';
            enablePOSControls();
            await startOrResumeSale();
        }
    }



function enablePOSControls() {
        productInput.disabled = false;
        openSearchModalBtn.disabled = false;
        if(scanBarcodeBtn) scanBarcodeBtn.disabled = false; // Habilitar botón de escáner
        productInput.focus();
    }

        if (changeStoreBtn) {
        changeStoreBtn.addEventListener('click', () => {
            storeSelectionModal.style.display = 'block';
        });
    }

  if (confirmStoreBtn) {
        confirmStoreBtn.addEventListener('click', async () => {
            const storeId = storeSelect.value;
            if (!storeId) {
                alert('Por favor, selecciona una tienda.');
                return;
            }
            
            // Si hay una venta en progreso y se está cambiando de tienda, pide confirmación
            if (currentTicket.length > 0 && selectedStoreId !== storeId) {
                if (!confirm('Al cambiar de tienda, se cancelará la venta actual. ¿Deseas continuar?')) {
                    storeSelectionModal.style.display = 'none';
                    return;
                }
            }

            selectedStoreId = storeId;
            const selectedOption = storeSelect.options[storeSelect.selectedIndex];
            const storeName = selectedOption.dataset.storeName;

            sessionStorage.setItem('pos_selected_store_id', selectedStoreId);
            sessionStorage.setItem('pos_selected_store_name', storeName);

            storeNameDisplay.textContent = `Operando desde: ${storeName}`;
            storeSelectionModal.style.display = 'none';
            if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext inicializado por interacción.");
            } catch (e) {
                console.error("No se pudo crear AudioContext:", e);
            }
        }
            enablePOSControls();
            // Inicia una nueva venta para la tienda seleccionada
            await startOrResumeSale(selectedStoreId); 
        });
    }

    async function setStoreInSession(storeId) {
        try {
            await fetch(`${API_URL}?resource=pos_set_store`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_id: storeId })
            });
        } catch (error) {
            console.error('Error al guardar la tienda en la sesión del servidor:', error);
        }
    }




    async function addProductToTicket(product) {
        if (!currentSaleId) { return; }
        const existingProduct = currentTicket.find(item => item.id_producto === product.id_producto);
        
        if (existingProduct) {
            if (existingProduct.usa_inventario == 1 && existingProduct.cantidad >= existingProduct.stock_actual_inicial) {
                return; // Bloqueo silencioso
            }
            existingProduct.cantidad++;
        } else {
            if (product.usa_inventario == 1 && parseInt(product.stock_actual) <= 0) {
                showPOSNotificationModal('Sin Existencias', `El producto "${product.nombre_producto}" está agotado en la tienda seleccionada.`, 'error');
                return;
            }
            // CORRECCIÓN: Se restauran las propiedades para guardar el estado inicial del producto
            currentTicket.push({
                ...product,
                cantidad: 1,
                stock_actual_inicial: product.stock_actual,
                precio_venta_original: product.precio_venta,
                precio_oferta_original: product.precio_oferta,
                precio_mayoreo_original: product.precio_mayoreo,
                precio_activo: 'normal'
            });
        }
        await updateItemInDB(product.id_producto);
        updateTicketTable();
        setActiveRow(currentTicket.length - 1);
    }




    // --- LÓGICA DE LA TABLA DEL TICKET (Actualizada) ---
    function updateTicketTable() {
        ticketTableBody.innerHTML = '';
        let total = 0;
        currentTicket.forEach((item, index) => {
            const subtotal = item.cantidad * item.precio_venta;
            total += subtotal;

            // CORRECCIÓN: Se asegura que el stock_actual_inicial sea un número
            const stockInicial = parseInt(item.stock_actual_inicial, 10);
            const stockDisplay = item.usa_inventario == 1 ? (stockInicial - item.cantidad) : 'N/A';
            
            const row = document.createElement('tr');
            row.dataset.index = index;
            let priceClass = '', priceTitle = '';
            if (item.precio_activo === 'oferta') { priceClass = 'price-offer'; priceTitle = 'Precio de Oferta (F2)'; }
            else if (item.precio_activo === 'mayoreo') { priceClass = 'price-wholesale'; priceTitle = 'Precio de Mayoreo (F4)'; }
            row.innerHTML = `
                <td>${item.nombre_producto}</td>
                <td>${stockDisplay}</td>
                <td><input type="number" class="quantity-input" value="${item.cantidad}" data-index="${index}" min="1"></td>
                <td class="${priceClass}" title="${priceTitle}">$${parseFloat(item.precio_venta).toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button class="remove-item btn btn-sm btn-danger" data-index="${index}">X</button></td>
            `;
            ticketTableBody.appendChild(row);
        });
        totalAmountInput.value = total.toFixed(2);
        updateChange();
        footerTotalAmount.textContent = `$${total.toFixed(2)}`;
        openCheckoutModalBtn.disabled = total <= 0;
    }


// REEMPLAZA ESTA FUNCIÓN EN: admin/js/pos.js
function openCheckoutModal() {
    if (currentTicket.length === 0) return;

    // Poblar el resumen del ticket en el modal
    checkoutTicketList.innerHTML = '';
    let currentTotal = 0; // Se calcula el total al momento de abrir
    currentTicket.forEach(item => {
        const subtotal = item.cantidad * item.precio_venta;
        currentTotal += subtotal; // Acumular total
        const itemDiv = document.createElement('div');
        itemDiv.className = 'ticket-item';
        itemDiv.innerHTML = `
            <span class="item-name">${item.cantidad} x ${item.nombre_producto}</span>
            <span class="item-details">$${subtotal.toFixed(2)}</span>
        `;
        checkoutTicketList.appendChild(itemDiv);
    });

    // --- INICIO DE LA INTEGRACIÓN ---
    // 1. Asegurar que el total esté en el input de Total a Pagar
    totalAmountInput.value = currentTotal.toFixed(2);
    // 2. Asignar ese mismo total al campo "Paga con" por defecto
    pagaConInput.value = currentTotal.toFixed(2); 
    // 3. Llamar a updateChange() para calcular el cambio (0.00) y habilitar el botón 'cobrarBtn'
    updateChange(); 
    // --- FIN DE LA INTEGRACIÓN ---

    checkoutModal.style.display = 'block';

    // --- LÓGICA DE FOCO MEJORADA ---
    if (paymentMethodSelect.value === '1') { // '1' es Efectivo
        pagaConInput.focus(); 
        pagaConInput.select(); // Seleccionar para sobreescribir fácil si paga con más
    } else if (paymentMethodSelect.value === '2') { // '2' es Tarjeta Interna
        cardNumberInput.focus();
    } else {
        pagaConInput.focus(); // Fallback
    }
    // --- FIN LÓGICA DE FOCO ---
}

        function closeCheckoutModal() {
        checkoutModal.style.display = 'none';
    }

    // --- MANEJADORES DE EVENTOS (NUEVOS Y MODIFICADOS) ---
    openCheckoutModalBtn.addEventListener('click', openCheckoutModal);
    checkoutModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-button') || e.target.id === 'checkout-modal') {
            closeCheckoutModal();
        }
    });

    // Atajo de teclado para abrir el modal
    document.addEventListener('keydown', (e) => {

        if (e.key === 'F10') {
            e.preventDefault();
            // Abre el modal de búsqueda de producto si los controles están activos
            if (openSearchModalBtn && !openSearchModalBtn.disabled) {
                // Cierra el modal de pago si está abierto, para evitar superposición
                if (checkoutModal.style.display === 'block') {
                    closeCheckoutModal();
                }
                openSearchModalBtn.click();
            }
        }
        if (e.key === 'F12') {
            e.preventDefault();
            openCheckoutModal();
        }


        if (e.key === 'F2') {
        e.preventDefault();
        // PRIMERO: Verifica si el modal de pago está abierto
        if (checkoutModal.style.display === 'block') {
            // Si está abierto y el botón Cobrar está listo, simula el clic
            if (!cobrarBtn.disabled) {
                cobrarBtn.click();
            }
        } else {
            // Si el modal NO está abierto, F2 aplica el precio de oferta (si hay fila activa)
            // Asegúrate de que la función applySpecialPrice exista en tu código
            if (typeof applySpecialPrice === 'function') {
                applySpecialPrice('oferta');
            } else {
                console.warn('La función applySpecialPrice no está definida para el atajo F2 (oferta).');
            }
        }
    }
    if (e.key === 'Escape') {
            // Llama a la nueva función reutilizable
            handleModalEscape(e, escapePriorityList);
        }

    });



    // --- NUEVO: SISTEMA DE NAVEGACIÓN Y ATAJOS DE TECLADO ---

    function setActiveRow(index) {
        // Desmarcar la fila anteriormente activa
        ticketTableBody.querySelectorAll('tr.active-row').forEach(row => row.classList.remove('active-row'));
        
        // Encontrar y marcar la nueva fila activa
        const newActiveRow = ticketTableBody.querySelector(`tr[data-index="${index}"]`);
        if (newActiveRow) {
            newActiveRow.classList.add('active-row');
            activeTicketRowIndex = index;
            // Opcional: hacer scroll para que la fila sea visible si está fuera de la vista
            newActiveRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            activeTicketRowIndex = -1; // Si no se encuentra, no hay ninguna activa
        }
    }

    async function changeActiveRowQuantity(change) {
        if (activeTicketRowIndex === -1) return;
        const item = currentTicket[activeTicketRowIndex];
        const newQuantity = item.cantidad + change;

        if (newQuantity < 1) return; 

        // CORRECCIÓN: Se usa stock_actual_inicial para la comparación
        if (item.usa_inventario == 1 && newQuantity > item.stock_actual_inicial) {
            return; 
        }
        
        item.cantidad = newQuantity;
        await updateItemInDB(item.id_producto);
        updateTicketTable();
        setActiveRow(activeTicketRowIndex);
    }

    async function applySpecialPrice(priceType) {
        if (activeTicketRowIndex === -1) return;
        const item = currentTicket[activeTicketRowIndex];

        // Lógica para alternar precios
        if (item.precio_activo === priceType) {
            item.precio_venta = item.precio_venta_original;
            item.precio_activo = 'normal';
        } else {
            const newPrice = parseFloat(priceType === 'oferta' ? item.precio_oferta_original : item.precio_mayoreo_original);
            if (newPrice > 0) {
                item.precio_venta = newPrice;
                item.precio_activo = priceType;
            } else {
                showPOSNotificationModal('Precio no Disponible', `Este producto no tiene precio de ${priceType}.`, 'error');
                return;
            }
        }
        await updateItemInDB(item.id_producto);
        updateTicketTable();
        setActiveRow(activeTicketRowIndex);
    }
    document.addEventListener('keydown', (e) => {
        // Evitar que los atajos se activen si se está escribiendo en otros inputs
        if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'pos-product-input') {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                let nextIndex = activeTicketRowIndex + 1;
                if (nextIndex >= currentTicket.length) nextIndex = 0; // Vuelve al inicio
                setActiveRow(nextIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                let prevIndex = activeTicketRowIndex - 1;
                if (prevIndex < 0) prevIndex = currentTicket.length - 1; // Va al final
                setActiveRow(prevIndex);
                break;
            case '+':
                e.preventDefault();
                changeActiveRowQuantity(1);
                break;
            case '-':
                e.preventDefault();
                changeActiveRowQuantity(-1);
                break;
            case 'F2':
                e.preventDefault();
                applySpecialPrice('oferta');
                break;
            case 'F4':
                e.preventDefault();
                applySpecialPrice('mayoreo');
                break;
        }
    });
    // --- MANEJADORES DE EVENTOS DE LA TABLA (INTEGRADOS) ---

    // Listener para seleccionar fila con el ratón y para borrar
    ticketTableBody.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        
        if (e.target.classList.contains('remove-item')) {
            e.stopPropagation(); // Evita que la selección cambie al hacer clic en 'X'
            const index = parseInt(e.target.dataset.index);
            const item = currentTicket.splice(index, 1)[0];
            await updateItemInDB(item.id_producto, true);
            updateTicketTable();
            if (currentTicket.length > 0) {
                setActiveRow(Math.min(index, currentTicket.length - 1));
            } else {
                activeTicketRowIndex = -1;
            }
        } else if (row && row.dataset.index) {
            setActiveRow(parseInt(row.dataset.index));
        }
    });

    // Listener para actualizar cantidad desde el input manualmente
   ticketTableBody.addEventListener('change', async (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const index = parseInt(e.target.dataset.index);
            let newQuantity = parseInt(e.target.value);
            const item = currentTicket[index];
            if (isNaN(newQuantity) || newQuantity < 1) { e.target.value = 1; newQuantity = 1; }
            if (item.usa_inventario == 1 && newQuantity > item.stock_actual_inicial) {
                newQuantity = item.stock_actual_inicial;
                e.target.value = newQuantity;
            }
            item.cantidad = newQuantity;
            await updateItemInDB(item.id_producto);
            updateTicketTable();
            setActiveRow(index);
        }
    });
    
    // --- FUNCIONES AUXILIARES Y LÓGICA EXISTENTE (SIN CAMBIOS) ---

    async function updateItemInDB(productId, isRemoval = false) {
        const item = currentTicket.find(p => p.id_producto === productId);
        const quantity = isRemoval ? 0 : (item ? item.cantidad : 0);
        const unitPrice = item ? item.precio_venta : 0;
        try {
            const response = await fetch(`${API_URL}?resource=pos_add_item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sale_id: currentSaleId, product_id: productId, quantity: quantity, unit_price: unitPrice })
            });
            const data = await response.json();
            if (!data.success) {
                showPOSNotificationModal('Error', data.error || 'No se pudo actualizar el producto.', 'error');
            }
        } catch (error) {
            showPOSNotificationModal('Error de Conexión', 'No se pudo actualizar el ticket.', 'error');
        }
    }

    function showPOSNotificationModal(title, message, type = 'info') {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notificationTitle.className = type === 'error' ? 'error-title' : '';
        notificationModal.style.display = 'block';
        notificationOkBtn.focus();
    }

    function closePOSNotificationModal() {
        notificationModal.style.display = 'none';
    }

    notificationModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-button') || e.target.id === 'pos-notification-ok-btn' || e.target.classList.contains('modal')) {
            closePOSNotificationModal();
        }
    });

    openSearchModalBtn.addEventListener('click', () => {
        productSearchModal.style.display = 'block';
        modalSearchInput.focus();
    });

    productSearchModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-button') || e.target.classList.contains('modal')) {
            closeProductSearchModal();
        }
    });

function closeProductSearchModal() {
    productSearchModal.style.display = 'none';
    modalSearchInput.value = '';

    // CORRECCIÓN: Buscamos la lista interna y solo borramos su contenido.
    const resultsList = document.getElementById('modal-search-results-list');
    if (resultsList) {
        resultsList.innerHTML = ''; // Esto vacía la lista sin eliminarla.
    }
}

 modalSearchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = this.value;
        const resultsList = document.getElementById('modal-search-results-list');
        if (!resultsList) return;

        if (query.length < 2) {
            resultsList.innerHTML = '';
            return;
        }
        
        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`${API_URL}?resource=pos_search_products&query=${encodeURIComponent(query)}&store_id=${selectedStoreId || ''}`);
                const products = await response.json();
                renderSearchResults(products);
            } catch (error) {
                console.error('Error buscando productos en modal:', error);
            }
        }, 300);
    });

// ================== INICIO DE LA CORRECCIÓN CLAVE ==================
// Se elimina la llamada final a startOrResumeSale();
// La única llamada que inicia el POS es setupPOSForRole();
setupPOSForRole();
// =================== FIN DE LA CORRECCIÓN CLAVE ====================


    modalSearchResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            const product = JSON.parse(item.dataset.product);
            addProductToTicket(product);
            closeProductSearchModal();
        }
    });

   productInput.addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = this.value.trim();
            if (code === '') return;
            try {
                const response = await fetch(`${API_URL}?resource=pos_get_product_by_code&code=${encodeURIComponent(code)}&store_id=${selectedStoreId || ''}`);
                const result = await response.json();
                if (result.success && result.product) {
                    addProductToTicket(result.product);
                    this.value = '';
                } else {
                    showPOSNotificationModal('Error', result.error || 'Producto no encontrado.', 'error');
                }
            } catch (error) {
                showPOSNotificationModal('Error de Conexión', 'No se pudo comunicar con el servidor.', 'error');
            }
        }
    });

// Reemplaza esta función en tu archivo admin/js/pos.js

// Reemplaza esta función en tu archivo admin/js/pos.js

// Reemplaza esta función en tu archivo admin/js/pos.js

  function renderSearchResults(products) {
        const resultsList = document.getElementById('modal-search-results-list');
        if (!resultsList) return;
        resultsList.innerHTML = '';
        highlightedSearchIndex = -1; // <-- AÑADIR ESTA LÍNEA
        if (products.length > 0) {
            products.forEach(product => {
                const stockInfo = product.usa_inventario ? product.stock_actual : 'N/A';
                const row = document.createElement('div');
                row.className = 'search-result-item';
                row.dataset.product = JSON.stringify(product);
                row.innerHTML = `
                    <div class="col-product">${product.nombre_producto}</div>
                    <div class="col-department">${product.nombre_departamento}</div>
                    <div class="col-price">$${parseFloat(product.precio_venta).toFixed(2)}</div>
                    <div class="col-stock">${stockInfo}</div>
                `;
                resultsList.appendChild(row);
            });
        } else {
            resultsList.innerHTML = '<div class="search-result-item-empty">No se encontraron productos.</div>';
        }
    }
// admin/js/pos.js

// admin/js/pos.js

async function startOrResumeSale(storeId = null) {
    try {
        const response = await fetch(`${API_URL}?resource=pos_start_sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Ahora enviamos el ID de la tienda en esta misma petición
            body: JSON.stringify({ store_id: storeId }) 
        });
        const data = await response.json();
        if (data.success && data.sale_id) {
            currentSaleId = data.sale_id;
            if (data.ticket_items && data.ticket_items.length > 0) {
                currentTicket = data.ticket_items.map(item => ({...item, stock_actual_inicial: item.stock_actual, precio_venta_original: item.precio_venta, precio_oferta_original: item.precio_oferta, precio_mayoreo_original: item.precio_mayoreo, precio_activo: 'normal'}));
            } else {
                currentTicket = [];
            }
            currentClientId = 1;
            currentClientName = 'Público en General';
            resetPOS();
            toggleCardPaymentFields();
        } else {
            // Si la API devuelve un error (como que la tienda no se pudo establecer), lo mostramos
            showPOSNotificationModal('Error', data.error || 'Error al iniciar una nueva venta.', 'error');
        }
    } catch (error) {
        showPOSNotificationModal('Error de Conexión', 'No se pudo iniciar la venta.', 'error');
    }
}

    
    
    function resetPOS() {
        updateTicketTable();
        clientNameSpan.textContent = currentClientName;
        pagaConInput.value = '';
        productInput.value = '';
        cardNumberInput.value = '';
        cardBalanceFeedback.textContent = '';
        cobrarBtn.textContent = 'Cobrar y Finalizar';
        activeTicketRowIndex = -1;
    }

    pagaConInput.addEventListener('input', updateChange);

    function updateChange() {
        const total = parseFloat(totalAmountInput.value);
        const pagaCon = parseFloat(pagaConInput.value) || 0;
        const cambio = pagaCon - total;
        if (paymentMethodSelect.value === '2') {
            checkCardBalance();
        } else {
            cobrarBtn.disabled = (cambio < 0 || total <= 0);
        }
        changeAmountSpan.textContent = (cambio >= 0 && paymentMethodSelect.value !== '2') ? `$${cambio.toFixed(2)}` : '$0.00';
    }

// Reemplaza la función cobrarBtn.addEventListener('click', ...) 

cobrarBtn.addEventListener('click', async () => {
    const total = parseFloat(totalAmountInput.value);
    if (total <= 0) return;

    cobrarBtn.disabled = true;
    cobrarBtn.textContent = 'Procesando...';

    const finalClientId = (paymentMethodSelect.value === '2' && cardOwnerId) 
        ? cardOwnerId 
        : currentClientId;

    const saleData = {
        sale_id: currentSaleId,
        client_id: finalClientId,
        payment_method_id: paymentMethodSelect.value,
        total_amount: total,
        card_number: cardNumberInput.value.trim()
    };

    try {
        const response = await fetch(`${API_URL}?resource=pos_finalize_sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();
        
        if (result.success) {
            showPOSNotificationModal('Éxito', 'Venta finalizada correctamente.', 'success');
            closeCheckoutModal();
            
            // ✅ NUEVO: Si el modal de historial está abierto, refrescar automáticamente
            if (salesHistoryModal && salesHistoryModal.style.display === 'block') {
                const currentDate = salesHistoryDateInput.value;
                console.log('Refrescando historial para:', currentDate);
                await fetchAndRenderSalesHistory(currentDate);
            }
            
            await startOrResumeSale(selectedStoreId);
        } else {
            showPOSNotificationModal('Error', result.error || 'Error al finalizar la venta.', 'error');
            cobrarBtn.disabled = false;
            cobrarBtn.textContent = 'Cobrar y Finalizar';
        }
    } catch (error) {
        console.error('Error al finalizar venta:', error);
        showPOSNotificationModal('Error de Conexión', 'No se pudo finalizar la venta.', 'error');
        cobrarBtn.disabled = false;
        cobrarBtn.textContent = 'Cobrar y Finalizar';
    }
});


    cancelSaleBtn.addEventListener('click', async () => {
        if (!currentSaleId || currentTicket.length === 0) {
            await startOrResumeSale(selectedStoreId);
            return;
        };
        if (confirm('¿Estás seguro de que quieres cancelar esta venta?')) {
            try {
                const response = await fetch(`${API_URL}?resource=pos_cancel_sale`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sale_id: currentSaleId })
                });
                const result = await response.json();
                if (result.success) {
                    showPOSNotificationModal('Información', 'Venta cancelada.', 'info');
                    await startOrResumeSale(selectedStoreId);
                } else {
                    showPOSNotificationModal('Error', result.error || 'No se pudo cancelar la venta.', 'error');
                }
            } catch (error) {
                showPOSNotificationModal('Error de Conexión', 'No se pudo cancelar la venta.', 'error');
            }
        }
    });

    clientSearchInput.addEventListener('input', async function() {
        const query = this.value;
        if (query.length < 2) {
            clientSearchResults.innerHTML = '';
            return;
        }
        try {
            const response = await fetch(`${API_URL}?resource=pos_search_clients&query=${encodeURIComponent(query)}`);
            const clients = await response.json();
            clientSearchResults.innerHTML = '';
            if (clients.length > 0) {
                clients.forEach(client => {
                    const div = document.createElement('div');
                    div.className = 'client-result-item';
                    div.textContent = `${client.nombre} ${client.apellido || ''} (${client.nombre_usuario})`;
                    div.dataset.clientId = client.id_cliente;
                    div.dataset.clientName = `${client.nombre} ${client.apellido || ''}`;
                    clientSearchResults.appendChild(div);
                });
            } else {
                clientSearchResults.innerHTML = '<div>No se encontraron clientes.</div>';
            }
        } catch (error) {
            console.error('Error buscando clientes:', error);
        }
    });
    
    clientSearchResults.addEventListener('click', function(event) {
        const selectedClient = event.target.closest('.client-result-item');
        if (selectedClient) {
            currentClientId = selectedClient.dataset.clientId;
            currentClientName = selectedClient.dataset.clientName;
            clientNameSpan.textContent = currentClientName;
            clientModal.style.display = 'none';
            toggleCardPaymentFields(); 
        }
    });

    paymentMethodSelect.addEventListener('change', toggleCardPaymentFields);
    assignClientBtn.addEventListener('click', () => {
        clientModal.style.display = 'block';
        clientSearchInput.focus();
    });

    document.querySelector('#assign-client-modal .close-button').addEventListener('click', () => {
        clientModal.style.display = 'none';
    });

function toggleCardPaymentFields() {
    const isCardPayment = paymentMethodSelect.value === '2';
    // Se elimina la restricción de tener un cliente asignado
    if (isCardPayment) {
        cardPaymentDetails.style.display = 'block';
        pagaConInput.disabled = true; // El monto se tomará del saldo
    } else {
        cardPaymentDetails.style.display = 'none';
        cardNumberInput.value = '';
        cardBalanceFeedback.textContent = '';
        pagaConInput.disabled = false;
        cardOwnerId = null; // Limpiamos el ID del dueño de la tarjeta
    }
    updateChange();
}

    cardNumberInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        cardBalanceFeedback.textContent = 'Verificando...';
        debounceTimer = setTimeout(() => {
            checkCardBalance();
        }, 500);


    });





 async function checkCardBalance() {
    const cardNumber = cardNumberInput.value.trim();
    const total = parseFloat(totalAmountInput.value);
    
    // Reseteamos el ID del dueño de la tarjeta en cada nueva verificación
    cardOwnerId = null; 

    if (!cardNumber) {
        cardBalanceFeedback.textContent = '';
        cobrarBtn.disabled = true;
        return;
    }
    try {
        const response = await fetch(`${API_URL}?resource=pos_check_card_balance&card_number=${encodeURIComponent(cardNumber)}`);
        const result = await response.json();
        if (result.success) {
            // Guardamos el ID del cliente dueño de la tarjeta
            cardOwnerId = parseInt(result.card.id_cliente); 
            
            const balance = parseFloat(result.card.saldo);
            if (balance >= total) {
                cardBalanceFeedback.style.color = '#2ecc71';
                cardBalanceFeedback.textContent = `Saldo disponible: $${balance.toFixed(2)}`;
                cobrarBtn.disabled = false;
            } else {
                cardBalanceFeedback.style.color = '#e74c3c';
                cardBalanceFeedback.textContent = `Saldo insuficiente: $${balance.toFixed(2)}`;
                cobrarBtn.disabled = true;
            }
        } else {
            cardBalanceFeedback.style.color = '#e74c3c';
            cardBalanceFeedback.textContent = result.error;
            cobrarBtn.disabled = true;
        }
    } catch (error) {
        cardBalanceFeedback.style.color = '#e74c3c';
        cardBalanceFeedback.textContent = 'Error de conexión al verificar.';
        cobrarBtn.disabled = true;
    }
}





    // Función para formatear la fecha a YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];

async function fetchAndRenderSalesHistory(date) {
    salesSummaryTbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    clearSaleDetails();

    try {
        const response = await fetch(`${API_URL}?resource=pos_get_sales_history&date=${date}`);
        const result = await response.json();
        
        salesSummaryTbody.innerHTML = '';
        if(result.success && result.sales.length > 0) {
            result.sales.forEach(sale => {
                const row = document.createElement('tr');
                row.dataset.saleId = sale.id_venta;
                row.style.cursor = 'pointer';
                // Añadimos una clase si la venta está cancelada (estado 16)
                if (sale.estado_id == 16) {
                    row.classList.add('sale-canceled');
                }
row.innerHTML = `
                    <td>${sale.id_venta}</td>
                    <td>${new Date(sale.fecha_venta).toLocaleString('es-SV')}</td>
                    <td>${sale.cantidad_items}</td>
                    <td>$${parseFloat(sale.monto_total).toFixed(2)}</td>
                `;
                salesSummaryTbody.appendChild(row);
            });
        } else {
            salesSummaryTbody.innerHTML = '<tr><td colspan="4">No hay ventas para esta fecha.</td></tr>';
        }
    } catch (error) {
        salesSummaryTbody.innerHTML = '<tr><td colspan="4" style="color:red;">Error al cargar el historial.</td></tr>';
    }
}


    // admin/js/pos.js

async function fetchAndRenderSaleDetails(saleId) {
    clearSaleDetails();
    saleDetailHeader.innerHTML = `<p>Cargando detalles para la venta #${saleId}...</p>`;

    try {
        const response = await fetch(`${API_URL}?resource=pos_get_sale_details&sale_id=${saleId}`);
        const result = await response.json();

        if (result.success) {
            const details = result.details;
            saleDetailHeader.innerHTML = `
                <strong>Ticket:</strong> #${details.id_venta} | 
                <strong>Cliente:</strong> ${details.nombre_cliente} | 
                <strong>Pago:</strong> ${details.metodo_pago}
            `;
            
            const watermarkHtml = details.estado_id == 16 
                ? '<div class="watermark">VENTA CANCELADA</div>' 
                : '';
            
            let itemsHtml = `
                ${watermarkHtml}
                <table>
                    <thead>
                        <tr>
                            <th>Cant.</th>
                            <th>Producto</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            details.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.cantidad}</td>
                        <td>${item.nombre_producto}</td>
                        <td>$${parseFloat(item.precio_unitario).toFixed(2)}</td>
                        <td>$${parseFloat(item.subtotal).toFixed(2)}</td>
                    </tr>
                `;
            });
            itemsHtml += `</tbody></table>`;
            saleDetailItems.innerHTML = itemsHtml;
            
            // --- INICIO DE LA MODIFICACIÓN ---
            let footerHtml = '';
            if (details.estado_id != 16) { // Si la venta no está cancelada
                footerHtml += `<button id="reverse-sale-btn" class="btn btn-danger" data-sale-id="${saleId}">Cancelar Venta</button>`;
            }
            // Se añade el botón de imprimir factura para todas las ventas (canceladas o no)
            footerHtml += ` <a href="../api/index.php?resource=generate-invoice&order_id=${saleId}" target="_blank" class="btn btn-primary">Imprimir Factura</a>`;
            
            saleDetailFooter.innerHTML = footerHtml;
            // --- FIN DE LA MODIFICACIÓN ---

        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        saleDetailHeader.innerHTML = `<p style="color:red;">Error al cargar detalles.</p>`;
    }
}

    
    function clearSaleDetails() {
        saleDetailHeader.innerHTML = '<p>Selecciona una venta para ver los detalles.</p>';
        saleDetailItems.innerHTML = '';
        saleDetailFooter.innerHTML = '';
    }

    async function handleReverseSale(saleId) {
        if (!confirm(`¿Estás seguro de que quieres CANCELAR la venta #${saleId}? Esta acción devolverá los productos al inventario y no se puede deshacer.`)) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}?resource=pos_reverse_sale`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sale_id: saleId })
            });
            const result = await response.json();
            if(result.success){
                alert(result.message);
                // Refrescar la vista del historial
                fetchAndRenderSalesHistory(salesHistoryDateInput.value);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

if(openHistoryModalBtn) {
    openHistoryModalBtn.addEventListener('click', async () => {
        salesHistoryModal.style.display = 'block';

        // Crear fecha de hoy con zona horaria local
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;

        console.log('Abriendo historial para fecha:', todayString);
        salesHistoryDateInput.value = todayString;
        
        // ✅ Esperar a que cargue antes de continuar
        await fetchAndRenderSalesHistory(todayString);
    });
}
    
    if(salesHistoryModal) {
        salesHistoryModal.querySelector('.close-button').addEventListener('click', () => {
            salesHistoryModal.style.display = 'none';
        });

        salesHistoryDateInput.addEventListener('change', () => {
            fetchAndRenderSalesHistory(salesHistoryDateInput.value);
        });

        salesSummaryTbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if(row && row.dataset.saleId) {
                // Resaltar fila seleccionada
                salesSummaryTbody.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
                row.classList.add('active-row');
                fetchAndRenderSaleDetails(row.dataset.saleId);
            }
        });

        saleDetailFooter.addEventListener('click', (e) => {
            if(e.target.id === 'reverse-sale-btn') {
                handleReverseSale(e.target.dataset.saleId);
            }
        });
    }
       if (ticketHistorySearchInput) {
        ticketHistorySearchInput.addEventListener('input', () => {
            const searchTerm = ticketHistorySearchInput.value.toLowerCase();
            const rows = salesSummaryTbody.querySelectorAll('tr');
            
            rows.forEach(row => {
                // Aseguramos que la fila tenga un saleId para no afectar los mensajes de "cargando" o "no hay ventas"
                const saleId = row.dataset.saleId;
                if (saleId) {
                    if (saleId.toLowerCase().includes(searchTerm)) {
                        row.style.display = ''; // Muestra la fila si coincide
                    } else {
                        row.style.display = 'none'; // Oculta la fila si no coincide
                    }
                }
            });
        });
    }

    // Asegúrate de limpiar el buscador cuando se abre el modal
    if (openHistoryModalBtn) {
        openHistoryModalBtn.addEventListener('click', () => {
            if (ticketHistorySearchInput) {
                ticketHistorySearchInput.value = ''; // Limpia el campo de búsqueda
            }
            // El resto de la función para abrir el modal...
        });
    }
}