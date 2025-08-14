
<div class="statistics-container" id="statistics-summary">
    <h2>Resumen General</h2>

    <div class="charts-grid">
    <div class="chart-container">
        <div class="chart-header">
            <h3>Ventas de la Última Semana</h3>
            <div class="chart-controls">
                <button class="chart-type-btn" data-chart="weeklySalesChart" data-type="line">Línea</button>
                <button class="chart-type-btn" data-chart="weeklySalesChart" data-type="bar">Barra</button>
            </div>
        </div>
        <div id="weeklySalesChartContainer" class="chart-canvas-wrapper">
            <canvas id="weeklySalesChart"></canvas>
        </div>
    </div>
    <div class="chart-container">
        <div class="chart-header">
            <h3>Ventas Anuales (Mensual)</h3>
            <div class="chart-controls">
                <button class="chart-type-btn" data-chart="annualSalesChart" data-type="line">Línea</button>
                <button class="chart-type-btn" data-chart="annualSalesChart" data-type="bar">Barra</button>
            </div>
        </div>
        <div id="annualSalesChartContainer" class="chart-canvas-wrapper">
            <canvas id="annualSalesChart"></canvas>
        </div>
    </div>
</div>

<div class="theme-selector-container">
    <label for="theme-selector">Estilo del Gráfico:</label>
    <select id="theme-selector" class="admin-config-input">
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
        <option value="ocean">Océano</option>
    </select>
</div>

    <div class="summary-grid">
        <div class="stat-card"><h3>Total de Clientes</h3><p id="total-clientes">...</p></div>
        <div class="stat-card"><h3>Ventas Diarias</h3><p id="ventas-diarias">...</p></div>
        <div class="stat-card"><h3>Ventas Semanales</h3><p id="ventas-semanales">...</p></div>
        <div class="stat-card"><h3>Ventas Mensuales</h3><p id="ventas-mensuales">...</p></div>
        <div class="stat-card"><h3>Ventas Trimestrales</h3><p id="ventas-trimestrales">...</p></div>
        <div class="stat-card"><h3>Ventas Anuales</h3><p id="ventas-anuales">...</p></div>
    </div>
</div>