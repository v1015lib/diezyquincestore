<?php
// test_anuncios.php - Script de prueba para verificar la funcionalidad de anuncios

require_once __DIR__ . '/config/config.php';

echo "<h2>Prueba de Anuncios Web</h2>";

try {
    // Probar conexión a la base de datos
    echo "<h3>1. Conexión a la base de datos:</h3>";
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM anuncios_web");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Conexión exitosa. Total de anuncios en BD: " . $result['total'] . "<br>";

    // Mostrar anuncios existentes
    echo "<h3>2. Anuncios existentes:</h3>";
    $stmt = $pdo->query("SELECT * FROM anuncios_web ORDER BY tipo, orden");
    $anuncios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($anuncios)) {
        echo "❌ No hay anuncios en la base de datos<br>";
    } else {
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>ID</th><th>Título</th><th>Tipo</th><th>Orden</th><th>Activo</th><th>URL Imagen</th></tr>";
        foreach ($anuncios as $anuncio) {
            echo "<tr>";
            echo "<td>" . $anuncio['id_anuncio'] . "</td>";
            echo "<td>" . htmlspecialchars($anuncio['titulo']) . "</td>";
            echo "<td>" . $anuncio['tipo'] . "</td>";
            echo "<td>" . $anuncio['orden'] . "</td>";
            echo "<td>" . ($anuncio['activo'] ? 'Sí' : 'No') . "</td>";
            echo "<td><a href='" . htmlspecialchars($anuncio['url_imagen']) . "' target='_blank'>Ver imagen</a></td>";
            echo "</tr>";
        }
        echo "</table>";
    }

    // Probar consultas específicas
    echo "<h3>3. Anuncios del carrusel principal:</h3>";
    $stmt = $pdo->prepare("SELECT * FROM anuncios_web WHERE tipo = 'slider_principal' AND activo = 1 ORDER BY orden ASC");
    $stmt->execute();
    $slider_ads = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($slider_ads)) {
        echo "❌ No hay anuncios activos para el carrusel principal<br>";
    } else {
        echo "✅ Encontrados " . count($slider_ads) . " anuncios para el carrusel<br>";
        foreach ($slider_ads as $ad) {
            echo "- " . htmlspecialchars($ad['titulo']) . " (Orden: " . $ad['orden'] . ")<br>";
        }
    }

    echo "<h3>4. Anuncios de la columna derecha:</h3>";
    $stmt = $pdo->prepare("SELECT * FROM anuncios_web WHERE tipo = 'columna_derecha' AND activo = 1 ORDER BY orden ASC");
    $stmt->execute();
    $sidebar_ads = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($sidebar_ads)) {
        echo "❌ No hay anuncios activos para la columna derecha<br>";
    } else {
        echo "✅ Encontrados " . count($sidebar_ads) . " anuncios para la columna derecha<br>";
        foreach ($sidebar_ads as $ad) {
            echo "- " . htmlspecialchars($ad['titulo']) . " (Orden: " . $ad['orden'] . ")<br>";
        }
    }

    echo "<h3>5. Prueba de la API:</h3>";
    echo "Para probar la API, puedes usar estas URLs:<br>";
    echo "- <a href='api/anuncios_web.php' target='_blank'>GET: Obtener todos los anuncios</a><br>";
    echo "- <a href='api/anuncios_web.php?tipo=slider_principal' target='_blank'>GET: Anuncios del carrusel</a><br>";
    echo "- <a href='api/anuncios_web.php?tipo=columna_derecha' target='_blank'>GET: Anuncios de columna</a><br>";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
}

echo "<h3>6. Instrucciones:</h3>";
echo "<ol>";
echo "<li>Ve al admin panel: <a href='admin/' target='_blank'>admin/</a></li>";
echo "<li>Navega a 'Web Admin' → 'Anuncios Web'</li>";
echo "<li>Agrega nuevos anuncios usando el formulario</li>";
echo "<li>Los anuncios aparecerán automáticamente en la página principal</li>";
echo "</ol>";
?>
