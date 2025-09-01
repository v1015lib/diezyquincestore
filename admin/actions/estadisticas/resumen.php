<?php
// Lógica para asegurar que solo usuarios logueados accedan
session_start();
if (!isset($_SESSION['loggedin'])) { exit('Acceso denegado.'); }

// Se requiere para obtener la lista de tiendas
require_once __DIR__ . '/../../../config/config.php';
$tiendas = $pdo->query("SELECT id_tienda, nombre_tienda FROM tiendas ORDER BY nombre_tienda")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="stats-header">
    <div class="date-range-filter">
        <label for="start-date">Desde:</label>
        <input type="date" id="start-date">
        <label for="end-date">Hasta:</label>
        <input type="date" id="end-date">
        
        <?php // --- Se muestra el filtro de tienda solo al administrador global --- ?>
        <?php if ($_SESSION['rol'] === 'administrador_global'): ?>
        <div class="form-group" style="flex-basis: auto; margin-left: 1rem;">
            <label for="stats-store-filter" style="text-align: left; flex-basis: auto; padding-right: .5rem;">Tienda:</label>
            <select id="stats-store-filter" class="form-control">
                <option value="global">Global (Todas)</option>
                <?php foreach ($tiendas as $tienda): ?>
                    <option value="<?php echo htmlspecialchars($tienda['id_tienda']); ?>">
                        <?php echo htmlspecialchars($tienda['nombre_tienda']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <?php endif; ?>
        
        <button id="filter-stats-btn" class="action-btn">Filtrar</button>
    </div>
</div>

<div class="widgets-grid" id="stats-widgets-container">
    <div class="widget">
        <h3>Ventas del Período</h3>
        <div class="widget-content" id="sales-summary-widget">
            <p>Cargando datos...</p>
        </div>
    </div>

    <div class="widget">
        <h3>Top 5 Productos Más Vendidos</h3>
        <div class="widget-content" id="top-products-widget">
            <p>Cargando datos...</p>
        </div>
    </div>

    <div class="widget">
        <h3>Productos con Bajo Stock</h3>
        <div class="widget-content" id="low-stock-widget">
            <p>Cargando datos...</p>
        </div>
    </div>
</div>

<div class="widget" style="margin-top: 2rem;">
    <h3 id="sales-chart-title">Gráfico de Ventas Diarias</h3>
    <div class="widget-content" id="sales-chart-container">
        <canvas id="salesChart"></canvas>
    </div>
</div>