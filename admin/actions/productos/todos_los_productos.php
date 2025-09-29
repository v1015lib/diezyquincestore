<?php  
 session_start(); //<------Fundamental para que reconozca los roles

?>
<div class="product-list-header">
    <div class="filters-container">
        <input type="text" id="product-search-input" class="form-control" placeholder="Buscar por nombre o código...">
        
        <div class="form-group">
            <input type="checkbox" id="toggle-product-images">
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
        </select>
        <button id="batch-action-execute" class="action-btn" disabled>Ejecutar</button>
    </div>
</div>
<div id="product-list-container" class="table-container">
<table class="product-table">
    <thead>
        <tr>
            <th data-col="select"><input type="checkbox" id="select-all-products"></th>
            
            <th class="product-image-col sortable" style="display: none;" data-sort="p.url_imagen">Imagen</th> 
            
            <th class="sortable" data-sort="p.codigo_producto">Código</th>
            <th class="sortable" data-sort="p.nombre_producto">Nombre</th>
            <th class="sortable" data-sort="d.departamento">Dept.</th>
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
