<?php 
// EN: admin/actions/productos/crear_oferta.php
session_start();

if (!(isset($_SESSION['rol']) && ($_SESSION['rol'] === 'administrador_global' || $_SESSION['rol'] === 'admin_tienda'))) {
    return;
}
?>
<div class="form-container" id="offer-management-wrapper">
    <div id="product-search-container-offer">
        <h3>Gestionar Oferta de un Producto</h3>
        <p>Ingresa el código del producto para añadir, modificar o eliminar una oferta.</p>
        
        <form id="product-search-form-offer">
            <div class="form-group">
                <label for="product-search-for-offer">Código de Producto</label>
                <input type="text" id="product-search-for-offer" placeholder="Ej: PROD-001" required>
                <button type="submit" class="action-btn">Buscar</button>
            </div>
            <div id="search-feedback-offer" class="validation-feedback"></div>
        </form>
    </div>
    <div id="offer-form-container" class="hidden" style="margin-top: 2rem;">
        </div>
</div>