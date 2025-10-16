<?php
// public_html/includes/og_meta_handler.php (VERSIÓN CORREGIDA Y FINAL)

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../../config/config.php';

// --- LÓGICA MEJORADA PARA METAETIQUETAS OPEN GRAPH ---

// 1. Valores por defecto
$og_title = "Variedades 10 y 15";
$og_description = "Busca en la variedad de productos disponibles, lo que buscas en un solo lugar.";
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
$base_url = $protocol . "://" . $_SERVER['HTTP_HOST'];
$base_path = rtrim(dirname(dirname($_SERVER['PHP_SELF'])), '/\\');
$og_image = $base_url . $base_path . '/img/logoinv.png';
$og_url = $base_url . $_SERVER['REQUEST_URI'];
$og_price_amount = '';
$og_price_currency = 'USD';

$is_user_logged_in = isset($_SESSION['id_cliente']);
$client_type_id = null;
if ($is_user_logged_in) {
    $stmt_client_type = $pdo->prepare("SELECT id_tipo_cliente FROM clientes WHERE id_cliente = :id");
    $stmt_client_type->execute([':id' => (int)$_SESSION['id_cliente']]);
    $client_type_id = $stmt_client_type->fetchColumn();
}

// 2. Lógica para determinar el contenido dinámicamente (PRIORIZANDO SLUGS)

if (isset($_GET['product_slug'])) {
    // --- LÓGICA PARA PRODUCTOS (POR SLUG) ---
    $stmt_product = $pdo->prepare("SELECT * FROM productos WHERE slug = :slug LIMIT 1");
    $stmt_product->execute([':slug' => $_GET['product_slug']]);
    $product = $stmt_product->fetch(PDO::FETCH_ASSOC);

    if ($product) {
        $og_title = $product['nombre_producto'] . " - Variedades 10 y 15";
        $og_description = "Encuentra '" . htmlspecialchars($product['nombre_producto']) . "' y mucho más en nuestra tienda.";
        if (!empty($product['url_imagen'])) {
            $og_image = htmlspecialchars($product['url_imagen']);
        }
        
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

} else if (isset($_GET['department_slug'])) {
    // --- LÓGICA PARA DEPARTAMENTOS (POR SLUG) ---
    $stmt_dept = $pdo->prepare("SELECT departamento FROM departamentos WHERE slug = :slug LIMIT 1");
    $stmt_dept->execute([':slug' => $_GET['department_slug']]);
    $department_name = $stmt_dept->fetchColumn();

    if ($department_name) {
        $og_title = "Productos de " . htmlspecialchars($department_name) . " en Variedades 10 y 15";
        $og_description = "Explora nuestra selección de productos en la categoría " . htmlspecialchars($department_name) . ".";
    }

} else if (isset($_GET['ofertas']) && $_GET['ofertas'] === 'true') {
    // --- LÓGICA PARA OFERTAS ---
    $og_title = "¡Grandes Ofertas en Variedades 10 y 15!";
    $og_description = "Descubre todos nuestros productos con descuentos especiales. ¡Exclusivo online!";
    $og_image = $base_url . $base_path . '/img/add4.jpg';

} else if (isset($_GET['marca_slug'])) {
    // --- LÓGICA PARA MARCAS (POR SLUG) ---
    $stmt_marca = $pdo->prepare("SELECT id_marca, nombre_marca FROM marcas WHERE slug = :slug");
    $stmt_marca->execute([':slug' => $_GET['marca_slug']]);
    $marca = $stmt_marca->fetch(PDO::FETCH_ASSOC);
    
    if ($marca) {
        $marca_name = htmlspecialchars($marca['nombre_marca']);
        $og_title = "Línea de productos " . $marca_name . " y más solo en Variedades 10 y 15";
        $og_description = "Descubre la línea completa de productos " . $marca_name . " en Variedades 10 y 15.";

        // Construct the brand URL to search for in ads
        $brand_url = $base_url . $base_path . '/' . $_GET['marca_slug'];
        
        // Find an ad linking to this brand
        $stmt_ad = $pdo->prepare("SELECT url_imagen FROM anuncios_web WHERE url_destino LIKE :url AND estado = 1 ORDER BY orden ASC LIMIT 1");
        $stmt_ad->execute([':url' => '%' . $brand_url . '%']);
        
        if ($ad = $stmt_ad->fetch(PDO::FETCH_ASSOC)) {
            $og_image = htmlspecialchars($ad['url_imagen']);
        }

    } else {
        // Fallback if the brand slug is not found
        $marca_name = ucfirst(str_replace('-', ' ', $_GET['marca_slug']));
        $og_title = "Productos de " . $marca_name;
    }
}
// Se mantiene la lógica por ID como fallback por si alguna parte antigua del sitio aún la usa
else if (isset($_GET['product_id']) && is_numeric($_GET['product_id'])) {
    $stmt_product = $pdo->prepare("SELECT * FROM productos WHERE id_producto = :id");
    $stmt_product->execute([':id' => (int)$_GET['product_id']]);
    $product = $stmt_product->fetch(PDO::FETCH_ASSOC);
    if ($product) {
        $og_title = $product['nombre_producto'] . " - Variedades 10 y 15";
        $og_description = "Encuentra '" . htmlspecialchars($product['nombre_producto']) . "' y mucho más en nuestra tienda.";
        if (!empty($product['url_imagen'])) $og_image = htmlspecialchars($product['url_imagen']);
    }
}
?>

<meta property="og:title" content="<?php echo htmlspecialchars($og_title); ?>" />
<meta property="og:description" content="<?php echo htmlspecialchars($og_description); ?>" />
<meta property="og:image" content="<?php echo htmlspecialchars($og_image); ?>" />
<meta property="og:url" content="<?php echo htmlspecialchars($og_url); ?>" />
<meta property="og:type" content="<?php echo (isset($_GET['product_slug']) || isset($_GET['product_id'])) ? 'product' : 'website'; ?>" />
<?php if ($og_price_amount): ?>
<meta property="product:price:amount" content="<?php echo $og_price_amount; ?>" />
<meta property="product:price:currency" content="<?php echo $og_price_currency; ?>" />
<?php endif; ?>