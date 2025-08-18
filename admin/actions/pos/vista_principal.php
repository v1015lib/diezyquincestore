<?php
// admin/actions/pos/vista_principal.php
?>
<div class="pos-container">
    <div class="pos-main-content">
        <div class="pos-header">
            <div class="search-container">
                <i class="fas fa-search"></i>
                <input type="text" id="pos-product-search" placeholder="Buscar producto por código o nombre...">
            </div>
            <div id="search-results-container"></div>
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
             <button id="cancel-sale-btn" class="btn btn-danger">Cancelar Venta</button>
        </div>
    </div>
    <div class="pos-sidebar">
        <div class="checkout-container">
            <h4>Finalizar Venta</h4>
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

<div id="assign-client-modal" class="modal" style="display:none;">
    <div class="modal-content">
        <span class="close-button">&times;</span>
        <h2>Asignar Cliente</h2>
        <input type="text" id="client-search" placeholder="Buscar cliente por nombre o usuario...">
        <div id="client-search-results"></div>
    </div>
</div>

