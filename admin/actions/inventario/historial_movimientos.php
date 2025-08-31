<?php
// Lógica para asegurar que solo usuarios logueados accedan
session_start();
if (!isset($_SESSION['loggedin'])) { exit('Acceso denegado.'); }

// Se requiere para obtener la lista de tiendas
require_once __DIR__ . '/../../../config/config.php';
$tiendas = $pdo->query("SELECT id_tienda, nombre_tienda FROM tiendas ORDER BY nombre_tienda")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="list-header">
    <h3>Historial de Movimientos de Inventario</h3>
    <div class="filter-container" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        
        <?php // --- Se muestra el filtro de tienda solo al administrador global --- ?>
        <?php if ($_SESSION['rol'] === 'administrador_global'): ?>
        <div class="form-group" style="flex-basis: auto;">
            <label for="store-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Tienda:</label>
            <select id="store-filter" class="inventory-history-filter">
                <option value="">Todas las Tiendas</option>
                <?php foreach ($tiendas as $tienda): ?>
                    <option value="<?php echo htmlspecialchars($tienda['id_tienda']); ?>">
                        <?php echo htmlspecialchars($tienda['nombre_tienda']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <?php endif; ?>

        <div class="form-group" style="flex-basis: auto;">
            <label for="start-date-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Desde:</label>
            <input type="date" id="start-date-filter" class="inventory-history-filter" style="padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
        <div class="form-group" style="flex-basis: auto;">
            <label for="end-date-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Hasta:</label>
            <input type="date" id="end-date-filter" class="inventory-history-filter" style="padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>

        <div class="form-group" style="flex-basis: auto;">
            <label for="movement-type-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Tipo:</label>
            <select id="movement-type-filter" class="inventory-history-filter">
                <option value="">Cargando tipos...</option>
            </select>
        </div>
    </div>
    <div class="search-container">
        <input type="text" id="inventory-history-search" class="inventory-history-filter" placeholder="Buscar por código o nombre...">
    </div>
</div>

<div class="product-list-container" id="inventory-history-container">
    <table class="product-table">
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Stock Ant.</th>
                <th>Stock Nuevo</th>
                <th>Tienda</th> <th>Usuario</th>
                <th>Notas</th>
            </tr>
        </thead>
        <tbody id="inventory-history-tbody">
            </tbody>
    </table>
</div>