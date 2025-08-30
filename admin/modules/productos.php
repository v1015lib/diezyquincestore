

<div class="module-header">
    <h2>Gestión de Productos</h2>
    <div class="action-ribbon">
        <button class="action-btn active" data-action="productos/todos_los_productos">Todos los Productos</button>
        <button class="action-btn" data-action="productos/agregar_producto">Nuevo Producto</button>
        <button class="action-btn" data-action="productos/modificar_producto">Modificar Producto</button>
        
        <?php 

        session_start();

        if (isset($_SESSION['rol']) && $_SESSION['rol'] === 'administrador_global' ||  $_SESSION['rol'] === 'admin_tienda'): 

        ?>

        <button class="action-btn" data-action="productos/crear_oferta">Gestionar Oferta</button>

        <?php endif; ?>


        <button class="action-btn" data-action="productos/ofertas_activas">Ofertas Activas</button>

        <?php if (isset($_SESSION['rol']) && $_SESSION['rol'] === 'administrador_global'): ?>

        <button class="action-btn" data-action="productos/eliminar_producto">Eliminar Producto</button>
        <?php endif; ?>

    </div>
</div>

<div id="action-content" class="module-content">
</div>