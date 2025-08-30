<?php 

if (isset($_SESSION['rol']) && $_SESSION['rol'] === 'administrador_global'): ?>


<div class="form-container" id="delete-product-wrapper">
    
    <div id="product-search-container-delete">
        <h3>Eliminar un Producto</h3>
        <p>Ingresa el código del producto que deseas eliminar.</p>
        
        <form id="product-search-form-delete">
            <div class="form-group">
                <label for="product-search-to-delete">Código de Producto</label>
                <input type="text" id="product-search-to-delete" placeholder="Ej: PROD-001" required>
                <button type="submit" class="action-btn">Buscar</button>
            </div>
            <div id="search-feedback-delete" class="validation-feedback"></div>
        </form>
    </div>

    <div id="delete-product-container" class="hidden">
        </div>

</div>        
<?php endif; ?>
