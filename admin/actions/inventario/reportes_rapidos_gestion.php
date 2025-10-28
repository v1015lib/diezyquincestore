<?php
// Inicia el buffer de salida
ob_start();
// Asegura que la sesión esté iniciada
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Obtenemos el rol y el id_tienda del usuario desde la sesión
$user_role = $_SESSION['rol'] ?? 'cajero'; // Default a un rol restringido si no existe
$user_store_id = $_SESSION['id_tienda'] ?? null;

?>

<div class="container-fluid">
    <div class="section-header">
        <h3>Gestión de Reportes Rápidos</h3>
        <p>Crea y administra reportes de conteo de inventario.</p>
    </div>

    <div class="form-container" style="padding: 2rem; background-color: #f9f9f9; border-radius: 8px;">
        <form id="create-report-form" class="form-row" style="align-items: flex-end;">
            
            <div class="form-group" style="flex: 2;">
                <label for="report-name">Nombre del Nuevo Reporte</label>
                <input type="text" id="report-name" placeholder="Ej: Conteo semanal Zona A" required>
            </div>

            <?php if ($user_role === 'administrador_global') : ?>
                <div class="form-group" style="flex: 1;">
                    <label for="report-store-filter">Asignar a Tienda</label>
                    <select id="report-store-selector" required>
                        <option value="">Cargando tiendas...</option>
                    </select>
                </div>
            <?php else : ?>
                <input type="hidden" id="report-store-selector" value="<?php echo htmlspecialchars($user_store_id); ?>">
            <?php endif; ?>

            <div class="form-group" style="flex: 0 0 auto;">
                <button type="submit" class="action-btn form-submit-btn">Crear e Iniciar Reporte</button>
            </div>
        </form>
        <div id="create-report-feedback" class="form-message" style="margin-top: 1rem;"></div>
    </div>

    <?php if ($user_role === 'administrador_global') : ?>
        <div class="filters-container" style="margin-top: 2rem;">
            <div class="form-group">
                <label for="view-report-store-filter">Filtrar Reportes por Tienda</label>
                <select id="view-report-store-filter" class="inventory-history-filter">
                    <option value="">Todas las tiendas</option>
                </select>
            </div>
        </div>
    <?php endif; ?>

    <div class="table-container" style="margin-top: 2rem;">
        <table class="product-table">
            <thead>
                <tr>
                    <th>Nombre del Reporte</th>
                    <th>Tienda</th>
                    <th>Creado por</th>
                    <th>Fecha de Creación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="inventory-reports-tbody">
                <tr><td colspan="5">Cargando reportes...</td></tr>
            </tbody>
        </table>
    </div>
</div>
<div id="copy-feedback" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: #28a745; color: white; padding: 10px 20px; border-radius: 5px; display: none; z-index: 1000;"></div>

<?php
// Devuelve el contenido del buffer
echo ob_get_clean();
?>