<?php
// En: admin/api/download_images.php
session_start();
require_once __DIR__ . '/../../vendor/autoload.php';

if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    http_response_code(403);
    die('Acceso denegado.');
}

$isBucketZipRequest = isset($_POST['bucket_files']);
$isSingleFileRequest = isset($_GET['file']);

$s3Client = new Aws\S3\S3Client([
    'version' => 'latest', 'region' => 'auto',
    'endpoint' => 'https://7963f8687a4029e4f9b712e6a8418931.r2.cloudflarestorage.com',
    'credentials' => ['key' => 'c9ec80887e252cd42c4a84bfbc8daf89', 'secret' => '668fe85245509d9e6f7cbe5c0357872b59584eafaa584678fbdb5a4015f68577']
]);
$bucketName = 'libreria-web-imagenes';
$extensionMap = [
    'image/jpeg' => '.jpg',
    'image/png'  => '.png',
    'image/gif'  => '.gif',
    'image/webp' => '.webp'
];

// --- LÓGICA PARA DESCARGAR ZIP DESDE EL BUCKET ---
if ($isBucketZipRequest) {
    $filesToZip = json_decode($_POST['bucket_files'], true);
    if (empty($filesToZip)) {
        http_response_code(400); die('No se seleccionaron archivos del bucket.');
    }

    $zip = new ZipArchive();
    $zipFileName = 'bucket_images_' . date('Y-m-d') . '.zip';
    $zipFilePath = sys_get_temp_dir() . '/' . $zipFileName;

    if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        http_response_code(500); die('No se pudo crear el archivo ZIP.');
    }

    foreach ($filesToZip as $fileKey) {
        try {
            $result = $s3Client->getObject(['Bucket' => $bucketName, 'Key' => $fileKey]);
            $finalFileName = basename($fileKey);
            $contentType = $result['ContentType'];
            $fileExtension = pathinfo($finalFileName, PATHINFO_EXTENSION);

            // --- INICIO DE LA CORRECCIÓN APLICADA AL ZIP ---
            if (empty($fileExtension) && isset($extensionMap[$contentType])) {
                $finalFileName .= $extensionMap[$contentType];
            }
            // --- FIN DE LA CORRECCIÓN ---

            $zip->addFromString($finalFileName, $result['Body']);
        } catch (Exception $e) {
            error_log("No se pudo agregar al ZIP: " . $fileKey . " - " . $e->getMessage());
        }
    }
    $zip->close();

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    header('Content-Length: ' . filesize($zipFilePath));
    readfile($zipFilePath);
    unlink($zipFilePath);
    exit;
}

// --- LÓGICA PARA DESCARGAR UN SOLO ARCHIVO (YA ESTABA BIEN, PERO SE REESTRUCTURA) ---
if ($isSingleFileRequest) {
    $fileNameKey = $_GET['file'];
    if (strpos($fileNameKey, 'productos/') !== 0) {
        http_response_code(400); die('Ruta de archivo no válida.');
    }
    try {
        $result = $s3Client->getObject(['Bucket' => $bucketName, 'Key' => $fileNameKey]);
        $contentType = $result['ContentType'];
        $finalFileName = basename($fileNameKey);
        $fileExtension = pathinfo($finalFileName, PATHINFO_EXTENSION);

        if (empty($fileExtension) && isset($extensionMap[$contentType])) {
            $finalFileName .= $extensionMap[$contentType];
        }

        header("Content-Type: " . $contentType);
        header("Content-Disposition: attachment; filename=\"" . $finalFileName . "\"");
        header("Content-Length: " . $result['ContentLength']);
        echo $result['Body'];
        exit;
    } catch (Aws\Exception\AwsException $e) {
        http_response_code(404); die("Error: No se pudo encontrar el archivo en el bucket.");
    }
}

// --- LÓGICA ORIGINAL PARA ZIP DE ARCHIVOS LOCALES (SIGUE FUNCIONANDO) ---
$filesToZip = json_decode($_POST['files'] ?? '[]', true);
if (!empty($filesToZip)) {
    $outputDir = __DIR__ . '/../scripts/salida_ia/';
    $zip = new ZipArchive();
    $zipFileName = 'imagenes_procesadas_' . date('Y-m-d_H-i-s') . '.zip';
    $zipFilePath = sys_get_temp_dir() . '/' . $zipFileName;

    if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        http_response_code(500); die('Error del servidor: No se pudo crear el archivo ZIP.');
    }

    foreach ($filesToZip as $fileName) {
        $filePath = realpath($outputDir . $fileName);
        if ($filePath && file_exists($filePath)) {
            $zip->addFile($filePath, $fileName);
        }
    }
    $zip->close();
    
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    header('Content-Length: ' . filesize($zipFilePath));
    readfile($zipFilePath);
    unlink($zipFilePath);
    exit;
}

// Si ninguna condición se cumple, muestra un error.
http_response_code(400);
die('Error: No se especificaron archivos para descargar.');
?>