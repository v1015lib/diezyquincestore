<?php
// admin/modules/web_admin.php (Versión Definitiva Unificada)

// Obtenemos la conexión a la BD para los departamentos
require_once __DIR__ . '/../../config/config.php';
$departamentos = $pdo->query("SELECT id_departamento, departamento FROM departamentos ORDER BY departamento")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="module-header">
    <h2 class="modules_head">Administración de la Tienda Web</h2>
    <div class="action-ribbon">
        <button id="tab-btn-visibility" class="action-btn active" data-tab="visibility">Visibilidad de Módulos</button>
        <button id="tab-btn-content" class="action-btn" data-tab="content">Contenido de Carruseles</button>
    </div>
</div>

<div id="action-content" class="module-content">
    <div id="tab-content-visibility" class="tab-pane active">
        <div class="form-container">
            <h3>Visibilidad de Módulos</h3>
            <p>Activa o desactiva los diferentes componentes y filtros de la página principal.</p>
            
            <fieldset class="form-fieldset">
                <legend class="form-section-header">Carruseles / Sliders</legend>
                <div class="form-group setting-toggle">
                    <label for="show_main_carousel">Carrusel Principal de Anuncios</label>
                    <input type="checkbox" id="show_main_carousel" name="show_main_carousel" class="switch admin-config-input">
                </div>
                <div class="form-group setting-toggle">
                    <label for="show_offers_carousel">Carrusel de Ofertas</label>
                    <input type="checkbox" id="show_offers_carousel" name="show_offers_carousel" class="switch admin-config-input">
                </div>
                <div class="form-group setting-toggle">
                    <label for="show_department_carousel">Carrusel de Departamento Destacado</label>
                    <input type="checkbox" id="show_department_carousel" name="show_department_carousel" class="switch admin-config-input">
                </div>
            </fieldset>

            <fieldset class="form-fieldset">
                <legend class="form-section-header">Productos</legend>
                <div class="form-group setting-toggle">
                    <label for="hide_products_without_image">Mostrar solo productos con imagen</label>
                    <input type="checkbox" id="hide_products_without_image" name="hide_products_without_image" class="switch admin-config-input">
                </div>
            </fieldset>

            <fieldset class="form-fieldset">
                <legend class="form-section-header">Visibilidad de Detalles del Producto</legend>
                <div class="form-group setting-toggle">
                    <label for="show_product_price">Mostrar precio del producto</label>
                    <input type="checkbox" id="show_product_price" name="show_product_price" class="switch admin-config-input">
                </div>
                <div class="form-group setting-toggle">
                    <label for="show_product_code">Mostrar código del producto</label>
                    <input type="checkbox" id="show_product_code" name="show_product_code" class="switch admin-config-input">
                </div>
                <div class="form-group setting-toggle">
                    <label for="show_product_department">Mostrar departamento del producto</label>
                    <input type="checkbox" id="show_product_department" name="show_product_department" class="switch admin-config-input">
                </div>
                <div class="form-group setting-toggle">
                    <label for="details_for_logged_in_only">Mostrar detalles solo a usuarios registrados</label>
                    <input type="checkbox" id="details_for_logged_in_only" name="details_for_logged_in_only" class="switch admin-config-input">
                </div>
            </fieldset>
        </div>
    </div>

    <div id="tab-content-content" class="tab-pane">
        <div class="form-container" id="carousel-settings-form">
            <fieldset class="form-fieldset">
                <legend class="form-section-header">Carrusel de Ofertas</legend>
                <div class="form-group">
                    <label for="offers_carousel_title">Título del Carrusel</label>
                    <input type="text" id="offers_carousel_title" name="offers_carousel_title" class="admin-config-input">
                </div>
                <div class="form-group">
                    <label for="offers_carousel_dept">Departamento (Opcional)</label>
                    <select id="offers_carousel_dept" name="offers_carousel_dept" class="admin-config-input">
                        <option value="0">Ofertas de TODOS los departamentos</option>
                        <?php foreach ($departamentos as $dep): ?>
                            <option value="<?php echo htmlspecialchars($dep['id_departamento']); ?>">
                                <?php echo htmlspecialchars($dep['departamento']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </fieldset>

            <fieldset class="form-fieldset">
                <legend class="form-section-header">Carrusel de Departamento Destacado</legend>
                <div class="form-group">
                    <label for="dept_carousel_title_prefix">Prefijo del Título</label>
                    <input type="text" id="dept_carousel_title_prefix" name="dept_carousel_title_prefix" class="admin-config-input" placeholder="Ej: Lo que siempre buscas en">
                </div>
                <div class="form-group">
                    <label for="dept_carousel_dept">Departamento a Destacar</label>
                    <select id="dept_carousel_dept" name="dept_carousel_dept" class="admin-config-input">
                        <?php foreach ($departamentos as $dep): ?>
                            <option value="<?php echo htmlspecialchars($dep['id_departamento']); ?>">
                                <?php echo htmlspecialchars($dep['departamento']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </fieldset>
        </div>
    </div>
</div>

<style>
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }
</style>