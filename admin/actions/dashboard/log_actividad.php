<div class="list-header">
    <h3>Registro de Actividad Reciente</h3>

    <p>Últimas 50 acciones importantes realizadas en el sistema.</p>
    <div class="filters-container" style="margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
    <label for="activity-date-filter">Filtrar por fecha:</label>
    <input type="date" id="activity-date-filter" class="form-control" style="width: auto;">
</div>
</div>

<div class="product-list-container">
    <table class="product-table">
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Tipo de Acción</th>
                <th>Descripción</th>
            </tr>
        </thead>
        <tbody id="activity-log-tbody">
            </tbody>
    </table>
</div>