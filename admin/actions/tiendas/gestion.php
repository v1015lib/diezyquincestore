<div id="tiendas-manager-container">
    
    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Nueva Tienda</legend>
        <form id="create-tienda-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div class="form-group">
                <label for="nombre_tienda">Nombre</label>
                <input type="text" id="nombre_tienda" name="nombre_tienda" required placeholder="Ej: Sucursal Centro">
            </div>
            <div class="form-group">
                <label for="direccion_tienda">Dirección</label>
                <input type="text" id="direccion_tienda" name="direccion_tienda" placeholder="Ej: Calle Principal #123">
            </div>
            <div class="form-group">
                <label for="telefono_tienda">Teléfono</label>
                <input type="text" id="telefono_tienda" name="telefono_tienda" placeholder="Ej: 2277-8899">
            </div>
            <div class="form-group" style="justify-content: center;">
                 <button type="submit" class="action-btn form-submit-btn">Crear Tienda</button>
            </div>
            <div id="create-tienda-feedback" class="form-message"></div>
        </form>
    </fieldset>

    <fieldset class="form-fieldset" style="margin-top: 2rem;">
        <legend class="form-section-header">Tiendas Existentes</legend>
        <div class="product-list-container" id="tiendas-list-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Dirección</th>
                        <th>Teléfono</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tiendas-table-body">
                    </tbody>
            </table>
        </div>
    </fieldset>

</div>