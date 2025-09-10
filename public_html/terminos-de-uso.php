<?php
// terminos-de-uso.php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$page_type = 'simplified';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Términos de Uso de Tarjeta Recargable - Variedades 10 y 15</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="shortcut icon" href="img/favicon.png">
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
<body class="page-legal">

    <?php include 'includes/header.php'; ?>

    <main class="legal-container">
        <h1>Términos y Condiciones de la Tarjeta Recargable</h1>
        <p><strong>Última actualización:</strong> 5 de Septiembre de 2025</p>

        <p>La Tarjeta Recargable de Variedades 10 y 15 es un método de pago anticipado para uso exclusivo en nuestros procesos.</p>

        <h2>1. Naturaleza del Pago con Saldo</h2>
        <ul>
            <li>Al elegir "Pagar y Finalizar Pedido" utilizando el saldo de su tarjeta, usted está realizando un <strong>pago anticipado</strong> por los productos de su lista.</li>
            <li>Esta acción <strong>NO constituye una reserva de inventario ni garantiza la disponibilidad</strong> de los productos. Es una forma de agilizar el proceso de pago al momento de su visita.</li>
        </ul>

        <h2>2. Proceso de Compra con Saldo</h2>
        <ol>
            <li><strong>Verificación de Saldo:</strong> Nuestro sistema verificará que su saldo sea suficiente para cubrir el monto total del pedido.</li>
            <li><strong>Deducción del Saldo:</strong> Al confirmar, el monto total será deducido de su tarjeta.</li>
            <li><strong>Retiro en Tienda:</strong> Usted deberá presentarse en nuestra tienda para retirar su pedido.</li>
        </ol>

        <h2>3. ¿Qué sucede si un producto no está disponible?</h2>
        <p>Entendemos que la disponibilidad puede variar. Si al momento de preparar su pedido en la tienda, uno o más productos pagados con su saldo no se encuentran en stock, procederemos de la siguiente manera:</p>
        <ul>
            <li><strong>Reembolso inmediato:</strong> El valor correspondiente a los productos no disponibles será <strong>reintegrado íntegramente a su Tarjeta Recargable</strong>.</li>
            <li><strong>Notificación:</strong> Le informaremos sobre los productos que no estaban disponibles.</li>
        </ul>
        <p>El objetivo de este sistema es ofrecerle comodidad, no la reserva de productos. Agradecemos su comprensión.</p>
    </main>

    <?php include 'includes/footer.php'; ?>

</body>
</html>