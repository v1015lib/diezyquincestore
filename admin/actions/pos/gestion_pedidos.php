<div class="list-header">
    <h3>Gestión de Pedidos de la Tienda Web</h3>
    <div class="filter-container" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <div class="form-group" style="flex-basis: auto;">
            <label for="start-date-filter-web" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Desde:</label>
            
            <input type="date" id="start-date-filter-web" class="web-order-filter" value="<?php echo date('Y-m-d'); ?>" style="padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 6px;">
        
        </div>
        <div class="form-group" style="flex-basis: auto;">
            <label for="end-date-filter-web" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Hasta:</label>
            
            <input type="date" id="end-date-filter-web" class="web-order-filter" value="<?php echo date('Y-m-d'); ?>" style="padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 6px;">
        
        </div>
    </div>
    <div class="search-container">
        <input type="text" id="web-order-search-input" placeholder="Buscar por N° Orden o Cliente...">
    </div>
</div>

<div class="product-list-container">
    <table class="product-table">
        <thead>
            <tr>
                <th>N° Orden</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody id="web-orders-tbody">
            </tbody>
    </table>
</div>