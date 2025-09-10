<?php
// finalizar_compra.php (Versión Corregida)

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['id_cliente'])) {
    header('Location: login.php');
    exit;
}

require_once __DIR__ . '/../config/config.php';

$id_tienda_web = 1; // ID de la tienda para la web

$client_id = (int)$_SESSION['id_cliente'];
$cart_items = [];
$total = 0;
$cliente_nombre = 'No disponible';
$cliente_telefono = 'No disponible';
$stock_ajustes = []; 

$tarjeta_cliente = null;
$puede_pagar_con_tarjeta = false;

try {
    // Obtener datos del cliente
    $stmt_cliente = $pdo->prepare("SELECT nombre_usuario, telefono FROM clientes WHERE id_cliente = :client_id");
    $stmt_cliente->execute([':client_id' => $client_id]);
    $cliente = $stmt_cliente->fetch(PDO::FETCH_ASSOC);

    if ($cliente) {
        $cliente_nombre = $cliente['nombre_usuario'];
        $cliente_telefono = $cliente['telefono'];
    }

    // Obtener carrito
    $stmt_cart = $pdo->prepare("SELECT id_carrito FROM carritos_compra WHERE id_cliente = :client_id AND estado_id = 1");
    $stmt_cart->execute([':client_id' => $client_id]);
    $cart_id = $stmt_cart->fetchColumn();

    if ($cart_id) {
        // --- INICIO: VERIFICACIÓN Y AJUSTE DE STOCK ---
        $stmt_items_check = $pdo->prepare(
            "SELECT dc.id_detalle_carrito, p.id_producto, dc.cantidad, p.nombre_producto, p.usa_inventario, inv.stock
             FROM detalle_carrito dc
             JOIN productos p ON dc.id_producto = p.id_producto
             LEFT JOIN inventario_tienda inv ON p.id_producto = inv.id_producto AND inv.id_tienda = :id_tienda
             WHERE dc.id_carrito = :cart_id"
        );
        $stmt_items_check->execute([':cart_id' => $cart_id, ':id_tienda' => $id_tienda_web]);
        $items_a_verificar = $stmt_items_check->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items_a_verificar as $item) {
            if ($item['usa_inventario']) {
                $stock_disponible = $item['stock'] ?? 0;
                if ($item['cantidad'] > $stock_disponible) {
                    $cantidad_ajustada = max(0, $stock_disponible);
                    
                    $nombre_prod = htmlspecialchars($item['nombre_producto']);
                    if ($cantidad_ajustada > 0) {
                        $stock_ajustes[] = "La cantidad de '{$nombre_prod}' se ajustó a {$cantidad_ajustada} unidades por falta de stock en tienda.";
                        $stmt_update = $pdo->prepare("UPDATE detalle_carrito SET cantidad = :cantidad WHERE id_detalle_carrito = :id_detalle");
                        $stmt_update->execute([':cantidad' => $cantidad_ajustada, ':id_detalle' => $item['id_detalle_carrito']]);
                    } else {
                        $stock_ajustes[] = "'{$nombre_prod}' fue eliminado de tu carrito por falta de stock en la tienda.";
                        $stmt_delete = $pdo->prepare("DELETE FROM detalle_carrito WHERE id_detalle_carrito = :id_detalle");
                        $stmt_delete->execute([':id_detalle' => $item['id_detalle_carrito']]);
                    }
                }
            }
        }
        // --- FIN: VERIFICACIÓN Y AJUSTE DE STOCK ---

        // Recalcular carrito y total después de ajustes
        $stmt_items = $pdo->prepare(
            "SELECT p.nombre_producto, dc.cantidad, (dc.cantidad * dc.precio_unitario) as subtotal
             FROM detalle_carrito dc
             JOIN productos p ON dc.id_producto = p.id_producto
             WHERE dc.id_carrito = :cart_id"
        );
        $stmt_items->execute([':cart_id' => $cart_id]);
        $cart_items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        $total = 0;
        foreach ($cart_items as $item) {
            $total += $item['subtotal'];
        }
    }
    
    // Si el carrito está vacío (incluso después de los ajustes), no hay necesidad de verificar la tarjeta.
    if (!empty($cart_items)) {
        // --- VERIFICAR TARJETA Y SALDO ---
        $stmt_card = $pdo->prepare("SELECT id_tarjeta, numero_tarjeta, saldo FROM tarjetas_recargables WHERE id_cliente = ? AND estado_id = 1 LIMIT 1");
        $stmt_card->execute([$client_id]);
        $tarjeta_cliente = $stmt_card->fetch(PDO::FETCH_ASSOC);

        if ($tarjeta_cliente && $tarjeta_cliente['saldo'] >= $total) {
            $puede_pagar_con_tarjeta = true;
        }

        // Lógica para el mensaje de WhatsApp
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
    }

} catch (Exception $e) {
    $error_message = "Error al cargar el carrito: " . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finalizar Compra</title>
    <link rel="stylesheet" href="css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <!-- Google tag (gtag.js) -->
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
<body class="page-checkout"> 
    <?php include 'includes/header.php'; ?>

    <div class="summary-container">
        <div class="summary-main">
            <div class="summary-header">
                <h1>Resumen de tu Pedido</h1>
            </div>

            <?php if (!empty($stock_ajustes)): ?>
                <div class="stock-notification" style="background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                    <h4 style="margin-top: 0;">¡Aviso de Stock!</h4>
                    <ul style="padding-left: 20px; margin-bottom: 0;">
                        <?php foreach ($stock_ajustes as $mensaje): ?>
                            <li><?php echo $mensaje; ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

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