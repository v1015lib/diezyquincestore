<?php
// Lógica para obtener los datos para los selectores (dropdowns)
require_once __DIR__ . '/../../../config/config.php';

$departamentos = $pdo->query("SELECT id_departamento, departamento FROM departamentos ORDER BY departamento")->fetchAll(PDO::FETCH_ASSOC);
$estados = $pdo->query("SELECT id_estado, nombre_estado FROM estados ORDER BY nombre_estado")->fetchAll(PDO::FETCH_ASSOC);
$proveedores = $pdo->query("SELECT id_proveedor, nombre_proveedor FROM proveedor ORDER BY nombre_proveedor")->fetchAll(PDO::FETCH_ASSOC);
$unidades_medida = $pdo->query("SELECT id_unidad_medida, nombre_unidad FROM unidad_medida ORDER BY nombre_unidad")->fetchAll(PDO::FETCH_ASSOC);
$marcas = $pdo->query("SELECT id_marca, nombre_marca FROM marcas ORDER BY nombre_marca")->fetchAll(PDO::FETCH_ASSOC);
$etiquetas = $pdo->query("SELECT id_etiqueta, nombre_etiqueta FROM etiquetas ORDER BY nombre_etiqueta")->fetchAll(PDO::FETCH_ASSOC);
$id_estado_activo = null;
foreach ($estados as $est) {
    if (strtolower($est['nombre_estado']) === 'activo') {
        $id_estado_activo = $est['id_estado'];
        break;
    }
}

$id_proveedor_tienda_central = null;
foreach ($proveedores as $prov) {
    // Ajusta 'tienda central' si el nombre exacto es diferente en tu base de datos
    if (strtolower($prov['nombre_proveedor']) === 'tienda central') {
        $id_proveedor_tienda_central = $prov['id_proveedor'];
        break;
    }
}


$id_unidad_medida_unidad = null;
foreach ($unidades_medida as $um) {
    // Asegúrate que 'unidad' sea el nombre exacto en tu tabla unidad_medida
    if (strtolower($um['nombre_unidad']) === 'unidad') {
        $id_unidad_medida_unidad = $um['id_unidad_medida'];
        break;
    }
}
?>

<div class="form-container">
    <form id="add-product-form" method="POST" enctype="multipart/form-data">
        <div id="form-messages"></div>

        <div class="form-group">
            <label for="codigo_producto">Código de Producto</label>
            <div style="display: flex; flex-grow: 0.2; gap: 0.5rem; align-items: center;"> 
                <input type="text" id="codigo_producto" name="codigo_producto" required style="flex-grow: 1;">
                

                <button type="button" id="generate-barcode-single" class="action-btn" title="Generar código EAN-13 único" style="flex-shrink: 0; padding: 0.5rem; background-color: #e0e0e0; color: #333;">Generar</button>

                
                <button type="button" id="scan-barcode-add-product" class="btn btn-primary" title="Escanear código de barras" style="flex-shrink: 0; padding: 0.5rem;">📷</button>
            </div>
            <div class="validation-feedback"></div>
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

        <?php // --- INICIO: SECCIÓN DE IMÁGENES MODIFICADA --- ?>
        <div class="form-group form-group-align-top">
            <label>Imágenes del Producto</label>
            <p style="font-size: 0.9rem; color: #666;">Puedes agregar hasta 4 imágenes. La primera será la principal.</p>
            
            <div class="multi-image-picker-container">
                <?php $image_limit = 4; // Límite de imágenes ?>
                <?php for ($i = 0; $i < $image_limit; $i++): ?>
                <div class="image-picker-slot" data-slot-index="<?php echo $i; ?>">
                    <div class="image-preview-container">
                        <img src="" class="image-preview hidden" alt="Previsualización">
                        <span class="no-image-text">Imagen <?php echo $i + 1; ?> <?php echo ($i == 0) ? '(Principal)' : ''; ?></span>
                    </div>
                    
                    <?php // Input oculto para guardar la URL de la imagen. El nombre es un array. ?>
                    <input type="hidden" name="product_images[]" class="product-image-url" value="">
                    
                    <div class="image-slot-actions">
                        <?php // Botón para abrir la galería (tu modal). Necesitará JS. ?>
                        <button type="button" class="modal-btn modal-btn-secondary open-gallery-multi-btn">Elegir</button>
                        
                        <?php // Botón para limpiar el slot. Necesitará JS. ?>
                        <button type="button" class="modal-btn modal-btn-danger remove-image-btn hidden" style="background-color: #f44336; padding: 0.5rem 0.7rem;">X</button>
                    </div>
                </div>
                <?php endfor; ?>
            </div>
            
            <?php /* // Opcional: Si quieres añadir más slots dinámicamente en el futuro
            <button type="button" id="add-image-slot-btn" class="modal-btn" style="margin-top: 1rem;">Añadir más imágenes</button> 
            */ ?>
        </div>
        <?php // --- FIN: SECCIÓN DE IMÁGENES MODIFICADA --- ?>


        <div class="form-group">
            <label for="tipo_de_venta">Unidad de Medida</label>
            <select id="tipo_de_venta" name="tipo_de_venta" required>
                <option value="">Selecciona una unidad</option>
                <?php foreach ($unidades_medida as $um): ?>
                    <option value="<?php echo htmlspecialchars($um['id_unidad_medida']); ?>" <?php echo ($id_unidad_medida_unidad !== null && $um['id_unidad_medida'] == $id_unidad_medida_unidad) ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($um['nombre_unidad']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="estado">Estado</label>
            <select id="estado" name="estado" required>
                <option value="">Selecciona un estado</option>
                <?php foreach ($estados as $est): ?>
                    <option value="<?php echo htmlspecialchars($est['id_estado']); ?>" <?php echo ($id_estado_activo !== null && $est['id_estado'] == $id_estado_activo) ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($est['nombre_estado']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="proveedor">Proveedor</label>
            <select id="proveedor" name="proveedor" required>
                <option value="">Selecciona un proveedor</option>
                <?php foreach ($proveedores as $prov): ?>
                    <option value="<?php echo htmlspecialchars($prov['id_proveedor']); ?>" <?php echo ($id_proveedor_tienda_central !== null && $prov['id_proveedor'] == $id_proveedor_tienda_central) ? 'selected' : ''; ?>>
                        <?php echo htmlspecialchars($prov['nombre_proveedor']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

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
            <label for="id_etiqueta">Etiquetas</label>
            <div class="tag-input-container">
                <div class="selected-tags" id="selected-tags-area">
                    </div>
                <input type="text" id="tag-search-input" placeholder="Buscar o añadir etiquetas...">
                <div class="tag-suggestions" id="tag-suggestions-list">
                    </div>

                <select id="id_etiqueta" name="id_etiqueta[]" multiple class="original-tag-select">
                    <?php foreach ($etiquetas as $etiqueta): ?>
                        <option value="<?php echo htmlspecialchars($etiqueta['id_etiqueta']); ?>"><?php echo htmlspecialchars($etiqueta['nombre_etiqueta']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>

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