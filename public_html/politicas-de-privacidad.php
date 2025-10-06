<?php
// politicas-de-privacidad.php
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
    <title>Políticas de Privacidad - Variedades 10 y 15</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="shortcut icon" href="img/favicon.png">
</head>
<body class="page-legal">

    <?php include 'includes/header.php'; ?>

    <main class="legal-container">
        <h1>Políticas de Privacidad</h1>
        <p><strong>Última actualización:</strong> 5 de Septiembre de 2025</p>
        <p>En Variedades 10 y 15, respetamos su privacidad y nos comprometemos a proteger sus datos personales.</p>

        <h2>1. Información que Recopilamos</h2>
        <p>Para crear una cuenta y ofrecer un servicio personalizado, recopilamos los siguientes datos:</p>
        <ul>
            <li>Nombre y Apellido.</li>
            <li>Número de teléfono de contacto.</li>
            <li>Correo electrónico.</li>
            <li>Preferencias sobre categorías de productos para recibir ofertas.</li>
        </ul>

        <h2>2. Uso de la Información</h2>
        <p>La información recopilada se utiliza con los siguientes fines:</p>
        <ul>
            <li>Crear y gestionar su cuenta de usuario.</li>
            <li>Contactarle para coordinar la preparación y entrega de sus pedidos.</li>
            <li>Enviarle ofertas, promociones y noticias personalizadas según las preferencias que usted haya indicado.</li>
        </ul>

        <h2>3. Protección de Datos</h2>
        <p>No compartimos ni vendemos su información personal a terceros.</p>

        <h2>4. Cambios a Futuro</h2>
        <p>Nuestras prácticas de recopilación de datos pueden cambiar para mejorar nuestros servicios. Cualquier modificación a esta política de privacidad será publicada en esta página.</p>
    </main>

    <?php include 'includes/footer.php'; ?>

</body>
</html>