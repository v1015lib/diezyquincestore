<?php
// admin/actions/usuarios/gestion.php
require_once __DIR__ . '/../../../config/config.php';

// Obtener las tiendas (código original)
$tiendas = $pdo->query("SELECT id_tienda, nombre_tienda FROM tiendas ORDER BY nombre_tienda")->fetchAll(PDO::FETCH_ASSOC);

// --- INICIO DE LA LÓGICA MODIFICADA ---
// Obtener los roles directamente de la definición de la columna ENUM
$stmt_roles = $pdo->query("SHOW COLUMNS FROM usuarios LIKE 'rol'");
$rol_column_info = $stmt_roles->fetch(PDO::FETCH_ASSOC);
preg_match("/^enum\(\'(.*)\'\)$/", $rol_column_info['Type'], $matches);
$all_roles = explode("','", $matches[1]);

// Excluir el rol 'administrador_global' de la lista
$roles_para_mostrar = array_filter($all_roles, function($rol) {
    return $rol !== 'administrador_global';
});
// --- FIN DE LA LÓGICA MODIFICADA ---
?>
<div id="users-manager-container">

    <fieldset class="form-fieldset">
        <legend class="form-section-header">Añadir Nuevo Empleado</legend>
        <form id="create-user-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            <div id="create-user-feedback" class="form-message"></div>
            
            <div class="form-group">
                <label for="new_nombre_usuario">Nombre de Usuario:</label>
                <input type="text" id="new_nombre_usuario" name="nombre_usuario" required>
            </div>
            
            <div class="form-group">
                <label for="new_password">Contraseña:</label>
                <input type="password" id="new_password" name="password" required>
            </div>

            <div class="form-group">
                <label for="rol_usuario">Rol:</label>
                <select id="rol_usuario" name="rol">
                    <?php foreach ($roles_para_mostrar as $rol): ?>
                        <option value="<?php echo htmlspecialchars($rol); ?>">
                            <?php echo htmlspecialchars(ucfirst(str_replace('_', ' ', $rol))); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                </div>

            <div class="form-group" id="tienda-assignment-group">
                <label for="id_tienda_usuario">Asignar a Tienda:</label>
                <select id="id_tienda_usuario" name="id_tienda" required>
                    <option value="">Seleccione una tienda</option>
                    <?php foreach ($tiendas as $tienda): ?>
                        <option value="<?php echo htmlspecialchars($tienda['id_tienda']); ?>">
                            <?php echo htmlspecialchars($tienda['nombre_tienda']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
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
                        <th>Tienda</th>
                        <th>Rol</th>
                        <th>Estado</th>
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