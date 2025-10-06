<?php
// terminos-y-condiciones.php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$page_type = 'simplified'; // Usa el header simplificado
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Términos y Condiciones - Variedades 10 y 15</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="shortcut icon" href="img/favicon.png">
</head>
<body class="page-legal">

    <?php include 'includes/header.php'; ?>

    <main class="legal-container">
        <h1>Términos y Condiciones</h1>
        <p><strong>Última actualización:</strong> 5 de Septiembre de 2025</p>

        <p>Bienvenido/a a Variedades 10 y 15. Al utilizar nuestro sitio web, usted acepta los siguientes términos y condiciones. Le pedimos que los lea atentamente.</p>

        <h2>1. Naturaleza del Sitio Web</h2>
        <p>Este sitio web funciona como un catálogo digital interactivo. Su propósito es permitir a los usuarios explorar nuestros productos y generar una lista de pedido. Es importante aclarar que <strong>el proceso en este sitio no constituye una compra en línea ni una transacción electrónica de pago</strong>, con la excepción del uso del saldo de la Tarjeta Recargable (ver sección aparte).</p>

        <h2>2. Proceso de Pedido</h2>
        <ol>
            <li><strong>Selección:</strong> Usted puede navegar por las categorías y agregar productos a su "Lista" o "Carrito".</li>
            <li><strong>Confirmación:</strong> Al finalizar, usted enviará su lista de pedido a nuestro número de WhatsApp para que podamos procesarla.</li>
            <li><strong>Pago y Retiro:</strong> El pago final y la entrega de los productos se realizarán exclusivamente en nuestra tienda física.</li>
        </ol>

        <h2>3. Disponibilidad de Productos y Precios</h2>
        <ul>
            <li>Los precios y la disponibilidad de los productos mostrados en este sitio web están sujetos a cambios sin previo aviso.</li>
            <li>La inclusión de un producto en su lista de pedido <strong>no garantiza su existencia en stock ni reserva el mismo</strong>. La disponibilidad se confirmará al momento de su visita a nuestra tienda.</li>
        </ul>

        <h2>4. Entrega de Productos</h2>
        <ul>
            <li>Por el momento, <strong>no ofrecemos servicio a domicilio</strong>. Todos los pedidos deben ser retirados personalmente en nuestra sucursal.</li>
            <li>Cualquier acuerdo de entrega especial deberá ser tratado directamente con nosotros a través de nuestros canales de contacto y estará sujeto a nuestras capacidades y condiciones en ese momento.</li>
        </ul>

        <h2>5. Modificaciones a los Términos</h2>
        <p>Nos reservamos el derecho de modificar estos términos y condiciones en cualquier momento. Cualquier cambio será efectivo inmediatamente después de su publicación en este sitio web.</p>
    </main>

    <?php include 'includes/footer.php'; ?>

</body>
</html>