<?php
// politicas-de-reembolso.php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$page_type = 'simplified';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <?php
// Determina la ruta base automáticamente
$base_path = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\') . '/';
?>
<base href="<?php echo $base_path; ?>">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Políticas de Reembolso - Variedades 10 y 15</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="shortcut icon" href="img/favicon.png">
</head>
<body class="page-legal">

    <?php include 'includes/header.php'; ?>

    <main class="legal-container">
        <h1>Políticas de Reembolso y Devoluciones</h1>
        <p><strong>Última actualización:</strong> 5 de Septiembre de 2025</p>

        <h2>1. Revisión del Producto</h2>
        <p>Es responsabilidad del cliente revisar el estado de todos los productos al momento de recibirlos en nuestra tienda.</p>

        <h2>2. Devoluciones por Defectos de Fábrica</h2>
        <ul>
            <li>Aceptamos devoluciones únicamente por defectos de fabricación comprobables.</li>
            <li>El producto debe ser devuelto en su empaque original y sin muestras de mal uso.</li>
        </ul>

        <h2>3. Exclusiones</h2>
        <p>No se realizarán reembolsos ni devoluciones en los siguientes casos:</p>
        <ul>
            <li>Si el producto presenta daños causados por mal uso, negligencia, accidentes (como golpes o caídas) o desgaste normal.</li>
            <li>Si el producto fue alterado o reparado por personas no autorizadas.</li>
            <li>Por insatisfacción con el producto si este se encuentra en perfectas condiciones funcionales y estéticas.</li>
        </ul>
    </main>

    <?php include 'includes/footer.php'; ?>

</body>
</html>