<?php
// Carga la conexión a la BD para obtener los departamentos
require_once __DIR__ . '/../../../config/config.php';
$departamentos = $pdo->query("SELECT id_departamento, departamento FROM departamentos ORDER BY departamento")->fetchAll(PDO::FETCH_ASSOC);
?>

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