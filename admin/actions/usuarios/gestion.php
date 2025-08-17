<div id="users-manager-container">

    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Nuevo Empleado</legend>
        <form id="create-user-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div id="create-user-feedback" class="form-message"></div>
            <div class="form-group">
                <label for="new_nombre_usuario">Nombre de Usuario</label>
                <input type="text" id="new_nombre_usuario" name="nombre_usuario" required pattern="[a-zA-Z0-9]+" title="Solo letras y números, sin espacios.">
            </div>
            <div class="form-group">
                <label for="new_password">Contraseña</label>
                <input type="password" id="new_password" name="password" required>
            </div>
            <div class="form-group" style="justify-content: center;">
                 <button type="submit" class="action-btn form-submit-btn">Crear Empleado</button>
            </div>
        </form>
    </fieldset>

    <fieldset class="form-fieldset" style="margin-top: 2rem;">
        <legend class="form-section-header">Lista de Empleados</legend>
        <div class="product-list-container" id="users-list-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Nombre de Usuario</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    </tbody>
            </table>
        </div>
    </fieldset>

</div>

<div id="permissions-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="permissions-modal-title">Editar Permisos</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <form id="permissions-form">
            <div class="modal-body">
                <input type="hidden" id="edit-user-id" name="id_usuario">
                <p>Selecciona los módulos a los que este usuario tendrá acceso:</p>
                <div id="permissions-checkbox-container">
                    </div>
                <div id="permissions-modal-feedback" class="form-message"></div>
            </div>
            <div class="modal-footer">
                <button type="button" id="modal-cancel-btn-perms" class="modal-btn modal-btn-secondary">Cancelar</button>
                <button type="submit" id="modal-save-btn-perms" class="modal-btn modal-btn-primary">Guardar Cambios</button>
            </div>
        </form>
    </div>
</div>