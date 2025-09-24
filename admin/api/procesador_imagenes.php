<?php
session_start();
require_once __DIR__ . '/../../vendor/autoload.php';

use Aws\S3\S3Client;
use Aws\Exception\AwsException;


// --- Medida de Seguridad Básica ---
// Asegurarse de que solo un usuario logueado en el admin pueda usar este endpoint.
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true || !isset($_SESSION['rol'])) {
    http_response_code(403); // Forbidden
    echo json_encode(['success' => false, 'error' => 'Acceso denegado.']);
    exit;
}

// Determina la acción a realizar
$resource = $_GET['resource'] ?? '';

try {
    switch ($resource) {



    	case 'upload_for_processing':
	    	try {
	    		if (empty($_FILES['images'])) {
	    			throw new Exception('No se recibieron archivos.');
	    		}

	    		$inputDir = '../scripts/entrada/';
	    		if (!is_dir($inputDir)) {
	    			mkdir($inputDir, 0777, true);
	    		}

	        // Opcional: Limpiar la carpeta de entrada antes de subir nuevos archivos
	    		$existingFiles = glob($inputDir . '*');
	    		foreach ($existingFiles as $file) {
	    			if (is_file($file)) {
	    				unlink($file);
	    			}
	    		}

	    		$fileCount = 0;
	    		$errors = [];

	    		foreach ($_FILES['images']['tmp_name'] as $key => $tmpName) {
	    			if ($_FILES['images']['error'][$key] === UPLOAD_ERR_OK) {
	    				$fileName = basename($_FILES['images']['name'][$key]);
	    				$destination = $inputDir . $fileName;
	    				if (move_uploaded_file($tmpName, $destination)) {
	    					$fileCount++;
	    				} else {
	    					$errors[] = "No se pudo mover el archivo: " . htmlspecialchars($fileName);
	    				}
	    			} else {
	    				$errors[] = "Error al subir el archivo: " . htmlspecialchars($_FILES['images']['name'][$key]);
	    			}
	    		}

	    		if ($fileCount > 0) {
	    			echo json_encode(['success' => true, 'message' => "Se subieron {$fileCount} imágenes correctamente."]);
	    		} else {
	    			throw new Exception("No se pudo procesar ningún archivo. Detalles: " . implode(", ", $errors));
	    		}

	    	} catch (Exception $e) {
	    		http_response_code(400);
	    		echo json_encode(['success' => false, 'error' => $e->getMessage()]);
	    	}

    	break;

        case 'run_processor':
            // Ahora PHP hace el trabajo, no Python.
            header('Content-Type: text/plain; charset=utf-8');
            if (ob_get_level()) ob_end_clean(); // Limpia buffers de salida

            $inputDir = '../scripts/entrada/';
            $outputDir = '../scripts/salida_ia/';
            $rotation = $_GET['rotate'] ?? '';
            $max_width = 500;
            $max_height = 500;
            $quality = 80;

            if (!function_exists('imagecreatefromjpeg')) {
                die("Error Crítico del Servidor: La librería GD de PHP no está habilitada.");
            }
            if (!is_dir($outputDir)) { mkdir($outputDir, 0777, true); }

            $files = glob($inputDir . '*');
            if (empty($files)) { echo "AVISO: La carpeta 'entrada' está vacía."; exit; }

            echo "--- INICIO DE OPTIMIZACIÓN PHP ---\n";
            $processed_count = 0;

            foreach ($files as $file) {
                $info = getimagesize($file);
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                $original_filename = basename($file);
                echo "Procesando: " . $original_filename . "...\n";

                $source_image = null;
                switch ($info['mime']) {
                    case 'image/jpeg': $source_image = imagecreatefromjpeg($file); break;
                    case 'image/png':  $source_image = imagecreatefrompng($file); break;
                    case 'image/webp': $source_image = imagecreatefromwebp($file); break;
                    default: echo "-> AVISO: Formato no soportado para {$original_filename}.\n"; continue 2;
                }

                if ($source_image) {
                    $width = imagesx($source_image);
                    $height = imagesy($source_image);

                    // Rotar si es necesario
                    if ($rotation === 'left') { $source_image = imagerotate($source_image, 90, 0); }
                    if ($rotation === 'right') { $source_image = imagerotate($source_image, -90, 0); }
                    
                    // Recalcular dimensiones después de rotar
                    $width = imagesx($source_image);
                    $height = imagesy($source_image);
                    
                    // Redimensionar
                    $ratio = $width / $height;
                    if ($width > $max_width || $height > $max_height) {
                        if (($max_width / $max_height) > $ratio) { $new_width = $max_height * $ratio; $new_height = $max_height; } 
                        else { $new_height = $max_width / $ratio; $new_width = $max_width; }
                        
                        $new_image = imagecreatetruecolor($new_width, $new_height);
                        imagecopyresampled($new_image, $source_image, 0, 0, 0, 0, $new_width, $new_height, $width, $height);
                        imagedestroy($source_image);
                        $source_image = $new_image;
                    }

                    // Guardar como JPG
                    $output_filename = pathinfo($original_filename, PATHINFO_FILENAME) . '_' . time() . '.jpg';
                    $outputPath = $outputDir . $output_filename;
                    imagejpeg($source_image, $outputPath, $quality);
                    imagedestroy($source_image);
                    echo "-> ¡Éxito! Guardado como '{$output_filename}'\n";
                    $processed_count++;
                }
            }
            echo "\n--- ¡Proceso completado! ---\nTotal de imágenes procesadas: {$processed_count}\n";
           
            break;

        case 'get_processed_images':
	        header('Content-Type: application/json');
    		$outputDir = __DIR__ . '/../scripts/salida_ia/';	        
			$baseUrl = 'scripts/salida_ia/'; // Ruta relativa para el src de la imagen
	        $files = [];
	        if (is_dir($outputDir)) {
	            $items = array_diff(scandir($outputDir), array('..', '.'));
	            foreach ($items as $item) {
	                if (!is_dir($outputDir . $item)) {
	                    $files[] = [
	                        'name' => $item,
	                        'url' => $baseUrl . $item
	                    ];
	                }
	            }
	        }
	        echo json_encode(['success' => true, 'files' => $files]);
    	break;

    // PEGA ESTE NUEVO BLOQUE EN api/index.php

case 'uploadProcessedToBucket':
            try {
                $data = json_decode(file_get_contents('php://input'), true);
                $filesToUpload = $data['files'] ?? [];

                if (empty($filesToUpload)) {
                    throw new Exception('No se seleccionaron archivos para subir.');
                }

                // --- CONFIGURACIÓN DE DIGITALOCEAN SPACES ---
                $s3Client = new S3Client([
                    'version' => 'latest',
                    'region'  => 'auto', // Tu región
                    'endpoint' => 'https://7963f8687a4029e4f9b712e6a8418931.r2.cloudflarestorage.com', // El endpoint regional
                    'credentials' => [
                        'key'    => 'c9ec80887e252cd42c4a84bfbc8daf89',    // Pega aquí tu Key
                        'secret' => '668fe85245509d9e6f7cbe5c0357872b59584eafaa584678fbdb5a4015f68577', // Pega aquí tu Secret
                    ],
                ]);

                $bucketName = 'libreria-web-imagenes'; // El nombre de tu Space
                $sourceDir = '../scripts/salida_ia/'; // Directorio local donde están los archivos
                $uploadedCount = 0;

                foreach ($filesToUpload as $fileName) {
                    $localFilePath = realpath($sourceDir . $fileName);

                    // Verifica que el archivo exista en el servidor antes de subirlo
                    if ($localFilePath && file_exists($localFilePath)) {
                        $objectKey = 'productos/' . $fileName; // Ruta dentro del Space

                        // Sube el archivo al Space
                        $s3Client->putObject([
                            'Bucket' => $bucketName,
                            'Key'    => $objectKey,
                            'Body'   => fopen($localFilePath, 'r'),
                            'ACL'    => 'public-read', // Hace el archivo públicamente visible
                        ]);
                        $uploadedCount++;
                    }
                }
                
                if ($uploadedCount == 0) {
                    throw new Exception('Ninguno de los archivos seleccionados pudo ser encontrado en el servidor.');
                }

                echo json_encode(['success' => true, 'message' => "{$uploadedCount} imágenes subidas a la galería con éxito."]);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Error al subir las imágenes procesadas: ' . $e->getMessage()]);
            }
break;

            

case 'clear_processor_folders':
    try {
        $outputDir =  '../scripts/salida_ia/';
        $inputDir =  '../scripts/entrada/';
        $deletedCount = 0;

        // Limpiar carpeta de salida
        if (is_dir($outputDir)) {
            $files = glob($outputDir . '*'); 
            foreach($files as $file){ 
                if(is_file($file)) {
                    unlink($file);
                    $deletedCount++;
                }
            }
        }

        // Limpiar carpeta de entrada
        if (is_dir($inputDir)) {
            $files = glob($inputDir . '*');
            foreach($files as $file){
                if(is_file($file)) {
                    unlink($file);
                    $deletedCount++;
                }
            }
        }

        echo json_encode(['success' => true, 'message' => "Se limpiaron las carpetas y se eliminaron {$deletedCount} archivos."]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudieron limpiar las carpetas: ' . $e->getMessage()]);
    }
    break;



        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Recurso no encontrado en el procesador de imágenes.']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

?>