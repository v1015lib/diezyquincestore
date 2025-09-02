<div id="view-list-container">
    <h3 id="list-name-header"></h3>

    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Producto Existente</legend>
        <div class="list-header">
            <div class="search-container">
                <input type="text" id="product-search-for-list" placeholder="Buscar producto por nombre o código...">
            </div>
        </div>
        <div id="product-search-results-list" class="product-list-container" style="max-height: 200px; margin-bottom: 1rem;"></div>
    </fieldset>

    <fieldset class="form-fieldset" style="margin-top: 2rem;">
        <legend class="form-section-header">Añadir Producto Manualmente</legend>
        <form id="manual-add-product-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div class="form-group">
                <label for="manual_product_name">Nombre Producto</label>
                <input type="text" id="manual_product_name" name="nombre_producto" required>
            </div>
            <div class="form-group">
                <label for="manual_purchase_price">Precio Compra</label>
                <input type="number" id="manual_purchase_price" name="precio_compra" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label for="manual_quantity">Cantidad</label>
                <input type="number" id="manual_quantity" name="cantidad" min="1" value="1" required>
            </div>
            <button type="submit" class="action-btn">Añadir a la Lista</button>
            <div id="manual-add-feedback" class="form-message"></div>
        </form>
    </fieldset>

    <div class="product-list-container" style="margin-top: 2rem;">
        <table class="product-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Precio de Compra</th>
                    <th>Cantidad</th>
                    <th>Usar Stock Actual</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody id="list-items-tbody">
                </tbody>
        </table>
    </div>
</div>