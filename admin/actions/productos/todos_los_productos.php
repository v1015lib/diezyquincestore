<?php
// Lógica de seguridad para asegurar que este archivo no se cargue directamente.
//session_start();
//if (!isset($_SESSION['loggedin']) || $_SESSION['rol'] != 'administrador') {
  //  die('Acceso denegado.');
//}
?>
<div class="list-header">
    <div class="search-container">
        <input type="text" id="product-search-input" placeholder="Buscar por nombre o código...">
    </div>
    <div class="filter-container">
        <select id="department-filter">
            <option value="">Todos los departamentos</option>
            </select>
    </div>
    <div class="batch-actions-container">
        <select id="batch-action-selector" disabled>
            <option value="">Acciones en lote...</option>
            <option value="delete">Eliminar Seleccionados</option>
            
            <option value="activate" style="display: none;">Activar en Tienda</option>
            <option value="deactivate" style="display: none;">Inactivar en Tienda</option>
            
            <option value="change-department">Cambiar Departamento</option>
        </select>
        <button id="batch-action-execute" class="action-btn" disabled>Ejecutar</button>
    </div>
</div>

<div class="product-list-container">
    <table class="product-table">
        <thead>
            <tr>
            <th><input type="checkbox" id="select-all-products"></th>
            <th>Código</th>
            <th class="sortable" data-sort="nombre_producto">Nombre del Producto</th>
            <th class="sortable" data-sort="departamento">Departamento</th>
            <th class="sortable" data-sort="precio_venta">Precio Venta</th>
            <th class="sortable" data-sort="nombre_estado">Estado</th>
            </tr>
        </thead>
        <tbody id="product-table-body">
            </tbody>
    </table>
</div>