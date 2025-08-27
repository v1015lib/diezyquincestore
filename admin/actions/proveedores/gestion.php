<div id="proveedores-manager-container">
    
    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Nuevo Proveedor</legend>
        <form id="create-proveedor-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div class="form-group">
                <label for="codigo_proveedor">Código</label>
                <input type="text" id="codigo_proveedor" name="codigo_proveedor" required placeholder="Ej: PR-001">
            </div>
             <div class="form-group">
                <label for="nombre_proveedor">Nombre</label>
                <input type="text" id="nombre_proveedor" name="nombre_proveedor" required placeholder="Ej: Proveedor S.A. de C.V.">
            </div>
            <div class="form-group">
                <label for="telefono_proveedor">Teléfono</label>
                <input type="text" id="telefono_proveedor" name="telefono_proveedor" placeholder="Ej: 2277-8899">
            </div>
            <div class="form-group">
                <label for="direccion_proveedor">Dirección</label>
                <input type="text" id="direccion_proveedor" name="direccion_proveedor" placeholder="Ej: Calle Principal #123">
            </div>
            <div class="form-group" style="justify-content: center;">
                 <button type="submit" class="action-btn form-submit-btn">Crear Proveedor</button>
            </div>
            <div id="create-proveedor-feedback" class="form-message"></div>
        </form>
    </fieldset>

    <fieldset class="form-fieldset" style="margin-top: 2rem;">
        <legend class="form-section-header">Proveedores Existentes</legend>
        <div class="product-list-container" id="proveedores-list-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th class="editable" data-field="nombre_proveedor">Nombre (doble clic para editar)</th>
                        <th class="editable" data-field="telefono">Teléfono</th>
                        <th class="editable" data-field="direccion">Dirección</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="proveedores-table-body">
                    </tbody>
            </table>
        </div>
    </fieldset>

</div>