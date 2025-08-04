<?php
// api/index.php

// Iniciar la sesión al principio de cualquier script que la necesite
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// LÓGICA DE CIERRE DE SESIÓN AUTOMÁTICO POR INACTIVIDAD
$timeout_duration = 1800; // 30 minutos
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

$resource = $_GET['resource'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$inputData = json_decode(file_get_contents('php://input'), true);

try {
    // --- MANEJADOR DE RECURSOS (ROUTER) ---
    switch ($resource) {
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
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 16;
    $offset = ($page - 1) * $limit;
    $department_id = isset($_GET['department_id']) ? (int)$_GET['department_id'] : null;
    $search_term = isset($_GET['search']) ? trim($_GET['search']) : '';
    $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'random';
    $order = isset($_GET['order']) ? strtoupper($_GET['order']) : 'ASC';
    $filter_name = '';
    
    $allowedSorts = ['nombre_producto', 'precio_venta', 'precio_compra'];
    if (!in_array($sort_by, $allowedSorts) && $sort_by !== 'random') $sort_by = 'random';
    if (!in_array($order, ['ASC', 'DESC'])) $order = 'ASC';

    // --- INICIO DE LA CORRECCIÓN ---
    // Por defecto, se seleccionan todos los campos para usuarios logueados.
    $select_fields = "p.*"; 

    // Si el usuario NO ha iniciado sesión, modificamos los campos a seleccionar.
    if (!isset($_SESSION['id_cliente'])) {
        // Seleccionamos todos los campos EXCEPTO 'precio_oferta', al cual le asignamos NULL.
        // Esto asegura que los usuarios no logueados nunca vean un precio de oferta.
        $select_fields = "p.id_producto, p.codigo_producto, p.nombre_producto, p.departamento, p.precio_compra, p.precio_venta, NULL AS precio_oferta, p.precio_mayoreo, p.url_imagen, p.stock_actual, p.stock_minimo, p.stock_maximo, p.tipo_de_venta, p.estado, p.fecha_creacion, p.fecha_actualizacion, p.creado_por, p.proveedor";
    }
    // --- FIN DE LA CORRECIÓN ---

    $base_sql = "FROM productos p INNER JOIN departamentos d ON p.departamento = d.id_departamento";
    $where_clauses = ["1=1"];
    $params = [];
    
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
    if (isset($_GET['hide_no_image']) && $_GET['hide_no_image'] === 'true') {
        $where_clauses[] = "(p.url_imagen IS NOT NULL AND p.url_imagen != '')";
    }

    $where_sql = " WHERE " . implode(" AND ", $where_clauses);
    
    $countSql = "SELECT COUNT(*) " . $base_sql . $where_sql;
    $stmtCount = $pdo->prepare($countSql);
    $stmtCount->execute($params);
    $total_products = $stmtCount->fetchColumn();
    $total_pages = ceil($total_products / $limit);
    
    // Usamos los campos de selección dinámicos en la consulta principal.
    $sql = "SELECT " . $select_fields . ", d.departamento AS nombre_departamento " . $base_sql . $where_sql;
    
    if ($sort_by === 'random') $sql .= " ORDER BY RAND()";
    else $sql .= " ORDER BY " . $sort_by . " " . $order;
    
    $sql .= " LIMIT :limit OFFSET :offset";
    $params[':limit'] = $limit;
    $params[':offset'] = $offset;
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => &$val) {
        $type = ($key === ':limit' || $key === ':offset') ? PDO::PARAM_INT : PDO::PARAM_STR;
        $stmt->bindParam($key, $val, $type);
    }
    
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['products' => $products, 'total_products' => (int) $total_products, 'total_pages' => $total_pages, 'current_page' => $page, 'limit' => $limit, 'filter_name' => $filter_name]);
}

function handleDepartmentsRequest(PDO $pdo) {
    $stmt = $pdo->query("SELECT id_departamento, codigo_departamento, departamento FROM departamentos ORDER BY departamento ASC");
    $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($departments);
}
?>