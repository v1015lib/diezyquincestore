<div class="form-container" id="add-stock-wrapper">
    <div id="product-search-container-stock">
        <h3>Agregar Stock a un Producto</h3>
        <p>Busca un producto por su código para añadir unidades a su inventario.</p>

        <form id="product-search-form-stock">
            <div class="form-group">
                <label for="product-search-for-stock">Código de Producto</label>
                <input type="text" id="product-search-for-stock" placeholder="Ej: PROD-001" required>
                <button type="submit" class="action-btn">Buscar</button>
                <button type="button" id="scan-barcode-add-stock" class="btn btn-primary" title="Escanear código de barras" style="flex-shrink: 0; padding: 0.5rem;">📷
        </button>
            </div>
            <div id="search-feedback-stock" class="validation-feedback"></div>
        </form>
    </div>

    <div id="stock-form-container" class="hidden" style="margin-top: 2rem;">
        </div>
</div>