<div class="stats-header">
    <div class="date-range-filter">
        <label for="start-date">Desde:</label>
        <input type="date" id="start-date">
        <label for="end-date">Hasta:</label>
        <input type="date" id="end-date">
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