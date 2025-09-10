<?php
// public_html/includes/og_meta_handler.php

// Asegurarse de que la sesión esté iniciada y la configuración de la base de datos cargada.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../../config/config.php';

// --- LÓGICA CENTRALIZADA PARA METAETIQUETAS OPEN GRAPH ---

// 1. Valores por defecto para las metaetiquetas
$og_title = "Variedades 10 y 15";
$og_description = "Busca en la variedad de productos disponibles, lo que buscas en un solo lugar.";
// Construye una URL base segura para la imagen por defecto
$base_url = "https://" . $_SERVER['HTTP_HOST'] . dirname(dirname($_SERVER['PHP_SELF']));
$og_image = $base_url . '/img/logo.png';
$og_url = "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
$og_price_amount = '';
$og_price_currency = 'USD';

// 2. Si se comparte un producto específico, obtenemos sus datos
if (isset($_GET['product_id']) && is_numeric($_GET['product_id'])) {
    $product_id = (int)$_GET['product_id'];
    
    $is_user_logged_in = isset($_SESSION['id_cliente']);
    $client_type_id = null;

    if ($is_user_logged_in) {
        $stmt_client_type = $pdo->prepare("SELECT id_tipo_cliente FROM clientes WHERE id_cliente = :id");
        $stmt_client_type->execute([':id' => (int)$_SESSION['id_cliente']]);
        $client_type_id = $stmt_client_type->fetchColumn();
    }

    $stmt_product = $pdo->prepare("SELECT * FROM productos WHERE id_producto = :id");
    $stmt_product->execute([':id' => $product_id]);
    $product = $stmt_product->fetch(PDO::FETCH_ASSOC);

    if ($product) {
        $og_title = $product['nombre_producto'] . " - Variedades 10 y 15";
        $og_description = "Encuentra '" . htmlspecialchars($product['nombre_producto']) . "' y mucho más en nuestra tienda.";
        if (!empty($product['url_imagen'])) {
            $og_image = htmlspecialchars($product['url_imagen']);
        }

        // Lógica de precios para Open Graph (respetando la configuración de la tienda)
        $layout_config_path = __DIR__ . '/../../config/layout_config.php';
        if (file_exists($layout_config_path)) {
            $layout_settings = include($layout_config_path);

            if ($layout_settings['show_product_price'] && (!$layout_settings['details_for_logged_in_only'] || $is_user_logged_in)) {
                $precio_oferta = (float)$product['precio_oferta'];
                $is_offer_valid = $precio_oferta > 0 && ($product['oferta_caducidad'] === null || new DateTime() < new DateTime($product['oferta_caducidad']));
                
                $final_price = (float)$product['precio_venta'];

                if ($is_offer_valid) {
                    if ($product['oferta_tipo_cliente_id'] !== null) {
                        if ($product['oferta_tipo_cliente_id'] == $client_type_id) $final_price = $precio_oferta;
                    } else if ($product['oferta_exclusiva'] == 1 && $is_user_logged_in) {
                        $final_price = $precio_oferta;
                    } else if ($product['oferta_exclusiva'] == 0) {
                        $final_price = $precio_oferta;
                    }
                }
                $og_price_amount = number_format($final_price, 2);
            }
        }
    }
}
?>

<meta property="og:title" content="<?php echo htmlspecialchars($og_title); ?>" />
<meta property="og:description" content="<?php echo htmlspecialchars($og_description); ?>" />
<meta property="og:image" content="<?php echo htmlspecialchars($og_image); ?>" />
<meta property="og:url" content="<?php echo htmlspecialchars($og_url); ?>" />
<meta property="og:type" content="<?php echo (isset($product) && $product) ? 'product' : 'website'; ?>" />
<?php if ($og_price_amount): ?>
<meta property="product:price:amount" content="<?php echo $og_price_amount; ?>" />
<meta property="product:price:currency" content="<?php echo $og_price_currency; ?>" />
<?php endif; ?>