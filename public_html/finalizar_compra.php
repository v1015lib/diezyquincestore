<?php
// finalizar_compra.php (Versión Integrada)

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['id_cliente'])) {
    header('Location: login.php');
    exit;
}

require_once __DIR__ . '/../config/config.php';

$client_id = (int)$_SESSION['id_cliente'];
$cart_items = [];
$total = 0;
$cliente_nombre = 'No disponible';
$cliente_telefono = 'No disponible';

// --- INICIO DE LA NUEVA LÓGICA DE TARJETA ---
$tarjeta_cliente = null;
$puede_pagar_con_tarjeta = false;
// --- FIN DE LA NUEVA LÓGICA DE TARJETA ---

try {
    // Obtener datos del cliente
    $stmt_cliente = $pdo->prepare("SELECT nombre_usuario, telefono FROM clientes WHERE id_cliente = :client_id");
    $stmt_cliente->execute([':client_id' => $client_id]);
    $cliente = $stmt_cliente->fetch(PDO::FETCH_ASSOC);

    if ($cliente) {
        $cliente_nombre = $cliente['nombre_usuario'];
        $cliente_telefono = $cliente['telefono'];
    }

    // Obtener carrito y sus productos
    $stmt_cart = $pdo->prepare("SELECT id_carrito FROM carritos_compra WHERE id_cliente = :client_id AND estado_id = 1");
    $stmt_cart->execute([':client_id' => $client_id]);
    $cart_id = $stmt_cart->fetchColumn();

    if ($cart_id) {
        $stmt_items = $pdo->prepare(
            "SELECT p.nombre_producto, dc.cantidad, (dc.cantidad * dc.precio_unitario) as subtotal
             FROM detalle_carrito dc
             JOIN productos p ON dc.id_producto = p.id_producto
             WHERE dc.id_carrito = :cart_id"
        );
        $stmt_items->execute([':cart_id' => $cart_id]);
        $cart_items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        foreach ($cart_items as $item) {
            $total += $item['subtotal'];
        }
    }

    if ($total <= 0) {
        header('Location: index.php');
        exit();
    }
    
    // --- VERIFICAR TARJETA Y SALDO (NUEVO) ---
    $stmt_card = $pdo->prepare("SELECT id_tarjeta, numero_tarjeta, saldo FROM tarjetas_recargables WHERE id_cliente = ? AND estado_id = 1 LIMIT 1");
    $stmt_card->execute([$client_id]);
    $tarjeta_cliente = $stmt_card->fetch(PDO::FETCH_ASSOC);

    if ($tarjeta_cliente && $tarjeta_cliente['saldo'] >= $total) {
        $puede_pagar_con_tarjeta = true;
    }
    // --- FIN VERIFICACIÓN ---

    // Lógica para el mensaje de WhatsApp (sin cambios)
    $whatsapp_message = "*-- DATOS DEL CLIENTE --*\n";
    $whatsapp_message .= "*ID Cliente:* " . $client_id . "\n";
    $whatsapp_message .= "*Usuario:* " . htmlspecialchars($cliente_nombre) . "\n";
    $whatsapp_message .= "*Teléfono:* " . htmlspecialchars($cliente_telefono) . "\n\n";
    $whatsapp_message .= "¡Hola! Quisiera confirmar el siguiente pedido:\n\n";
    $whatsapp_message .= "```\n";
    $ancho_cant = 5; $ancho_prod = 18; $ancho_sub = 10;
    $whatsapp_message .= str_pad("Cant.", $ancho_cant) . str_pad("Producto", $ancho_prod) . str_pad("Total", $ancho_sub, " ", STR_PAD_LEFT) . "\n";
    $whatsapp_message .= str_repeat("-", $ancho_cant + $ancho_prod + $ancho_sub) . "\n";
    foreach ($cart_items as $item) {
        $product_name = mb_strlen($item['nombre_producto']) > ($ancho_prod - 1) ? mb_substr($item['nombre_producto'], 0, $ancho_prod - 4) . "..." : $item['nombre_producto'];
        $whatsapp_message .= str_pad("x" . $item['cantidad'], $ancho_cant) . str_pad($product_name, $ancho_prod) . str_pad("$" . number_format($item['subtotal'], 2), $ancho_sub, " ", STR_PAD_LEFT) . "\n";
    }
    $whatsapp_message .= str_repeat("-", $ancho_cant + $ancho_prod + $ancho_sub) . "\n";
    $whatsapp_message .= str_pad("Total a Pagar:", $ancho_cant + $ancho_prod, " ", STR_PAD_LEFT) . str_pad("$" . number_format($total, 2), $ancho_sub, " ", STR_PAD_LEFT) . "\n";
    $whatsapp_message .= "```\n\n_Gracias por su compra._";
    $whatsapp_number = "50368345121";
    $whatsapp_url = "https://wa.me/" . $whatsapp_number . "?text=" . urlencode($whatsapp_message);

} catch (Exception $e) {
    $error_message = "Error al cargar el carrito: " . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finalizar Compra</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="page-checkout"> 
    <?php include 'includes/header.php'; ?>

    <div class="summary-container">
        <div class="summary-main">
            <div class="summary-header">
                <h1>Resumen de tu Pedido</h1>
            </div>

            <?php if (!empty($cart_items)): ?>
                <div class="summary-table-container">
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th class="col-product">Producto</th>
                                <th class="col-quantity">Cantidad</th>
                                <th class="col-subtotal">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($cart_items as $item): ?>
                                <tr>
                                    <td class="p_name"><?php echo htmlspecialchars($item['nombre_producto']); ?></td>
                                    <td><?php echo $item['cantidad']; ?></td>
                                    <td>$<?php echo number_format($item['subtotal'], 2); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="cart-empty-message">
                    <p>Tu carrito está vacío. <a href="index.php">Volver a la tienda</a>.</p>
                </div>
            <?php endif; ?>
        </div>

        <?php if (!empty($cart_items)): ?>
            <div class="summary-sidebar">
                <div class="summary-total">
                    <span>Total a Pagar</span>
                    <strong>$<?php echo number_format($total, 2); ?></strong>
                </div>

                <?php if ($puede_pagar_con_tarjeta): ?>
                    <div class="card-payment-option">
                        <h4>¡Paga ahora con tu saldo!</h4>
                        <p><strong>Saldo disponible:</strong> $<?php echo number_format($tarjeta_cliente['saldo'], 2); ?></p>
                        <button id="pay-with-card-btn" class="submit-btn-card">Pagar y Finalizar Pedido</button>
                    </div>
                    <div class="checkout-separator"><span>O</span></div>
                <?php endif; ?>

                <div class="default-payment-option">
                    <h4>Confirmar para Pago en Tienda</h4>
                    <p>Puedes pagar en efectivo o con otros métodos al recoger.</p>
                    <a href="<?php echo $whatsapp_url; ?>" id="send-whatsapp-btn" class="whatsapp-button" target="_blank">
                        ✔ Enviar Pedido por WhatsApp
                    </a>
                </div>
                <a href="index.php" class="cancel-button">
                    Cancelar y Volver a la Tienda
                </a>
            </div>
        <?php endif; ?>
    </div>
    
    <script type="module" src="js/checkout.js"></script>
</body>
</html>