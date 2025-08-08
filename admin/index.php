<?php
session_start();

// --- Bloque de Seguridad (Comentado para desarrollo) ---
//if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true || !isset($_SESSION['rol'])) {
//    // Asumiendo que el login está en la raíz del dominio principal
//    header("Location: ../login.php"); 
//    exit();
//}
//if ($_SESSION['rol'] != 'administrador') { 
//    die('Acceso denegado. Se requieren permisos de administrador.');
//}
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
    
    <script type="module" src="js/admin.js"></script>
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
</body>
</html>