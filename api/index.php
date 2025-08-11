<?php
// api/index.php

// Iniciar la sesión al principio de cualquier script que la necesite
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// LÓGICA DE CIERRE DE SESIÓN AUTOMÁTICO POR INACTIVIDAD
        $timeout_duration = 3600; // 30 minutos
        if (isset($_SESSION['id_cliente']) && isset($_SESSION['last_activity'])) {
            if ((time() - $_SESSION['last_activity']) > $timeout_duration) {
                session_unset();
                session_destroy();
                http_response_code(401);
                echo json_encode(['error' => 'Tu sesión ha expirado por inactividad.']);
                exit;
            }
        }
        if (isset($_SESSION['id_cliente'])) {
            $_SESSION['last_activity'] = time();
        }

            // --- CONFIGURACIÓN Y CABECERAS ---
            ini_set('display_errors', 1);
            error_reporting(E_ALL);
            header('Content-Type: application/json');
            header('Access-Control-Allow-Origin: *');
            require_once __DIR__ . '/../config/config.php';
            //die('La conexión SÍ fue incluida correctamente.');

            $resource = $_GET['resource'] ?? '';
            $method = $_SERVER['REQUEST_METHOD'];
            $inputData = json_decode(file_get_contents('php://input'), true);

try {
    // --- MANEJADOR DE RECURSOS (ROUTER) ---
    switch ($resource) {


// PEGA este nuevo 'case' dentro del switch en api/index.php

case 'admin/deleteCustomer':
    // require_admin(); // Seguridad
    $pdo->beginTransaction();
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $customerId = $data['id_cliente'] ?? 0;

        if (!$customerId) {
            throw new Exception('No se proporcionó el ID del cliente.');
        }

        // --- LÓGICA DE SEGURIDAD ---
        // Aquí podrías agregar comprobaciones adicionales, por ejemplo:
        // No permitir eliminar clientes con carritos de compra históricos, etc.
        // Por ahora, la eliminación es directa.

        $stmt = $pdo->prepare("DELETE FROM clientes WHERE id_cliente = :id");
        $stmt->execute([':id' => $customerId]);

        if ($stmt->rowCount() > 0) {
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Cliente eliminado correctamente.']);
        } else {
            throw new Exception('No se encontró el cliente para eliminar o ya fue eliminado.');
        }

    } catch (Exception $e) {
        if($pdo->inTransaction()) { $pdo->rollBack(); }
        http_response_code(400);
        // Atrapa errores de llave foránea (si un cliente está vinculado a otras tablas)
        if ($e instanceof PDOException && $e->getCode() == '23000') {
             echo json_encode(['success' => false, 'error' => 'No se puede eliminar este cliente porque tiene registros asociados (como pedidos o tarjetas).']);
        } else {
             echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
    break;

case 'admin/getCustomers':
    // require_admin(); // Seguridad
    try {
        // Añade comodines al término de búsqueda
        $searchTerm = '%' . ($_GET['search'] ?? '') . '%';

        // Prepara la consulta SQL con placeholders distintos para cada campo de búsqueda
        $stmt = $pdo->prepare("
            SELECT 
                c.id_cliente,
                c.nombre_usuario,
                c.nombre,
                c.apellido,
                c.email,
                c.telefono,
                tc.nombre_tipo as tipo_cliente,
                COALESCE(tr.numero_tarjeta, 'No disponible') as numero_tarjeta,
                (CASE WHEN tr.id_tarjeta IS NULL THEN 24 ELSE tr.estado_id END) as estado_tarjeta_id,
                e.nombre_estado as estado_tarjeta
            FROM clientes c
            JOIN tipos_cliente tc ON c.id_tipo_cliente = tc.id_tipo
            LEFT JOIN tarjetas_recargables tr ON c.id_cliente = tr.id_cliente
            LEFT JOIN estados e ON (CASE WHEN tr.id_tarjeta IS NULL THEN 24 ELSE tr.estado_id END) = e.id_estado
            WHERE c.nombre_usuario LIKE :search_user 
               OR c.nombre LIKE :search_name 
               OR c.apellido LIKE :search_lastname
               OR c.email LIKE :search_email
               OR c.telefono LIKE :search_phone
            ORDER BY c.nombre, c.apellido
        ");
        
        // Asigna el mismo término de búsqueda a cada placeholder
        $stmt->execute([
            ':search_user' => $searchTerm,
            ':search_name' => $searchTerm,
            ':search_lastname' => $searchTerm,
            ':search_email' => $searchTerm,
            ':search_phone' => $searchTerm
        ]);
        
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'customers' => $customers]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener la lista de clientes: ' . $e->getMessage()]);
    }
    break;

case 'admin/getCustomerDetails':
    // require_admin(); // Seguridad
    $customerId = $_GET['id'] ?? 0;
    if (!$customerId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No se proporcionó el ID del cliente.']);
        break;
    }
    try {
        $stmt = $pdo->prepare("SELECT * FROM clientes WHERE id_cliente = :id");
        $stmt->execute([':id' => $customerId]);
        $customer = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($customer) {
            echo json_encode(['success' => true, 'customer' => $customer]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Cliente no encontrado.']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
    break;

// REEMPLAZA este 'case' completo en api/index.php

// REEMPLAZA este 'case' completo en api/index.php

case 'admin/createCustomer':
    // require_admin(); // Seguridad
    $pdo->beginTransaction();
    try {
        $data = $_POST;
        
        // --- VALIDACIONES GENERALES ---
        if (empty($data['nombre']) || !preg_match('/^[a-zA-Z\s]+$/', $data['nombre'])) throw new Exception("El nombre es obligatorio y solo puede contener letras y espacios.");
        if (empty($data['nombre_usuario']) || !preg_match('/^[a-zA-Z0-9]+$/', $data['nombre_usuario'])) throw new Exception("El nombre de usuario es obligatorio y solo puede contener letras y números.");
        if (empty($data['password'])) throw new Exception("La contraseña es obligatoria.");
        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new Exception("El formato del correo electrónico no es válido.");
        if (empty($data['telefono']) || !preg_match('/^[0-9]{8}$/', $data['telefono'])) throw new Exception("El teléfono es obligatorio y debe tener 8 dígitos.");

        // Verificar unicidad general
        $stmt_check = $pdo->prepare("SELECT 1 FROM clientes WHERE nombre_usuario = :user OR email = :email OR telefono = :phone");
        $stmt_check->execute([':user' => $data['nombre_usuario'], ':email' => $data['email'], ':phone' => $data['telefono']]);
        if ($stmt_check->fetch()) {
            throw new Exception("El nombre de usuario, email o teléfono ya están en uso.");
        }

        $id_tipo_cliente = (int)$data['id_tipo_cliente'];
        
        // --- VALIDACIONES CONDICIONALES ---
        if ($id_tipo_cliente === 2) { // Estudiante
            if (empty($data['institucion']) || empty($data['grado_actual'])) {
                throw new Exception("Para estudiantes, la institución y el grado son obligatorios.");
            }
        } elseif ($id_tipo_cliente === 3) { // Contribuyente
            // Validaciones de formato
            if (empty($data['razon_social']) || !preg_match('/^[a-zA-Z0-9\s\.]+$/', $data['razon_social'])) throw new Exception("Razón Social es obligatoria y solo debe contener letras, números, espacios y puntos.");
            if (empty($data['direccion'])) throw new Exception("La dirección es obligatoria.");
            if (empty($data['dui']) || !preg_match('/^[0-9]{8}$/', $data['dui'])) throw new Exception("El DUI es obligatorio y debe tener 8 dígitos.");
            if (empty($data['nit']) || !preg_match('/^[0-9]{14}$/', $data['nit'])) throw new Exception("El NIT es obligatorio y debe tener 14 dígitos.");
            if (empty($data['n_registro']) || !preg_match('/^[0-9]{1,14}$/', $data['n_registro'])) throw new Exception("El N° de Registro es obligatorio y debe tener hasta 14 dígitos.");
            
            // Verificación de unicidad para campos de contribuyente
            $stmt_contribuyente = $pdo->prepare("SELECT 1 FROM clientes WHERE dui = :dui OR nit = :nit OR n_registro = :n_registro OR razon_social = :razon_social");
            $stmt_contribuyente->execute([
                ':dui' => $data['dui'],
                ':nit' => $data['nit'],
                ':n_registro' => $data['n_registro'],
                ':razon_social' => $data['razon_social']
            ]);
            if ($stmt_contribuyente->fetch()) {
                throw new Exception("El DUI, NIT, N° de Registro o Razón Social ya están registrados por otro contribuyente.");
            }
        }
        
        $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
        $sql = "INSERT INTO clientes (nombre, apellido, nombre_usuario, telefono, email, password_hash, id_tipo_cliente, institucion, grado_actual, direccion, dui, nit, n_registro, razon_social) 
                VALUES (:nombre, :apellido, :nombre_usuario, :telefono, :email, :password_hash, :id_tipo_cliente, :institucion, :grado_actual, :direccion, :dui, :nit, :n_registro, :razon_social)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':nombre' => $data['nombre'],
            ':apellido' => $data['apellido'] ?? null,
            ':nombre_usuario' => $data['nombre_usuario'],
            ':telefono' => $data['telefono'],
            ':email' => $data['email'],
            ':password_hash' => $password_hash,
            ':id_tipo_cliente' => $id_tipo_cliente,
            ':institucion' => ($id_tipo_cliente === 2) ? $data['institucion'] : null,
            ':grado_actual' => ($id_tipo_cliente === 2) ? $data['grado_actual'] : null,
            ':direccion' => ($id_tipo_cliente === 3) ? $data['direccion'] : null,
            ':dui' => ($id_tipo_cliente === 3) ? $data['dui'] : null,
            ':nit' => ($id_tipo_cliente === 3) ? $data['nit'] : null,
            ':n_registro' => ($id_tipo_cliente === 3) ? $data['n_registro'] : null,
            ':razon_social' => ($id_tipo_cliente === 3) ? $data['razon_social'] : null,
        ]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Cliente creado exitosamente.']);

    } catch (Exception $e) {
        if($pdo->inTransaction()) { $pdo->rollBack(); }
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;


// REEMPLAZA este 'case' completo en api/index.php

case 'admin/updateCustomer':
    // require_admin(); // Seguridad
    $pdo->beginTransaction();
    try {
        $data = $_POST;
        $customerId = $data['id_cliente'] ?? 0;
        if (!$customerId) throw new Exception('ID de cliente no válido.');

        // --- VALIDACIONES GENERALES ---
        if (empty($data['nombre']) || !preg_match('/^[a-zA-Z\s]+$/', $data['nombre'])) throw new Exception("El nombre es obligatorio y solo puede contener letras y espacios.");
        if (empty($data['nombre_usuario']) || !preg_match('/^[a-zA-Z0-9]+$/', $data['nombre_usuario'])) throw new Exception("El nombre de usuario es obligatorio y solo puede contener letras y números.");
        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new Exception("El formato del correo electrónico no es válido.");
        if (empty($data['telefono']) || !preg_match('/^[0-9]{8}$/', $data['telefono'])) throw new Exception("El teléfono es obligatorio y debe tener 8 dígitos.");
        
        // Unicidad general (excluyendo al propio cliente)
        $stmt_check = $pdo->prepare("SELECT 1 FROM clientes WHERE (nombre_usuario = :user OR email = :email OR telefono = :phone) AND id_cliente != :id");
        $stmt_check->execute([':user' => $data['nombre_usuario'], ':email' => $data['email'], ':phone' => $data['telefono'], ':id' => $customerId]);
        if ($stmt_check->fetch()) {
            throw new Exception("El nombre de usuario, email o teléfono ya están en uso por otro cliente.");
        }
        
        $id_tipo_cliente = (int)$data['id_tipo_cliente'];

        // --- VALIDACIONES Y LÓGICA CONDICIONAL ---
        if ($id_tipo_cliente === 2 && (empty($data['institucion']) || empty($data['grado_actual']))) {
            $id_tipo_cliente = 1; // Cambiar a Común si faltan datos de estudiante
        }
        
        if ($id_tipo_cliente === 3) {
            // Validaciones de formato para Contribuyente
            if (empty($data['razon_social']) || !preg_match('/^[a-zA-Z0-9\s\.]+$/', $data['razon_social'])) throw new Exception("Razón Social es obligatoria y solo debe contener letras, números, espacios y puntos.");
            if (empty($data['direccion'])) throw new Exception("La dirección es obligatoria.");
            if (empty($data['dui']) || !preg_match('/^[0-9]{8}$/', $data['dui'])) throw new Exception("El DUI es obligatorio y debe tener 8 dígitos.");
            if (empty($data['nit']) || !preg_match('/^[0-9]{14}$/', $data['nit'])) throw new Exception("El NIT es obligatorio y debe tener 14 dígitos.");
            if (empty($data['n_registro']) || !preg_match('/^[0-9]{1,14}$/', $data['n_registro'])) throw new Exception("El N° de Registro es obligatorio y debe tener hasta 14 dígitos.");
            
            // Unicidad para campos de contribuyente (excluyendo al propio cliente)
            $stmt_contribuyente = $pdo->prepare("SELECT 1 FROM clientes WHERE (dui = :dui OR nit = :nit OR n_registro = :n_registro OR razon_social = :razon_social) AND id_cliente != :id");
            $stmt_contribuyente->execute([
                ':dui' => $data['dui'],
                ':nit' => $data['nit'],
                ':n_registro' => $data['n_registro'],
                ':razon_social' => $data['razon_social'],
                ':id' => $customerId
            ]);
            if ($stmt_contribuyente->fetch()) {
                throw new Exception("El DUI, NIT, N° de Registro o Razón Social ya están registrados por otro contribuyente.");
            }
        }
        
        // Si al editar un contribuyente, se le borran datos, se convierte en cliente común
        if ($id_tipo_cliente === 3 && (empty($data['dui']) || empty($data['nit']) || empty($data['n_registro']) || empty($data['razon_social']) || empty($data['direccion']))) {
            $id_tipo_cliente = 1;
        }

        $sql = "UPDATE clientes SET 
                    nombre = :nombre, apellido = :apellido, nombre_usuario = :nombre_usuario, 
                    telefono = :telefono, email = :email, id_tipo_cliente = :id_tipo_cliente, 
                    institucion = :institucion, grado_actual = :grado_actual, direccion = :direccion, 
                    dui = :dui, nit = :nit, n_registro = :n_registro, razon_social = :razon_social";
        
        $params = [
            ':nombre' => $data['nombre'],
            ':apellido' => $data['apellido'] ?? null,
            ':nombre_usuario' => $data['nombre_usuario'],
            ':telefono' => $data['telefono'],
            ':email' => $data['email'],
            ':id_tipo_cliente' => $id_tipo_cliente,
            ':institucion' => ($id_tipo_cliente === 2) ? $data['institucion'] : null,
            ':grado_actual' => ($id_tipo_cliente === 2) ? $data['grado_actual'] : null,
            ':direccion' => ($id_tipo_cliente === 3) ? $data['direccion'] : null,
            ':dui' => ($id_tipo_cliente === 3) ? $data['dui'] : null,
            ':nit' => ($id_tipo_cliente === 3) ? $data['nit'] : null,
            ':n_registro' => ($id_tipo_cliente === 3) ? $data['n_registro'] : null,
            ':razon_social' => ($id_tipo_cliente === 3) ? $data['razon_social'] : null,
            ':id_cliente' => $customerId
        ];

        if (!empty($data['password'])) {
            $sql .= ", password_hash = :password_hash";
            $params[':password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        $sql .= " WHERE id_cliente = :id_cliente";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Cliente actualizado correctamente.']);

    } catch (Exception $e) {
        if($pdo->inTransaction()) { $pdo->rollBack(); }
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

case 'run_processor':
    header('Content-Type: text/plain; charset=utf-8');
    if (ob_get_level()) ob_end_clean();
    
    // Ruta a tu ejecutable de Python
    $python_executable = 'C:\Users\LibreriaPc\AppData\Local\Programs\Python\Python313\python.exe';
    
    // Ruta al script de Python
    $python_script_path = realpath(__DIR__ . '/../admin/scripts/procesador.py');
    
    // --- LÍNEA NUEVA: Obtenemos el parámetro de rotación ---
    $rotation = $_GET['rotate'] ?? '';

    // Verificaciones de seguridad (sin cambios)
    if (!$python_script_path || !file_exists($python_script_path)) {
        die("Error Crítico: No se pudo encontrar el script procesador.py.");
    }
    if (!file_exists($python_executable)) {
        die("Error Crítico: No se pudo encontrar el ejecutable de Python en la ruta especificada.");
    }
    
    // --- LÓGICA MODIFICADA: Se construye el comando con el argumento de rotación ---
    $command = '"' . $python_executable . '" "' . $python_script_path . '"';
    if ($rotation === 'left' || $rotation === 'right') {
        $command .= ' --rotate ' . escapeshellarg($rotation);
    }
    $command .= ' 2>&1';
    
    passthru($command);
    break;

    case 'get_processed_images':
        header('Content-Type: application/json');
        $outputDir = __DIR__ . '/../admin/scripts/salida_ia/';
        $baseUrl = '../admin/scripts/salida_ia/'; // Ruta relativa para el src de la imagen
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

case 'admin/uploadProcessedToBucket':
    // Lógica para subir los archivos procesados al bucket
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $filesToUpload = $input['files'] ?? [];

        if (empty($filesToUpload)) {
            throw new Exception('No se seleccionaron archivos para subir.');
        }

        // Reutilizamos la misma lógica de conexión a Google Cloud Storage
        require_once __DIR__ . '/../vendor/autoload.php';
        $keyFilePath = __DIR__ . '/../keygcs.json';
        $bucketName = 'libreria-web-imagenes';
        $cdnDomain = "https://cdngcs.diezyquince.store"; // Tu dominio de CDN

        $storage = new \Google\Cloud\Storage\StorageClient(['keyFilePath' => $keyFilePath]);
        $bucket = $storage->bucket($bucketName);
        
        $sourceDir = __DIR__ . '/../admin/scripts/salida_ia/';
        $uploadedUrls = [];

        foreach ($filesToUpload as $fileName) {
            $localFilePath = realpath($sourceDir . $fileName);

            if ($localFilePath && file_exists($localFilePath)) {
                // Define la ruta y el nombre del archivo en el bucket
                $gcsPath = 'productos/' . $fileName;

                // Sube el archivo
                $bucket->upload(
                    fopen($localFilePath, 'r'),
                    ['name' => $gcsPath]
                );
                
                // Guarda la URL pública para devolverla si es necesario
                $uploadedUrls[] = $cdnDomain . '/' . $gcsPath;
            }
        }
        
        echo json_encode(['success' => true, 'message' => '¡Imágenes subidas a la galería con éxito!', 'urls' => $uploadedUrls]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al subir a GCS: ' . $e->getMessage()]);
    }
    break;

// FIN DEL NUEVO BLOQUE

case 'download_processed_images':
    $input = json_decode(file_get_contents('php://input'), true);
    $filesToZip = $input['files'] ?? [];
    $outputDir = __DIR__ . '/../admin/scripts/salida_ia/';

    if (empty($filesToZip)) {
        http_response_code(400);
        die('No se seleccionaron archivos.');
    }

    $zip = new ZipArchive();
    $zipFileName = 'imagenes_procesadas_' . date('Y-m-d_H-i-s') . '.zip';
    $zipFilePath = sys_get_temp_dir() . '/' . $zipFileName;

    if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        http_response_code(500);
        die('No se pudo crear el archivo ZIP.');
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
    unlink($zipFilePath); // Limpia el archivo temporal
    break;

     case 'admin/deleteProduct':
            // require_admin(); // Seguridad
            
            $data = json_decode(file_get_contents('php://input'), true);
            $productId = $data['id_producto'] ?? 0;

            if (!$productId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No se proporcionó el ID del producto.']);
                break;
            }

            try {
                // Verificación de seguridad: no eliminar si hay stock
                $stmt_check = $pdo->prepare("SELECT stock_actual FROM productos WHERE id_producto = :id");
                $stmt_check->execute([':id' => $productId]);
                $stock = $stmt_check->fetchColumn();

                if ($stock > 0) {
                    http_response_code(409); // 409 Conflict: El estado actual del recurso impide la acción.
                    echo json_encode(['success' => false, 'error' => 'Este producto no se puede eliminar porque tiene stock disponible.']);
                    break;
                }

                // Si el stock es 0, procedemos a eliminar
                $stmt_delete = $pdo->prepare("DELETE FROM productos WHERE id_producto = :id");
                $stmt_delete->execute([':id' => $productId]);

                if ($stmt_delete->rowCount() > 0) {
                    echo json_encode(['success' => true, 'message' => 'Producto eliminado correctamente.']);
                } else {
                    throw new Exception('No se encontró el producto para eliminar o ya fue eliminado.');
                }

            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Error de base de datos al intentar eliminar el producto.']);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            break;

        case 'admin/uploadImage':
    // Endpoint dedicado exclusivamente a subir una imagen al bucket.
    try {
        if (!isset($_FILES['url_imagen']) || $_FILES['url_imagen']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('No se recibió ningún archivo o hubo un error en la subida.');
        }

        // Reutilizamos la misma lógica de GCS que ya tienes
        require_once __DIR__ . '/../vendor/autoload.php';
        $keyFilePath = __DIR__ . '/../keygcs.json';
        $bucketName = 'libreria-web-imagenes';
        
        $fileTmpPath = $_FILES['url_imagen']['tmp_name'];
        $fileExt = strtolower(pathinfo($_FILES['url_imagen']['name'], PATHINFO_EXTENSION));
        $newFileName = md5(uniqid(rand(), true)) . '.' . $fileExt;
        $gcsPath = 'productos/' . $newFileName;
        
        $storage = new \Google\Cloud\Storage\StorageClient(['keyFilePath' => $keyFilePath]);
        $bucket = $storage->bucket($bucketName);
        
        $bucket->upload(
            fopen($fileTmpPath, 'r'),
            ['name' => $gcsPath]
        );
        
        echo json_encode(['success' => true, 'message' => 'Imagen subida correctamente.']);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

    // api/index.php (reemplaza este case específico)

    case 'admin/getProductDetails':
        $productCode = $_GET['id'] ?? ''; // Aunque el param se llama 'id', lo tratamos como el código.
        
        if (empty($productCode)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No se proporcionó un código de producto.']);
            break;
        }

        try {
            // --- INICIO DE LA CORRECCIÓN ---
            // La consulta ahora busca estricta y únicamente por la columna 'codigo_producto'.
            $stmt = $pdo->prepare("
                SELECT p.*, d.departamento as nombre_departamento, e.nombre_estado, pr.nombre_proveedor, um.nombre_unidad
                FROM productos p
                LEFT JOIN departamentos d ON p.departamento = d.id_departamento
                LEFT JOIN estados e ON p.estado = e.id_estado
                LEFT JOIN proveedor pr ON p.proveedor = pr.id_proveedor
                LEFT JOIN unidad_medida um ON p.tipo_de_venta = um.id_unidad_medida
                WHERE p.codigo_producto = :code
            ");
            $stmt->execute([':code' => $productCode]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            // --- FIN DE LA CORRECCIÓN ---

        if (!$product) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Producto no encontrado con ese código.']);
        } else {
            echo json_encode(['success' => true, 'product' => $product]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error de base de datos.']);
    }
    break;

    // api/index.php (dentro del switch)

case 'admin/getBucketImages':
    // Lógica para listar todas las imágenes en la carpeta 'productos' del bucket
    try {
        require_once __DIR__ . '/../vendor/autoload.php';
        $keyFilePath = __DIR__ . '/../keygcs.json';
        $bucketName = 'libreria-web-imagenes';
        $cdnDomain = "https://cdngcs.diezyquince.store";

        $storage = new \Google\Cloud\Storage\StorageClient(['keyFilePath' => $keyFilePath]);
        $bucket = $storage->bucket($bucketName);
        $options = ['prefix' => 'productos/']; // Solo listar imágenes de la carpeta de productos
        
        $imageUrls = [];
        foreach ($bucket->objects($options) as $object) {
            // Ignoramos "carpetas vacías" si existen
            if (substr($object->name(), -1) === '/') {
                continue;
            }
            $imageUrls[] = [
                'url' => $cdnDomain . '/' . $object->name(),
                'name' => $object->name() // Guardamos el 'path' para poder borrarlo
            ];
        }
        
        echo json_encode(['success' => true, 'images' => $imageUrls]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudieron listar las imágenes: ' . $e->getMessage()]);
    }
    break;

case 'admin/deleteBucketImage':
    // Lógica para eliminar una imagen específica del bucket
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $objectName = $data['name'] ?? null;

        if (!$objectName) {
            throw new Exception('No se proporcionó el nombre del objeto a eliminar.');
        }

        require_once __DIR__ . '/../vendor/autoload.php';
        $keyFilePath = __DIR__ . '/../keygcs.json';
        $bucketName = 'libreria-web-imagenes';

        $storage = new \Google\Cloud\Storage\StorageClient(['keyFilePath' => $keyFilePath]);
        $bucket = $storage->bucket($bucketName);
        $object = $bucket->object($objectName);

        $object->delete(); // Eliminamos el objeto

        echo json_encode(['success' => true, 'message' => 'Imagen eliminada correctamente.']);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudo eliminar la imagen: ' . $e->getMessage()]);
    }

    break;

            case 'admin/checkProductCode':
            $code = $_GET['code'] ?? '';
            $current_id = isset($_GET['current_id']) ? (int)$_GET['current_id'] : 0;
            
            if (empty($code)) {
                echo json_encode(['is_available' => false, 'message' => 'Código no proporcionado.']);
                break;
            }
            
            // Construimos la consulta base
            $sql = "SELECT 1 FROM productos WHERE codigo_producto = :code";
            $params = [':code' => $code];
            
            // Si estamos editando (current_id > 0), excluimos ese producto de la búsqueda
            // para no detectar su propio código como un duplicado.
            if ($current_id > 0) {
                $sql .= " AND id_producto != :current_id";
                $params[':current_id'] = $current_id;
            }
            
            $sql .= " LIMIT 1";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->fetch()) {
                echo json_encode(['is_available' => false, 'message' => 'Este código ya está en uso.']);
            } else {
                echo json_encode(['is_available' => true, 'message' => 'Código disponible.']);
            }
            break;
       
       // api/index.php

    case 'admin/createProduct':
        // Inicia la transacción
        $pdo->beginTransaction();

        try {
            // Recoger y validar datos del formulario (sin cambios)
            $codigo_producto = trim($_POST['codigo_producto'] ?? '');
            $nombre_producto = trim($_POST['nombre_producto'] ?? '');
            // ... (resto de las variables del formulario)
            $departamento_id = filter_var($_POST['departamento'] ?? '', FILTER_VALIDATE_INT);
            $precio_compra_raw = $_POST['precio_compra'] ?? '';
            $precio_compra = ($precio_compra_raw === '' || $precio_compra_raw === null) ? 0.00 : filter_var($precio_compra_raw, FILTER_VALIDATE_FLOAT);
            $precio_venta = filter_var($_POST['precio_venta'] ?? '', FILTER_VALIDATE_FLOAT);
            $precio_mayoreo_raw = $_POST['precio_mayoreo'] ?? '';
            $precio_mayoreo = ($precio_mayoreo_raw === '' || $precio_mayoreo_raw === null) ? 0.00 : filter_var($precio_mayoreo_raw, FILTER_VALIDATE_FLOAT);
            $tipo_de_venta_id = filter_var($_POST['tipo_de_venta'] ?? '', FILTER_VALIDATE_INT);
            $estado_id = filter_var($_POST['estado'] ?? '', FILTER_VALIDATE_INT);
            $proveedor_id = filter_var($_POST['proveedor'] ?? '', FILTER_VALIDATE_INT);
            $usa_inventario = isset($_POST['usa_inventario_checkbox']) ? 1 : 0;
            $stock_actual = $usa_inventario ? filter_var($_POST['stock_actual'] ?? 0, FILTER_VALIDATE_INT) : 0;
            $stock_minimo = $usa_inventario ? filter_var($_POST['stock_minimo'] ?? 0, FILTER_VALIDATE_INT) : 0;
            $stock_maximo = $usa_inventario ? filter_var($_POST['stock_maximo'] ?? 0, FILTER_VALIDATE_INT) : 0;
            $url_imagen = trim($_POST['url_imagen'] ?? '');

            if (empty($codigo_producto) || empty($nombre_producto) || $departamento_id === false || $precio_venta === false) {
                throw new Exception("Por favor, completa todos los campos obligatorios.");
            }

            // 1. Inserción INICIAL en la Base de Datos (con url_imagen vacía)
        $sql_insert = "INSERT INTO productos 
            (codigo_producto, nombre_producto, departamento, precio_compra, precio_venta, precio_mayoreo, url_imagen, stock_actual, stock_minimo, stock_maximo, tipo_de_venta, estado, usa_inventario, creado_por, proveedor, fecha_creacion, fecha_actualizacion) 
            VALUES 
            (:codigo_producto, :nombre_producto, :departamento_id, :precio_compra, :precio_venta, :precio_mayoreo, :url_imagen, :stock_actual, :stock_minimo, :stock_maximo, :tipo_de_venta_id, :estado_id, :usa_inventario, :creado_por, :proveedor_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
        
             $stmt_insert = $pdo->prepare($sql_insert);
            
            $creado_por = $_SESSION['id_usuario'] ?? null;

            $stmt_insert->execute([
                ':codigo_producto' => $codigo_producto,
                ':nombre_producto' => $nombre_producto,
                ':departamento_id' => $departamento_id,
                ':precio_compra' => $precio_compra,
                ':precio_venta' => $precio_venta,
                ':precio_mayoreo' => $precio_mayoreo,
                ':url_imagen' => $url_imagen, // <-- Se inserta la URL de la galería
                ':stock_actual' => $stock_actual,
                ':stock_minimo' => $stock_minimo,
                ':stock_maximo' => $stock_maximo,
                ':tipo_de_venta_id' => $tipo_de_venta_id,
                ':estado_id' => $estado_id,
                ':usa_inventario' => $usa_inventario,
                ':creado_por' => $creado_por,
                ':proveedor_id' => $proveedor_id
            ]);

            $lastProductId = $pdo->lastInsertId(); // Obtenemos el ID del producto que acabamos de crear

            // 2. Lógica de subida de imagen a GCS (sólo si se proporcionó una imagen)
            if (isset($_FILES['url_imagen']) && $_FILES['url_imagen']['error'] === UPLOAD_ERR_OK) {
                require_once __DIR__ . '/../vendor/autoload.php';
                $keyFilePath = __DIR__ . '/../keygcs.json';
                $bucketName = 'libreria-web-imagenes';
                $cdnDomain = "https://cdngcs.diezyquince.store";

                $fileTmpPath = $_FILES['url_imagen']['tmp_name'];
                $fileExt = strtolower(pathinfo($_FILES['url_imagen']['name'], PATHINFO_EXTENSION));
                $newFileName = md5(uniqid(rand(), true)) . '.' . $fileExt;
                $gcsPath = 'productos/' . $newFileName;
                
                $storage = new \Google\Cloud\Storage\StorageClient(['keyFilePath' => $keyFilePath]);
                $bucket = $storage->bucket($bucketName);
                $bucket->upload(fopen($fileTmpPath, 'r'), ['name' => $gcsPath]);
                
                $url_imagen = $cdnDomain . "/" . $gcsPath;

                // 3. ACTUALIZAMOS el registro del producto con la nueva URL de la imagen
                $stmt_update_img = $pdo->prepare("UPDATE productos SET url_imagen = :url_imagen WHERE id_producto = :id_producto");
                $stmt_update_img->execute([':url_imagen' => $url_imagen, ':id_producto' => $lastProductId]);
            }

            // 4. Si todo fue exitoso, confirmamos la transacción
            $pdo->commit();
            
            echo json_encode(['success' => true, 'message' => "Producto '" . htmlspecialchars($nombre_producto) . "' ingresado exitosamente."]);

        } catch (Exception $e) {
            // 5. Si algo falló, revertimos todos los cambios en la base de datos
            $pdo->rollBack();
            
            http_response_code(400); // Bad Request
            $error_message = $e->getMessage();
            if ($e instanceof PDOException && $e->getCode() == 23000) {
                 $error_message = "Error: El código de producto '" . htmlspecialchars($codigo_producto) . "' ya existe.";
            }
            echo json_encode(['success' => false, 'error' => $error_message]);
        }
        break;
            
        case 'admin/batchAction':
      // require_admin(); // Seguridad (descomentar en producción)
     
      $data = json_decode(file_get_contents('php://input'), true);
      $action = $data['action'] ?? null;
      $productIds = $data['productIds'] ?? [];

      // Validar que tengamos una acción y IDs
      if (!$action || empty($productIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Acción o IDs de productos no proporcionados.']);
        break;
      }

      // Crear una cadena de placeholders (?, ?, ?) para la consulta IN()
      $placeholders = implode(',', array_fill(0, count($productIds), '?'));

      try {
        switch ($action) {
          case 'delete':
            $stmt = $pdo->prepare("DELETE FROM productos WHERE id_producto IN ($placeholders)");
            $stmt->execute($productIds);
            $message = 'Productos eliminados correctamente.';
            break;

          case 'deactivate':
            // Asumiendo que el estado 'Inactivo' tiene el ID 2
            $stmt = $pdo->prepare("UPDATE productos SET estado = 2 WHERE id_producto IN ($placeholders)");
            $stmt->execute($productIds);
            $message = 'Productos inactivados en la tienda.';
            break;

                    // --- CÓDIGO INTEGRADO ---
                    case 'activate':
                        // Asumiendo que el estado 'Activo' tiene el ID 1
                        $stmt = $pdo->prepare("UPDATE productos SET estado = 1 WHERE id_producto IN ($placeholders)");
                        $stmt->execute($productIds);
                        $message = 'Productos activados en la tienda.';
                        break;
                    // --- FIN DEL CÓDIGO INTEGRADO ---
                                    case 'change-department':
                $departmentId = $data['departmentId'] ?? null;
                if (!$departmentId) {
                    throw new Exception('No se especificó el departamento de destino.');
                }
                
                // 1. La consulta ahora solo usa '?'
                $stmt = $pdo->prepare("UPDATE productos SET departamento = ? WHERE id_producto IN ($placeholders)");
                
                // 2. Construimos el array de parámetros en el orden correcto
                // El primer '?' corresponde al departmentId, los siguientes a los productIds.
                $params = array_merge([$departmentId], $productIds);
                
                // 3. Ejecutamos con el array de parámetros unificado
                $stmt->execute($params);

                $message = 'Departamento de los productos actualizado correctamente.';
                break;
   
         
          case 'toggle-inventory':
            // Esto cambia el valor de 'usa_inventario' al opuesto (si es 1 lo hace 0, y viceversa)
            $stmt = $pdo->prepare("UPDATE productos SET usa_inventario = NOT usa_inventario WHERE id_producto IN ($placeholders)");
            $stmt->execute($productIds);
            $message = 'Gestión de inventario actualizada.';
            break;
         
          default:
            throw new Exception('Acción en lote no reconocida: ' . htmlspecialchars($action));
        }

        echo json_encode(['success' => true, 'message' => $message]);

      } catch (Exception $e) { // Captura tanto errores de Lógica como de BD
        http_response_code(500);
                // Usamos getMessage() para obtener el error específico, como "Acción no reconocida"
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
      }
      break;

    
    // Reemplaza este case en tu api/index.php

    case 'admin/getProducts':
        // require_admin(); // Descomentar en producción

        // --- INICIO DE LA LÓGICA DE PAGINACIÓN Y ORDENAMIENTO ---
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = 25; // 25 productos por página, puedes ajustar este número
        $offset = ($page - 1) * $limit;

        $allowed_sorts = [
            'nombre_producto' => 'p.nombre_producto', 'departamento' => 'd.departamento',
            'precio_venta' => 'p.precio_venta', 'nombre_estado' => 'e.nombre_estado',
            'stock_actual' => 'p.stock_actual', 'usa_inventario' => 'p.usa_inventario'
        ];
        $sort_by_key = $_GET['sort_by'] ?? 'nombre_producto';
        $order = isset($_GET['order']) && strtoupper($_GET['order']) === 'DESC' ? 'DESC' : 'ASC';
        $sort_column = $allowed_sorts[$sort_by_key] ?? $allowed_sorts['nombre_producto'];
        
        // --- CONSTRUCCIÓN DE LA CONSULTA ---
        $base_query = "FROM productos p 
                       JOIN departamentos d ON p.departamento = d.id_departamento 
                       JOIN estados e ON p.estado = e.id_estado";
        
        $where_clauses = [];
        $params = [];

        if (!empty($_GET['search'])) {
            $search_term = '%' . $_GET['search'] . '%';
            $where_clauses[] = "(p.nombre_producto LIKE :search_name OR p.codigo_producto LIKE :search_code)";
            $params[':search_name'] = $search_term;
            $params[':search_code'] = $search_term;
        }
        if (!empty($_GET['department_id']) && is_numeric($_GET['department_id'])) {
            $where_clauses[] = "p.departamento = :department_id";
            $params[':department_id'] = (int)$_GET['department_id'];
        }
        
        $where_sql = !empty($where_clauses) ? " WHERE " . implode(" AND ", $where_clauses) : "";

        // --- OBTENER EL CONTEO TOTAL PARA LA PAGINACIÓN ---
        $count_sql = "SELECT COUNT(p.id_producto) " . $base_query . $where_sql;
        $stmt_count = $pdo->prepare($count_sql);
        $stmt_count->execute($params);
        $total_products = $stmt_count->fetchColumn();
        $total_pages = ceil($total_products / $limit);

        // --- OBTENER LOS PRODUCTOS DE LA PÁGINA ACTUAL ---
        $products_sql = "SELECT p.id_producto, p.codigo_producto, p.nombre_producto, d.departamento, p.precio_venta, e.nombre_estado,
                                p.stock_actual, p.stock_minimo, p.stock_maximo, p.usa_inventario " . $base_query . $where_sql .
                        " ORDER BY $sort_column $order LIMIT :limit OFFSET :offset";

        $stmt_products = $pdo->prepare($products_sql);
        // Bindeamos los parámetros de la cláusula WHERE
        foreach ($params as $key => &$val) {
            $stmt_products->bindParam($key, $val, PDO::PARAM_STR);
        }
        // Bindeamos los parámetros de LIMIT y OFFSET
        $stmt_products->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt_products->bindParam(':offset', $offset, PDO::PARAM_INT);
        
        $stmt_products->execute();
        $products = $stmt_products->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true, 
            'products' => $products,
            'pagination' => [
                'currentPage' => $page,
                'totalPages' => $total_pages,
                'totalProducts' => $total_products
            ]
        ]);

        break;

    // Prepara la consulta base
    $query = "SELECT p.id_producto, p.codigo_producto, p.nombre_producto, d.departamento, p.precio_venta, e.nombre_estado FROM productos p JOIN departamentos d ON p.departamento = d.id_departamento JOIN estados e ON p.estado = e.id_estado";
    $params = [];
    $where_clauses = [];

    // --- INICIO DE LA CORRECCIÓN CLAVE ---
    if (!empty($_GET['search'])) {
        $search_term = '%' . $_GET['search'] . '%';
        
        // Usamos dos placeholders diferentes: :search_name y :search_code
        $where_clauses[] = "(p.nombre_producto LIKE :search_name OR p.codigo_producto LIKE :search_code)";
        
        // Añadimos ambos parámetros al array
        $params[':search_name'] = $search_term;
        $params[':search_code'] = $search_term;
    }
    // --- FIN DE LA CORRECCIÓN CLAVE ---

    if (!empty($where_clauses)) {
        $query .= " WHERE " . implode(" AND ", $where_clauses);
    }
    
    $query .= " ORDER BY p.nombre_producto ASC";

    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'products' => $products]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error en la consulta a la base de datos.', 'details' => $e->getMessage()]);
    }
    break;
    case 'admin/updateProductField':
                // require_admin(); 
                $data = json_decode(file_get_contents('php://input'), true);
                $productId = $data['id'] ?? null;
                $field = $data['field'] ?? null;
                $value = $data['value'] ?? null;

                $allowed_fields = ['nombre_producto', 'precio_venta']; 
                
                if ($productId && in_array($field, $allowed_fields) && $value !== null) {
                    try {
                        $stmt = $pdo->prepare("UPDATE productos SET {$field} = :value WHERE id_producto = :id");
                        $stmt->execute([':value' => $value, ':id' => $productId]);
                        echo json_encode(['success' => true, 'message' => 'Producto actualizado.']);
                    } catch (PDOException $e) {
                        http_response_code(500);
                        echo json_encode(['success' => false, 'error' => 'Error de base de datos.']);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Datos inválidos.']);
                }
    break;    

     case 'admin/updateProduct':
            $pdo->beginTransaction();
            try {
                $productId = $_POST['id_producto'] ?? 0;
                if (!$productId) { throw new Exception('ID de producto no válido.'); }
                $stmt_check = $pdo->prepare("SELECT stock_actual FROM productos WHERE id_producto = :id");
                $stmt_check->execute([':id' => $productId]);
                $current_stock = $stmt_check->fetchColumn();
                $usa_inventario_nuevo = isset($_POST['usa_inventario_checkbox']) ? 1 : 0;
                if ($usa_inventario_nuevo == 0 && $current_stock > 0) {
                    throw new Exception('No se puede desactivar la gestión de inventario si el stock actual no es cero.');
                }
                
                $codigo_producto = trim($_POST['codigo_producto'] ?? '');
                $nombre_producto = trim($_POST['nombre_producto'] ?? '');
                $departamento_id = filter_var($_POST['departamento'] ?? '', FILTER_VALIDATE_INT);
                $precio_compra = filter_var($_POST['precio_compra'] ?? 0, FILTER_VALIDATE_FLOAT);
                $precio_venta = filter_var($_POST['precio_venta'] ?? 0, FILTER_VALIDATE_FLOAT);
                $precio_mayoreo = filter_var($_POST['precio_mayoreo'] ?? 0, FILTER_VALIDATE_FLOAT);
                $tipo_de_venta_id = filter_var($_POST['tipo_de_venta'] ?? '', FILTER_VALIDATE_INT);
                $estado_id = filter_var($_POST['estado'] ?? '', FILTER_VALIDATE_INT);
                $proveedor_id = filter_var($_POST['proveedor'] ?? '', FILTER_VALIDATE_INT);
                $stock_actual = $usa_inventario_nuevo ? filter_var($_POST['stock_actual'] ?? 0, FILTER_VALIDATE_INT) : 0;
                $stock_minimo = $usa_inventario_nuevo ? filter_var($_POST['stock_minimo'] ?? 0, FILTER_VALIDATE_INT) : 0;
                $stock_maximo = $usa_inventario_nuevo ? filter_var($_POST['stock_maximo'] ?? 0, FILTER_VALIDATE_INT) : 0;
                $url_imagen = $_POST['url_imagen'] ?? '';

                $sql_update = "UPDATE productos SET codigo_producto = :codigo_producto, nombre_producto = :nombre_producto, departamento = :departamento, precio_compra = :precio_compra, precio_venta = :precio_venta, precio_mayoreo = :precio_mayoreo, url_imagen = :url_imagen, stock_actual = :stock_actual, stock_minimo = :stock_minimo, stock_maximo = :stock_maximo, tipo_de_venta = :tipo_de_venta, estado = :estado, usa_inventario = :usa_inventario, proveedor = :proveedor WHERE id_producto = :id_producto";
                $stmt_update = $pdo->prepare($sql_update);
                $stmt_update->execute([
                    ':codigo_producto' => $codigo_producto, ':nombre_producto' => $nombre_producto, ':departamento' => $departamento_id,
                    ':precio_compra' => $precio_compra, ':precio_venta' => $precio_venta, ':precio_mayoreo' => $precio_mayoreo,
                    ':url_imagen' => $url_imagen, ':stock_actual' => $stock_actual, ':stock_minimo' => $stock_minimo,
                    ':stock_maximo' => $stock_maximo, ':tipo_de_venta' => $tipo_de_venta_id, ':estado' => $estado_id,
                    ':usa_inventario' => $usa_inventario_nuevo, ':proveedor' => $proveedor_id, ':id_producto' => $productId
                ]);
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Producto actualizado correctamente.']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e; // Relanza la excepción para que el manejador principal la capture
            }
            break;
// ... dentro de tu switch($resource) ...

// Reemplaza estos dos 'case' en tu archivo api/index.php

case 'admin/saveLayoutSettings':
    // require_admin();
    $configFile = __DIR__ . '/../config/layout_config.php';
    $data = json_decode(file_get_contents('php://input'), true);

    if ($data === null) {
        http_response_code(400);
        throw new Exception('Datos inválidos.');
    }

    $phpContent = "<?php\n// Configuración de la tienda web, actualizada automáticamente.\nreturn [\n";
    foreach ($data as $key => $value) {
        $key = htmlspecialchars($key);
        // Distingue entre booleanos, números y texto
        if (is_bool($value)) {
            $formattedValue = $value ? 'true' : 'false';
        } elseif (is_numeric($value)) {
            $formattedValue = (int)$value;
        } else {
            $formattedValue = "'" . addslashes(htmlspecialchars($value)) . "'";
        }
        $phpContent .= "    '{$key}' => {$formattedValue},\n";
    }
    $phpContent .= "];\n";

    if (!file_put_contents($configFile, $phpContent)) {
        http_response_code(500);
        throw new Exception('No se pudo guardar la configuración.');
    }
    echo json_encode(['success' => true, 'message' => 'Configuración guardada.']);
    break;

case 'layout-settings':
    $configFile = __DIR__ . '/../config/layout_config.php';
    // --- VALORES POR DEFECTO ---
    // Si una clave no existe en el archivo, se usará una de estas.
    $default_settings = [
        'show_main_carousel' => true,
        'show_offers_carousel' => true,
        'show_department_carousel' => true,
        'hide_products_without_image' => false,
        'offers_carousel_title' => 'Aprovecha estas oportunidades',
        'offers_carousel_dept' => 0,
        'dept_carousel_title_prefix' => 'Lo que siempre buscas en ',
        'dept_carousel_dept' => 8
    ];
    $config = file_exists($configFile) ? include($configFile) : [];
    $final_config = array_merge($default_settings, $config);

    // --- LÓGICA AUTOMÁTICA PARA CONSTRUIR TÍTULOS Y FILTROS ---
    $offers_final_filters = ['limit' => 12, 'ofertas' => 'true'];
    $offers_final_title = $final_config['offers_carousel_title'];

    if ($final_config['offers_carousel_dept'] > 0) {
        $offers_final_filters['department_id'] = $final_config['offers_carousel_dept'];
        $stmt_dept_name = $pdo->prepare("SELECT departamento FROM departamentos WHERE id_departamento = :id");
        $stmt_dept_name->execute([':id' => $final_config['offers_carousel_dept']]);
        if ($dept_name = $stmt_dept_name->fetchColumn()) {
            $offers_final_title .= ' en ' . $dept_name;
        }
    }
    
    $stmt_dept_name_2 = $pdo->prepare("SELECT departamento FROM departamentos WHERE id_departamento = :id");
    $stmt_dept_name_2->execute([':id' => $final_config['dept_carousel_dept']]);
    $dept_name_2 = $stmt_dept_name_2->fetchColumn();
    $department_final_title = $dept_name_2 ? $final_config['dept_carousel_title_prefix'] . $dept_name_2 : 'Departamento Destacado';

    // --- ARRAY FINAL QUE SE ENVÍA A LA PÁGINA ---
    // Este array ahora contiene tanto los ajustes de visibilidad como los de contenido
    $settings = [
        'show_main_carousel' => $final_config['show_main_carousel'],
        'show_offers_carousel' => $final_config['show_offers_carousel'],
        'show_department_carousel' => $final_config['show_department_carousel'],
        'hide_products_without_image' => $final_config['hide_products_without_image'],
        
        // --- Nuevos valores para el panel de admin ---
        'offers_carousel_title' => $final_config['offers_carousel_title'],
        'offers_carousel_dept' => $final_config['offers_carousel_dept'],
        'dept_carousel_title_prefix' => $final_config['dept_carousel_title_prefix'],
        'dept_carousel_dept' => $final_config['dept_carousel_dept'],

        // --- Configuración que usa la tienda para renderizar los carruseles ---
        'offers_carousel_config' => ['title' => $offers_final_title, 'filters' => $offers_final_filters],
        'department_carousel_config' => ['title' => $department_final_title, 'filters' => ['department_id' => $final_config['dept_carousel_dept'], 'limit' => 8]]
    ];

    echo json_encode(['success' => true, 'settings' => $settings]);
    break;

// ... resto de tus 'case' ...

        case 'products':
            handleProductsRequest($pdo);
            break;
        case 'departments':
            handleDepartmentsRequest($pdo);
            break;
        case 'cart':
            if ($method === 'POST' || $method === 'PUT') handleSetCartItemRequest($pdo);
            elseif ($method === 'DELETE') handleDeleteCartItemRequest($pdo);
            break;
        case 'cart-status':
            handleCartStatusRequest($pdo);
            break;
        case 'cart-details':
            handleCartDetailsRequest($pdo);
            break;
        case 'cart-checkout':
            if ($method === 'POST') handleCheckoutRequest($pdo);
            break;
        case 'clear-cart':
            if ($method === 'POST') handleClearCartRequest($pdo);
            break;

        case 'favorites':
            if ($method === 'GET') handleGetFavoritesRequest($pdo);
            elseif ($method === 'POST') handleAddFavoriteRequest($pdo);
            elseif ($method === 'DELETE') handleRemoveFavoriteRequest($pdo);
            break;
        case 'register':
            if ($method === 'POST') handleRegisterRequest($pdo, $inputData);
            break;
        case 'login':
            if ($method === 'POST') handleLoginRequest($pdo);
            break;
        case 'check-username':
            handleCheckUsernameRequest($pdo);
            break;
        case 'check-phone':
            $phone = $_GET['phone'] ?? '';
            if (empty($phone)) { echo json_encode(['is_available' => false]); exit; }
            $stmt = $pdo->prepare("SELECT 1 FROM clientes WHERE telefono = :phone LIMIT 1");
            $stmt->execute([':phone' => $phone]);
            echo json_encode(['is_available' => !$stmt->fetch()]);
            exit;
        case 'check-email':
            $email = $_GET['email'] ?? '';
            if (empty($email)) { echo json_encode(['is_available' => false]); exit; }
            $stmt = $pdo->prepare("SELECT 1 FROM clientes WHERE email = :email LIMIT 1");
            $stmt->execute([':email' => $email]);
            echo json_encode(['is_available' => !$stmt->fetch()]);
            exit;
        case 'profile':
            if (!isset($_SESSION['id_cliente'])) { throw new Exception("Acceso no autorizado.", 401); }
            if ($method === 'GET') { handleGetProfileRequest($pdo, $_SESSION['id_cliente']); }
            elseif ($method === 'PUT') { handleUpdateProfileRequest($pdo, $_SESSION['id_cliente'], $inputData); }
            break;
        case 'password':
            if (!isset($_SESSION['id_cliente'])) { throw new Exception("Acceso no autorizado.", 401); }
            if ($method === 'PUT') { handleUpdatePasswordRequest($pdo, $_SESSION['id_cliente'], $inputData); }
            break;
        case 'get-favorite-details':
            if ($method === 'GET' && isset($_SESSION['id_cliente'])) { handleGetFavoriteDetailsRequest($pdo, $_SESSION['id_cliente']); }
            break;
        case 'add-multiple-to-cart':
            if ($method === 'POST' && isset($_SESSION['id_cliente'])) { handleAddMultipleToCartRequest($pdo, $_SESSION['id_cliente'], $inputData['product_ids'] ?? []); }
            break;
        case 'order-history':
            if ($method === 'GET' && isset($_SESSION['id_cliente'])) { handleGetOrderHistory($pdo, $_SESSION['id_cliente']); }
            break;
        case 'reorder':
            if ($method === 'POST' && isset($_SESSION['id_cliente'])) { handleReorderRequest($pdo, $_SESSION['id_cliente'], $inputData['order_id'] ?? 0); }
            break;
        case 'ofertas':
            if (isset($_SESSION['id_cliente'])) {
                $id_cliente = $_SESSION['id_cliente'];
                $stmt = $pdo->prepare("
                    SELECT p.id_producto, p.nombre_producto, p.codigo_producto, p.precio_venta, p.precio_oferta, p.url_imagen, d.departamento AS nombre_departamento
                    FROM productos p
                    JOIN departamentos d ON p.departamento = d.id_departamento
                    JOIN preferencias_cliente pc ON p.departamento = pc.id_departamento
                    WHERE pc.id_cliente = :id_cliente AND p.precio_oferta IS NOT NULL AND p.precio_oferta > 0
                ");
                $stmt->execute([':id_cliente' => $id_cliente]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'ofertas' => $data]);
            } else {
                http_response_code(401);
                echo json_encode(["success" => false, "message" => "Debes iniciar sesión para ver tus ofertas."]);
            }
            break;
        case 'repeat-order':
            if (!isset($_SESSION['id_cliente'])) { throw new Exception("Debes iniciar sesión para repetir un pedido.");}
            $client_id = $_SESSION['id_cliente'];
            $data = json_decode(file_get_contents('php://input'), true);
            $order_id = $data['order_id'] ?? null;
            if (!$order_id) { throw new Exception("No se especificó el ID del pedido a repetir.");}
            $current_cart_id = getOrCreateCart($pdo, $client_id);
            $stmt_old_items = $pdo->prepare("SELECT id_producto, cantidad, precio_unitario FROM detalle_carrito WHERE id_carrito = :order_id");
            $stmt_old_items->execute([':order_id' => $order_id]);
            $old_items = $stmt_old_items->fetchAll(PDO::FETCH_ASSOC);
            if (empty($old_items)) { throw new Exception("El pedido que intentas repetir no tiene productos.");}
            $pdo->beginTransaction();
            foreach ($old_items as $item) {
                $stmt_upsert = $pdo->prepare("INSERT INTO detalle_carrito (id_carrito, id_producto, cantidad, precio_unitario) VALUES (:cart_id, :product_id, :quantity, :price) ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)");
                $stmt_upsert->execute([':cart_id' => $current_cart_id, ':product_id' => $item['id_producto'], ':quantity' => $item['cantidad'], ':price' => $item['precio_unitario']]);
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => '¡Productos añadidos a tu carrito!']);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Recurso no encontrado.']);
            break;
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    $code = is_int($e->getCode()) && $e->getCode() > 0 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode(['error' => $e->getMessage()]);
}


/**
 * Obtiene el historial de pedidos de un cliente, incluyendo el nuevo estado 'Pedido finalizado'.
 */
function handleGetOrderHistory(PDO $pdo, int $client_id) {
    // **AQUÍ AGREGAMOS EL 23**: Lista de todos los estados que el cliente puede ver.
    $historical_statuses = [2, 3, 7, 8, 9, 10, 13, 14, 17, 20, 23];
    
    $in_clause = implode(',', array_fill(0, count($historical_statuses), '?'));

    $stmt_orders = $pdo->prepare("
        SELECT 
            cc.id_carrito, 
            cc.fecha_creacion,
            e.nombre_estado
        FROM carritos_compra cc
        JOIN estados e ON cc.estado_id = e.id_estado
        WHERE cc.id_cliente = ? AND cc.estado_id IN ($in_clause)
        ORDER BY cc.fecha_creacion DESC
    ");
    
    $params = array_merge([$client_id], $historical_statuses);
    $stmt_orders->execute($params);
    $orders_raw = $stmt_orders->fetchAll(PDO::FETCH_ASSOC);

    $orders = [];
    $stmt_details = $pdo->prepare("
        SELECT p.nombre_producto, dc.cantidad, dc.precio_unitario
        FROM detalle_carrito dc
        JOIN productos p ON dc.id_producto = p.id_producto
        WHERE dc.id_carrito = :cart_id
    ");

    foreach ($orders_raw as $order_raw) {
        $stmt_details->execute([':cart_id' => $order_raw['id_carrito']]);
        $items = $stmt_details->fetchAll(PDO::FETCH_ASSOC);
        
        $total = 0;
        foreach ($items as $item) {
            $total += $item['cantidad'] * $item['precio_unitario'];
        }

        $orders[] = [
            'id_pedido' => $order_raw['id_carrito'],
            'fecha' => date("d/m/Y H:i", strtotime($order_raw['fecha_creacion'])),
            'total' => number_format($total, 2),//Decimales de los totales
            'status_name' => $order_raw['nombre_estado'],
            'items' => $items
        ];
    }

    echo json_encode(['success' => true, 'orders' => $orders]);
}
/**
 * Crea un nuevo carrito con los productos de un pedido antiguo.
 * (Versión corregida del bug "invalid parameter number")
 */
function handleReorderRequest(PDO $pdo, int $client_id, int $order_id) {
    if ($order_id <= 0) {
        http_response_code(400);
        throw new Exception("ID de pedido no válido.");
    }

    $stmt_old_items = $pdo->prepare("SELECT id_producto, cantidad FROM detalle_carrito WHERE id_carrito = :order_id");
    $stmt_old_items->execute([':order_id' => $order_id]);
    $old_items = $stmt_old_items->fetchAll(PDO::FETCH_ASSOC);

    if (empty($old_items)) {
        http_response_code(404);
        throw new Exception("No se encontraron productos en el pedido a repetir.");
    }
    
    $pdo->beginTransaction();
    try {
        $new_cart_id = getOrCreateCart($pdo, $client_id);
        
        $stmt_price = $pdo->prepare("SELECT precio_venta FROM productos WHERE id_producto = :product_id");
        
        $stmt_insert = $pdo->prepare("
            INSERT INTO detalle_carrito (id_carrito, id_producto, cantidad, precio_unitario)
            VALUES (:cart_id, :product_id, :quantity, :unit_price)
            ON DUPLICATE KEY UPDATE 
                cantidad = cantidad + VALUES(cantidad), 
                precio_unitario = VALUES(precio_unitario)
        ");

        foreach ($old_items as $item) {
            $stmt_price->execute([':product_id' => $item['id_producto']]);
            $current_price = $stmt_price->fetchColumn();

            if ($current_price !== false) {
                $stmt_insert->execute([
                    ':cart_id'      => $new_cart_id,
                    ':product_id'   => $item['id_producto'],
                    ':quantity'     => $item['cantidad'],
                    ':unit_price'   => $current_price
                ]);
            }
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'El pedido se ha añadido a tu carrito.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        throw new Exception("Error al repetir el pedido: " . $e->getMessage());
    }
}
/**
 * Procesa el checkout final, marcando el carrito como 'Pedido finalizado' (estado 23).
 */
function handleCheckoutRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) throw new Exception('Debes iniciar sesión para finalizar la compra.');
    
    $client_id = $_SESSION['id_cliente'];
    $cart_id = getOrCreateCart($pdo, $client_id, false);
    
    if (!$cart_id) {
        throw new Exception("Tu carrito está vacío. No hay nada que procesar.");
    }
    
    // **AQUÍ ESTÁ LA MAGIA**: El estado inicial ahora será 23.
    $stmt = $pdo->prepare("UPDATE carritos_compra SET estado_id = 23 WHERE id_carrito = :cart_id AND id_cliente = :client_id AND estado_id = 1");
    $stmt->execute([':cart_id' => $cart_id, ':client_id' => $client_id]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Compra finalizada con éxito.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se pudo procesar la compra. Es posible que el carrito ya estuviera procesado.']);
    }
}

function handleGetFavoriteDetailsRequest(PDO $pdo, int $client_id) {
    $stmt = $pdo->prepare("
        SELECT p.id_producto, p.nombre_producto, p.precio_venta, p.url_imagen
        FROM favoritos f
        JOIN productos p ON f.id_producto = p.id_producto
        WHERE f.id_cliente = :client_id
        ORDER BY p.nombre_producto ASC
    ");
    $stmt->execute([':client_id' => $client_id]);
    $favorites = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'favorites' => $favorites]);
}

function handleAddMultipleToCartRequest(PDO $pdo, int $client_id, array $product_ids) {
    if (empty($product_ids)) {
        throw new Exception("No se proporcionaron productos para añadir.");
    }

    $cart_id = getOrCreateCart($pdo, $client_id);

    // Preparar todas las consultas SQL necesarias
    $stmt_price = $pdo->prepare("SELECT precio_venta, precio_oferta FROM productos WHERE id_producto = :product_id");
    $stmt_check = $pdo->prepare("SELECT id_detalle_carrito FROM detalle_carrito WHERE id_carrito = :cart_id AND id_producto = :product_id");
    $stmt_update = $pdo->prepare("UPDATE detalle_carrito SET cantidad = cantidad + 1 WHERE id_detalle_carrito = :detail_id");
    $stmt_insert = $pdo->prepare(
        "INSERT INTO detalle_carrito (id_carrito, id_producto, cantidad, precio_unitario)
         VALUES (:cart_id, :product_id, 1, :unit_price)"
    );

    $pdo->beginTransaction();
    try {
        foreach ($product_ids as $product_id) {
            $product_id_int = (int)$product_id;

            // 1. Verificar si el producto ya existe en el carrito
            $stmt_check->execute([':cart_id' => $cart_id, ':product_id' => $product_id_int]);
            $detail_id = $stmt_check->fetchColumn();

            if ($detail_id) {
                // 2a. Si existe, simplemente incrementa la cantidad
                $stmt_update->execute([':detail_id' => $detail_id]);
            } else {
                // 2b. Si no existe, obtén el precio correcto e insértalo
                $stmt_price->execute([':product_id' => $product_id_int]);
                $prices = $stmt_price->fetch(PDO::FETCH_ASSOC);

                if ($prices) {
                    // Usar precio de oferta si es válido; si no, el precio de venta normal
                    $unit_price = ($prices['precio_oferta'] !== null && $prices['precio_oferta'] > 0)
                        ? $prices['precio_oferta']
                        : $prices['precio_venta'];

                    $stmt_insert->execute([
                        ':cart_id' => $cart_id,
                        ':product_id' => $product_id_int,
                        ':unit_price' => $unit_price
                    ]);
                }
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Productos añadidos al carrito con éxito.']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        // Lanza una excepción con un mensaje más claro para depuración
        throw new Exception("Error al añadir productos al carrito: " . $e->getMessage());
    }
}
function handleGetProfileRequest(PDO $pdo, int $client_id) {
    $stmt = $pdo->prepare("SELECT nombre_usuario, nombre, apellido, email, telefono FROM clientes WHERE id_cliente = :client_id");
    $stmt->execute([':client_id' => $client_id]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$profile) throw new Exception("Perfil no encontrado.");
    echo json_encode(['success' => true, 'profile' => $profile]);
}

function handleUpdateProfileRequest(PDO $pdo, int $client_id, ?array $data) {
    if (empty($data['nombre']) || empty($data['apellido']) || empty($data['email'])) throw new Exception("Nombre, apellido y email son campos obligatorios.");
    $stmt = $pdo->prepare("UPDATE clientes SET nombre = :nombre, apellido = :apellido, email = :email, telefono = :telefono WHERE id_cliente = :client_id");
    $stmt->execute([':nombre' => $data['nombre'], ':apellido' => $data['apellido'], ':email' => $data['email'], ':telefono' => $data['telefono'] ?? null, ':client_id' => $client_id]);
    echo json_encode(['success' => true, 'message' => 'Perfil actualizado correctamente.']);
}

function handleUpdatePasswordRequest(PDO $pdo, int $client_id, ?array $data) {
    if (empty($data['current_password']) || empty($data['new_password'])) throw new Exception("Todos los campos de contraseña son requeridos.");
    $stmt = $pdo->prepare("SELECT password_hash FROM clientes WHERE id_cliente = :client_id");
    $stmt->execute([':client_id' => $client_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify($data['current_password'], $user['password_hash'])) throw new Exception("La contraseña actual es incorrecta.");
    $new_password_hash = password_hash($data['new_password'], PASSWORD_DEFAULT);
    $stmt_update = $pdo->prepare("UPDATE clientes SET password_hash = :new_hash WHERE id_cliente = :client_id");
    $stmt_update->execute([':new_hash' => $new_password_hash, ':client_id' => $client_id]);
    echo json_encode(['success' => true, 'message' => 'Contraseña actualizada correctamente.']);
}

function handleLoginRequest(PDO $pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['nombre_usuario']) || empty($data['password'])) throw new Exception("Nombre de usuario y contraseña son requeridos.");
    $stmt = $pdo->prepare("SELECT id_cliente, nombre_usuario, password_hash FROM clientes WHERE nombre_usuario = :nombre_usuario");
    $stmt->execute([':nombre_usuario' => $data['nombre_usuario']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($user && password_verify($data['password'], $user['password_hash'])) {
        $_SESSION['id_cliente'] = $user['id_cliente'];
        $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
        $_SESSION['last_activity'] = time();
        echo json_encode(['success' => true, 'message' => 'Inicio de sesión exitoso. Redirigiendo...']);
    } else {
        http_response_code(401);
        throw new Exception("Nombre de usuario o contraseña incorrectos.");
    }
}



function handleRegisterRequest(PDO $pdo, array $data) {
    // Validación de campos básicos
    $required_fields = ['nombre', 'nombre_usuario', 'password', 'telefono'];
    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            throw new Exception("El campo '$field' es obligatorio.");
        }
    }
    // --- INICIO DE LA MODIFICACIÓN ---
    // Validación para que nombre y apellido solo contengan letras y espacios
    if (!preg_match("/^[a-zA-Z\s]+$/", $data['nombre'])) {
        throw new Exception("El nombre solo puede contener letras y espacios.");
    }
    if (!empty($data['apellido']) && !preg_match("/^[a-zA-Z\s]+$/", $data['apellido'])) {
        throw new Exception("El apellido solo puede contener letras y espacios.");
    }
    // --- FIN DE LA MODIFICACIÓN ---

    $pdo->beginTransaction();

    try {
        // 1. INSERTAR EL NUEVO USUARIO EN LA TABLA 'clientes'
        $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
        
        $stmt_cliente = $pdo->prepare(
            "INSERT INTO clientes (nombre, apellido, nombre_usuario, telefono, email, password_hash, id_tipo_cliente) 
             VALUES (:nombre, :apellido, :nombre_usuario, :telefono, :email, :password_hash, :id_tipo_cliente)"
        );
        
        $stmt_cliente->execute([
            ':nombre' => $data['nombre'],
            ':apellido' => $data['apellido'] ?? null,
            ':nombre_usuario' => $data['nombre_usuario'],
            ':telefono' => $data['telefono'],
            ':email' => !empty($data['email']) ? $data['email'] : null,
            ':password_hash' => $password_hash,
            ':id_tipo_cliente' => $data['id_tipo_cliente'] ?? 1
        ]);

        // 2. OBTENER EL ID DEL CLIENTE QUE ACABAMOS DE CREAR
        $new_client_id = $pdo->lastInsertId();

        if (!$new_client_id) {
            throw new Exception("No se pudo crear el cliente.");
        }

        // 3. INICIAMOS LA SESIÓN PARA EL NUEVO USUARIO
        $_SESSION['id_cliente'] = $new_client_id;
        $_SESSION['nombre_usuario'] = $data['nombre_usuario'];
        $_SESSION['last_activity'] = time();

        // 4. GUARDAR LAS PREFERENCIAS USANDO EL NUEVO ID
        $preferencias = $data['preferencias'] ?? [];
        if (!empty($preferencias) && is_array($preferencias)) {
            // Si "Seleccionar Todos" está marcado, obtenemos todos los departamentos
            if (in_array('all', $preferencias)) {
                $stmt_all_deps = $pdo->query("SELECT id_departamento FROM departamentos");
                $preferencias = $stmt_all_deps->fetchAll(PDO::FETCH_COLUMN);
            }

            $stmt_pref = $pdo->prepare(
                "INSERT INTO preferencias_cliente (id_cliente, id_departamento) VALUES (:client_id, :dept_id)"
            );
            foreach ($preferencias as $dept_id) {
                if (!empty($dept_id)) {
                    $stmt_pref->execute([
                        ':client_id' => $new_client_id,
                        ':dept_id'   => (int)$dept_id
                    ]);
                }
            }
        }

        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => '¡Registro exitoso!']);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(400);

        // --- INICIO DE LA INTEGRACIÓN ---
        // Verificamos si el error es por una entrada duplicada (código de error SQLSTATE 23000)
        if ($e->getCode() == '23000') {
            // Revisamos el mensaje de error para ver qué campo se duplicó
            if (strpos($e->getMessage(), 'telefono') !== false) {
                echo json_encode(['success' => false, 'error' => 'Este número de teléfono ya está registrado.']);
            } elseif (strpos($e->getMessage(), 'email') !== false) {
                echo json_encode(['success' => false, 'error' => 'Este correo electrónico ya está registrado.']);
            } else {
                // Mensaje genérico para otros duplicados (como el nombre de usuario)
                echo json_encode(['success' => false, 'error' => 'El nombre de usuario ya existe.']);
            }
        } else {
            // Para cualquier otro tipo de error, muestra el mensaje original
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        // --- FIN DE LA INTEGRACIÓN ---
    }
}
// ... (el resto de las funciones de tu api/index.php)
function handleGetFavoritesRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) { echo json_encode([]); return; }
    $client_id = $_SESSION['id_cliente'];
    $stmt = $pdo->prepare("SELECT id_producto FROM favoritos WHERE id_cliente = :client_id");
    $stmt->execute([':client_id' => $client_id]);
    $favorites = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    echo json_encode($favorites);
}

function handleAddFavoriteRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) { http_response_code(401); echo json_encode(['error' => 'Debes iniciar sesión para añadir favoritos.']); return; }
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['product_id'])) throw new Exception('Falta el ID del producto.');
    $product_id = (int)$data['product_id'];
    $client_id = $_SESSION['id_cliente'];
    $stmt = $pdo->prepare("INSERT IGNORE INTO favoritos (id_cliente, id_producto) VALUES (:client_id, :product_id)");
    $stmt->execute([':client_id' => $client_id, ':product_id' => $product_id]);
    echo json_encode(['success' => true, 'message' => 'Producto añadido a favoritos.']);
}

function handleRemoveFavoriteRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) { http_response_code(401); echo json_encode(['error' => 'Debes iniciar sesión para quitar favoritos.']); return; }
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['product_id'])) throw new Exception('Falta el ID del producto.');
    $product_id = (int)$data['product_id'];
    $client_id = $_SESSION['id_cliente'];
    $stmt = $pdo->prepare("DELETE FROM favoritos WHERE id_cliente = :client_id AND id_producto = :product_id");
    $stmt->execute([':client_id' => $client_id, ':product_id' => $product_id]);
    echo json_encode(['success' => true, 'message' => 'Producto eliminado de favoritos.']);
}

function handleSetCartItemRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) { 
        http_response_code(401); 
        echo json_encode(['error' => 'Debes iniciar sesión para modificar el carrito.']); 
        return; 
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $product_id = (int)($data['product_id'] ?? 0);
    $quantity = (int)($data['quantity'] ?? 0);
    $client_id = $_SESSION['id_cliente'];
    
    $pdo->beginTransaction();
    try {
        $cart_id = getOrCreateCart($pdo, $client_id);
        
        if ($quantity <= 0) {
            deleteCartItem($pdo, $cart_id, $product_id);
        } else {
            $stmt_price = $pdo->prepare("SELECT precio_venta, precio_oferta FROM productos WHERE id_producto = :product_id");
            $stmt_price->execute([':product_id' => $product_id]);
            $prices = $stmt_price->fetch(PDO::FETCH_ASSOC);

            if (!$prices) throw new Exception("Producto no encontrado.");

            $unit_price = ($prices['precio_oferta'] !== null && $prices['precio_oferta'] > 0)
                ? $prices['precio_oferta']
                : $prices['precio_venta'];

            $stmt_check = $pdo->prepare("SELECT id_detalle_carrito FROM detalle_carrito WHERE id_carrito = :cart_id AND id_producto = :product_id");
            $stmt_check->execute([':cart_id' => $cart_id, ':product_id' => $product_id]);
            $detail_id = $stmt_check->fetchColumn();

            if ($detail_id) {
                $stmt_update = $pdo->prepare("UPDATE detalle_carrito SET cantidad = :quantity, precio_unitario = :unit_price WHERE id_detalle_carrito = :detail_id");
                $stmt_update->execute([':quantity' => $quantity, ':unit_price' => $unit_price, ':detail_id' => $detail_id]);
            } else {
                $stmt_insert = $pdo->prepare("INSERT INTO detalle_carrito (id_carrito, id_producto, cantidad, precio_unitario) VALUES (:cart_id, :product_id, :quantity, :unit_price)");
                $stmt_insert->execute([':cart_id' => $cart_id, ':product_id' => $product_id, ':quantity' => $quantity, ':unit_price' => $unit_price]);
            }
        }
        
        // --- INICIO DE LA MEJORA ---
        // Después de la operación, calculamos el nuevo total del carrito.
        $stmt_total = $pdo->prepare("SELECT SUM(dc.cantidad * dc.precio_unitario) as total_price FROM detalle_carrito dc WHERE dc.id_carrito = :cart_id");
        $stmt_total->execute([':cart_id' => $cart_id]);
        $total_price = $stmt_total->fetchColumn() ?: 0;
        
        $pdo->commit();

        // Y lo devolvemos en la respuesta.
        echo json_encode([
            'success' => true, 
            'message' => 'Carrito actualizado.',
            'new_total' => number_format($total_price, 2)
        ]);
        // --- FIN DE LA MEJORA ---

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        // Devolvemos el error en formato JSON también
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
function handleCartStatusRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) { echo json_encode(['total_price' => '0.00']); return; }
    $client_id = $_SESSION['id_cliente'];
    $stmt = $pdo->prepare("SELECT SUM(dc.cantidad * dc.precio_unitario) as total_price FROM detalle_carrito dc JOIN carritos_compra cc ON dc.id_carrito = cc.id_carrito WHERE cc.id_cliente = :client_id AND cc.estado_id = 1");
    $stmt->execute([':client_id' => $client_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $total_price = $result['total_price'] ? number_format($result['total_price'], 2, '.', '') : '0.00';//Decimales en los numero
    echo json_encode(['total_price' => $total_price]);
}

function handleCartDetailsRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) { echo json_encode(['cart_items' => [], 'total' => '0.00']); return; }
    $client_id = $_SESSION['id_cliente'];
    $cart_id = getOrCreateCart($pdo, $client_id);
    if (!$cart_id) { echo json_encode(['cart_items' => [], 'total' => '0.00']); return; }
    $stmt_items = $pdo->prepare("SELECT p.id_producto, p.nombre_producto, p.url_imagen, dc.cantidad, dc.precio_unitario, (dc.cantidad * dc.precio_unitario) as subtotal FROM detalle_carrito dc JOIN productos p ON dc.id_producto = p.id_producto WHERE dc.id_carrito = :cart_id");
    $stmt_items->execute([':cart_id' => $cart_id]);
    $cart_items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);
    $total = 0;
    foreach ($cart_items as $item) $total += $item['subtotal'];
    echo json_encode(['cart_items' => $cart_items, 'total' => number_format($total, 2, '.', '')]);//Decimales en los numeros
}

function handleDeleteCartItemRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) throw new Exception('Debes iniciar sesión para modificar el carrito.');
    $data = json_decode(file_get_contents('php://input'), true);
    $product_id = (int)$data['product_id'];
    $client_id = $_SESSION['id_cliente'];
    $cart_id = getOrCreateCart($pdo, $client_id);
    deleteCartItem($pdo, $cart_id, $product_id);
    echo json_encode(['success' => true, 'message' => 'Producto eliminado.']);
}

function getOrCreateCart(PDO $pdo, int $client_id, bool $create_if_not_found = true) {
    $stmt = $pdo->prepare("SELECT id_carrito FROM carritos_compra WHERE id_cliente = :client_id AND estado_id = 1");
    $stmt->execute([':client_id' => $client_id]);
    $cart_id = $stmt->fetchColumn();
    if (!$cart_id && $create_if_not_found) {
        $stmt_new = $pdo->prepare("INSERT INTO carritos_compra (id_cliente, estado_id) VALUES (:client_id, 1)");
        $stmt_new->execute([':client_id' => $client_id]);
        return $pdo->lastInsertId();
    }
    return $cart_id;
}

function deleteCartItem(PDO $pdo, int $cart_id, int $product_id) {
    $stmt = $pdo->prepare("DELETE FROM detalle_carrito WHERE id_carrito = :cart_id AND id_producto = :product_id");
    $stmt->execute([':cart_id' => $cart_id, ':product_id' => $product_id]);
}

function handleCheckUsernameRequest(PDO $pdo) {
    $username = $_GET['username'] ?? '';
    if (empty($username)) {
        echo json_encode(['is_available' => false]);
        exit; // Detiene la ejecución aquí
    }
    $stmt = $pdo->prepare("SELECT 1 FROM clientes WHERE nombre_usuario = :nombre_usuario LIMIT 1");
    $stmt->execute([':nombre_usuario' => $username]);
    $is_available = !$stmt->fetch();
    echo json_encode(['is_available' => $is_available]);
    exit; // --- ¡LA CORRECCIÓN MÁS IMPORTANTE! ---
          // Detiene la ejecución para asegurar una respuesta JSON limpia.
}
function handleProductsRequest(PDO $pdo) {
    // Parámetros de la URL para paginación, filtros y orden
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 16;
    $offset = ($page - 1) * $limit;
    $department_id = isset($_GET['department_id']) ? (int)$_GET['department_id'] : null;
    $search_term = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'random'; // 'random' como valor por defecto
    $order = isset($_GET['order']) ? strtoupper($_GET['order']) : 'ASC';

    $filter_name = '';
    $ofertas_only = isset($_GET['ofertas']) && $_GET['ofertas'] === 'true';

    $hide_no_image = isset($_GET['hide_no_image']) && $_GET['hide_no_image'] === 'true';//cometar para que $hide_no_image = true; funcione
    
    //$hide_no_image = true; forzar para desarrrolo el mostrar solo aquellos productos que si tienen imagen

    // Validación de seguridad para el ordenamiento
    $allowedSorts = ['nombre_producto', 'precio_venta', 'precio_compra', 'random'];
    if (!in_array($sort_by, $allowedSorts)) {
        $sort_by = 'random';
    }
    if (!in_array($order, ['ASC', 'DESC'])) {
        $order = 'ASC';
    }

    $select_fields = "p.*"; 

    // Construcción de la consulta SQL
    $base_sql = "FROM productos p INNER JOIN departamentos d ON p.departamento = d.id_departamento";
    $where_clauses = ["p.estado = 1"];
    $params = [];
    
    // Se añade la nueva condición a la consulta si el parámetro está activo.
    if ($hide_no_image) {
        $where_clauses[] = "(p.url_imagen IS NOT NULL AND p.url_imagen != '' AND p.url_imagen != '0')";
    }

    // Filtros existentes (departamento, búsqueda, ofertas)
    if ($department_id !== null && $department_id > 0) {
        $where_clauses[] = "p.departamento = :department_id";
        $params[':department_id'] = $department_id;
        $stmt_dept_name = $pdo->prepare("SELECT departamento FROM departamentos WHERE id_departamento = :dept_id");
        $stmt_dept_name->execute([':dept_id' => $department_id]);
        $filter_name = $stmt_dept_name->fetchColumn();
    }
    if (!empty($search_term)) {
        $where_clauses[] = "(p.nombre_producto LIKE :search_term OR p.codigo_producto LIKE :search_term_code)";
        $params[':search_term'] = '%' . $search_term . '%';
        $params[':search_term_code'] = '%' . $search_term . '%';
        $filter_name = $search_term;
    }
    if ($ofertas_only) {
        $where_clauses[] = "(p.precio_oferta IS NOT NULL AND p.precio_oferta > 0 AND p.precio_oferta < p.precio_venta)";
        $filter_name = "Productos en Oferta";
    }

    $where_sql = " WHERE " . implode(" AND ", $where_clauses);
    
    // Contar el total de productos para la paginación
    $countSql = "SELECT COUNT(*) " . $base_sql . $where_sql;
    $stmtCount = $pdo->prepare($countSql);
    $stmtCount->execute($params);
    $total_products = $stmtCount->fetchColumn();
    $total_pages = ceil($total_products / $limit);
    
    $sql = "SELECT " . $select_fields . ", d.departamento AS nombre_departamento " . $base_sql . $where_sql;
    
    // Lógica de ordenamiento
    if ($sort_by === 'random') {
        $sql .= " ORDER BY RAND()";
    } else {
        $sql .= " ORDER BY " . $sort_by . " " . $order;
    }
    
    $sql .= " LIMIT :limit OFFSET :offset";
    $params[':limit'] = $limit;
    $params[':offset'] = $offset;
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => &$val) {
        $type = ($key === ':limit' || $key === ':offset' || $key === ':department_id') ? PDO::PARAM_INT : PDO::PARAM_STR;
        $stmt->bindParam($key, $val, $type);
    }
    
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'products' => $products, 
        'total_products' => (int)$total_products, 
        'total_pages' => $total_pages, 
        'current_page' => $page, 
        'limit' => $limit, 
        'filter_name' => $filter_name
    ]);
}
function handleDepartmentsRequest(PDO $pdo) {
    $stmt = $pdo->query("SELECT id_departamento, codigo_departamento, departamento FROM departamentos ORDER BY departamento ASC");
    $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($departments);
}

function handleClearCartRequest(PDO $pdo) {
    if (!isset($_SESSION['id_cliente'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Debes iniciar sesión para vaciar el carrito.']);
        return;
    }

    $client_id = $_SESSION['id_cliente'];
    // Obtenemos el ID del carrito activo sin crear uno nuevo si no existe.
    $cart_id = getOrCreateCart($pdo, $client_id, false);

    if ($cart_id) {
        // Preparamos la sentencia para borrar todos los detalles de ese carrito.
        $stmt = $pdo->prepare("DELETE FROM detalle_carrito WHERE id_carrito = :cart_id");
        $stmt->execute([':cart_id' => $cart_id]);

        // Verificamos si se borraron filas para confirmar la operación.
        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'El carrito se ha vaciado con éxito.']);
        } else {
            // Esto puede pasar si el carrito ya estaba vacío.
            echo json_encode(['success' => true, 'message' => 'El carrito ya estaba vacío.']);
        }
    } else {
        // No había un carrito activo para este usuario.
        echo json_encode(['success' => true, 'message' => 'No se encontró un carrito activo.']);
    }
}


?>