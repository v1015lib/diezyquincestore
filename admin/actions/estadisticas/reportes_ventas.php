<div class="module-header">
    <h2>📊 Reportes de Ventas</h2>
</div>

<!-- ✅ FILTROS DE FECHA -->
<div class="filter-bar" style="margin-bottom: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <div class="form-group" style="margin: 0; min-width: 200px;">
            <label for="reporte-fecha-inicio" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Fecha Inicio:</label>
            <input type="date" id="reporte-fecha-inicio" class="form-control" style="width: 100%;">
        </div>
        <div class="form-group" style="margin: 0; min-width: 200px;">
            <label for="reporte-fecha-fin" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Fecha Fin:</label>
            <input type="date" id="reporte-fecha-fin" class="form-control" style="width: 100%;">
        </div>
        <div style="align-self: flex-end;">
            <button id="aplicar-filtro-reporte" class="action-btn" style="padding: 0.6rem 1.5rem;">
                🔍 Filtrar
            </button>
            <button id="limpiar-filtro-reporte" class="action-btn" style="padding: 0.6rem 1.5rem; background-color: #6c757d;">
                🔄 Limpiar
            </button>
        </div>
        <div style="align-self: flex-end; margin-left: auto;">
            <span id="periodo-seleccionado" style="font-weight: 500; color: #0C0A4E;"></span>
        </div>
    </div>
</div>

<div class="module-content">
    <!-- Tabla de productos vendidos por día -->
    <div class="content-section">
        <h3>📅 Ventas Diarias por Producto</h3>
        <div style="max-height: 500px; overflow-y: auto;">
            <table id="tabla-reporte-productos" class="data-table">
                <thead>
                    <tr>
                        <th style="width: 12%;">Fecha</th>
                        <th style="width: 13%;">Código</th>
                        <th style="width: 40%;">Producto</th>
                        <th style="width: 10%;">Unidades</th>
                        <th style="width: 25%;">Total Vendido</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="5">Cargando...</td></tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL:</td>
                        <td id="total-productos" style="text-align: right;">$0.00</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>

    <!-- Top 15 productos -->
    <div class="content-section" style="margin-top: 2rem;">
        <h3>🏆 Top 15 Productos Más Vendidos</h3>
        <div style="max-height: 500px; overflow-y: auto;">
            <table id="tabla-reporte-departamentos" class="data-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">#</th>
                        <th style="width: 60%;">Producto</th>
                        <th style="width: 30%;">Total Vendido</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="3">Cargando...</td></tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="text-align: right; font-weight: bold;">TOTAL:</td>
                        <td id="total-departamentos" style="text-align: right;">$0.00</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>

    <!-- Gráfico -->
    <div class="content-section" style="margin-top: 2rem;">
        <h3>📊 Gráfico de Ventas por Producto</h3>
        <div style="position: relative; height: 500px; width: 100%; max-width: 800px; margin: 0 auto;">
            <canvas id="grafico-pastel-productos"></canvas>
        </div>
    </div>
</div>