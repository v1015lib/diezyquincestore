<div class="reports-container">
    <h2 id="report-title">Reporte de Ventas por Departamento</h2>
    <div class="report-filters">
        <button id="report-daily" class="btn">Diario</button>
        <button id="report-weekly" class="btn">Semanal</button>
        <button id="report-monthly" class="btn">Mensual</button>
        <button id="report-quarterly" class="btn">Trimestral</button>
        <button id="report-yearly" class="btn">Anual</button>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Departamento</th>
                    <th>Total Vendido</th>
                </tr>
            </thead>
            <tbody id="sales-report-content">
                </tbody>
        </table>
    </div>
</div>

<div class="reports-container monthly-breakdown-container">
    <h3 id="monthly-breakdown-title">Cargando desglose mensual...</h3>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Total del Día</th>
                </tr>
            </thead>
            <tbody id="monthly-breakdown-content">
                </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><strong>Total del Mes</strong></td>
                    <td id="monthly-breakdown-total"><strong>$0.00</strong></td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>