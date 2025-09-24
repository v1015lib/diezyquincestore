<?php
// En: download_images.php

session_start();

if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    http_response_code(403);
    die('Acceso denegado.');
}

$filesToZip = json_decode($_POST['files'] ?? '[]', true);

// --- CORRECCIÓN APLICADA ---
// La ruta ahora apunta correctamente desde /api/ hacia /admin/scripts/salida_ia/
$outputDir = __DIR__ . '../scripts/salida_ia/';

if (empty($filesToZip) || !is_array($filesToZip)) {
    http_response_code(400);
    die('Error: No se seleccionaron archivos.');
}

$zip = new ZipArchive();
$zipFileName = 'imagenes_procesadas_' . date('Y-m-d_H-i-s') . '.zip';
$zipFilePath = sys_get_temp_dir() . '/' . $zipFileName;

if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    http_response_code(500);
    die('Error del servidor: No se pudo crear el archivo ZIP.');
}

foreach ($filesToZip as $fileName) {
    $filePath = realpath($outputDir . $fileName);
    if ($filePath && file_exists($filePath)) {
        $zip->addFile($filePath, $fileName);
    } else {
        // Para debugging - puedes quitar esta línea después
        error_log("Archivo no encontrado: " . $outputDir . $fileName);
    }
}
$zip->close();

if (ob_get_level()) {
    ob_end_clean();
}

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
header('Content-Length: ' . filesize($zipFilePath));
header('Pragma: no-cache');
header('Expires: 0');

readfile($zipFilePath);
unlink($zipFilePath);
exit;
?>