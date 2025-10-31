<?php
// admin/actions/productos/modificar_producto.php
?>

<div class="form-container" id="modify-product-wrapper">
    
    <div id="product-search-container">
        <h3>Modificar un Producto</h3>
        <p>Ingresa el código del producto que deseas editar. El formulario de edición se cargará a continuación.</p>
        
        <div id="product-search-form"> <div class="form-group">
                <label for="product-search-to-edit">Código de Producto</label>
                <input type="text" id="product-search-to-edit" placeholder="Ej: PROD-001">
                
                <button type="button" id="product-search-btn" class="action-btn">Buscar</button>
                
                <button type="button" id="scan-barcode-modify-product" class="btn btn-primary" title="Escanear código de barras" style="flex-shrink: 0; padding: 0.5rem;">📷</button>
            </div>
            <div id="search-feedback" class="validation-feedback"></div>
        </div> </div>

    <div id="edit-product-container" class="hidden" style="margin-top: 2rem;">
    </div>
    
     <div id="barcode-display-container" style="text-align: center; margin-top: 2rem;">
     </div>
</div>