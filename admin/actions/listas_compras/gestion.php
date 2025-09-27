<div class="list-header">
    <h3>Listas de Compras Creadas</h3>
    <div class="filters-container" style="margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
        <?php
        // Se calcula el inicio y fin de la semana actual
        $today = new DateTime();
        $start_of_week = (clone $today)->modify('monday this week');
        $end_of_week = (clone $today)->modify('sunday this week');
        ?>
        <label for="list-start-date-filter">Desde:</label>
        <input type="date" id="list-start-date-filter" class="form-control" style="width: auto;" value="<?php echo $start_of_week->format('Y-m-d'); ?>">
        
        <label for="list-end-date-filter">Hasta:</label>
        <input type="date" id="list-end-date-filter" class="form-control" style="width: auto;" value="<?php echo $end_of_week->format('Y-m-d'); ?>">
    </div>
</div>
<div class="product-list-container">
    <table class="product-table">
        <thead>
            <tr>
                <th>Nombre de la Lista</th>
                <th>Fecha de Creación</th>
                <th>Creado por</th>
                <th>Proveedor</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody id="shopping-lists-tbody">
            </tbody>
    </table>
</div>