<?php  
 session_start(); //<------Fundamental para que reconozca los roles

?>
<div class="product-list-header">
    <div class="filters-container">
        <input type="text" id="product-search-input" class="form-control" placeholder="Buscar por nombre o código...">
        
        <div class="form-group">
            <input type="checkbox" id="toggle-product-images" checked>
            <label for="toggle-product-images">Mostrar Imágenes</label>
        </div>

        <select id="department-filter" class="form-control">
            <option value="">Filtrar por departamento</option>
        </select>
        
        <?php if (isset($_SESSION['rol']) && $_SESSION['rol'] === 'administrador_global'): ?>
        <select id="store-filter" class="form-control">
            <option value="">Filtrar por tienda</option>
        </select>
        <?php endif; ?>

    </div>
<div class="batch-actions-container">
    <select id="batch-action-selector" class="form-control" disabled>
        <option value="">Acciones en lote...</option>
        <option value="activate" style="display:none;">Activar seleccionados</option>
        <option value="deactivate" style="display:none;">Desactivar seleccionados</option>
        <option value="change-department">Cambiar departamento</option>
        <option value="change-price-massive">Cambiar Precio</option>
        <option value="find-replace-name">Buscar y Reemplazar Nombre</option>
    </select>
    <button id="batch-action-execute" class="action-btn" disabled>Ejecutar</button>
</div>
</div>
<div id="product-list-container" class="table-container">
<table class="product-table">
    <thead>
        <tr>
            <th data-col="select"><input type="checkbox" id="select-all-products"></th>
            
            <th class="product-image-col sortable"  data-sort="p.url_imagen">Imagen</th> 
            
            <th class="sortable" data-sort="p.codigo_producto">Código</th>
            <th class="sortable" data-sort="p.nombre_producto">Nombre</th>
            <th class="sortable" data-sort="d.departamento">Dept.</th>
            <th class="sortable" data-sort="m.nombre_marca">Marca</th>
            <th class="sortable" data-sort="et.nombre_etiqueta">Etiqueta</th>
            <th class="sortable" data-sort="p.precio_venta">P. Venta</th>
            <th class="sortable" data-sort="stock_actual">Stock </th>
            <th data-col="stock-min">S. Mín.</th>
            <th data-col="stock-max">S. Máx.</th>
            <th data-col="u-inv">U. Inv.</th>
            <th class="sortable" data-sort="e.nombre_estado">Estado</th>
            <th data-col="acc">Acc.</th>
        </tr>
    </thead>
    <tbody id="product-table-body">
    </tbody>
</table>
    <div id="loading-indicator" style="display: none; text-align: center; padding: 1rem;">Cargando más productos...</div>
</div>

<div id="find-replace-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Buscar y Reemplazar en Nombres</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <p>Se aplicará la acción a los <strong id="find-replace-count">0</strong> productos seleccionados.</p>
            <div class="form-group">
                <label for="find-text">Buscar Texto:</label>
                <input type="text" id="find-text" class="modal-input" placeholder="Palabra o frase a buscar">
            </div>
            <div class="form-group">
                <label for="replace-text">Reemplazar con:</label>
                <input type="text" id="replace-text" class="modal-input" placeholder="Dejar en blanco para eliminar">
            </div>
            <div id="modal-find-replace-error" class="modal-error"></div>
        </div>
        <div class="modal-footer">
            <button id="modal-find-replace-cancel-btn" class="modal-btn modal-btn-secondary">Cancelar</button>
            <button id="modal-find-replace-confirm-btn" class="modal-btn modal-btn-primary">Ejecutar Reemplazo</button>
        </div>
    </div>
</div>