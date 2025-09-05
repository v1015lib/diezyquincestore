<div id="departments-manager-container">
    
    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Nuevo Departamento</legend>
        <form id="create-department-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div class="form-group">
                <label for="departamento">Nombre del Departamento</label>
                <input type="text" id="departamento" name="departamento" required placeholder="Ej: Librería">
                
                <label for="codigo_departamento">Código</label>
                <input type="text" id="codigo_departamento" name="codigo_departamento" required placeholder="Ej: LIB">
                <button type="submit" class="action-btn">Crear Departamento</button>
            </div>
            <div id="create-department-feedback" class="form-message"></div>
        </form>
    </fieldset>

    <fieldset class="form-fieldset" style="margin-top: 2rem;">
        <legend class="form-section-header">Departamentos Existentes</legend>
        <div class="product-list-container" id="departments-list-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th class="sortable" data-sort="departamento">Nombre (haz doble clic para editar)</th>
                        <th class="sortable" data-sort="codigo_departamento">Código</th>
                        <th class="sortable" data-sort="total_productos">Total Productos</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody id="departments-table-body">
                    </tbody>
            </table>
        </div>
    </fieldset>

</div>