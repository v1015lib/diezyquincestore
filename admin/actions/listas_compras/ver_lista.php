<?php
$id_lista = $_GET['id'] ?? 0;
?>

<div class="lista-compras-container" data-id-lista="<?php echo htmlspecialchars($id_lista); ?>">
    <div class="list-header-responsive">
        <h3 id="list-name-header">Cargando lista...</h3>
        <div class="header-actions">
            <button id="refresh-list-btn" class="btn btn-sm btn-secondary" title="Recargar Lista">Recargar</button>
            <button id="save-and-exit-btn" class="btn btn-sm btn-primary">Guardar y Salir</button>
            <button id="copy-list-btn" class="btn btn-sm" title="Copiar esta lista para hoy">Copiar</button>
        </div>
    </div>

    <div class="list-controls">
        <div class="search-product-form">
            <input type="text" id="product-search-for-list" placeholder="Buscar producto existente...">
            <div id="product-search-results-list" class="search-results-popover"></div>
        </div>
        <form id="manual-add-product-form" class="manual-add-form">
            <input type="text" id="manual_product_name" placeholder="O añadir producto manual" required>
            <input type="number" id="manual_purchase_price" placeholder="Precio" step="0.01" required>
            <input type="number" id="manual_quantity" value="1" min="1" required>
            <button type="submit" class="btn btn-sm btn-success">Añadir</button>
        </form>
         <div id="manual-add-feedback" class="form-message"></div>
    </div>

    <div class="product-list-container" id="list-items-container">
        <table id="list-items-table" class="product-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Usar Stock</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody id="list-items-tbody">
            </tbody>
        </table>
    </div>
</div>