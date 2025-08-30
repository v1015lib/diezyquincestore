<?php
// EN: admin/actions/usuarios/permisos.php

// Requerimos la configuración para obtener la lista de roles de la base de datos.
require_once __DIR__ . '/../../../config/config.php';

// Obtenemos todos los roles excepto 'administrador_global', que no debe ser modificado.
$roles_para_mostrar = $pdo->query("SELECT nombre_rol FROM roles WHERE nombre_rol != 'administrador_global' ORDER BY nombre_rol ASC")->fetchAll(PDO::FETCH_COLUMN);

?>

<div id="permissions-manager-container">
    <fieldset class="form-fieldset">
        <legend class="form-section-header">Configuración de Permisos por Rol</legend>
        <form id="permissions-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
            
            <div class="form-group">
                <label for="role-select">Selecciona un rol para configurar:</label>
                <select id="role-select" name="nombre_rol" class="form-control">
                    <option value="">-- Elige un rol --</option>
                    <?php foreach ($roles_para_mostrar as $rol): ?>
                        <option value="<?php echo htmlspecialchars($rol); ?>">
                            <?php echo htmlspecialchars(ucfirst(str_replace('_', ' ', $rol))); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <p style="margin-top: 1.5rem; font-weight: 600; color: #333;">Módulos a los que este rol tendrá acceso:</p>
            
            <div id="permissions-checkbox-container">
                <p>Por favor, selecciona un rol para ver sus permisos.</p>
            </div>

            <div id="permissions-modal-feedback" class="form-message" style="margin-top: 1rem;"></div>

            <div class="form-group" style="justify-content: center; margin-top: 2rem;">
                 <button type="submit" class="action-btn form-submit-btn">Guardar Permisos</button>
            </div>
        </form>
    </fieldset>
</div>