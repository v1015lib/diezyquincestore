<div id="etiquetas-manager-container">
    
    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Nueva Etiqueta</legend>
        <form id="create-etiqueta-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div class="form-group">
                <label for="nombre_etiqueta">Nombre de la Etiqueta</label>
                <input type="text" id="nombre_etiqueta" name="nombre_etiqueta" required placeholder="Ej: Nuevo, Oferta, Popular">
            </div>
            <div class="form-group" style="justify-content: center;">
                 <button type="submit" class="action-btn form-submit-btn">Crear Etiqueta</button>
            </div>
            <div id="create-etiqueta-feedback" class="form-message"></div>
        </form>
    </fieldset>

    <fieldset class="form-fieldset" style="margin-top: 2rem;">
        <legend class="form-section-header">Etiquetas Existentes</legend>
        <div class="product-list-container" id="etiquetas-list-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th class="editable" data-field="nombre_etiqueta">Nombre (doble clic para editar)</th>
                        <th>Total Productos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="etiquetas-table-body">
                </tbody>
            </table>
        </div>
    </fieldset>

</div>