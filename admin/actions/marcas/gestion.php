<?php
// EN: admin/actions/marcas/gestion.php
?>
<div id="marcas-manager-container">
    
    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Nueva Marca</legend>
        <form id="create-marca-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div class="form-group">
                <label for="nombre_marca">Nombre de la Marca</label>
                <input type="text" id="nombre_marca" name="nombre_marca" required placeholder="Ej: Starmate">
            </div>
            <div class="form-group" style="justify-content: center;">
                 <button type="submit" class="action-btn form-submit-btn">Crear Marca</button>
            </div>
            <div id="create-marca-feedback" class="form-message"></div>
        </form>
    </fieldset>

    <fieldset class="form-fieldset" style="margin-top: 2rem;">
        <legend class="form-section-header">Marcas Existentes</legend>
        <div class="product-list-container" id="marcas-list-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th class="editable" data-field="nombre_marca">Nombre (doble clic para editar)</th>
                        <th>Total Productos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="marcas-table-body">
                </tbody>
            </table>
        </div>
    </fieldset>

</div>