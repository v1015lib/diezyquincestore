<?php
// api/anuncios_web.php - API para gestión de anuncios web

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/config.php';

// Verificar autenticación
session_start();
if (!isset($_SESSION['id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo, $input);
            break;
        case 'PUT':
            handlePut($pdo, $input);
            break;
        case 'DELETE':
            handleDelete($pdo, $input);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método no permitido']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor: ' . $e->getMessage()]);
}

function handleGet($pdo) {
    // CORRECCIÓN: Se traduce el valor de la BD al que espera el frontend
    $sql = "SELECT 
                id_anuncio, titulo, url_imagen, url_destino AS url_enlace, 
                CASE 
                    WHEN tipo_anuncio = 'carousel' THEN 'slider_principal'
                    WHEN tipo_anuncio = 'sidebar' THEN 'columna_derecha'
                    ELSE tipo_anuncio 
                END AS tipo, 
                orden, estado AS activo, fecha_creacion 
            FROM anuncios_web 
            ORDER BY orden ASC, fecha_creacion DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $anuncios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $anuncios]);
}

function handlePost($pdo, $input) {
    // ... validación ...
    
    // CORRECCIÓN: Se espera 'url_enlace' del JSON y se inserta en 'url_destino'
    $sql = "INSERT INTO anuncios_web (titulo, url_imagen, url_destino, tipo_anuncio, orden, estado) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    
    $result = $stmt->execute([
        $input['titulo'],
        $input['url_imagen'],
        $input['url_enlace'] ?? '', // Lee 'url_enlace'
        $input['tipo'] === 'slider_principal' ? 'carousel' : 'sidebar',
        $input['orden'] ?? 0,
        $input['activo'] ?? 1
    ]);
    
    // ... resto de la función ...
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Anuncio creado exitosamente']);
    } else { /* ... */ }
}





function translate_ad_type($frontend_type) {
    if ($frontend_type === 'slider_principal') {
        return 'carousel';
    }
    if ($frontend_type === 'columna_derecha') {
        return 'sidebar';
    }
    return ''; // Devuelve un valor por defecto o vacío si no coincide
}


function handlePut($pdo, $input) {
    if (!$input || !isset($input['id_anuncio'])) { /* ... */ }

    // CORRECCIÓN: Se traduce el valor del frontend al de la BD
    $tipo_db = translate_ad_type($input['tipo']);
    
    $sql = "UPDATE anuncios_web SET titulo = ?, url_imagen = ?, url_destino = ?, tipo_anuncio = ?, orden = ?, estado = ? WHERE id_anuncio = ?";
    $stmt = $pdo->prepare($sql);
    
    $result = $stmt->execute([
        $input['titulo'],
        $input['url_imagen'],
        $input['url_destino'] ?? '',
        $tipo_db, // Se usa el valor traducido
        $input['orden'] ?? 0,
        $input['activo'] ?? 1,
        $input['id_anuncio']
    ]);
    
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Anuncio actualizado']);
    } else { /* ... */ }
}

function handleDelete($pdo, $input) {
    if (!$input || !isset($input['id_anuncio'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID del anuncio requerido']);
        return;
    }
    
    $sql = "DELETE FROM anuncios_web WHERE id_anuncio = ?";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([$input['id_anuncio']]);
    
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Anuncio eliminado exitosamente']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar el anuncio']);
    }
}
?>