<?php
// generate_existing_slugs.php
// Coloca este archivo en la misma carpeta raíz que tu index.php principal (API)

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
set_time_limit(300); // Aumenta el tiempo de ejecución si tienes muchas etiquetas

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/api/index.php'; // Incluye tu API principal para acceder a la función generateUniqueSlug y la conexión $pdo

echo "<h1>Generando slugs para etiquetas existentes...</h1>";
echo "<pre>"; // Para mostrar la salida de forma más legible

if (!isset($pdo)) {
    die("ERROR: No se pudo establecer la conexión a la base de datos. Verifica config/config.php.");
}

if (!function_exists('generateUniqueSlug')) {
    die("ERROR: La función generateUniqueSlug no está definida. Asegúrate de que está en tu index.php.");
}

try {
    // 1. Seleccionar todas las etiquetas que NO tienen un slug
    $stmt_select = $pdo->prepare("SELECT id_etiqueta, nombre_etiqueta FROM etiquetas WHERE slug IS NULL OR slug = ''");
    $stmt_select->execute();
    $etiquetas_sin_slug = $stmt_select->fetchAll(PDO::FETCH_ASSOC);

    if (empty($etiquetas_sin_slug)) {
        echo "¡Excelente! Todas las etiquetas ya tienen un slug.\n";
        echo "</pre>";
        exit;
    }

    echo "Se encontraron " . count($etiquetas_sin_slug) . " etiquetas sin slug. Procesando...\n\n";

    // 2. Preparar la sentencia UPDATE
    $stmt_update = $pdo->prepare("UPDATE etiquetas SET slug = :slug WHERE id_etiqueta = :id");

    $updated_count = 0;
    $error_count = 0;

    // 3. Iterar y actualizar cada etiqueta
    foreach ($etiquetas_sin_slug as $etiqueta) {
        $id = $etiqueta['id_etiqueta'];
        $nombre = $etiqueta['nombre_etiqueta'];

        echo "Procesando ID: {$id}, Nombre: '{$nombre}' -> ";

        try {
            // Generar slug único (pasando el ID para la verificación de duplicados)
            $slug = generateUniqueSlug($nombre, $pdo, 'etiquetas', 'id_etiqueta', $id);

            // Actualizar la base de datos
            $stmt_update->execute([':slug' => $slug, ':id' => $id]);

            if ($stmt_update->rowCount() > 0) {
                echo "Slug generado y guardado: '{$slug}'\n";
                $updated_count++;
            } else {
                echo "ADVERTENCIA: No se actualizó la fila (quizás ya tenía un slug?).\n";
            }
        } catch (Exception $e) {
            echo "ERROR al generar/guardar slug: " . $e->getMessage() . "\n";
            $error_count++;
        }
    }

    echo "\n--- Proceso Finalizado ---";
    echo "\nEtiquetas actualizadas con éxito: " . $updated_count;
    if ($error_count > 0) {
        echo "\nErrores encontrados: " . $error_count;
    }

} catch (PDOException $e) {
    echo "ERROR DE BASE DE DATOS: " . $e->getMessage();
} catch (Exception $e) {
    echo "ERROR GENERAL: " . $e->getMessage();
}

echo "</pre>";

?>