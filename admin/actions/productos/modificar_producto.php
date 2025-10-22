<div class="form-container" id="modify-product-wrapper">

    <div id="product-search-container">
        <h3>Modificar un Producto</h3>
        <p>Ingresa el código del producto que deseas modificar.</p>

        <form id="product-search-form">
            <div class="form-group">
                <label for="product-search-to-edit">Código de Producto</label>
                
                <div style="display: flex; flex-grow: 1; gap: 0.5rem; align-items: center;"> 
                    <input type="text" id="product-search-to-edit" placeholder="Ej: PROD-001" required style="flex-grow: 1;">
                    
                    <button type="button" id="scan-barcode-modify-product" class="btn btn-primary" title="Escanear código de barras" style="flex-shrink: 0; padding: 0.5rem; height: calc(1.5em + 1rem); line-height: 1;">📷</button>
                    
                    <button type="submit" class="action-btn" style="flex-shrink: 0;">Buscar</button>
                </div>
            </div>
            <div id="search-feedback" class="validation-feedback"></div>
        </form>
    </div>

    <div id="edit-product-container" class="hidden">
        </div>
    <div id="barcode-display-container" style="margin-top: 2rem; text-align: center;"></div>

</div>