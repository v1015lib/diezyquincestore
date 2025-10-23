<?php
// Inicia el buffer de salida
ob_start();
// Asegura que la sesión esté iniciada
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Obtenemos el ID del reporte desde la URL
$id_reporte = filter_input(INPUT_GET, 'id', FILTER_SANITIZE_NUMBER_INT);

if (!$id_reporte) {
    echo "<p class='message error'>Error: No se proporcionó un ID de reporte válido.</p>";
    echo ob_get_clean();
    exit;
}
?>

<div class="lista-compras-container" data-report-id="<?php echo htmlspecialchars($id_reporte); ?>">

    <div class="header-actions">
        <h3 id="report-name-header">Cargando Reporte...</h3>
        <div>
            <button id="exit-report-btn" class="action-btn" data-action="inventario/reportes_rapidos_gestion">
                &larr; Volver a la Gestión
            </button>
        </div>
    </div>

    <div class="form-container" style="padding: 2rem; background-color: #f9f9f9; border-radius: 8px; margin-top: 1rem;">
        <h4>Añadir Producto al Reporte</h4>
        <form id="add-product-to-report-form" class="form-row" style="align-items: flex-end;">

            <div class="form-group" style="flex: 2;">
                <label for="report-product-code">Código del Producto</label>
                <input type="text" id="report-product-code" placeholder="Escanear o digitar código" required>
                <button type="button" id="scan-barcode-add-item-report" class="btn btn-primary" title="Escanear código de barras" style="flex-shrink: 0; padding: 0.5rem;">📷</button> <?php /* Botón de escaner añadido */ ?>
            </div>

            <div class="form-group" style="flex: 1;">
                <label for="report-product-qty">Cantidad Contada</label>
                <input type="number" id="report-product-qty" min="1" value="1" required>
            </div>

            <div class="form-group" style="flex: 0 0 auto;">
                <button type="submit" class="action-btn form-submit-btn">Añadir</button>
            </div>
        </form>

        <div id="add-product-feedback" class="form-message" style="margin-top: 1rem;"></div>
    </div>

    <div class="table-container" style="margin-top: 2rem;">
        <table class="product-table" id="report-items-table">
            <thead>
                <tr>
                    <th style="width: 80px;">Imagen</th>
                    <th>Código</th>
                    <th>Nombre del Producto</th>
                    <th>Precio de Venta (Snapshot)</th>
                    <th>Cantidad Reportada</th>
                    <th>Acción</th> <?php /* Nueva columna */ ?>
                </tr>
            </thead>
            <tbody id="report-items-tbody">
                <tr><td colspan="6">Cargando items del reporte...</td></tr> <?php /* Ajustado colspan */ ?>
            </tbody>
        </table>
    </div>

</div>

<?php
// Devuelve el contenido del buffer
echo ob_get_clean();
?>