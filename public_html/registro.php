<?php
// registro.php
require_once __DIR__ . '.././../config/config.php';
$page_type = 'simplified';
$departments = [];
try {
    if (!isset($pdo)) throw new Exception("La conexión a la base de datos no está disponible.");
    $stmt_deps = $pdo->query("SELECT id_departamento, departamento FROM departamentos ORDER BY departamento ASC");
    $departments = $stmt_deps->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) { /* No se mostrarán las preferencias */ }
?>
<!DOCTYPE html>
<html lang="es">
<head>
<?php
// Construye la URL base absoluta y detecta subcarpetas automáticamente.
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
$path = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
$base_url = "{$protocol}://{$host}{$path}/";
?>
<base href="<?php echo $base_url; ?>">
<base href="<?php echo $base_path; ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crear tu Cuenta</title>
    <link rel="shortcut icon" href="img/favicon.png">    
    <meta name="robots" content="noindex, follow">

    <link rel="stylesheet" href="css/style.css">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-HBEVFQFD8Q"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
    'analytics_storage': 'denied'
  });
  gtag('js', new Date());

  gtag('config', 'G-HBEVFQFD8Q');
</script>
</head>
<body class="page-register">

     <a class="link-back" href="index.php">Regresar a la Tienda</a>
   

    <div class="form-container">
        <div class="form-header">
            <h1 id="form-title">Crea tu cuenta</h1>
            <p id="form-subtitle">Paso <span id="current-step-indicator">1</span> de 5</p>
        </div>

        <div class="form-content">
            <form id="register-form" novalidate>
                <div id="form-message" class="form-message"></div>

                <div class="form-step active" data-step="1">
                    <div class="form-group floating-label"><input type="text" id="nombre" name="nombre" required placeholder=" "><label for="nombre">Nombre <span class="required">*</span></label></div>
                    <div class="form-group floating-label"><input type="text" id="apellido" name="apellido" placeholder=" "><label for="apellido">Apellido (Opcional)</label></div>
                    <div class="form-group floating-label">
                        <input type="tel" id="telefono" name="telefono" required placeholder=" ">
                        <label for="telefono">Teléfono <span class="required">*</span></label>
                        <div id="phone-availability" class="form-message"></div>
                    </div>
                </div>

                <div class="form-step" data-step="2">
                    <div class="form-group floating-label">
                        <input type="text" id="nombre_usuario" name="nombre_usuario" required placeholder=" ">
                        <label for="nombre_usuario">Nombre de Usuario <span class="required">*</span></label>
                        <div id="username-availability" class="form-message"></div>
                    </div>
                    <div class="form-group floating-label"><input type="password" id="password" name="password" required placeholder=" "><label for="password">Contraseña <span class="required">*</span></label></div>
                    <div class="form-group floating-label"><input type="password" id="password_confirm" name="password_confirm" required placeholder=" "><label for="password_confirm">Confirmar Contraseña <span class="required">*</span></label></div>
                </div>

                <div class="form-step" data-step="3">
                    <h2>¿Eres estudiante?</h2>
                    <p>Al confirmar, podrías acceder a beneficios especiales.</p>
                    <div class="choice-buttons">
                        <button type="button" class="btn-choice" data-student-choice="yes">Sí</button>
                        <button type="button" class="btn-choice" data-student-choice="no">No</button>
                    </div>
                    <input type="hidden" name="is_student_check" id="is_student_check" value="0">
                </div>

                <div class="form-step" data-step="4">
                    <h2>Información de Estudiante</h2>
                    <div class="form-group floating-label"><input type="text" id="institucion" name="institucion" placeholder=" "><label for="institucion">Institución Educativa <span class="required">*</span></label></div>
                    <div class="form-group floating-label"><input type="text" id="grado_actual" name="grado_actual" placeholder=" "><label for="grado_actual">Grado Actual <span class="required">*</span></label></div>
                </div>

                <div class="form-step" data-step="5">
                    <div class="form-group floating-label">
                        <input type="email" id="email" name="email" required placeholder=" ">
                        <label for="email">Correo <span class="required">*</span></label>
                        <div id="email-availability" class="form-message"></div>
                    </div>
                    <?php if (!empty($departments)): ?>
                    <fieldset class="form-group">
                        <legend>Quiero recibir ofertas de:</legend>
                        <div class="checkbox-group">
                            <input type="checkbox" id="select_all_prefs" name="preferencias[]" value="all">
                            <label for="select_all_prefs">Seleccionar Todos</label>
                            <?php foreach ($departments as $dept): ?>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="dept_<?php echo $dept['id_departamento']; ?>" name="preferencias[]" value="<?php echo $dept['id_departamento']; ?>">
                                    <label for="dept_<?php echo $dept['id_departamento']; ?>"><?php echo htmlspecialchars($dept['departamento']); ?></label>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </fieldset>
                    <?php endif; ?>
                </div>
                
                <input type="hidden" id="id_tipo_cliente" name="id_tipo_cliente" value="1">
            </form>
            
            <div class="form-navigation">
                <button type="button" id="btn-prev">Atrás</button>
                <button type="button" id="btn-next">Siguiente</button>
            </div>
            
            <div id="success-container" style="display:none;"></div>
            <p class="form-footer-link">¿Ya tienes una cuenta? <a href="login.php">Inicia Sesión</a></p>
        </div>
    </div>

    <div id="notification-container" class="notification-container"></div>
    <script type="module" src="js/register.js"></script>
</body>
</html>