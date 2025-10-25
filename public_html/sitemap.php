<?php
// DEBE ser el primer carácter - SIN espacios ni saltos de línea antes
ob_start();

// 1. Validar acceso solo a sitemap.php directo
if (basename($_SERVER['PHP_SELF']) !== 'sitemap.php') {
    http_response_code(403);
    die('Forbidden');
}

// 2. Validar método GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    die('Method Not Allowed');
}

// 3. Prevenir inclusión remota y ataques de ruta
if (strpos($_SERVER['REQUEST_URI'], '..') !== false || strpos($_SERVER['REQUEST_URI'], '//') !== false) {
    http_response_code(400);
    die('Bad Request');
}

// 4. Limpiar buffer antes de incluir config
while (ob_get_level() > 1) {
    ob_end_clean();
}
ob_clean();

// 5. Conexión a la Base de Datos
require_once __DIR__ . '/../config/config.php';

// 5.1 Limpiar cualquier output que haya dejado config.php
if (ob_get_level() > 0) {
    $output = ob_get_clean();
    if (!empty(trim($output))) {
        error_log("SITEMAP WARNING: config.php imprimió: " . substr($output, 0, 200));
    }
    ob_start(); // Reiniciar buffer
}

// 6. Validar que $pdo existe
if (!isset($pdo) || !($pdo instanceof PDO)) {
    http_response_code(500);
    error_log("SITEMAP ERROR: PDO no está disponible");
    die('Internal Server Error');
}

// 7. Definir la URL Base de forma segura
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = preg_replace('/[^a-zA-Z0-9.-]/', '', $_SERVER['HTTP_HOST']);
$path = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
$base_url = "{$protocol}://{$host}{$path}/";

// 8. Validar URL base
if (!filter_var($base_url, FILTER_VALIDATE_URL)) {
    http_response_code(500);
    error_log("SITEMAP ERROR: URL base inválida: {$base_url}");
    die('Internal Server Error');
}

// 9. Establecer headers de seguridad
header("Content-Type: application/xml; charset=utf-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Cache-Control: public, max-age=86400"); // Cachear por 1 día

// 10. Iniciar el XML
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

/**
 * Función para generar una entrada <url> del sitemap de forma segura
 * @param string $url La URL completa
 * @param string $priority La prioridad (0.1 a 1.0)
 */
function generateUrlEntry($url, $priority = '0.80') {
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        error_log("SITEMAP WARNING: URL inválida: {$url}");
        return;
    }
    $priority = floatval($priority);
    if ($priority < 0 || $priority > 1) {
        $priority = 0.80;
    }
    echo "    <url>\n";
    echo "        <loc>" . htmlspecialchars($url, ENT_XML1, 'UTF-8') . "</loc>\n";
    echo "        <priority>" . number_format($priority, 2) . "</priority>\n";
    echo "    </url>\n";
}

// 11. Agregar Páginas Estáticas
$static_pages = [
    "",
    "ofertas",
    "terminos-y-condiciones.php", // Corregido para usar .php
    "politicas-de-privacidad.php",
    "politicas-de-reembolso.php",
    "terminos-de-uso.php"
];

foreach ($static_pages as $page) {
    // No es necesario sanitizar aquí si la lista es estática y controlada por ti
    generateUrlEntry($base_url . $page, '1.00');
}

// 12. Agregar Páginas Dinámicas desde la Base de Datos
try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // --- PRODUCTOS (SOLO CON IMAGEN, ACTIVOS O AGOTADOS) ---
    // Contar TODOS los productos con imagen (activos + agotados)
    $stmt_count_all = $pdo->prepare("
        SELECT COUNT(*) as total FROM productos
        WHERE slug IS NOT NULL 
        AND slug != ''
        AND url_imagen IS NOT NULL 
        AND url_imagen != ''
        AND (estado = 1 OR estado = 4) -- ▼▼▼ LÓGICA CORREGIDA ▼▼▼
    ");
    $stmt_count_all->execute();
    $count_all = $stmt_count_all->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Contar activos con imagen
    $stmt_count_active = $pdo->prepare("
        SELECT COUNT(*) as total FROM productos
        WHERE slug IS NOT NULL 
        AND slug != ''
        AND url_imagen IS NOT NULL 
        AND url_imagen != ''
        AND estado = 1 -- 1 = Activo
    ");
    $stmt_count_active->execute();
    $count_active = $stmt_count_active->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Contar agotados con imagen
    $stmt_count_sold = $pdo->prepare("
        SELECT COUNT(*) as total FROM productos
        WHERE slug IS NOT NULL 
        AND slug != ''
        AND url_imagen IS NOT NULL 
        AND url_imagen != ''
        AND estado = 4 -- 4 = Agotado
    ");
    $stmt_count_sold->execute();
    $count_sold = $stmt_count_sold->fetch(PDO::FETCH_ASSOC)['total'];
    
	error_log("SITEMAP: {$count_all} productos con imagen (Activos: {$count_active} | Agotados: {$count_sold})");
    
    // Mostrar en XML comment para ver en navegador
    // ▼▼▼ ✅ ¡ASÍ DEBE VERSE! ▼▼▼
	echo "    \n";    
    // Agregar productos activos y agotados
    // ▼▼▼ ¡AQUÍ ESTÁ LA CORRECCIÓN! (estado IN (1, 4)) ▼▼▼
    $stmt_products = $pdo->prepare("
        SELECT slug FROM productos
        WHERE slug IS NOT NULL 
        AND slug != ''
        AND url_imagen IS NOT NULL 
        AND url_imagen != ''
        AND estado IN (1, 4) -- 1=Activo, 4=Agotado
        LIMIT 50000
    ");
    $stmt_products->execute();
    // --- LÍNEA NUEVA SOLICITADA ---
    $product_count = $stmt_products->rowCount();
    echo "    \n";
    // --- FIN DE LÍNEA NUEVA ---
    while ($row = $stmt_products->fetch(PDO::FETCH_ASSOC)) {
        $slug = preg_replace('/[^a-zA-Z0-9\-_]/', '', $row['slug']);
        if (!empty($slug)) {
            generateUrlEntry($base_url . "producto/" . $slug, '0.80');
        }
    }

    // --- DEPARTAMENTOS ---
    $stmt_depts = $pdo->prepare("
        SELECT slug FROM departamentos 
        WHERE slug IS NOT NULL 
        AND slug != ''
        LIMIT 10000
    ");
    $stmt_depts->execute();
    
    while ($row = $stmt_depts->fetch(PDO::FETCH_ASSOC)) {
        $slug = preg_replace('/[^a-zA-Z0-9\-_]/', '', $row['slug']);
        if (!empty($slug)) {
            generateUrlEntry($base_url . "departamento/" . $slug, '0.90');
        }
    }

    // --- MARCAS ---
    $stmt_brands = $pdo->prepare("
        SELECT slug FROM marcas 
        WHERE slug IS NOT NULL 
        AND slug != ''
        LIMIT 5000
    ");
    $stmt_brands->execute();
    
    while ($row = $stmt_brands->fetch(PDO::FETCH_ASSOC)) {
        $slug = preg_replace('/[^a-zA-Z0-9\-_]/', '', $row['slug']);
        if (!empty($slug)) {
            // ▼▼▼ LÓGICA CORREGIDA ▼▼▼
            // Tu htaccess dice que las marcas van en la raíz (ej: /starmate)
            generateUrlEntry($base_url . $slug, '0.70');
        }
    }

    // --- ETIQUETAS ---
    $stmt_tags = $pdo->prepare("
        SELECT nombre_etiqueta FROM etiquetas 
        WHERE nombre_etiqueta IS NOT NULL 
        AND nombre_etiqueta != ''
        LIMIT 5000
    ");
    $stmt_tags->execute();
    
    while ($row = $stmt_tags->fetch(PDO::FETCH_ASSOC)) {
        $tag = preg_replace('/[^a-zA-Z0-9\-_]/', '', $row['nombre_etiqueta']);
        if (!empty($tag)) {
            generateUrlEntry($base_url . "etiqueta/" . $tag, '0.60');
        }
    }

} catch (PDOException $e) {
    error_log("SITEMAP DATABASE ERROR: " . $e->getMessage());
    http_response_code(500);
    die('');
} catch (Exception $e) {
    error_log("SITEMAP ERROR: " . $e->getMessage());
    http_response_code(500);
    die('');
}

// 13. Cerrar el XML
echo '</urlset>' . "\n";

// 14. Vaciar el buffer
ob_end_flush();
// No debe haber NADA después de esta línea
?>