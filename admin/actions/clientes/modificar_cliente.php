<?php
session_start();

// --- Bloque de Seguridad Actualizado ---
// Ahora, este bloque solo verifica que el usuario haya iniciado sesión correctamente,
// sin importar si es administrador o empleado.
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true || !isset($_SESSION['rol'])) {
   header("Location: ../../login-form.php"); 
   exit();
}

// Se ha eliminado la línea "if ($_SESSION['rol'] != 'administrador')".
// La lógica de permisos ahora se delega completamente al menú lateral (_sidemenu.php).

?>
<div class="form-container" id="modify-customer-wrapper">
    
    <div id="customer-search-container">
        <h3>Modificar un Cliente</h3>
        <p>Haz clic en el botón "Editar" en la lista de clientes para cargar sus datos aquí.</p>
    </div>

    <div id="edit-customer-container" class="hidden">
        </div>

</div>