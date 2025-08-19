<?php
// admin/actions/pos/vista_principal.php
?>
<div class="pos-container">
    <div class="pos-main-content">
        <div class="pos-header">
            <div class="pos-input-container">
                <i class="fas fa-barcode"></i>
                <input type="text" id="pos-product-input" placeholder="Ingresar código de producto o usar atajos de teclado...">
                <button id="open-search-modal-btn" class="btn btn-primary">Buscar Producto (F1)</button>
            </div>
        </div>
        <div class="pos-ticket">
            <h3>Ticket de Venta</h3>
            <div class="ticket-table-container">
                <table id="ticket-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Existencias</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="pos-actions-footer">
        <button id="cancel-sale-btn" class="btn btn-danger">Cancelar Venta (ESC)</button>
        <div class="pos-total-summary">
            <span>Total a Pagar:</span>
            <strong id="footer-total-amount">$0.00</strong>
        </div>
        <button id="open-checkout-modal-btn" class="btn btn-success" disabled>Finalizar Compra (F12)</button>
    </div>
</div>

<div id="checkout-modal" class="modal" style="display:none;">
    <div class="modal-content modal-lg">
        <span class="close-button">&times;</span>
        <h2>Finalizar Venta</h2>
        <div class="checkout-modal-body">
            <div class="checkout-ticket-summary">
                <h4>Resumen del Ticket</h4>
                <div id="checkout-ticket-list">
                    </div>
            </div>
            <div class="checkout-payment-section">
                <h4>Detalles del Pago</h4>
                <div class="client-info">
                    <strong>Cliente:</strong> <span id="client-name">Público en General</span>
                    <button id="assign-client-btn" class="btn btn-primary btn-sm">Asignar Cliente</button>
                </div>
                <div class="payment-details">
                    <div class="total-section">
                        <label for="total-amount">Total a Pagar:</label>
                        <input type="text" id="total-amount" value="0.00" readonly>
                    </div>
                    <div class="payment-method">
                        <label for="payment-method-select">Método de Pago:</label>
                        <select id="payment-method-select" class="form-control">
                            <option value="1">Efectivo</option>
                            <option value="2">Tarjeta Interna</option>
                            <option value="3">Transferencia</option>
                        </select>
                    </div>
                    <div id="card-payment-details" style="display:none;">
                        <div class="card-number-input">
                            <label for="card-number-input">N° de Tarjeta:</label>
                            <input type="text" id="card-number-input" class="form-control" placeholder="Ingrese o escanee la tarjeta...">
                        </div>
                        <div id="card-balance-feedback" style="text-align: right; font-weight: bold; margin-top: 5px;"></div>
                    </div>
                    <div class="amount-paid">
                        <label for="paga-con">Paga con:</label>
                        <input type="number" id="paga-con" class="form-control" placeholder="0.00">
                    </div>
                    <div class="change-section">
                        <strong>Cambio:</strong> <span id="change-amount">$0.00</span>
                    </div>
                </div>
                <button id="cobrar-btn" class="btn btn-success" disabled>Cobrar y Finalizar</button>
            </div>
        </div>
    </div>
</div>

<div id="assign-client-modal" class="modal" style="display:none;">
    <div class="modal-content">
        <span class="close-button">&times;</span>
        <h2>Asignar Cliente</h2>
        <input type="text" id="client-search" placeholder="Buscar cliente por nombre o usuario...">
        <div id="client-search-results"></div>
    </div>
</div>

<div id="product-search-modal" class="modal" style="display:none;">
    <div class="modal-content">
        <span class="close-button">&times;</span>
        <h2>Buscar Producto</h2>
        <div class="search-container">
            <i class="fas fa-search"></i>
            <input type="text" id="modal-product-search-input" placeholder="Buscar por nombre o código...">
        </div>
        <div id="modal-search-results-container">
            <div class="search-result-header">
                <div class="col-product">Producto</div>
                <div class="col-department">Depto.</div>
                <div class="col-price">Precio</div>
                <div class="col-stock">Stock</div>
            </div>
            <div id="modal-search-results-list"></div>
        </div>
    </div>
</div>

<div id="pos-notification-modal" class="modal" style="display:none;">
    <div class="modal-content modal-sm">
        <span class="close-button">&times;</span>
        <div id="pos-notification-content">
            <h3 id="pos-notification-title"></h3>
            <p id="pos-notification-message"></p>
        </div>
        <div class="modal-footer" style="justify-content: flex-end;">
            <button id="pos-notification-ok-btn" class="modal-btn modal-btn-primary">Aceptar</button>
        </div>
    </div>
</div>