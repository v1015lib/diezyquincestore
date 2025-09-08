<?php
// api/download_barcodes.php

require_once __DIR__ . '/../vendor/autoload.php';

set_time_limit(120);

try {
    $codes = json_decode($_POST['codes'] ?? '[]', true);

    if (empty($codes)) {
        throw new Exception("No se proporcionaron códigos.");
    }

    $generator = new \Picqer\Barcode\BarcodeGeneratorPNG();
    $zip = new ZipArchive();
    $zipFileName = 'codigos_de_barras_' . date('Y-m-d') . '.zip';
    $zipFilePath = sys_get_temp_dir() . '/' . $zipFileName;

    if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        throw new Exception("No se pudo crear el archivo ZIP temporal.");
    }

    foreach ($codes as $code) {
        if (preg_match('/^[0-9]{13}$/', $code)) {
            
            // --- INICIO DE LA MODIFICACIÓN ---

            // 1. Generar solo la imagen de las barras como antes
            $barcodeImage = $generator->getBarcode($code, $generator::TYPE_EAN_13, 2, 60);
            $barcodeGdImage = imagecreatefromstring($barcodeImage);

            $barcodeWidth = imagesx($barcodeGdImage);
            $barcodeHeight = imagesy($barcodeGdImage);
            
            // Definir altura extra para el texto
            $textHeight = 20; 
            $newHeight = $barcodeHeight + $textHeight;

            // 2. Crear un nuevo lienzo en blanco más alto
            $finalImage = imagecreatetruecolor($barcodeWidth, $newHeight);
            
            // 3. Definir colores
            $backgroundColor = imagecolorallocate($finalImage, 255, 255, 255); // Blanco
            $textColor = imagecolorallocate($finalImage, 0, 0, 0);       // Negro
            
            // 4. Rellenar el nuevo lienzo con el fondo blanco
            imagefill($finalImage, 0, 0, $backgroundColor);
            
            // 5. Copiar la imagen del código de barras en la parte superior del nuevo lienzo
            imagecopy($finalImage, $barcodeGdImage, 0, 0, 0, 0, $barcodeWidth, $barcodeHeight);
            
            // 6. Centrar y dibujar el texto del código debajo de las barras
            $font = 4; // Usamos una fuente interna de GD (de 1 a 5)
            $textWidth = imagefontwidth($font) * strlen($code);
            $textX = ($barcodeWidth - $textWidth) / 2;
            $textY = $barcodeHeight + 5; // 5px de espacio
            imagestring($finalImage, $font, $textX, $textY, $code, $textColor);

            // 7. Capturar la imagen final (barras + texto) en una variable
            ob_start();
            imagepng($finalImage);
            $finalImageData = ob_get_clean();
            
            // 8. Añadir la imagen final al ZIP y liberar memoria
            $zip->addFromString($code . '.png', $finalImageData);
            imagedestroy($barcodeGdImage);
            imagedestroy($finalImage);

            // --- FIN DE LA MODIFICACIÓN ---
        }
    }
    $zip->close();

    // Enviar el archivo ZIP (sin cambios aquí)
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    header('Content-Length: ' . filesize($zipFilePath));
    header('Pragma: no-cache');
    header('Expires: 0');

    readfile($zipFilePath);
    unlink($zipFilePath);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    die("Error al generar el ZIP: " . $e->getMessage());
}
?>