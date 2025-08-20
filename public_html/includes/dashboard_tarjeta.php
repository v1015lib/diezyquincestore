<?php // public_html/includes/dashboard_tarjeta.php ?>
<h1>Mi Tarjeta Recargable</h1>
<p>Consulta tu saldo disponible y el detalle de tus últimos movimientos.</p>

<div class="card-summary-container">
    <div class="card-info-widget">
        <h4>Número de Tarjeta</h4>
        <p id="card-number">Cargando...</p>
    </div>
    <div class="card-balance-widget">
        <h4>Saldo Disponible</h4>
        <p id="card-balance">Cargando...</p>
    </div>
</div>

<div class="transaction-history-container">
    <h2>Historial de Movimientos</h2>
    <div class="table-responsive-wrapper">
        <table class="transaction-history-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Monto</th>
                </tr>
            </thead>
            <tbody id="transaction-history-body">
                </tbody>
        </table>
    </div>
</div>
