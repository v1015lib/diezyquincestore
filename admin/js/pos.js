function initializePOS() {
    let currentTicket = [];
    let currentSaleId = null;
    let currentClientId = null;
    let currentClientName = 'Público en General';

    const searchInput = document.getElementById('pos-product-search');
    const searchResultsContainer = document.getElementById('search-results-container');
    const ticketTableBody = document.querySelector('#ticket-table tbody');
    const totalAmountInput = document.getElementById('total-amount');
    const pagaConInput = document.getElementById('paga-con');
    const changeAmountSpan = document.getElementById('change-amount');
    const cobrarBtn = document.getElementById('cobrar-btn');
    const cancelSaleBtn = document.getElementById('cancel-sale-btn');
    const assignClientBtn = document.getElementById('assign-client-btn');
    const clientNameSpan = document.getElementById('client-name');
    const clientModal = document.getElementById('assign-client-modal');
    const closeModalBtn = clientModal.querySelector('.close-button');
    const clientSearchInput = document.getElementById('client-search');
    const clientSearchResults = document.getElementById('client-search-results');
    const paymentMethodSelect = document.getElementById('payment-method-select');
    const cardPaymentDetails = document.getElementById('card-payment-details');
    const cardNumberInput = document.getElementById('card-number-input');
    const cardBalanceFeedback = document.getElementById('card-balance-feedback');
    let debounceTimer;
    const API_URL = '../api/index.php';

// --- NUEVO MANEJADOR DE CLICS PARA LA SELECCIÓN DE CLIENTE ---
    clientSearchResults.addEventListener('click', function(event) {
        const selectedClient = event.target.closest('.client-result-item');
        if (selectedClient) {
            // Leemos los datos guardados en el elemento en lugar de una variable
            currentClientId = selectedClient.dataset.clientId;
            currentClientName = selectedClient.dataset.clientName;
            
            clientNameSpan.textContent = currentClientName;
            clientModal.style.display = 'none';
            
            // Importante: Volvemos a verificar el estado del campo de la tarjeta
            toggleCardPaymentFields(); 
        }
    });
    function toggleCardPaymentFields() {
        const isCardPayment = paymentMethodSelect.value === '2';
        const isClientAssigned = currentClientId !== null;

        if (isCardPayment && isClientAssigned) {
            cardPaymentDetails.style.display = 'block';
            pagaConInput.disabled = true; // Deshabilitamos "Paga con" para pagos con tarjeta
        } else {
            cardPaymentDetails.style.display = 'none';
            cardNumberInput.value = '';
            cardBalanceFeedback.textContent = '';
            pagaConInput.disabled = false;
        }
        updateChange(); // Actualizamos el estado del botón cobrar
    }

    async function startOrResumeSale() {
        try {
            const response = await fetch(`${API_URL}?resource=pos_start_sale`, { method: 'POST' });
            const data = await response.json();

            if (data.success && data.sale_id) {
                currentSaleId = data.sale_id;
                
                if (data.ticket_items && data.ticket_items.length > 0) {
                    currentTicket = data.ticket_items;
                    //showNotification('Se ha cargado un ticket en proceso.', 'info');
                } else {
                    currentTicket = [];
                }
                
                resetPOS();
            } else {
                showNotification(data.error || 'Error al iniciar o reanudar la venta.', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión al iniciar venta.', 'error');
        }
    }

    function resetPOS() {
        updateTicketTable();
        clientNameSpan.textContent = currentClientName;
        pagaConInput.value = '';
        searchInput.value = '';
        searchResultsContainer.style.display = 'none';
    }

    searchInput.addEventListener('input', async function() {
        const query = this.value;
        if (query.length < 2) {
            searchResultsContainer.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`${API_URL}?resource=pos_search_products&query=${encodeURIComponent(query)}`);
            const products = await response.json();
            searchResultsContainer.innerHTML = '';
            if (products.length > 0) {
                products.forEach(product => {
                    const stockInfo = product.usa_inventario ? `(Stock: ${product.stock_actual})` : '(Servicio)';
                    const div = document.createElement('div');
                    div.className = 'search-result-item';
                    div.innerHTML = `${product.nombre_producto} - <strong>$${parseFloat(product.precio_venta).toFixed(2)}</strong> ${stockInfo}`;
                    div.addEventListener('click', () => addProductToTicket(product));
                    searchResultsContainer.appendChild(div);
                });
                searchResultsContainer.style.display = 'block';
            } else {
                searchResultsContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error buscando productos:', error);
        }
    });

    document.addEventListener('click', e => {
        if (!searchResultsContainer.contains(e.target) && e.target !== searchInput) {
            searchResultsContainer.style.display = 'none';
        }
    });

    async function addProductToTicket(product) {
        const existingProduct = currentTicket.find(item => item.id_producto === product.id_producto);
        const quantityInTicket = existingProduct ? existingProduct.cantidad : 0;
        if (product.usa_inventario == 1 && (product.stock_actual <= 0 || product.stock_actual <= quantityInTicket)) {
            showNotification('Este producto está agotado o no tiene más existencias.', 'error');
            return;
        }
        if (existingProduct) {
            existingProduct.cantidad++;
        } else {
            product.stock_actual_inicial = product.stock_actual;
            currentTicket.push({ ...product, cantidad: 1 });
        }
        await updateItemInDB(product.id_producto, product.precio_venta);
        updateTicketTable();
        searchInput.value = '';
        searchResultsContainer.style.display = 'none';
    }

    function updateTicketTable() {
        ticketTableBody.innerHTML = '';
        let total = 0;
        currentTicket.forEach((item, index) => {
            const subtotal = item.cantidad * item.precio_venta;
            total += subtotal;
            const stockDisplay = item.usa_inventario ? (item.stock_actual_inicial - item.cantidad) : 'N/A';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombre_producto}</td>
                <td>${stockDisplay}</td>
                <td>
                    <button class="quantity-change btn btn-sm btn-secondary" data-index="${index}" data-change="-1">-</button>
                    <input type="number" class="quantity-input" value="${item.cantidad}" data-index="${index}" min="1" style="width: 60px; text-align: center;">
                    <button class="quantity-change btn btn-sm btn-secondary" data-index="${index}" data-change="1">+</button>
                </td>
                <td>$${parseFloat(item.precio_venta).toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button class="remove-item btn btn-sm btn-danger" data-index="${index}">X</button></td>
            `;
            ticketTableBody.appendChild(row);
        });
        totalAmountInput.value = total.toFixed(2);
        updateChange();
    }
    
    async function updateItemInDB(productId, unitPrice) {
        const item = currentTicket.find(p => p.id_producto === productId);
        const quantity = item ? item.cantidad : 0;
        try {
            const response = await fetch(`${API_URL}?resource=pos_add_item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sale_id: currentSaleId, product_id: productId, quantity: quantity, unit_price: unitPrice })
            });
            const data = await response.json();
            if (!data.success) {
                showNotification(data.error || 'No se pudo actualizar el producto en el ticket.', 'error');
                if (item) item.cantidad--;
                if (item.cantidad <= 0) currentTicket = currentTicket.filter(p => p.id_producto !== productId);
                updateTicketTable();
            }
        } catch (error) {
             showNotification('Error de conexión al actualizar el ticket.', 'error');
        }
    }

    ticketTableBody.addEventListener('click', async e => {
        if (e.target.classList.contains('quantity-change')) {
            const index = e.target.dataset.index;
            const change = parseInt(e.target.dataset.change);
            const item = currentTicket[index];
            const newQuantity = item.cantidad + change;
            if (newQuantity < 1) return;
            if (item.usa_inventario == 1 && newQuantity > item.stock_actual_inicial) {
                 showNotification('No hay suficientes existencias.', 'error'); return;
            }
            item.cantidad = newQuantity;
            await updateItemInDB(item.id_producto, item.precio_venta);
            updateTicketTable();
        }
        if (e.target.classList.contains('remove-item')) {
            const index = e.target.dataset.index;
            const item = currentTicket.splice(index, 1)[0];
            await updateItemInDB(item.id_producto, item.precio_venta);
            updateTicketTable();
        }
    });

    pagaConInput.addEventListener('input', updateChange);

    function updateChange() {
        const total = parseFloat(totalAmountInput.value);
        const pagaCon = parseFloat(pagaConInput.value) || 0;
        const cambio = pagaCon - total;

        if (paymentMethodSelect.value === '2') { // Si es pago con tarjeta
            checkCardBalance(); // El botón se habilita/deshabilita aquí
        } else { // Si es efectivo u otro método
            cobrarBtn.disabled = (cambio < 0 || total <= 0);
        }
        
        changeAmountSpan.textContent = (cambio >= 0 && paymentMethodSelect.value !== '2') ? `$${cambio.toFixed(2)}` : '$0.00';
    
    }
    
    // ================== INICIO DE LA CORRECCIÓN ==================
    cobrarBtn.addEventListener('click', async () => {
        const total = parseFloat(totalAmountInput.value);
        if (total <= 0) {
            //showNotification('No hay productos en el ticket.', 'error'); return;
        }
        const saleData = {
            sale_id: currentSaleId,
            client_id: currentClientId,
            payment_method_id: document.getElementById('payment-method-select').value,
            total_amount: total
        };

        try {
            cobrarBtn.disabled = true;
            cobrarBtn.textContent = 'Procesando...';
            const response = await fetch(`${API_URL}?resource=pos_finalize_sale`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });
            const result = await response.json();
            if (result.success) {
                //showNotification('Venta finalizada con éxito.', 'success');
                
                // BUG FIX: En lugar de llamar a startOrResumeSale(), que crea una nueva venta,
                // simplemente limpiamos las variables para preparar la siguiente venta.
                // La nueva venta se creará automáticamente en la base de datos cuando se agregue el primer producto.
                currentTicket = [];
                currentSaleId = null;
                currentClientId = null;
                currentClientName = 'Público en General';
                resetPOS();

            } else {
                showNotification(result.error || 'Error al finalizar la venta.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión al finalizar venta.', 'error');
        } finally {
            cobrarBtn.disabled = false;
            cobrarBtn.textContent = 'Cobrar y Finalizar';
        }
    });

    cancelSaleBtn.addEventListener('click', async () => {
        if (!currentSaleId || currentTicket.length === 0) {
            currentTicket = []; resetPOS(); return;
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
                    showNotification('Venta cancelada.', 'info');
                    
                    // BUG FIX: Igual que al cobrar, solo reseteamos el estado.
                    currentTicket = [];
                    currentSaleId = null;
                    currentClientId = null;
                    currentClientName = 'Público en General';
                    resetPOS();

                } else {
                    showNotification(result.error || 'No se pudo cancelar la venta.', 'error');
                }
            } catch (error) {
                showNotification('Error de conexión.', 'error');
            }
        }
    });
    // =================== FIN DE LA CORRECCIÓN ===================


clientSearchInput.addEventListener('input', async function() {
        const query = this.value;
        if (query.length < 2) { 
            clientSearchResults.innerHTML = ''; 
            return; 
        }
        try {
            const response = await fetch(`${API_URL}?resource=pos_search_clients&query=${encodeURIComponent(query)}`);
            const clients = await response.json();
            clientSearchResults.innerHTML = ''; // Limpiar resultados anteriores
            
            if (clients.length > 0) {
                clients.forEach(client => {
                    const div = document.createElement('div');
                    div.className = 'client-result-item';
                    div.textContent = `${client.nombre} ${client.apellido || ''} (${client.nombre_usuario})`;
                    
                    // --- CORRECCIÓN CLAVE ---
                    // Guardamos los datos del cliente directamente en el elemento HTML
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
     // ...después del listener para clientSearchInput...
    paymentMethodSelect.addEventListener('change', toggleCardPaymentFields);
    assignClientBtn.addEventListener('click', () => { 
        clientModal.style.display = 'block';
        // Limpiamos el campo de tarjeta si se cambia de cliente
        toggleCardPaymentFields(); 
    });



    // Este listener se activa cuando el usuario escribe el número de tarjeta
    cardNumberInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        cardBalanceFeedback.textContent = 'Verificando...';
        debounceTimer = setTimeout(() => {
            checkCardBalance();
        }, 500); // Espera 500ms después de la última tecla presionada
    });

    async function checkCardBalance() {
        const cardNumber = cardNumberInput.value.trim();
        const total = parseFloat(totalAmountInput.value);
        if (!cardNumber) {
            cardBalanceFeedback.textContent = '';
            cobrarBtn.disabled = true;
            return;
        }

        try {
            const response = await fetch(`${API_URL}?resource=pos_check_card_balance&card_number=${encodeURIComponent(cardNumber)}`);
            const result = await response.json();

            if (result.success) {
                if (parseInt(result.card.id_cliente) !== parseInt(currentClientId)) {
                    cardBalanceFeedback.style.color = '#e74c3c'; // Rojo
                    cardBalanceFeedback.textContent = 'Esta tarjeta no pertenece al cliente seleccionado.';
                    cobrarBtn.disabled = true;
                    return;
                }

                const balance = parseFloat(result.card.saldo);
                if (balance >= total) {
                    cardBalanceFeedback.style.color = '#2ecc71'; // Verde
                    cardBalanceFeedback.textContent = `Saldo disponible: $${balance.toFixed(2)}`;
                    cobrarBtn.disabled = false;
                } else {
                    cardBalanceFeedback.style.color = '#e74c3c'; // Rojo
                    cardBalanceFeedback.textContent = `Saldo insuficiente: $${balance.toFixed(2)}`;
                    cobrarBtn.disabled = true;
                }
            } else {
                cardBalanceFeedback.style.color = '#e74c3c'; // Rojo
                cardBalanceFeedback.textContent = result.error;
                cobrarBtn.disabled = true;
            }
        } catch (error) {
            cardBalanceFeedback.style.color = '#e74c3c';
            cardBalanceFeedback.textContent = 'Error de conexión al verificar.';
            cobrarBtn.disabled = true;
        }
    }
    startOrResumeSale();

    function showNotification(message, type = 'info') {
        alert(`[${type.toUpperCase()}] ${message}`);
    }
}