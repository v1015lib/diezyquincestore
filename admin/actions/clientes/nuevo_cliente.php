<?php
session_start();

// --- Bloque de Seguridad Actualizado ---
// Ahora, este bloque solo verifica que el usuario haya iniciado sesión correctamente,
// sin importar si es administrador o empleado.
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true || !isset($_SESSION['rol'])) {
   header("Location: ../../login-form.php"); 
   exit();
}
// Lógica para obtener los tipos de cliente para el selector
require_once __DIR__ . '/../../../config/config.php';
$tipos_cliente = $pdo->query("SELECT id_tipo, nombre_tipo FROM tipos_cliente ORDER BY nombre_tipo")->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="form-container">
    <form id="add-customer-form" method="POST">
        <div id="form-messages"></div>

        <div class="form-group">
            <label for="nombre">Nombre</label>
            <input type="text" id="nombre" name="nombre" required>
        </div>
        <div class="form-group">
            <label for="apellido">Apellido</label>
            <input type="text" id="apellido" name="apellido">
        </div>
        <div class="form-group">
            <label for="nombre_usuario">Nombre de Usuario</label>
            <input type="text" id="nombre_usuario" name="nombre_usuario" required pattern="[a-zA-Z0-9]+" title="Solo letras y números, sin espacios.">
            <div class="validation-feedback"></div>
        </div>
         <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" name="password" placeholder="Dejar en blanco para no cambiar">
        </div>
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
            <div class="validation-feedback"></div>
        </div>
        <div class="form-group">
            <label for="telefono">Teléfono</label>
            <input type="tel" id="telefono" name="telefono" required pattern="[0-9]{8}" title="Debe contener 8 dígitos.">
             <div class="validation-feedback"></div>
        </div>
        <div class="form-group">	
            <label for="id_tipo_cliente">Tipo de Cliente</label>
            <select id="id_tipo_cliente" name="id_tipo_cliente" required>
                <?php foreach ($tipos_cliente as $tipo): ?>
                    <option value="<?php echo htmlspecialchars($tipo['id_tipo']); ?>"><?php echo htmlspecialchars($tipo['nombre_tipo']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        
        <div id="student-fields" class="conditional-fields hidden">
             <h4 class="form-section-header">Datos de Estudiante</h4>
            <div class="form-group">
                <label for="institucion">Institución</label>
                <input type="text" id="institucion" name="institucion">
            </div>
            <div class="form-group">
                <label for="grado_actual">Grado Actual</label>
                <input type="text" id="grado_actual" name="grado_actual">
            </div>
        </div>
        
        <div id="taxpayer-fields" class="conditional-fields hidden">
            <h4 class="form-section-header">Datos de Contribuyente</h4>
             <div class="form-group">
                <label for="razon_social">Razón Social</label>
                <input type="text" id="razon_social" name="razon_social">
            </div>
            <div class="form-group">
                <label for="direccion">Dirección</label>
                <input type="text" id="direccion" name="direccion">
            </div>
            <div class="form-group">
                <label for="dui">DUI</label>
                <input type="text" id="dui" name="dui">
            </div>
            <div class="form-group">
                <label for="nit">NIT</label>
                <input type="text" id="nit" name="nit">
            </div>
            <div class="form-group">
                <label for="n_registro">N° de Registro</label>
                <input type="text" id="n_registro" name="n_registro">
            </div>
        </div>

        <button type="submit" class="action-btn form-submit-btn">Guardar Cliente</button>
    </form>
</div>	