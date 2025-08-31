function initializePOS() {
    let currentTicket = [];
    let currentSaleId = null;
    let currentClientId = 1;
    let currentClientName = 'Público en General';
    let cardOwnerId = null;
    let activeTicketRowIndex = -1;
    let selectedStoreId = null;
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
    // --- LÓGICA DEL HISTORIAL DE VENTAS ---
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



    let debounceTimer;
    const API_URL = '../api/index.php';




    async function setupPOSForRole() {
        if (USER_ROLE === 'administrador_global') {
            const storedStoreId = sessionStorage.getItem('pos_selected_store_id');
            const storedStoreName = sessionStorage.getItem('pos_selected_store_name');

            if (storedStoreId && storedStoreName) {
                selectedStoreId = storedStoreId;
                storeIndicator.textContent = `Operando desde: ${storedStoreName}`;
                enablePOSControls();
                // Se pasa el ID de la tienda directamente para evitar el error
                await startOrResumeSale(selectedStoreId);
            } else {
                storeSelectionModal.style.display = 'block';
            }
        } else {
            enablePOSControls();
            await startOrResumeSale(); // Los otros roles no necesitan pasar ID
        }
    }



    function enablePOSControls() {
        productInput.disabled = false;
        openSearchModalBtn.disabled = false;
        productInput.focus();
    }

    if (confirmStoreBtn) {
        confirmStoreBtn.addEventListener('click', async () => {
            const storeId = storeSelect.value;
            if (!storeId) {
                alert('Por favor, selecciona una tienda.');
                return;
            }
            selectedStoreId = storeId;
            const selectedOption = storeSelect.options[storeSelect.selectedIndex];
            const storeName = selectedOption.dataset.storeName;

            sessionStorage.setItem('pos_selected_store_id', selectedStoreId);
            sessionStorage.setItem('pos_selected_store_name', storeName);

            storeIndicator.textContent = `Operando desde: ${storeName}`;
            storeSelectionModal.style.display = 'none';
            
            enablePOSControls();
            await startOrResumeSale(selectedStoreId); // Se pasa el ID de la tienda directamente
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


        function openCheckoutModal() {
        if (currentTicket.length === 0) return;

        // Poblar el resumen del ticket en el modal
        checkoutTicketList.innerHTML = '';
        currentTicket.forEach(item => {
            const subtotal = item.cantidad * item.precio_venta;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ticket-item';
            itemDiv.innerHTML = `
                <span class="item-name">${item.cantidad} x ${item.nombre_producto}</span>
                <span class="item-details">$${subtotal.toFixed(2)}</span>
            `;
            checkoutTicketList.appendChild(itemDiv);
        });

        checkoutModal.style.display = 'block';
        pagaConInput.focus(); // Poner el foco en el campo de pago
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
        // ... (otros atajos) ...
        if (e.key === 'F12') {
            e.preventDefault();
            openCheckoutModal();
        }
        if (e.key === 'Escape') {
            if (checkoutModal.style.display === 'block') {
                closeCheckoutModal();
            } else if (productSearchModal.style.display === 'block') {
                closeProductSearchModal();
            } else {
                 cancelSaleBtn.click();
            }
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

    cobrarBtn.addEventListener('click', async () => {
    const total = parseFloat(totalAmountInput.value);
    if (total <= 0) return;

    cobrarBtn.disabled = true;
    cobrarBtn.textContent = 'Procesando...';










    const finalClientId = (paymentMethodSelect.value === '2' && cardOwnerId) 
        ? cardOwnerId 
        : currentClientId;



    // Aquí se recolectan los datos necesarios para la venta.
 const saleData = {
        sale_id: currentSaleId,
        client_id: finalClientId, // Se usa el ID del cliente correcto
        payment_method_id: paymentMethodSelect.value,
        total_amount: total,
        card_number: cardNumberInput.value.trim()
    };
    // --- FIN DE LA CORRECCIÓN ---

    try {
        const response = await fetch(`${API_URL}?resource=pos_finalize_sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData) // Ahora saleData contiene la información correcta
        });

        const result = await response.json();
        if (result.success) {
            showPOSNotificationModal('Éxito', 'Venta finalizada correctamente.', 'success');
            closeCheckoutModal(); // Cierra el modal de pago
            await startOrResumeSale(selectedStoreId);
        } else {
            showPOSNotificationModal('Error', result.error || 'Error al finalizar la venta.', 'error');
            cobrarBtn.disabled = false;
            cobrarBtn.textContent = 'Cobrar y Finalizar';
        }
    } catch (error) {
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
                    <td>${new Date(sale.fecha_venta).toLocaleTimeString()}</td>
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
        openHistoryModalBtn.addEventListener('click', () => {
            salesHistoryModal.style.display = 'block';
            salesHistoryDateInput.value = formatDate(new Date());
            fetchAndRenderSalesHistory(salesHistoryDateInput.value);
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