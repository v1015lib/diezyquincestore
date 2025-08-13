<div class="list-header">
    <h3>Historial de Movimientos de Inventario</h3>
    <div class="filter-container" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <div class="form-group" style="flex-basis: auto;">
            <label for="start-date-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Desde:</label>
            <input type="date" id="start-date-filter" class="inventory-history-filter" style="padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
        <div class="form-group" style="flex-basis: auto;">
            <label for="end-date-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Hasta:</label>
            <input type="date" id="end-date-filter" class="inventory-history-filter" style="padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>

        <div class="form-group" style="flex-basis: auto;">
    <label for="movement-type-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Tipo:</label>
    <select id="movement-type-filter" class="inventory-history-filter">
        <option value="">Cargando tipos...</option>
    </select>
</div>
    </div>
    <div class="search-container">
        <input type="text" id="inventory-history-search" class="inventory-history-filter" placeholder="Buscar por código o nombre...">
    </div>
</div>

<div class="product-list-container" id="inventory-history-container">
    <table class="product-table">
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo de Movimiento</th>
                <th>Cantidad</th>
                <th>Stock Anterior</th>
                <th>Stock Nuevo</th>
                <th>Usuario</th>
                <th>Notas</th>
            </tr>
        </thead>
        <tbody id="inventory-history-tbody">
            </tbody>
    </table>
</div>