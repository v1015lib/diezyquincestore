<?php
// admin/modules/web_admin.php (Versión Definitiva Unificada)

// Obtenemos la conexión a la BD para los departamentos
require_once __DIR__ . '/../../config/config.php';

$departamentos = $pdo->query("SELECT id_departamento, departamento FROM departamentos ORDER BY departamento")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="module-header">
    <h2 class="modules_head">Administración de la Tienda Web</h2>
    <div class="action-ribbon">
        <button id="tab-btn-visibility" class="action-btn active" data-tab="visibility">Visibilidad</button>
        <button id="tab-btn-content" class="action-btn" data-tab="content">Carruseles</button>
        <button id="tab-btn-ads" class="action-btn" data-tab="ads">Anuncios Web</button>
    </div>
</div>

<div id="action-content" class="module-content">
    
    <div id="tab-content-visibility" class="tab-pane active">
        <h3>Visibilidad de Secciones</h3>
        <p>Activa o desactiva las principales secciones de la página de inicio.</p>
        <div class="setting-toggle">
            <label for="show_main_carousel">Mostrar Carrusel Principal de Anuncios</label>
            <input type="checkbox" id="show_main_carousel" class="switch">
        </div>
        <div class="setting-toggle">
            <label for="show_offers_carousel">Mostrar Carrusel de Ofertas</label>
            <input type="checkbox" id="show_offers_carousel" class="switch">
        </div>
        <div class="setting-toggle">
            <label for="show_department_carousel">Mostrar Carrusel de Departamento Destacado</label>
            <input type="checkbox" id="show_department_carousel" class="switch">
        </div>
        <hr>
        <h3>Visibilidad de Detalles de Producto</h3>
        <p>Controla qué información se muestra en las tarjetas de producto.</p>
        <div class="setting-toggle">
            <label for="hide_products_without_image">Ocultar productos sin imagen en la tienda</label>
            <input type="checkbox" id="hide_products_without_image" class="switch">
        </div>
        <div class="setting-toggle">
            <label for="show_product_price">Mostrar precio del producto</label>
            <input type="checkbox" id="show_product_price" class="switch">
        </div>
        <div class="setting-toggle">
            <label for="show_product_code">Mostrar código del producto</label>
            <input type="checkbox" id="show_product_code" class="switch">
        </div>
        <div class="setting-toggle">
            <label for="show_product_department">Mostrar departamento del producto</label>
            <input type="checkbox" id="show_product_department" class="switch">
        </div>
        <div class="setting-toggle">
            <label for="details_for_logged_in_only">Mostrar detalles solo a usuarios con sesión iniciada</label>
            <input type="checkbox" id="details_for_logged_in_only" class="switch">
        </div>
    </div>

    <div id="tab-content-content" class="tab-pane">
        <h3>Contenido de Carruseles de Productos</h3>
        <p>Personaliza los títulos y el contenido de los carruseles que se muestran en la página de inicio.</p>
        <fieldset class="form-fieldset">
            <legend class="form-section-header">Carrusel de Ofertas</legend>
            <div class="form-group">
                <label for="offers_carousel_title">Título del Carrusel</label>
                <input type="text" id="offers_carousel_title" class="admin-config-input form-control">
            </div>
            <div class="form-group">
                <label for="offers_carousel_dept">Mostrar ofertas solo del departamento</label>
                <select id="offers_carousel_dept" class="admin-config-input form-control">
                    <option value="0">Todos los departamentos</option>
                    <?php foreach ($departamentos as $dep): ?>
                        <option value="<?php echo htmlspecialchars($dep['id_departamento']); ?>"><?php echo htmlspecialchars($dep['departamento']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </fieldset>
        <fieldset class="form-fieldset" style="margin-top: 2rem;">
            <legend class="form-section-header">Carrusel de Departamento Destacado</legend>
            <div class="form-group">
                <label for="dept_carousel_title_prefix">Prefijo del Título</label>
                <input type="text" id="dept_carousel_title_prefix" class="admin-config-input form-control">
            </div>
            <div class="form-group">
                <label for="dept_carousel_dept">Departamento a mostrar</label>
                <select id="dept_carousel_dept" class="admin-config-input form-control">
                    <?php foreach ($departamentos as $dep): ?>
                        <option value="<?php echo htmlspecialchars($dep['id_departamento']); ?>"><?php echo htmlspecialchars($dep['departamento']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </fieldset>
    </div>
    
    <div id="tab-content-ads" class="tab-pane">
        <div class="form-container">
            <h3>Gestión de Anuncios Web</h3>
            <p>Administra los anuncios que aparecen en el carrusel principal y la columna derecha.</p>
            
            <div class="ads-management">
                <div class="ads-form-section">
                    <h4>Agregar/Editar Anuncio</h4>
                    <form id="ads-form" class="ads-form">
                        <div class="form-group">
                            <label for="ads-titulo">Título del Anuncio</label>
                            <input type="text" id="ads-titulo" name="titulo" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="ads-url-imagen">URL de la Imagen</label>
                            <div class="image-picker-container">
                                <input type="url" id="ads-url-imagen" name="url_imagen" required placeholder="https://ejemplo.com/imagen.jpg" style="flex-grow: 1;">
                                <button type="button" id="open-gallery-for-ads-btn" class="modal-btn modal-btn-secondary" style="flex-shrink: 0;">Galería</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="ads-url-enlace">URL de Destino (opcional)</label>
                            <input type="url" id="ads-url-enlace" name="url_enlace" placeholder="Se genera automáticamente al seleccionar abajo">
                        </div>

<fieldset class="form-fieldset" style="margin-top: 1rem; padding: 1rem; border: 1px dashed #ccc;">
    <legend style="font-size: 0.9rem; font-weight: 600; padding: 0 5px;">Generador de URL de Destino</legend>
    <div class="form-group">
        <label for="link-type-selector">Tipo de Enlace</label>
        <select id="link-type-selector" class="form-control">
            <option value="manual">Manual</option>
            <option value="departamento">Departamento</option>
            <option value="producto">Producto</option>
            <option value="ofertas">Todas las Ofertas</option>
            <option value="todos">Todos los productos</option>
            <option value="marca">Solo Marca</option>
            <option value="marca_tipo">Marca y Tipo</option>
        </select>
    </div>
    <div id="department-link-generator" class="form-group hidden">
        <label for="department-selector">Seleccionar Depto.</label>
        <select id="department-selector" class="form-control" style="width: 100%;">
            <option value="">Cargando...</option>
        </select>
    </div>
    <div id="product-link-generator" class="form-group hidden" style="position: relative;">
        <label for="product-search-input-ads">Buscar Producto</label>
        <input type="text" id="product-search-input-ads" class="form-control" placeholder="Escribe para buscar...">
        <div id="product-search-results-ads" class="search-results-popover"></div>
    </div>
    <div id="brand-link-generator" class="form-group hidden">
        <label for="brand-selector">Seleccionar Marca</label>
        <select id="brand-selector" class="form-control" style="width: 100%;">
            <option value="">Cargando...</option>
        </select>
    </div>
    
    <div id="type-link-generator" class="form-group hidden">
        <label for="type-selector">Seleccionar Etiqueta</label>
        <select id="type-selector" class="form-control">
            <option value="">(Opcional) Selecciona una etiqueta</option>
        </select>
    </div>
    <div class="form-group">
        <label for="link-decorator">Decorador/Campaña</label>
        <input type="text" id="link-decorator" class="form-control" placeholder="Se autocompleta al seleccionar">
    </div>
</fieldset>


                        <div class="form-group">
                            <label for="ads-tipo">Ubicación</label>
                            <select id="ads-tipo" name="tipo" required>
                                <option value="">Seleccionar ubicación</option>
                                <option value="slider_principal">Carrusel Principal</option>
                                <option value="columna_derecha">Columna Derecha</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ads-orden">Orden</label>
                            <input type="number" id="ads-orden" name="orden" min="0" value="0">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="ads-activo" name="activo" checked>
                                Anuncio Activo
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Guardar Anuncio</button>
                            <button type="button" id="cancel-edit" class="btn btn-secondary" style="display: none;">Cancelar Edición</button>
                        </div>
                    </form>
                </div>

                <div class="ads-list-section">
                    <h4>Anuncios Existentes</h4>
                    <div id="ads-list" class="ads-list">
                        </div>
                </div>
            </div>
        </div>
    </div>
</div>


<style>
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }
    .hidden { display: none !important; }
    
    .ads-management {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 2rem;
        margin-top: 1rem;
    }
    
    .ads-form-section, .ads-list-section {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    }
    
    .ads-form .form-group {
        margin-bottom: 1rem;
    }
    
    .ads-form .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #495057;
    }
    
    .ads-form input, .ads-form select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .checkbox-label {
        display: flex;
        align-items: center;
        cursor: pointer;
    }
    
    .checkbox-label input[type="checkbox"] {
        width: auto;
        margin-right: 0.5rem;
    }
    
    .ads-list {
        max-height: 600px;
        overflow-y: auto;
    }
    
    .ad-item {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 1rem;
        margin-bottom: 1rem;
        position: relative;
    }
    
    .ad-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .ad-item-title {
        font-weight: 600;
        color: #212529;
        margin: 0;
    }
    
    .ad-item-type {
        background: #007bff;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .ad-item-type.slider_principal {
        background: #28a745;
    }
    
    .ad-item-type.columna_derecha {
        background: #ffc107;
        color: #212529;
    }
    
    .ad-item-actions {
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        gap: 0.5rem;
    }
    
    .btn-edit, .btn-delete {
        padding: 0.25rem 0.5rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
    }
    
    .btn-edit {
        background: #17a2b8;
        color: white;
    }
    
    .btn-delete {
        background: #dc3545;
        color: white;
    }
    
    .ad-item-details {
        font-size: 0.9rem;
        color: #6c757d;
        margin-top: 0.5rem;
    }
    
    .ad-item-details div {
        margin-bottom: 0.25rem;
        word-break: break-all;
    }
    
    .ad-preview {
        margin-top: 0.5rem;
        max-width: 200px;
    }
    
    .ad-preview img {
        width: 100%;
        height: auto;
        border-radius: 4px;
        border: 1px solid #dee2e6;
    }
    
    .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .btn-primary {
        background: #007bff;
        color: white;
    }
    
    .btn-secondary {
        background: #6c757d;
        color: white;
    }
    
    .btn:hover {
        opacity: 0.9;
    }

    .search-results-popover {
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        z-index: 1000;
        width: calc(100% - 2rem);
        max-height: 200px;
        overflow-y: auto;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        display: none; /* Oculto por defecto */
    }

    .search-results-popover .search-result-item {
        padding: 0.75rem;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
    }

    .search-results-popover .search-result-item:last-child {
        border-bottom: none;
    }

    .search-results-popover .search-result-item:hover {
        background-color: #f5f5f5;
    }
    
    @media (max-width: 991px) {
        .ads-management {
            grid-template-columns: 1fr;
        }
    }
</style>