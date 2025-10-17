<?php
// Lógica para obtener los datos para los selectores (dropdowns)
require_once __DIR__ . '/../../../config/config.php';

$departamentos = $pdo->query("SELECT id_departamento, departamento FROM departamentos ORDER BY departamento")->fetchAll(PDO::FETCH_ASSOC);
$estados = $pdo->query("SELECT id_estado, nombre_estado FROM estados ORDER BY nombre_estado")->fetchAll(PDO::FETCH_ASSOC);
$proveedores = $pdo->query("SELECT id_proveedor, nombre_proveedor FROM proveedor ORDER BY nombre_proveedor")->fetchAll(PDO::FETCH_ASSOC);
$unidades_medida = $pdo->query("SELECT id_unidad_medida, nombre_unidad FROM unidad_medida ORDER BY nombre_unidad")->fetchAll(PDO::FETCH_ASSOC);
$marcas = $pdo->query("SELECT id_marca, nombre_marca FROM marcas ORDER BY nombre_marca")->fetchAll(PDO::FETCH_ASSOC);
$etiquetas = $pdo->query("SELECT id_etiqueta, nombre_etiqueta FROM etiquetas ORDER BY nombre_etiqueta")->fetchAll(PDO::FETCH_ASSOC);

?>

<div class="form-container">
    <form id="add-product-form" method="POST" enctype="multipart/form-data">
        <div id="form-messages"></div>

        <div class="form-group">
            <label for="codigo_producto">Código de Producto</label>
            <input type="text" id="codigo_producto" name="codigo_producto" required>
        </div>

        <div class="form-group">
            <label for="nombre_producto">Nombre de Producto</label>
            <input type="text" id="nombre_producto" name="nombre_producto" required>
        </div>

        <div class="form-group">
            <label for="departamento">Departamento</label>
            <select id="departamento" name="departamento" required>
                <option value="">Selecciona un departamento</option>
                <?php foreach ($departamentos as $dep): ?>
                    <option value="<?php echo htmlspecialchars($dep['id_departamento']); ?>"><?php echo htmlspecialchars($dep['departamento']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="precio_compra">Precio de Compra</label>
            <input type="number" id="precio_compra" name="precio_compra" step="0.01" min="0" placeholder="0.00">
        </div>

        <div class="form-group">
            <label for="precio_venta">Precio de Venta</label>
            <input type="number" id="precio_venta" name="precio_venta" step="0.01" min="0" required>
        </div>

        <div class="form-group">
            <label for="precio_mayoreo">Precio al Mayoreo</label>
            <input type="number" id="precio_mayoreo" name="precio_mayoreo" step="0.01" min="0" placeholder="0.00">
        </div>

        <div class="form-group">
            <label>Imagen del Producto</label>
            <div class="image-picker-container">
                <div id="image-preview-container">
                    <img src="" id="image-preview" class="hidden" alt="Previsualización">
                    <span id="no-image-text">Ninguna imagen seleccionada</span>
                </div>
                <input type="hidden" id="selected-image-url" name="url_imagen">
                <button type="button" id="open-gallery-btn" class="modal-btn modal-btn-secondary">Elegir Imagen</button>
            </div>
        </div>

        <div class="form-group">
            <label for="tipo_de_venta">Unidad de Medida</label>
            <select id="tipo_de_venta" name="tipo_de_venta" required>
                <option value="">Selecciona una unidad</option>
                <?php foreach ($unidades_medida as $um): ?>
                    <option value="<?php echo htmlspecialchars($um['id_unidad_medida']); ?>"><?php echo htmlspecialchars($um['nombre_unidad']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="estado">Estado</label>
            <select id="estado" name="estado" required>
                <option value="">Selecciona un estado</option>
                <?php foreach ($estados as $est): ?>
                    <option value="<?php echo htmlspecialchars($est['id_estado']); ?>"><?php echo htmlspecialchars($est['nombre_estado']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="proveedor">Proveedor</label>
            <select id="proveedor" name="proveedor" required>
                <option value="">Selecciona un proveedor</option>
                <?php foreach ($proveedores as $prov): ?>
                    <option value="<?php echo htmlspecialchars($prov['id_proveedor']); ?>"><?php echo htmlspecialchars($prov['nombre_proveedor']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        
        <?php // --- BLOQUES MODIFICADOS Y AÑADIDOS --- ?>
        <div class="form-group">
            <label for="id_marca">Marca</label>
            <select id="id_marca" name="id_marca">
                <option value="">(Opcional) Selecciona una marca</option>
                <?php foreach ($marcas as $marca): ?>
                    <option value="<?php echo htmlspecialchars($marca['id_marca']); ?>"><?php echo htmlspecialchars($marca['nombre_marca']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="id_etiqueta">Etiqueta</label>
            <select id="id_etiqueta" name="id_etiqueta">
                <option value="">(Opcional) Selecciona una etiqueta</option>
                <?php foreach ($etiquetas as $etiqueta): ?>
                    <option value="<?php echo htmlspecialchars($etiqueta['id_etiqueta']); ?>"><?php echo htmlspecialchars($etiqueta['nombre_etiqueta']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <?php // --- FIN DEL BLOQUE --- ?>

        <div class="form-group">
            <label for="stock_minimo">Stock Mínimo</label>
            <input type="number" id="stock_minimo" name="stock_minimo" min="0" value="0">
        </div>
        <div class="form-group">
            <label for="stock_maximo">Stock Máximo</label>
            <input type="number" id="stock_maximo" name="stock_maximo" min="0" value="0">
        </div>

        <button type="submit" class="action-btn form-submit-btn">Ingresar Producto</button>
    </form>
</div>