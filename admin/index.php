<?php
session_start();

if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true || !isset($_SESSION['rol'])) {
   header("Location: login-form.php"); 
   exit();
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link rel="shortcut icon" href="img/favicon.png">    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="css/styles.css">


</head>
<body>
    <div class="dashboard-layout">
        
        <?php include 'includes/_sidemenu.php'; ?>

        <main class="dashboard-main">
            <?php include 'includes/_header.php'; ?>
            
            <div id="main-content" class="dashboard-content">
                </div>
        </main>
    </div>
     
    <div id="department-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Cambiar Departamento</h3>
                <button class="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p>Selecciona el nuevo departamento para los productos marcados:</p>
                <select id="modal-department-selector" class="modal-select">
                    <option value="">Cargando departamentos...</option>
                </select>
                <div id="modal-error-message" class="modal-error"></div>
            </div>
            <div class="modal-footer">
                <button id="modal-cancel-btn" class="modal-btn modal-btn-secondary">Cancelar</button>
                <button id="modal-confirm-btn" class="modal-btn modal-btn-primary">Confirmar Cambio</button>
            </div>
        </div>
    </div>

    <div id="image-gallery-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h3>Galería de Imágenes</h3>
                <button class="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="gallery-tabs">
                    <button class="gallery-tab-btn active" data-tab="select">Seleccionar Existente</button>
                    <button class="gallery-tab-btn" data-tab="upload">Subir Nueva</button>
                </div>
                <div id="gallery-select-tab" class="gallery-tab-content active">
                    <div class="image-grid-container"></div>
                </div>
                <div id="gallery-upload-tab" class="gallery-tab-content">
                    <p>Sube una nueva imagen al bucket. Se añadirá a la galería para usos futuros.</p>
                    <input type="file" id="gallery-upload-input" name="url_imagen" accept="image/*">
                    <button id="gallery-upload-btn" class="modal-btn modal-btn-primary">Subir Imagen</button>
                    <div id="gallery-upload-feedback"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="gallery-cancel-btn" class="modal-btn modal-btn-secondary">Cancelar</button>
                <button id="gallery-confirm-btn" class="modal-btn modal-btn-primary" disabled>Confirmar Selección</button>
            </div>
        </div>
    </div>

    <script>


        
        // Esta variable global le informa a admin.js el rol del usuario actual.
        const USER_ROLE = '<?php echo $_SESSION['rol'] ?? "empleado"; ?>';
    </script>
    <script src="js/pos.js"></script>
    <script type="module" src="js/admin.js"></script>
</body>
</html>