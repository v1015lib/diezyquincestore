<?php
session_start();

require_once __DIR__ . '/../config/config.php'; 

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
//header('Access-Control-Allow-Origin: https://diezyquince.store'); 

require_once __DIR__ . '/../config/config.php';

// =================== INICIO DEL NUEVO BLOQUE ===================
// Este bloque intercepta las peticiones de "pre-vuelo" (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Le dice al navegador qué métodos están permitidos
    header('Access-Control-Allow-Methods: POST, GET, DELETE, PUT, OPTIONS');
    // Le dice al navegador qué cabeceras están permitidas (importante para el JSON)
    header('Access-Control-Allow-Headers: Content-Type');
    // Responde con un "OK" para dar permiso
    http_response_code(200);
    // Detiene el script para que no continúe al switch
    exit();
}


$resource = $_GET['resource'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$inputData = json_decode(file_get_contents('php://input'), true);

try {
    // --- MANEJADOR DE RECURSOS (ROUTER) ---
    switch ($resource) {


// api/index.php

case 'admin/getWebOrders':
    // require_admin();
    try {
        $stmt = $pdo->prepare("
            SELECT 
                cc.id_carrito,
                cc.numero_orden_cliente,
                c.nombre_usuario,
                c.nombre,
                c.apellido,
                cc.fecha_creacion,
                e.nombre_estado,
                SUM(dc.cantidad * dc.precio_unitario) as total
            FROM carritos_compra cc
            JOIN clientes c ON cc.id_cliente = c.id_cliente
            JOIN estados e ON cc.estado_id = e.id_estado
            /* --- ESTA LÍNEA ES LA CORRECCIÓN CLAVE --- */
            /* Asegura que solo se listen carritos con productos. */
            JOIN detalle_carrito dc ON cc.id_carrito = dc.id_carrito
            WHERE cc.estado_id IN (8, 10, 11) -- 8: En Proceso, 10: Entregado, 11: Cancelado
            GROUP BY cc.id_carrito -- Agrupamos para obtener un solo total por carrito
            ORDER BY cc.fecha_creacion DESC
        ");
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'orders' => $orders]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener los pedidos web.']);
    }
    break;

case 'admin/updateOrderStatus':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $cartId = filter_var($data['cart_id'] ?? 0, FILTER_VALIDATE_INT);
    $statusId = filter_var($data['status_id'] ?? 0, FILTER_VALIDATE_INT);
    $userId = $_SESSION['id_usuario'] ?? null;

    if (!$cartId || !$statusId || !$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos incompletos o sesión no válida.']);
        break;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("UPDATE carritos_compra SET estado_id = :status_id WHERE id_carrito = :cart_id");
        $stmt->execute([':status_id' => $statusId, ':cart_id' => $cartId]);

        // Log de la actividad
        $stmt_status = $pdo->prepare("SELECT nombre_estado FROM estados WHERE id_estado = :status_id");
        $stmt_status->execute([':status_id' => $statusId]);
        $statusName = $stmt_status->fetchColumn();

        logActivity($pdo, $userId, 'Gestión de Pedido Web', "El pedido web #${cartId} se marcó como '${statusName}'.");
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Estado del pedido actualizado.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudo actualizar el estado del pedido.']);
    }
    break;







/********************************************************************************/

case 'pos_get_sale_by_id':
    if ($method === 'GET' && isset($_GET['sale_id'])) {
        try {
            $sale_id = filter_var($_GET['sale_id'], FILTER_VALIDATE_INT);
            if (!$sale_id) {
                throw new Exception("Número de ticket no válido.");
            }

            // Primero, verifica si la venta existe y no está ya en proceso por otro usuario
            $stmt_check = $pdo->prepare("SELECT id_venta, estado_id FROM ventas WHERE id_venta = :sale_id");
            $stmt_check->execute([':sale_id' => $sale_id]);
            $sale_status = $stmt_check->fetch(PDO::FETCH_ASSOC);

            if (!$sale_status) {
                throw new Exception("El ticket #${sale_id} no fue encontrado.");
            }
            if ($sale_status['estado_id'] === 8) { // 8 = En Proceso
                throw new Exception("El ticket #${sale_id} ya está siendo procesado en otra terminal.");
            }
            if ($sale_status['estado_id'] !== 29) { // 29 = Venta Realizada
                 throw new Exception("El ticket #${sale_id} no es una venta finalizada y no se puede cargar.");
            }

            // Obtener los detalles de los productos de esa venta
            $stmt_items = $pdo->prepare("
                SELECT 
                    p.id_producto, p.codigo_producto, p.nombre_producto, p.precio_venta, 
                    p.precio_oferta, p.precio_mayoreo, p.stock_actual, p.usa_inventario, 
                    dv.cantidad, p.stock_actual as stock_actual_inicial
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = :sale_id
            ");
            $stmt_items->execute([':sale_id' => $sale_id]);
            $ticket_items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'sale_id' => $sale_id, 'ticket_items' => $ticket_items]);

        } catch (Exception $e) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
    break;

case 'pos_get_sales_history':
    if ($method === 'GET' && isset($_GET['date'])) {
        try {
            $filter_date = $_GET['date'];
            // MODIFICACIÓN: Se incluyen ventas finalizadas (29) y canceladas (16)
            $stmt = $pdo->prepare("
                SELECT 
                    v.id_venta,
                    v.fecha_venta,
                    c.nombre_usuario AS nombre_cliente,
                    (SELECT COUNT(*) FROM detalle_ventas dv WHERE dv.id_venta = v.id_venta) AS cantidad_items,
                    v.monto_total,
                    v.estado_id 
                FROM ventas v
                JOIN clientes c ON v.id_cliente = c.id_cliente
                WHERE DATE(v.fecha_venta) = :filter_date AND v.estado_id IN (29, 16)
                ORDER BY v.fecha_venta DESC
            ");
            $stmt->execute([':filter_date' => $filter_date]);
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'sales' => $sales]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al obtener el historial de ventas: ' . $e->getMessage()]);
        }
    }
    break;


case 'pos_get_sale_details':
    if ($method === 'GET' && isset($_GET['sale_id'])) {
        try {
            $sale_id = $_GET['sale_id'];
            
            // MODIFICACIÓN: Se añade v.estado_id a la consulta
            $stmt_sale = $pdo->prepare("
                SELECT 
                    v.id_venta,
                    c.nombre_usuario AS nombre_cliente,
                    mp.nombre_metodo AS metodo_pago,
                    v.estado_id
                FROM ventas v
                JOIN clientes c ON v.id_cliente = c.id_cliente
                JOIN metodos_pago mp ON v.id_metodo_pago = mp.id_metodo_pago
                WHERE v.id_venta = :sale_id
            ");
            $stmt_sale->execute([':sale_id' => $sale_id]);
            $sale_details = $stmt_sale->fetch(PDO::FETCH_ASSOC);

            if (!$sale_details) {
                throw new Exception('Venta no encontrada.');
            }

            $stmt_items = $pdo->prepare("
                SELECT 
                    dv.cantidad,
                    p.nombre_producto,
                    dv.precio_unitario,
                    dv.subtotal
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = :sale_id
            ");
            $stmt_items->execute([':sale_id' => $sale_id]);
            $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

            $sale_details['items'] = $items;

            echo json_encode(['success' => true, 'details' => $sale_details]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al obtener los detalles de la venta: ' . $e->getMessage()]);
        }
    }
    break;

case 'pos_reverse_sale':
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $saleId = $data['sale_id'] ?? null;
        $userId = $_SESSION['id_usuario'] ?? null;

        if (!$saleId || !$userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Datos incompletos o sesión no válida.']);
            break;
        }
        
        $pdo->beginTransaction();
        try {
            // 1. Obtener los items y la info de la venta
            $stmt_items = $pdo->prepare("
                SELECT dv.id_producto, dv.cantidad, p.usa_inventario, p.stock_actual
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = :sale_id
            ");
            $stmt_items->execute([':sale_id' => $saleId]);
            $items_to_reverse = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

            // =================== INICIO DE LA NUEVA LÓGICA ===================
            // Preparamos la consulta para insertar en el historial de movimientos
            $stmt_log_movement = $pdo->prepare(
                "INSERT INTO movimientos_inventario (id_producto, id_estado, cantidad, stock_anterior, stock_nuevo, id_usuario, notas)
                 VALUES (:product_id, 12, :cantidad, :stock_anterior, :stock_nuevo, :user_id, :notas)" // Usamos el estado 12 = 'Devuelto'
            );
            // =================== FIN DE LA NUEVA LÓGICA ===================

            // 2. Revertir el stock para cada producto que usa inventario
            $stmt_update_stock = $pdo->prepare("UPDATE productos SET stock_actual = stock_actual + :quantity WHERE id_producto = :product_id");
            foreach ($items_to_reverse as $item) {
                if ($item['usa_inventario']) {
                    $stock_anterior = $item['stock_actual'];
                    $stock_nuevo = $stock_anterior + $item['cantidad'];

                    // Actualizamos el stock en la tabla de productos
                    $stmt_update_stock->execute([
                        ':quantity' => $item['cantidad'],
                        ':product_id' => $item['id_producto']
                    ]);

                    // =================== INICIO DE LA NUEVA LÓGICA ===================
                    // Insertamos el registro de la devolución en el historial de inventario
                    $stmt_log_movement->execute([
                        ':product_id' => $item['id_producto'],
                        ':cantidad' => $item['cantidad'], // La cantidad es positiva porque es una entrada/devolución
                        ':stock_anterior' => $stock_anterior,
                        ':stock_nuevo' => $stock_nuevo,
                        ':user_id' => $userId,
                        ':notas' => "Reversión por cancelación de Venta POS No. {$saleId}"
                    ]);
                    // =================== FIN DE LA NUEVA LÓGICA ===================
                }
            }

            // 3. Cambiar el estado de la venta a 'Cancelada' (ID 16)
            $stmt_cancel = $pdo->prepare("UPDATE ventas SET estado_id = 16 WHERE id_venta = :sale_id AND estado_id = 29");
            $stmt_cancel->execute([':sale_id' => $saleId]);

            // 4. Registrar la acción en el log de actividad principal
            logActivity($pdo, $userId, 'Venta POS Cancelada', "Se canceló y revirtió la venta POS No. {$saleId}. El stock fue restaurado y registrado en movimientos.");

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Venta cancelada y stock revertido correctamente.']);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al cancelar la venta: ' . $e->getMessage()]);
        }
    }
    break;
/*************************************************************************************************/
case 'pos_get_product_by_code':
    if (isset($_GET['code'])) {
        $code = trim($_GET['code']);
        // --- INICIO DE LA CORRECCIÓN ---
        // Se añaden los campos precio_oferta y precio_mayoreo a la consulta
        $stmt = $pdo->prepare(
            "SELECT id_producto, codigo_producto, nombre_producto, precio_venta, precio_oferta, precio_mayoreo, stock_actual, usa_inventario 
             FROM productos 
             WHERE codigo_producto = :code AND estado = 1 
             LIMIT 1"
        );
        // --- FIN DE LA CORRECCIÓN ---
        $stmt->execute([':code' => $code]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($product) {
            echo json_encode(['success' => true, 'product' => $product]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Producto no encontrado o inactivo.']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No se proporcionó código de producto.']);
    }
    break;
    

     case 'admin/getUsers':
             // Seguridad
            try {
                $stmt = $pdo->query("SELECT id_usuario, nombre_usuario, permisos FROM usuarios WHERE rol = 'empleado' ORDER BY nombre_usuario");
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'users' => $users]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Error al obtener usuarios.']);
            }
            break;

        case 'admin/createUser':
            
            $data = json_decode(file_get_contents('php://input'), true);
            $username = trim($data['nombre_usuario'] ?? '');
            $password = $data['password'] ?? '';

            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Nombre de usuario y contraseña son obligatorios.']);
                break;
            }
            try {
                $password_hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("INSERT INTO usuarios (nombre_usuario, cod_acceso, rol) VALUES (:username, :password, 'empleado')");
                $stmt->execute([':username' => $username, ':password' => $password_hash]);
                echo json_encode(['success' => true, 'message' => 'Empleado creado con éxito.']);
            } catch (PDOException $e) {
                http_response_code(409); // Conflict
                echo json_encode(['success' => false, 'error' => 'El nombre de usuario ya existe.']);
            }
            break;

        case 'admin/updateUserPermissions':
            
            $data = json_decode(file_get_contents('php://input'), true);
            $userId = filter_var($data['id_usuario'] ?? 0, FILTER_VALIDATE_INT);
            $permissions = $data['permisos'] ?? [];

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID de usuario no válido.']);
                break;
            }
            try {
                $permissionsJson = json_encode($permissions);
                $stmt = $pdo->prepare("UPDATE usuarios SET permisos = :permissions WHERE id_usuario = :id AND rol = 'empleado'");
                $stmt->execute([':permissions' => $permissionsJson, ':id' => $userId]);
                echo json_encode(['success' => true, 'message' => 'Permisos actualizados.']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Error al guardar los permisos.']);
            }
            break;

        case 'admin/deleteUser':
            
            $data = json_decode(file_get_contents('php://input'), true);
            $userId = filter_var($data['id_usuario'] ?? 0, FILTER_VALIDATE_INT);

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID de usuario no válido.']);
                break;
            }
            try {
                $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id_usuario = :id AND rol = 'empleado'");
                $stmt->execute([':id' => $userId]);
                echo json_encode(['success' => true, 'message' => 'Usuario eliminado correctamente.']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Error al eliminar el usuario.']);
            }
            break;

/**************************************************************************************/
/**************************************************************************************/
/**************************************************************************************/
/**************************************************************************************/

case 'admin/userSalesStats':
    try {
        $stmt = $pdo->prepare("
            SELECT 
                u.nombre_usuario,
                COUNT(v.id_venta) AS numero_ventas,
                SUM(v.monto_total) AS total_vendido
            FROM ventas v
            JOIN usuarios u ON v.id_usuario_venta = u.id_usuario
            WHERE v.fecha_venta >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND v.estado_id = 29
            GROUP BY u.id_usuario, u.nombre_usuario
            ORDER BY total_vendido DESC
        ");
        $stmt->execute();
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'stats' => $stats]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener estadísticas por usuario: ' . $e->getMessage()]);
    }
    break;
case 'pos_check_card_balance':
    if ($method === 'GET' && isset($_GET['card_number'])) {
        try {
            $card_number = trim($_GET['card_number']);
            $stmt = $pdo->prepare(
                "SELECT id_cliente, saldo, estado_id 
                 FROM tarjetas_recargables 
                 WHERE numero_tarjeta = :card_number"
            );
            $stmt->execute([':card_number' => $card_number]);
            $card = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($card) {
                echo json_encode(['success' => true, 'card' => $card]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Tarjeta no encontrada.']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error de base de datos.']);
        }
    }
    break;










/**************************************************************************************/
/**************************************************************************************/

// Reemplaza este case en tu archivo /api/index.php

case 'admin/activityLog':
    if ($method == 'GET') {
        $filter_date = $_GET['date'] ?? date('Y-m-d');

        // --- INICIO DE LA CORRECCIÓN ---
        $sql = "(SELECT
                    u.nombre_usuario,
                    -- Se interpreta el estado para mostrar un texto más claro
                    CASE e.nombre_estado
                        WHEN 'Entrada' THEN '✅ Entrada de Stock'
                        WHEN 'Salida' THEN '🛒 Salida por Venta'
                        WHEN 'Ajuste' THEN '🔧 Ajuste Manual'
                        WHEN 'Producto Eliminado' THEN '❌ Producto Eliminado'
                        ELSE e.nombre_estado
                    END as tipo_accion,
                    CONCAT(mi.cantidad, ' unidades a: ', p.nombre_producto) as descripcion,
                    mi.fecha as fecha
                FROM movimientos_inventario mi
                JOIN usuarios u ON mi.id_usuario = u.id_usuario
                JOIN productos p ON mi.id_producto = p.id_producto
                JOIN estados e ON mi.id_estado = e.id_estado
                WHERE mi.id_usuario IS NOT NULL AND DATE(mi.fecha) = :date1)
        -- --- FIN DE LA CORRECCIÓN ---
                
                UNION ALL
                
                (SELECT
                    u.nombre_usuario,
                    'Venta POS Procesada' as tipo_accion,
                    CONCAT('ID Venta: ', v.id_venta, ', Total: $', v.monto_total) as descripcion,
                    v.fecha_venta as fecha
                FROM ventas v
                JOIN usuarios u ON v.id_usuario_venta = u.id_usuario
                WHERE v.id_usuario_venta IS NOT NULL 
                  AND v.estado_id = 29
                  AND DATE(v.fecha_venta) = :date2)
                
                UNION ALL
                
                (SELECT
                    u.nombre_usuario,
                    'Tarjeta Asignada' as tipo_accion,
                    CONCAT('Tarjeta ', tr.numero_tarjeta, ' a cliente ', c.nombre_usuario) as descripcion,
                    tr.fecha_activacion as fecha
                FROM tarjetas_recargables tr
                JOIN usuarios u ON tr.asignada_por_usuario_id = u.id_usuario
                JOIN clientes c ON tr.id_cliente = c.id_cliente
                WHERE tr.asignada_por_usuario_id IS NOT NULL AND tr.fecha_activacion IS NOT NULL AND DATE(tr.fecha_activacion) = :date3)
                
                UNION ALL
                
                (SELECT
                    u.nombre_usuario,
                    ra.tipo_accion,
                    ra.descripcion,
                    ra.fecha
                FROM registros_actividad ra
                JOIN usuarios u ON ra.id_usuario = u.id_usuario
                WHERE DATE(ra.fecha) = :date4)


                UNION ALL

                (SELECT
                    c.nombre_usuario,
                    'Pedido Web Recibido' as tipo_accion,
                    CONCAT('Nuevo pedido en línea (#', cc.id_carrito, ')') as descripcion,
                    cc.fecha_creacion as fecha
                FROM carritos_compra cc
                JOIN clientes c ON cc.id_cliente = c.id_cliente
                WHERE cc.estado_id = 8 AND DATE(cc.fecha_creacion) = :date5)

                ORDER BY fecha DESC
                LIMIT 200";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':date1' => $filter_date,
            ':date2' => $filter_date,
            ':date3' => $filter_date,
            ':date4' => $filter_date,
            ':date5' => $filter_date
        ]);

        $log = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'log' => $log]);
    }
    break;
/**************************************************************************************/
/**************************************************************************************/



case 'pos_search_products':
    if (isset($_GET['query'])) {
        $query = '%' . $_GET['query'] . '%';
        // --- INICIO DE LA CORRECCIÓN ---
        $stmt = $pdo->prepare("
            SELECT 
                p.id_producto, p.codigo_producto, p.nombre_producto, p.precio_venta, 
                p.stock_actual, p.usa_inventario, d.departamento as nombre_departamento
            FROM productos p
            JOIN departamentos d ON p.departamento = d.id_departamento
            WHERE (p.nombre_producto LIKE :query OR p.codigo_producto LIKE :query) AND p.estado = 1 
            LIMIT 20
        ");
        // --- FIN DE LA CORRECCIÓN ---
        $stmt->execute([':query' => $query]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    break;

case 'pos_start_sale':
    if ($method === 'POST') {
        if (!isset($_SESSION['id_usuario']) || empty($_SESSION['id_usuario'])) {
            http_response_code(403); echo json_encode(['success' => false, 'error' => 'No autorizado.']); break;
        }
        $id_usuario_actual = $_SESSION['id_usuario'];
        $pdo->beginTransaction();
        try {
            $stmt_find = $pdo->prepare("SELECT id_venta FROM ventas WHERE id_usuario_venta = :id_usuario AND estado_id = 8 LIMIT 1");
            $stmt_find->execute([':id_usuario' => $id_usuario_actual]);
            $saleId = $stmt_find->fetchColumn();
            $ticket_items = [];

            if ($saleId) {
                $stmt_items = $pdo->prepare("
              SELECT 
                    p.id_producto, p.codigo_producto, p.nombre_producto, p.precio_venta, 
                    p.precio_oferta, p.precio_mayoreo, p.stock_actual, p.usa_inventario, 
                    dv.cantidad, p.stock_actual as stock_actual_inicial
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = :sale_id
            ");
                $stmt_items->execute([':sale_id' => $saleId]);
                $ticket_items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $stmt_default_client = $pdo->prepare("SELECT id_cliente FROM clientes WHERE nombre_usuario = 'publico_general' LIMIT 1");
                $stmt_default_client->execute();
                $default_client_id = $stmt_default_client->fetchColumn();

                if (!$default_client_id) {
                    $pdo->exec("INSERT INTO clientes (id_cliente, nombre_usuario, nombre, email, telefono, id_tipo_cliente) VALUES (1, 'publico_general', 'Público en General', 'sin@correo.com', '00000000', 1) ON DUPLICATE KEY UPDATE id_cliente=id_cliente");
                    $default_client_id = 1;
                }

                $stmt_create = $pdo->prepare("INSERT INTO ventas (id_cliente, id_usuario_venta, id_metodo_pago, monto_total, estado_id) VALUES (:id_cliente, :id_usuario, 1, 0.00, 8)");
                $stmt_create->execute([':id_cliente' => $default_client_id, ':id_usuario' => $id_usuario_actual]);
                $saleId = $pdo->lastInsertId();
                
                // --- CORRECCIÓN: Se ha eliminado el registro de actividad de esta sección ---
                // logActivity($pdo, $id_usuario_actual, 'Inicio de Ticket POS', "Se inició el ticket de venta POS No. {$saleId}.");
            }
            
            $pdo->commit();
            echo json_encode(['success' => true, 'sale_id' => $saleId, 'ticket_items' => $ticket_items]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error de BD: ' . $e->getMessage()]);
        }
    }
    break;
            
case 'pos_add_item':
     if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sale_id = $data['sale_id']; $product_id = $data['product_id']; $quantity = $data['quantity']; $unit_price = $data['unit_price'];
        $pdo->beginTransaction();
        try {
            if ($quantity <= 0) {
                $stmt_delete = $pdo->prepare("DELETE FROM detalle_ventas WHERE id_venta = :sale_id AND id_producto = :product_id");
                $stmt_delete->execute([':sale_id' => $sale_id, ':product_id' => $product_id]);
            } else {
                $stmt = $pdo->prepare("SELECT id_detalle_venta FROM detalle_ventas WHERE id_venta = :sale_id AND id_producto = :product_id");
                $stmt->execute([':sale_id' => $sale_id, ':product_id' => $product_id]);
                $existing_detail_id = $stmt->fetchColumn();
                $subtotal = $quantity * $unit_price;
                if ($existing_detail_id) {
                    $stmt_update = $pdo->prepare("UPDATE detalle_ventas SET cantidad = :qty, subtotal = :subtotal, precio_unitario = :price WHERE id_detalle_venta = :id");
                    $stmt_update->execute([':qty' => $quantity, ':subtotal' => $subtotal, ':price' => $unit_price, ':id' => $existing_detail_id]);
                } else {
                    $stmt_insert = $pdo->prepare("INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (:sale_id, :product_id, :qty, :price, :subtotal)");
                    $stmt_insert->execute([':sale_id' => $sale_id, ':product_id' => $product_id, ':qty' => $quantity, ':price' => $unit_price, ':subtotal' => $subtotal]);
                }
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack(); http_response_code(400); echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
    break;





// Reemplaza este case en tu archivo /api/index.php

// Reemplaza este case en tu archivo: api/index.php

case 'pos_finalize_sale':
    if ($method === 'POST' && isset($inputData['sale_id'], $inputData['client_id'], $inputData['payment_method_id'], $inputData['total_amount'])) {
        
        $saleId = $inputData['sale_id'];
        $clientId = $inputData['client_id']; // ID del cliente (puede ser el dueño de la tarjeta)
        $paymentMethodId = $inputData['payment_method_id'];
        $totalAmount = $inputData['total_amount'];
        $cardNumber = $inputData['card_number'] ?? null;
        $userId = $_SESSION['id_usuario'] ?? 1; 

        $pdo->beginTransaction();

        try {
            // 1. Actualizar la venta con el ID del cliente correcto (el dueño de la tarjeta si aplica)
            $stmt = $pdo->prepare("UPDATE ventas SET id_cliente = :id_cliente, id_metodo_pago = :id_metodo_pago, monto_total = :monto_total, estado_id = 29, id_usuario_venta = :id_usuario_venta WHERE id_venta = :id_venta");
            $stmt->execute([
                ':id_cliente' => $clientId,
                ':id_metodo_pago' => $paymentMethodId,
                ':monto_total' => $totalAmount,
                ':id_venta' => $saleId,
                ':id_usuario_venta' => $userId
            ]);

            // --- Lógica para pago con Tarjeta Interna (MODIFICADA) ---
            if ($paymentMethodId == 2) { 
                if (empty($cardNumber)) throw new Exception('El número de tarjeta es obligatorio.');
                
                $stmtCard = $pdo->prepare("SELECT id_tarjeta, saldo, id_cliente FROM tarjetas_recargables WHERE numero_tarjeta = :numero_tarjeta FOR UPDATE");
                $stmtCard->execute([':numero_tarjeta' => $cardNumber]);
                $card = $stmtCard->fetch(PDO::FETCH_ASSOC);

                if (!$card) throw new Exception('La tarjeta proporcionada no existe.');
                // SE ELIMINA LA VALIDACIÓN DE PERTENENCIA. Ahora cualquier tarjeta con saldo puede pagar.
                if ($card['saldo'] < $totalAmount) throw new Exception('Saldo insuficiente en la tarjeta.');
                
                $newBalance = $card['saldo'] - $totalAmount;
                $stmtUpdate = $pdo->prepare("UPDATE tarjetas_recargables SET saldo = :saldo WHERE id_tarjeta = :id_tarjeta");
                $stmtUpdate->execute([':saldo' => $newBalance, ':id_tarjeta' => $card['id_tarjeta']]);
                
                $stmtVenta = $pdo->prepare("UPDATE ventas SET id_tarjeta_recargable = :id_tarjeta WHERE id_venta = :id_venta");
                $stmtVenta->execute([':id_tarjeta' => $card['id_tarjeta'], ':id_venta' => $saleId]);
            }

            // --- Lógica de inventario y logging (sin cambios) ---
            $stmt_items = $pdo->prepare("
                SELECT dv.id_producto, dv.cantidad, p.stock_actual, p.usa_inventario
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = :sale_id AND p.usa_inventario = 1
            ");
            $stmt_items->execute([':sale_id' => $saleId]);
            $items_to_update = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

            $stmt_update_stock = $pdo->prepare("UPDATE productos SET stock_actual = stock_actual - :quantity WHERE id_producto = :product_id");
            $stmt_log_movement = $pdo->prepare(
                "INSERT INTO movimientos_inventario (id_producto, id_estado, cantidad, stock_anterior, stock_nuevo, id_usuario, notas)
                 VALUES (:product_id, (SELECT id_estado FROM estados WHERE nombre_estado = 'Salida'), :cantidad, :stock_anterior, :stock_nuevo, :user_id, :notas)"
            );

            foreach ($items_to_update as $item) {
                $quantity_sold = $item['cantidad'];
                $stock_anterior = $item['stock_actual'];
                $stock_nuevo = $stock_anterior - $quantity_sold;
                $stmt_update_stock->execute([':quantity' => $quantity_sold, ':product_id' => $item['id_producto']]);
                $stmt_log_movement->execute([
                    ':product_id' => $item['id_producto'], ':cantidad' => -$quantity_sold, 
                    ':stock_anterior' => $stock_anterior, ':stock_nuevo' => $stock_nuevo,
                    ':user_id' => $userId, ':notas' => "Venta POS No. {$saleId}"
                ]);
            }
            
            logActivity($pdo, $userId, 'Venta POS Finalizada', "Se finalizó la venta POS No. {$saleId} con un total de $ {$totalAmount}.");

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Venta finalizada con éxito.']);

        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Datos incompletos para finalizar la venta.']);
    }
    break;









case 'pos_cancel_sale':
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true); $sale_id = $data['sale_id'];
        $stmt = $pdo->prepare("DELETE FROM ventas WHERE id_venta = :sale_id AND estado_id = 8");
        if ($stmt->execute([':sale_id' => $sale_id])) {
             // --- CORRECCIÓN: Se ha eliminado el registro de actividad de esta sección ---
             // logActivity($pdo, $_SESSION['id_usuario'], 'Venta POS Cancelada', "Se canceló y eliminó el ticket de venta POS No. {$sale_id}.");
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No se pudo cancelar la venta.']);
        }
    }
    break;
            
case 'pos_search_clients':
     if (isset($_GET['query'])) {
        $query = '%' . $_GET['query'] . '%';
        $stmt = $pdo->prepare("SELECT id_cliente, nombre, apellido, nombre_usuario FROM clientes WHERE nombre LIKE :query OR apellido LIKE :query OR nombre_usuario LIKE :query LIMIT 10");
        $stmt->execute([':query' => $query]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    break;


/**************************************************************************************/
/**************************************************************************************/
/**************************************************************************************/

//Estadistica

case 'admin/getSalesStats':
    header('Content-Type: application/json');

    try {
        $startDateStr = $_GET['startDate'] ?? date('Y-m-d', strtotime('-1 month'));
        $endDateStr = $_GET['endDate'] ?? date('Y-m-d');
        
        $startDate = new DateTime($startDateStr);
        $endDate = new DateTime($endDateStr);
        $endDate->modify('+1 day');
        $endDateTimeForQuery = $endDateStr . ' 23:59:59';

        $stats = [
            'total_revenue' => '0.00',
            'sales_by_payment' => [],
            'daily_sales' => [],
            'average_sale' => '0.00'
        ];
        
        // =================== INICIO DE LA CORRECCIÓN ===================
        // Se añade "v.estado_id = 29" para asegurar que solo las ventas finalizadas (no las canceladas) se incluyan en el cálculo.
        $unifiedSalesQuery = "
            SELECT v.fecha_venta AS fecha_transaccion, v.monto_total AS monto_transaccion, v.id_metodo_pago AS id_metodo_pago_transaccion
            FROM ventas v
            WHERE v.estado_id = 29 AND v.fecha_venta BETWEEN :startDate AND :endDateTimeForQuery
            UNION ALL
            SELECT cc.fecha_creacion AS fecha_transaccion, SUM(dc.cantidad * dc.precio_unitario) AS monto_transaccion, cc.id_metodo_pago AS id_metodo_pago_transaccion
            FROM carritos_compra cc
            JOIN detalle_carrito dc ON cc.id_carrito = dc.id_carrito
            WHERE cc.estado_id = 23 AND cc.fecha_creacion BETWEEN :startDate AND :endDateTimeForQuery
            GROUP BY cc.id_carrito
        ";
        // =================== FIN DE LA CORRECCIÓN ===================

        $stmt_revenue = $pdo->prepare("SELECT COALESCE(SUM(monto_transaccion), 0) FROM ({$unifiedSalesQuery}) AS combined_sales");
        $stmt_revenue->execute([':startDate' => $startDateStr, ':endDateTimeForQuery' => $endDateTimeForQuery]);
        $totalRevenue = $stmt_revenue->fetchColumn();
        $stats['total_revenue'] = number_format($totalRevenue, 2);
        
        $stmt_payment = $pdo->prepare("SELECT m.nombre_metodo, COUNT(*) as count FROM ({$unifiedSalesQuery}) AS combined_sales JOIN metodos_pago m ON combined_sales.id_metodo_pago_transaccion = m.id_metodo_pago GROUP BY m.nombre_metodo");
        $stmt_payment->execute([':startDate' => $startDateStr, ':endDateTimeForQuery' => $endDateTimeForQuery]);
        $salesByPayment = $stmt_payment->fetchAll(PDO::FETCH_ASSOC);
        $stats['sales_by_payment'] = $salesByPayment;

        $totalSalesCount = 0;
        foreach ($salesByPayment as $paymentMethod) {
            $totalSalesCount += $paymentMethod['count'];
        }

        if ($totalSalesCount > 0) {
            $average = $totalRevenue / $totalSalesCount;
            $stats['average_sale'] = number_format($average, 2);
        }

        $stmt_daily_raw = $pdo->prepare("SELECT DATE(fecha_transaccion) as fecha, SUM(monto_transaccion) as daily_total FROM ({$unifiedSalesQuery}) AS combined_sales GROUP BY DATE(fecha_transaccion) ORDER BY fecha ASC");
        $stmt_daily_raw->execute([':startDate' => $startDateStr, ':endDateTimeForQuery' => $endDateTimeForQuery]);
        $salesData = $stmt_daily_raw->fetchAll(PDO::FETCH_ASSOC);
        
        $salesByDate = [];
        foreach ($salesData as $row) {
            $salesByDate[$row['fecha']] = $row['daily_total'];
        }

        $period = new DatePeriod($startDate, new DateInterval('P1D'), $endDate);
        $fullDailySales = [];
        foreach ($period as $date) {
            $dateString = $date->format('Y-m-d');
            $fullDailySales[] = ['fecha' => $dateString, 'daily_total' => $salesByDate[$dateString] ?? '0.00'];
        }
        $stats['daily_sales'] = $fullDailySales;
        
        $response = ['success' => true, 'stats' => $stats];

    } catch (Exception $e) {
        http_response_code(500);
        $response = ['success' => false, 'error' => $e->getMessage()];
    }

    echo json_encode($response);
    break;

case 'admin/getProductStats':
    // require_admin();
    try {
        // --- INICIO DE LA LÓGICA CORREGIDA ---
        // Top 5 productos más vendidos, combinando TPV (detalle_ventas) y Web (detalle_carrito)
        $stmt_top_products = $pdo->query("
            SELECT
                p.nombre_producto,
                SUM(combined_sales.total_sold) as total_sold
            FROM (
                -- Parte 1: Ventas del TPV (esto ya era correcto)
                SELECT
                    id_producto,
                    subtotal AS total_sold
                FROM detalle_ventas

                UNION ALL

                -- LA CORRECCIÓN CLAVE ESTÁ AQUÍ:
                -- Ya no agrupamos ni sumamos dentro de esta parte.
                -- Simplemente calculamos el subtotal de CADA LÍNEA de producto.
                SELECT
                    dc.id_producto,
                    (dc.cantidad * dc.precio_unitario) AS total_sold
                FROM detalle_carrito dc
                JOIN carritos_compra cc ON dc.id_carrito = cc.id_carrito
                WHERE cc.estado_id = 23 -- Solo carritos con estado 'Pedido Enviado'

            ) AS combined_sales
            JOIN productos p ON combined_sales.id_producto = p.id_producto
            GROUP BY p.id_producto, p.nombre_producto
            ORDER BY total_sold DESC
            LIMIT 5
        ");
        $top_products = $stmt_top_products->fetchAll(PDO::FETCH_ASSOC);
        // --- FIN DE LA LÓGICA CORREGIDA ---

        // Productos con bajo stock (esta parte no necesita cambios)
        $stmt_low_stock = $pdo->query("
            SELECT nombre_producto, stock_actual, stock_minimo
            FROM productos
            WHERE usa_inventario = 1 AND stock_actual <= stock_minimo AND estado = 1
            ORDER BY (stock_actual - stock_minimo) ASC
            LIMIT 10
        ");
        $low_stock_products = $stmt_low_stock->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'stats' => [
                'top_products' => $top_products,
                'low_stock_products' => $low_stock_products
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

//Backup de base de datos
case 'admin/createBackup':
    // Aumentamos el tiempo de ejecución a 2 minutos para evitar timeouts
    set_time_limit(120);
    error_reporting(0);
    ini_set('display_errors', 0);

    $mysqldump_command = ''; // Inicializamos la variable

    try {
        $mysqldump_executable = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
        //$mysqldump_executable = 'mysqldump.exe';
        $backup_dir = __DIR__ . '/../admin/backups/';

        if (!is_dir($backup_dir)) {
            if (!mkdir($backup_dir, 0777, true)) {
                 throw new Exception("Error de permisos: No se pudo crear la carpeta 'admin/backups'. Asegúrate de que la carpeta 'admin' tenga permisos de escritura.");
            }
        }

        $backup_file = 'DBBACKUP' . DB_NAME . '_' . date("Y-m-d_H-i-s") . '.sql';
        $backup_path = $backup_dir . $backup_file;

        // Construcción del comando, ahora sin escapeshellarg en la contraseña para probar
        // y con comillas dobles para proteger las rutas.
        $mysqldump_command = sprintf(
            '"%s" --user="%s" --password="%s" --host="%s" --port=%s %s > "%s"',
            $mysqldump_executable,
            DB_USER,
            DB_PASS, // Se pasa directamente. Asegúrate de que no tenga caracteres especiales de la consola.
            DB_HOST,
            DB_PORT,
            DB_NAME,
            $backup_path
        );
        
        $output = [];
        $return_var = null;
        
        exec($mysqldump_command . ' 2>&1', $output, $return_var);

        if ($return_var !== 0) {
            $error_details = !empty($output) ? implode("\n", $output) : "No se recibió salida del comando.";
            throw new Exception("Falló la ejecución de mysqldump (código de error: $return_var).<br><br><b>Detalles:</b><br>" . htmlspecialchars($error_details));
        }
        
        if (!file_exists($backup_path) || filesize($backup_path) === 0) {
            throw new Exception("El comando parece haberse ejecutado, pero el archivo de backup no se creó o está vacío. Revisa los permisos de escritura.");
        }

        echo json_encode([
            'success' => true,
            'message' => '¡Copia de seguridad creada con éxito!',
            'download_url' => 'index.php?resource=admin/downloadBackup&file=' . urlencode($backup_file),
            'file_name' => $backup_file
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        // Ahora el mensaje de error incluirá el comando exacto que se intentó ejecutar.
        echo json_encode([
            'success' => false,
            'message' => 'Ocurrió un error al intentar crear el backup.',
            'details' => $e->getMessage() . "<br><br><b>Comando ejecutado:</b><br>" . htmlspecialchars($mysqldump_command)
        ]);
    } finally {
        error_reporting(E_ALL);
        ini_set('display_errors', 1);
    }
    break;

case 'admin/downloadBackup':
    // require_admin(); // Seguridad de sesión

    $backup_dir = __DIR__ . '/../admin/backups/';
    $file_name = $_GET['file'] ?? '';

    // Validación de seguridad para evitar que accedan a otros directorios
    if (basename($file_name) !== $file_name) {
        http_response_code(400);
        die('Nombre de archivo no válido.');
    }

    $file_path = $backup_dir . $file_name;

    if (file_exists($file_path)) {
        header('Content-Description: File Transfer');
        
        // --- Lógica para determinar el Content-Type ---
        // Si el archivo termina en .gz, es un archivo comprimido.
        if (str_ends_with($file_name, '.gz')) {
            header('Content-Type: application/gzip');
        } else {
            // Si no, es un archivo SQL de texto plano.
            header('Content-Type: application/sql');
        }
        
        header('Content-Disposition: attachment; filename="' . basename($file_path) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($file_path));
        
        // Limpia cualquier salida anterior para evitar corrupción del archivo
        ob_clean();
        flush();
        
        // Lee el archivo y lo envía directamente al navegador
        readfile($file_path);
        
        // Detiene el script para asegurar que no se envíe nada más.
        exit;
    } else {
        http_response_code(404);
        die('Archivo de backup no encontrado.');
    }
    break; // Aunque exit; detiene el script, es buena práctica mantener el break.

//Tarjetas


case 'admin/getCardDetails':
    // require_admin();
    $searchTerm = $_GET['search'] ?? '';
    if (empty($searchTerm)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Término de búsqueda no proporcionado.']);
        break;
    }
    try {
        // CORRECCIÓN: Se usan dos placeholders diferentes para la búsqueda.
        $stmt = $pdo->prepare("
            SELECT tr.id_tarjeta, tr.numero_tarjeta, tr.saldo, c.nombre_usuario, c.nombre, c.apellido, e.nombre_estado
            FROM tarjetas_recargables tr
            JOIN clientes c ON tr.id_cliente = c.id_cliente
            JOIN estados e ON tr.estado_id = e.id_estado
            WHERE tr.numero_tarjeta = :search_card OR c.nombre_usuario = :search_user
        ");
        
        // CORRECCIÓN: Se asigna el mismo valor a los dos placeholders.
        $stmt->execute([
            ':search_card' => $searchTerm,
            ':search_user' => $searchTerm
        ]);
        
        $card_details = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($card_details) {
            echo json_encode(['success' => true, 'card' => $card_details]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No se encontró ninguna tarjeta asignada con ese número o usuario.']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        // Para depuración, podrías mostrar $e->getMessage()
        echo json_encode(['success' => false, 'error' => 'Error en la base de datos.']);
    }
    break;

case 'admin/rechargeCard':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $card_id = filter_var($data['card_id'] ?? 0, FILTER_VALIDATE_INT);
    $amount = filter_var($data['amount'] ?? 0, FILTER_VALIDATE_FLOAT);
    $userId = $_SESSION['id_usuario'] ?? null; // Captura el ID del usuario admin

    if (!$card_id || $amount <= 0 || !$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos de recarga inválidos o sesión no iniciada.']);
        break;
    }

    $pdo->beginTransaction();
    try {
        // 1. Obtenemos la información de la tarjeta y el cliente para el log
        $stmt_info = $pdo->prepare(
            "SELECT tr.numero_tarjeta, c.nombre_usuario 
             FROM tarjetas_recargables tr 
             JOIN clientes c ON tr.id_cliente = c.id_cliente 
             WHERE tr.id_tarjeta = :card_id"
        );
        $stmt_info->execute([':card_id' => $card_id]);
        $cardInfo = $stmt_info->fetch(PDO::FETCH_ASSOC);

        if (!$cardInfo) {
            throw new Exception("La tarjeta o el cliente asociado no existen.");
        }

        // 2. Aplicamos la recarga (sumamos el monto al saldo actual)
        $stmt_update = $pdo->prepare("UPDATE tarjetas_recargables SET saldo = saldo + :amount WHERE id_tarjeta = :card_id");
        $stmt_update->execute([':amount' => $amount, ':card_id' => $card_id]);
        
        // 3. Insertamos el registro de la actividad en la tabla 'registros_actividad'
        $stmt_log = $pdo->prepare(
            "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
             VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
        );
        
        $description = 'Recarga de $' . number_format($amount, 2) . ' a la tarjeta ' . $cardInfo['numero_tarjeta'] . ' (Cliente: ' . $cardInfo['nombre_usuario'] . ')';
        
        $stmt_log->execute([
            ':id_usuario'   => $userId,
            ':tipo_accion'  => 'Recarga de Tarjeta',
            ':descripcion'  => $description
        ]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Recarga de $' . number_format($amount, 2) . ' aplicada correctamente.']);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudo completar la recarga: ' . $e->getMessage()]);
    }
    break;


case 'admin/getCards':
            // require_admin();
            try {
                $stmt_unassigned = $pdo->prepare("SELECT id_tarjeta, numero_tarjeta, fecha_emision FROM tarjetas_recargables WHERE id_cliente IS NULL AND estado_id = 24 ORDER BY fecha_emision DESC");
                $stmt_unassigned->execute();
                $unassigned_cards = $stmt_unassigned->fetchAll(PDO::FETCH_ASSOC);
        
                $stmt_assigned = $pdo->prepare("
                    SELECT tr.id_tarjeta, tr.numero_tarjeta, tr.saldo, e.nombre_estado, c.nombre_usuario, c.nombre, c.apellido
                    FROM tarjetas_recargables tr
                    JOIN clientes c ON tr.id_cliente = c.id_cliente
                    JOIN estados e ON tr.estado_id = e.id_estado
                    WHERE tr.id_cliente IS NOT NULL
                    ORDER BY c.nombre_usuario
                ");
                $stmt_assigned->execute();
                $assigned_cards = $stmt_assigned->fetchAll(PDO::FETCH_ASSOC);
        
                echo json_encode(['success' => true, 'unassigned' => $unassigned_cards, 'assigned' => $assigned_cards]);
        
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            break;

case 'admin/createCards':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $quantity = filter_var($data['quantity'] ?? 0, FILTER_VALIDATE_INT);

    if (!$quantity || $quantity <= 0 || $quantity > 500) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cantidad no válida. Debe ser entre 1 y 500.']);
        break;
    }

    $pdo->beginTransaction();
    try {
        $userId = $_SESSION['id_usuario'] ?? null; // Capturamos el ID del administrador

        if (!$userId) {
            throw new Exception("No se ha podido identificar al usuario. Inicia sesión de nuevo.");
        }

        // --- SQL MODIFICADO: Añadimos la columna 'emitida_por_usuario_id' ---
        $stmt = $pdo->prepare(
            "INSERT INTO tarjetas_recargables (numero_tarjeta, estado_id, id_cliente, emitida_por_usuario_id) 
             VALUES (:numero_tarjeta, 24, NULL, :user_id)"
        );

        for ($i = 0; $i < $quantity; $i++) {
            $cardNumber = '221015' . substr(str_shuffle('0123456789'), 0, 7);
            // Pasamos el ID del usuario en cada inserción
            $stmt->execute([
                ':numero_tarjeta' => $cardNumber,
                ':user_id' => $userId
            ]);
        }

        // --- INICIO DE LA LÓGICA DE LOGGING ---
        $stmt_log = $pdo->prepare(
            "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
             VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
        );
        $stmt_log->execute([
            ':id_usuario'   => $userId,
            ':tipo_accion'  => 'Creación de Tarjetas',
            ':descripcion'  => 'Se crearon ' . $quantity . ' nuevas tarjetas sin asignar.'
        ]);
        // --- FIN DE LA LÓGICA DE LOGGING ---

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "$quantity tarjetas creadas y listas para asignar."]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al crear tarjetas: ' . $e->getMessage()]);
    }
    break;

case 'admin/getCustomersWithoutCard':
            // require_admin();
            $searchTerm = '%' . ($_GET['search'] ?? '') . '%';
            $stmt = $pdo->prepare("
                SELECT c.id_cliente, c.nombre, c.apellido, c.nombre_usuario
                FROM clientes c
                LEFT JOIN tarjetas_recargables tr ON c.id_cliente = tr.id_cliente
                WHERE tr.id_tarjeta IS NULL AND (c.nombre LIKE :search1 OR c.apellido LIKE :search2 OR c.nombre_usuario LIKE :search3)
                ORDER BY c.nombre ASC
                LIMIT 20
            ");
            $stmt->execute([':search1' => $searchTerm, ':search2' => $searchTerm, ':search3' => $searchTerm]);
            $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'customers' => $customers]);
            break;

case 'admin/assignCard':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $card_id = filter_var($data['card_id'] ?? 0, FILTER_VALIDATE_INT);
    $customer_id = filter_var($data['customer_id'] ?? 0, FILTER_VALIDATE_INT);
    $userId = $_SESSION['id_usuario'] ?? null;

    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'No se ha iniciado sesión correctamente.']);
        break;
    }
    if (!$card_id || !$customer_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos inválidos.']);
        break;
    }

    $pdo->beginTransaction(); // Iniciar transacción para seguridad
    try {
        // 1. Obtenemos los datos necesarios para el log ANTES de hacer el cambio.
        $stmt_info = $pdo->prepare(
            "SELECT tr.numero_tarjeta, c.nombre_usuario 
             FROM tarjetas_recargables tr, clientes c
             WHERE tr.id_tarjeta = :card_id AND c.id_cliente = :customer_id"
        );
        $stmt_info->execute([':card_id' => $card_id, ':customer_id' => $customer_id]);
        $info = $stmt_info->fetch(PDO::FETCH_ASSOC);

        if (!$info) {
            throw new Exception('La tarjeta o el cliente seleccionado no existen.');
        }

        // 2. Actualizamos la tarjeta para asignarla (ahora sin guardar datos de auditoría aquí).
        $stmt = $pdo->prepare(
            "UPDATE tarjetas_recargables 
             SET id_cliente = :customer_id, estado_id = 1, fecha_activacion = NOW()
             WHERE id_tarjeta = :card_id AND id_cliente IS NULL"
        );
        $stmt->execute([':customer_id' => $customer_id, ':card_id' => $card_id]);
        
        if ($stmt->rowCount() > 0) {
            // 3. Insertamos el registro centralizado en 'registros_actividad'.
            $stmt_log = $pdo->prepare(
                "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
                 VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
            );
            $description = 'Se asignó la tarjeta ' . $info['numero_tarjeta'] . ' al cliente ' . $info['nombre_usuario'];
            $stmt_log->execute([
                ':id_usuario'   => $userId,
                ':tipo_accion'  => 'Tarjeta Asignada',
                ':descripcion'  => $description
            ]);
            
            $pdo->commit(); // Confirmamos todos los cambios
            echo json_encode(['success' => true, 'message' => 'Tarjeta asignada y registrada correctamente.']);
        } else {
            throw new Exception('La tarjeta no pudo ser asignada (posiblemente ya está en uso).');
        }
    } catch (Exception $e) {
        $pdo->rollBack(); // Revertimos si algo falla
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;
case 'admin/deleteCard':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $card_id = filter_var($data['card_id'] ?? 0, FILTER_VALIDATE_INT);
    $userId = $_SESSION['id_usuario'] ?? null; // Capturamos el ID del administrador

    if (!$card_id || !$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de tarjeta no válido o sesión de administrador inválida.']);
        break;
    }
    
    $pdo->beginTransaction();
    try {
        // 1. Obtenemos el número de tarjeta ANTES de borrarla para poder registrarlo.
        $stmt_get_card = $pdo->prepare("SELECT numero_tarjeta FROM tarjetas_recargables WHERE id_tarjeta = :card_id AND id_cliente IS NULL");
        $stmt_get_card->execute([':card_id' => $card_id]);
        $cardNumber = $stmt_get_card->fetchColumn();

        if (!$cardNumber) {
            throw new Exception('La tarjeta no existe o ya está asignada.');
        }

        // 2. Intentamos eliminar la tarjeta bajo las condiciones de seguridad
        $stmt_delete = $pdo->prepare("DELETE FROM tarjetas_recargables WHERE id_tarjeta = :card_id AND id_cliente IS NULL AND saldo = 0.00");
        $stmt_delete->execute([':card_id' => $card_id]);

        if ($stmt_delete->rowCount() > 0) {
            // 3. Si se eliminó, registramos la acción en el log.
            $stmt_log = $pdo->prepare(
                "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
                 VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
            );
            
            $stmt_log->execute([
                ':id_usuario'   => $userId,
                ':tipo_accion'  => 'Tarjeta Eliminada',
                ':descripcion'  => 'Se eliminó la tarjeta sin asignar: ' . $cardNumber
            ]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Tarjeta eliminada con éxito.']);
        } else {
            // Si no se eliminó ninguna fila, es porque no cumplía las condiciones (tenía saldo).
            throw new Exception('No se puede eliminar. La tarjeta está asignada o tiene saldo.');
        }
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

case 'admin/getCardReport':
             // require_admin();
            try {
                $stmt = $pdo->prepare("
                    SELECT c.nombre_usuario, c.nombre, c.apellido, tr.numero_tarjeta, tr.saldo, e.nombre_estado
                    FROM tarjetas_recargables tr
                    JOIN clientes c ON tr.id_cliente = c.id_cliente
                    JOIN estados e ON tr.estado_id = e.id_estado
                    ORDER BY c.nombre_usuario
                ");
                $stmt->execute();
                $report_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'report' => $report_data]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            break;




//Deparamentos
case 'admin/getDepartments':
            // require_admin();
            try {
                // CORRECCIÓN: Se usa "departamento" para coincidir con la base de datos.
                $stmt = $pdo->query("SELECT id_departamento, departamento, codigo_departamento FROM departamentos ORDER BY departamento ASC");
                $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'departments' => $departments]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Error al obtener los departamentos.']);
            }
            break;

case 'admin/createDepartment':
            // require_admin();
            // CORRECCIÓN: Se espera "departamento" desde el JavaScript.
            $data = json_decode(file_get_contents('php://input'), true);
            $name = trim($data['departamento'] ?? ''); 
            $code = trim($data['codigo_departamento'] ?? '');

            if (empty($name) || empty($code)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El nombre y el código del departamento son obligatorios.']);
                break;
            }
            try {
                // CORRECCIÓN: Se inserta en la columna "departamento".
                $stmt = $pdo->prepare("INSERT INTO departamentos (departamento, codigo_departamento) VALUES (:name, :code)");
                $stmt->execute([':name' => $name, ':code' => $code]);
                echo json_encode(['success' => true, 'message' => 'Departamento creado con éxito.']);
            } catch (PDOException $e) {
                http_response_code(409); 
                echo json_encode(['success' => false, 'error' => 'Ya existe un departamento con ese nombre o código.']);
            }
            break;

case 'admin/updateDepartment':
            // require_admin();
            $data = json_decode(file_get_contents('php://input'), true);
            $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
            $name = trim($data['name'] ?? '');

            if (!$id || empty($name)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Datos inválidos.']);
                break;
            }
            try {
                // CORRECCIÓN: Se actualiza la columna "departamento".
                $stmt = $pdo->prepare("UPDATE departamentos SET departamento = :name WHERE id_departamento = :id");
                $stmt->execute([':name' => $name, ':id' => $id]);
                echo json_encode(['success' => true, 'message' => 'Departamento actualizado.']);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Error al actualizar el departamento.']);
            }
            break;


case 'admin/deleteDepartment':
            $data = json_decode(file_get_contents('php://input'), true);
            $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID de departamento no válido.']);
                break;
            }
            try {
                $stmt = $pdo->prepare("DELETE FROM departamentos WHERE id_departamento = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true, 'message' => 'Departamento eliminado con éxito.']);
            } catch (PDOException $e) {
                if ($e->getCode() == '23000') {
                    http_response_code(409);
                    echo json_encode(['success' => false, 'error' => 'No se puede eliminar. Este departamento tiene productos asociados.']);
                } else {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Error de base de datos.']);
                }
            }
            break;
    

//Inventario
case 'admin/addStock':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $productId = filter_var($data['product_id'] ?? 0, FILTER_VALIDATE_INT);
    $quantityToAdd = filter_var($data['quantity'] ?? 0, FILTER_VALIDATE_INT);
    $notes = trim($data['notes'] ?? '');
    $userId = $_SESSION['id_usuario'] ?? 1;

    if (!$productId || $quantityToAdd <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'La cantidad a agregar debe ser mayor a cero.']);
        break;
    }

    $pdo->beginTransaction();
    try {
        $stmt_current = $pdo->prepare("SELECT stock_actual FROM productos WHERE id_producto = :id FOR UPDATE");
        $stmt_current->execute([':id' => $productId]);
        $stock_anterior = $stmt_current->fetchColumn();

        if ($stock_anterior === false) throw new Exception("El producto no fue encontrado.");
        
        $stock_nuevo = $stock_anterior + $quantityToAdd;

        $stmt_update = $pdo->prepare("UPDATE productos SET stock_actual = :new_stock WHERE id_producto = :id");
        $stmt_update->execute([':new_stock' => $stock_nuevo, ':id' => $productId]);

        $stmt_estado = $pdo->prepare("SELECT id_estado FROM estados WHERE nombre_estado = 'Entrada'");
        $stmt_estado->execute();
        $id_estado = $stmt_estado->fetchColumn();
        if (!$id_estado) throw new Exception("Error de Configuración: No se encontró el estado 'Entrada de Inventario'.");

        $stmt_log = $pdo->prepare(
            "INSERT INTO movimientos_inventario (id_producto, id_estado, cantidad, stock_anterior, stock_nuevo, id_usuario, notas)
             VALUES (:product_id, :id_estado, :cantidad, :stock_anterior, :stock_nuevo, :user_id, :notes)"
        );
        $stmt_log->execute([
            ':product_id' => $productId,
            ':id_estado' => $id_estado,
            ':cantidad' => $quantityToAdd,
            ':stock_anterior' => $stock_anterior,
            ':stock_nuevo' => $stock_nuevo,
            ':user_id' => $userId,
            ':notes' => $notes
        ]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => "$quantityToAdd unidad(es) agregadas al stock."]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

case 'admin/adjustInventory':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $productId = filter_var($data['product_id'] ?? 0, FILTER_VALIDATE_INT);
    $adjustmentValue = filter_var($data['adjustment_value'] ?? null, FILTER_VALIDATE_INT);
    $notes = trim($data['notes'] ?? '');
    $userId = $_SESSION['id_usuario'] ?? 1;

    if (!$productId || $adjustmentValue === null || $adjustmentValue === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El valor de ajuste es inválido o es cero.']);
        break;
    }

    $pdo->beginTransaction();
    try {
        $stmt_current = $pdo->prepare("SELECT stock_actual FROM productos WHERE id_producto = :id FOR UPDATE");
        $stmt_current->execute([':id' => $productId]);
        $stock_anterior = $stmt_current->fetchColumn();

        if ($stock_anterior === false) throw new Exception("El producto no fue encontrado.");

        $stock_nuevo = $stock_anterior + $adjustmentValue;

        if ($stock_nuevo < 0) {
            throw new Exception("La operación no es válida. El stock no puede ser negativo.");
        }

        $stmt_update = $pdo->prepare("UPDATE productos SET stock_actual = :new_stock WHERE id_producto = :id");
        $stmt_update->execute([':new_stock' => $stock_nuevo, ':id' => $productId]);
        
        $stmt_estado = $pdo->prepare("SELECT id_estado FROM estados WHERE nombre_estado = 'Ajuste'");
        $stmt_estado->execute();
        $id_estado = $stmt_estado->fetchColumn();
        if (!$id_estado) throw new Exception("Error de Configuración: No se encontró el estado 'Ajuste de Inventario'.");

        $stmt_log = $pdo->prepare(
            "INSERT INTO movimientos_inventario (id_producto, id_estado, cantidad, stock_anterior, stock_nuevo, id_usuario, notas)
             VALUES (:product_id, :id_estado, :cantidad, :stock_anterior, :stock_nuevo, :user_id, :notes)"
        );
        $stmt_log->execute([
            ':product_id'     => $productId,
            ':id_estado'      => $id_estado,
            ':cantidad'       => $adjustmentValue,
            ':stock_anterior' => $stock_anterior,
            ':stock_nuevo'    => $stock_nuevo,
            ':user_id'        => $userId,
            ':notes'          => $notes
        ]);

        $pdo->commit();
        $message = $adjustmentValue > 0 ? "Se sumaron $adjustmentValue unidad(es)." : "Se restaron " . abs($adjustmentValue) . " unidad(es).";
        echo json_encode(['success' => true, 'message' => "Ajuste realizado: $message"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

case 'admin/getInventoryHistory':
    // require_admin();
    try {
        $params = [];
        $where_clauses = ["1=1"];

        if (!empty($_GET['search'])) {
            $where_clauses[] = "(p.nombre_producto LIKE :search_name OR p.codigo_producto LIKE :search_code)";
            $params[':search_name'] = '%' . $_GET['search'] . '%';
            $params[':search_code'] = '%' . $_GET['search'] . '%';
        }
        
        if (!empty($_GET['startDate'])) {
            $where_clauses[] = "mi.fecha >= :startDate";
            $params[':startDate'] = $_GET['startDate'] . ' 00:00:00';
        }
        if (!empty($_GET['endDate'])) {
            $where_clauses[] = "mi.fecha <= :endDate";
            $params[':endDate'] = $_GET['endDate'] . ' 23:59:59';
        }

        if (!empty($_GET['movementTypeId'])) {
            $where_clauses[] = "mi.id_estado = :movementTypeId";
            $params[':movementTypeId'] = $_GET['movementTypeId'];
        }

        $where_sql = " WHERE " . implode(" AND ", $where_clauses);

        $stmt = $pdo->prepare("
            SELECT 
                mi.fecha, p.nombre_producto, p.codigo_producto, e.nombre_estado AS tipo_movimiento,
                mi.cantidad, mi.stock_anterior, mi.stock_nuevo, u.nombre_usuario, mi.notas
            FROM movimientos_inventario mi
            JOIN productos p ON mi.id_producto = p.id_producto
            LEFT JOIN estados e ON mi.id_estado = e.id_estado
            LEFT JOIN usuarios u ON mi.id_usuario = u.id_usuario
            $where_sql
            ORDER BY mi.fecha DESC
            LIMIT 200
        ");
        $stmt->execute($params);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'history' => $history]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener el historial: ' . $e->getMessage()]);
    }
    break;

case 'admin/deleteProduct':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $productId = $data['id_producto'] ?? 0;
    $userId = $_SESSION['id_usuario'] ?? null; // Usamos el usuario real de la sesión

    if (!$productId || !$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de producto no válido o sesión de administrador inválida.']);
        break;
    }
    
    $pdo->beginTransaction();
    try {
        // --- LÓGICA MEJORADA ---
        // 1. Obtenemos toda la información necesaria del producto en una sola consulta.
        $stmt_info = $pdo->prepare("SELECT nombre_producto, codigo_producto, stock_actual FROM productos WHERE id_producto = :id");
        $stmt_info->execute([':id' => $productId]);
        $productInfo = $stmt_info->fetch(PDO::FETCH_ASSOC);

        if (!$productInfo) {
            throw new Exception('El producto que intentas eliminar no existe.');
        }
        
        // 2. Verificamos el stock usando la información que ya obtuvimos.
        if ($productInfo['stock_actual'] > 0) {
            http_response_code(409);
            throw new Exception('No se puede eliminar un producto con stock. Realiza un ajuste a cero primero.');
        }

        // 3. Eliminamos el producto de la base de datos.
        $stmt_delete = $pdo->prepare("DELETE FROM productos WHERE id_producto = :id");
        $stmt_delete->execute([':id' => $productId]);

        if ($stmt_delete->rowCount() > 0) {
            // 4. Si la eliminación fue exitosa, registramos la acción en la tabla correcta 'registros_actividad'.
            $stmt_log = $pdo->prepare(
                "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
                 VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
            );
            
            $description = 'Se eliminó el producto: ' . $productInfo['nombre_producto'] . ' (Código: ' . $productInfo['codigo_producto'] . ')';
            
            $stmt_log->execute([
                ':id_usuario'   => $userId,
                ':tipo_accion'  => 'Producto Eliminado',
                ':descripcion'  => $description
            ]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Producto eliminado y la acción ha sido registrada.']);

        } else {
            throw new Exception('No se pudo eliminar el producto (quizás ya fue eliminado por otra acción).');
        }

    } catch (Exception $e) {
        $pdo->rollBack();
        $errorCode = http_response_code() >= 400 ? http_response_code() : 400;
        http_response_code($errorCode);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

case 'admin/getMovementStates':
    // require_admin();
    try {
        $movement_names = [
            'Entrada', 
            'Salida', 
            'Ajuste ', 
            'Eliminado'
        ];
        $placeholders = implode(',', array_fill(0, count($movement_names), '?'));

        $stmt = $pdo->prepare("SELECT id_estado, nombre_estado FROM estados WHERE nombre_estado IN ($placeholders)");
        $stmt->execute($movement_names);
        $states = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'states' => $states]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener los estados de movimiento.']);
    }
    break;



//Ofertas
case 'admin/getActiveOffers':
    // require_admin(); // Seguridad
    try {
        // Esta consulta selecciona solo los productos con un precio de oferta válido y mayor a cero.
        $stmt = $pdo->prepare("
            SELECT 
                codigo_producto,
                nombre_producto,
                precio_venta,
                precio_oferta,
                oferta_caducidad
            FROM productos 
            WHERE precio_oferta IS NOT NULL AND precio_oferta > 0
            ORDER BY oferta_caducidad ASC, nombre_producto ASC
        ");
        
        $stmt->execute();
        $offers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'offers' => $offers]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener la lista de ofertas: ' . $e->getMessage()]);
    }
    break;

case 'admin/manageOffer':
    // require_admin(); // Seguridad
    
    $data = json_decode(file_get_contents('php://input'), true);
    $productId = filter_var($data['product_id'] ?? 0, FILTER_VALIDATE_INT);
    $userId = $_SESSION['id_usuario'] ?? null;

    if (!$productId || !$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID de producto no válido o sesión de administrador inválida.']);
        break;
    }

    // --- Procesamiento de datos de entrada ---
    $precio_oferta_raw = $data['precio_oferta'] ?? null;
    $precio_oferta = is_numeric($precio_oferta_raw) ? filter_var($precio_oferta_raw, FILTER_VALIDATE_FLOAT) : null;
    $oferta_exclusiva = isset($data['oferta_exclusiva']) ? (int)(bool)$data['oferta_exclusiva'] : 0;
    $oferta_caducidad_raw = $data['oferta_caducidad'] ?? null;
    $oferta_caducidad = null;
    if (!empty($oferta_caducidad_raw)) {
        try {
            $date = new DateTime($oferta_caducidad_raw);
            $oferta_caducidad = $date->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            throw new Exception('El formato de la fecha de caducidad no es válido.');
        }
    }

    $pdo->beginTransaction(); // --- Iniciamos transacción ---
    try {
        // 1. OBTENEMOS LOS DATOS ORIGINALES DEL PRODUCTO PARA COMPARAR
        $stmt_original = $pdo->prepare("SELECT nombre_producto, codigo_producto, precio_venta, precio_oferta, oferta_exclusiva, oferta_caducidad FROM productos WHERE id_producto = :id");
        $stmt_original->execute([':id' => $productId]);
        $originalData = $stmt_original->fetch(PDO::FETCH_ASSOC);
        if (!$originalData) { throw new Exception('El producto no existe.'); }

        // --- VALIDACIÓN DE PRECIO ---
        if ($precio_oferta !== null && $precio_oferta > 0) {
            if ($precio_oferta >= $originalData['precio_venta']) {
                throw new Exception('El precio de oferta debe ser menor que el precio de venta actual ($' . $originalData['precio_venta'] . ').');
            }
        }
        
        // --- PREPARAMOS LOS DATOS FINALES ---
        $final_precio_oferta = ($precio_oferta > 0) ? $precio_oferta : 0.00;
        $final_oferta_exclusiva = $oferta_exclusiva;
        $final_oferta_caducidad = $oferta_caducidad;

        if ($final_precio_oferta <= 0) { // Si se quita la oferta, se resetean los demás campos
            $final_oferta_caducidad = null;
            $final_oferta_exclusiva = 0;
        }

        // 2. CONSTRUIMOS EL LOG DETALLADO COMPARANDO VALORES
        $changes = [];
        $actionType = 'Oferta Modificada';

        $precio_original_num = (float)($originalData['precio_oferta'] ?? 0);

        if ($final_precio_oferta > 0 && $precio_original_num <= 0) {
            $actionType = 'Oferta Creada';
            $changes[] = "Precio de oferta establecido a $" . number_format($final_precio_oferta, 2);
        } elseif ($final_precio_oferta <= 0 && $precio_original_num > 0) {
            $actionType = 'Oferta Eliminada';
            $changes[] = "Se eliminó el precio de oferta anterior de $" . number_format($precio_original_num, 2);
        } else {
            if ($precio_original_num != $final_precio_oferta) {
                $changes[] = "Precio cambió de $" . number_format($precio_original_num, 2) . " a $" . number_format($final_precio_oferta, 2);
            }
        }
        if ($originalData['oferta_exclusiva'] != $final_oferta_exclusiva) {
            $changes[] = "Exclusividad cambió de '" . ($originalData['oferta_exclusiva'] ? 'Sí' : 'No') . "' a '" . ($final_oferta_exclusiva ? 'Sí' : 'No') . "'";
        }
        $oldDate = $originalData['oferta_caducidad'] ? (new DateTime($originalData['oferta_caducidad']))->format('Y-m-d H:i') : 'Ninguna';
        $newDate = $final_oferta_caducidad ? (new DateTime($final_oferta_caducidad))->format('Y-m-d H:i') : 'Ninguna';
        if ($oldDate != $newDate) {
             $changes[] = "Caducidad cambió de '{$oldDate}' a '{$newDate}'";
        }
        
        // 3. ACTUALIZAMOS LA BASE DE DATOS
        $stmt_update = $pdo->prepare(
            "UPDATE productos SET 
                precio_oferta = :precio_oferta, 
                oferta_exclusiva = :oferta_exclusiva,
                oferta_caducidad = :oferta_caducidad,
                modificado_por_usuario_id = :user_id
             WHERE id_producto = :id"
        );
        $stmt_update->execute([
            ':precio_oferta' => $final_precio_oferta,
            ':oferta_exclusiva' => $final_oferta_exclusiva,
            ':oferta_caducidad' => $final_oferta_caducidad,
            ':user_id' => $userId,
            ':id' => $productId
        ]);

        // 4. INSERTAMOS EL LOG SI HUBO CAMBIOS
        if (!empty($changes)) {
            $description = "Producto: " . $originalData['nombre_producto'] . " (" . $originalData['codigo_producto'] . ").\nDetalles:\n- " . implode("\n- ", $changes);
            $stmt_log = $pdo->prepare(
                "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
                 VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
            );
            $stmt_log->execute([
                ':id_usuario'   => $userId,
                ':tipo_accion'  => $actionType,
                ':descripcion'  => $description
            ]);
        }
        
        $pdo->commit(); // --- Confirmamos todos los cambios ---
        $message = ($final_precio_oferta > 0) ? 'Oferta guardada correctamente.' : 'Oferta eliminada correctamente.';
        echo json_encode(['success' => true, 'message' => $message]);

    } catch (Exception $e) {
        $pdo->rollBack(); // --- Revertimos si algo falla ---
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;


//Clientes
case 'admin/deleteCustomer':
    // require_admin(); // Seguridad
    $pdo->beginTransaction();
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $customerId = $data['id_cliente'] ?? 0;
        $userId = $_SESSION['id_usuario'] ?? null; // Captura el ID del administrador

        if (!$customerId || !$userId) {
            throw new Exception('No se proporcionó el ID del cliente o la sesión del administrador es inválida.');
        }

        // --- INICIO DE LA LÓGICA DE LOGGING ---
        // 1. Obtener los datos del cliente ANTES de eliminarlo para el registro.
        $stmt_customer_info = $pdo->prepare(
            "SELECT nombre_usuario, nombre, apellido FROM clientes WHERE id_cliente = :id_cliente"
        );
        $stmt_customer_info->execute([':id_cliente' => $customerId]);
        $customerInfo = $stmt_customer_info->fetch(PDO::FETCH_ASSOC);

        if (!$customerInfo) {
            throw new Exception('No se encontró el cliente para eliminar o ya fue eliminado.');
        }
        // --- FIN DE LA LÓGICA DE LOGGING ---

        // Validación de saldo en tarjeta (lógica que ya tenías)
        $stmt_check_card = $pdo->prepare(
            "SELECT saldo FROM tarjetas_recargables WHERE id_cliente = :id_cliente"
        );
        $stmt_check_card->execute([':id_cliente' => $customerId]);
        $card_balance = $stmt_check_card->fetchColumn();

        if ($card_balance !== false && $card_balance > 0) {
            $formatted_balance = number_format($card_balance, 2);
            throw new Exception("No se puede eliminar: el cliente tiene una tarjeta asignada con un saldo de $" . $formatted_balance . ".");
        }
        
        // Si pasa la validación, se procede con la eliminación.
        $stmt = $pdo->prepare("DELETE FROM clientes WHERE id_cliente = :id");
        $stmt->execute([':id' => $customerId]);

        if ($stmt->rowCount() > 0) {
            // --- INICIO DE LA LÓGICA DE LOGGING (INSERCIÓN) ---
            // 2. Si la eliminación fue exitosa, registrar la acción.
            $stmt_log = $pdo->prepare(
                "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
                 VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
            );
            
            $customerFullName = trim($customerInfo['nombre'] . ' ' . $customerInfo['apellido']);
            $description = 'Se eliminó al cliente: ' . $customerFullName . ' (Usuario: ' . $customerInfo['nombre_usuario'] . ')';
            
            $stmt_log->execute([
                ':id_usuario'   => $userId,
                ':tipo_accion'  => 'Cliente Eliminado',
                ':descripcion'  => $description
            ]);
            // --- FIN DE LA LÓGICA DE LOGGING (INSERCIÓN) ---

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Cliente y sus datos asociados han sido eliminados.']);
        } else {
             // Este caso es poco probable ahora que verificamos la existencia al inicio.
            throw new Exception('No se pudo eliminar al cliente.');
        }

    } catch (Exception $e) {
        if($pdo->inTransaction()) { $pdo->rollBack(); }
        http_response_code(400); 
        
        if ($e instanceof PDOException && $e->getCode() == '23000') {
             echo json_encode(['success' => false, 'error' => 'No se puede eliminar este cliente porque tiene registros históricos importantes (como pedidos) asociados.']);
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

case 'admin/createCustomer':
    // require_admin(); // Seguridad
    $pdo->beginTransaction();
    try {
        $data = $_POST;
        $userId = $_SESSION['id_usuario'] ?? null; // Capturamos el ID del administrador

        // Validamos que un administrador esté realizando la acción
        if (!$userId) {
            throw new Exception('Sesión de administrador no válida. No se puede crear el cliente.');
        }
        
        // --- VALIDACIONES GENERALES (sin cambios) ---
        if (empty($data['nombre']) || !preg_match('/^[a-zA-Z\s]+$/', $data['nombre'])) throw new Exception("El nombre es obligatorio y solo puede contener letras y espacios.");
        if (empty($data['nombre_usuario']) || !preg_match('/^[a-zA-Z0-9]+$/', $data['nombre_usuario'])) throw new Exception("El nombre de usuario es obligatorio y solo puede contener letras y números.");
        if (empty($data['password'])) throw new Exception("La contraseña es obligatoria.");
        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new Exception("El formato del correo electrónico no es válido.");
        if (empty($data['telefono']) || !preg_match('/^[0-9]{8}$/', $data['telefono'])) throw new Exception("El teléfono es obligatorio y debe tener 8 dígitos.");

        $stmt_check = $pdo->prepare("SELECT 1 FROM clientes WHERE nombre_usuario = :user OR email = :email OR telefono = :phone");
        $stmt_check->execute([':user' => $data['nombre_usuario'], ':email' => $data['email'], ':phone' => $data['telefono']]);
        if ($stmt_check->fetch()) {
            throw new Exception("El nombre de usuario, email o teléfono ya están en uso.");
        }

        $id_tipo_cliente = (int)$data['id_tipo_cliente'];
        
        // --- VALIDACIONES CONDICIONALES (sin cambios) ---
        // (Se mantiene la lógica para Estudiante y Contribuyente)
        if ($id_tipo_cliente === 2) { 
            if (empty($data['institucion']) || empty($data['grado_actual'])) {
                throw new Exception("Para estudiantes, la institución y el grado son obligatorios.");
            }
        } elseif ($id_tipo_cliente === 3) { 
            if (empty($data['razon_social'])) throw new Exception("Razón Social es obligatoria.");
            // ... (resto de validaciones de contribuyente)
        }
        
        $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // --- SQL MODIFICADO: Añadimos la columna 'creado_por_usuario_id' ---
        $sql = "INSERT INTO clientes (nombre, apellido, nombre_usuario, telefono, email, password_hash, id_tipo_cliente, institucion, grado_actual, direccion, dui, nit, n_registro, razon_social, creado_por_usuario_id) 
                VALUES (:nombre, :apellido, :nombre_usuario, :telefono, :email, :password_hash, :id_tipo_cliente, :institucion, :grado_actual, :direccion, :dui, :nit, :n_registro, :razon_social, :creado_por)";
        
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
            ':creado_por' => $userId // Guardamos el ID del admin que lo creó
        ]);

        // --- INICIO DE LA LÓGICA DE LOGGING ---
        $stmt_log = $pdo->prepare(
            "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
             VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
        );
        
        $customerFullName = trim($data['nombre'] . ' ' . ($data['apellido'] ?? ''));
        $description = 'Se creó el cliente: ' . $customerFullName . ' (Usuario: ' . $data['nombre_usuario'] . ')';
        
        $stmt_log->execute([
            ':id_usuario'   => $userId,
            ':tipo_accion'  => 'Cliente Creado',
            ':descripcion'  => $description
        ]);
        // --- FIN DE LA LÓGICA DE LOGGING ---

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Cliente creado exitosamente.']);

    } catch (Exception $e) {
        if($pdo->inTransaction()) { $pdo->rollBack(); }
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;

case 'admin/updateCustomer':
    // require_admin(); // Seguridad
    $pdo->beginTransaction();
    try {
        $data = $_POST;
        $customerId = $data['id_cliente'] ?? 0;
        $userId = $_SESSION['id_usuario'] ?? null;

        if (!$customerId) throw new Exception('ID de cliente no válido.');
        if (!$userId) throw new Exception('Sesión de administrador no válida.');

        // 1. OBTENEMOS LOS DATOS ORIGINALES DEL CLIENTE ANTES DE CUALQUIER CAMBIO
        $stmt_original = $pdo->prepare("SELECT * FROM clientes WHERE id_cliente = :id");
        $stmt_original->execute([':id' => $customerId]);
        $originalData = $stmt_original->fetch(PDO::FETCH_ASSOC);
        if (!$originalData) {
            throw new Exception('El cliente que intentas modificar no existe.');
        }

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

        // (Aquí sigue el resto de tus validaciones para Estudiante y Contribuyente)
        
        // 2. COMPARAMOS LOS DATOS ANTIGUOS CON LOS NUEVOS PARA VER QUÉ CAMBIÓ
        $changes = [];
        $fieldsToCompare = [
            'nombre', 'apellido', 'nombre_usuario', 'email', 'telefono', 
            'id_tipo_cliente', 'institucion', 'grado_actual', 'direccion', 
            'dui', 'nit', 'n_registro', 'razon_social'
        ];

        foreach ($fieldsToCompare as $field) {
            $oldValue = $originalData[$field] ?? null;
            $newValue = $data[$field] ?? null;

            // Comparamos los valores, tratando los nulos y vacíos de forma consistente
            if (trim($oldValue ?? '') != trim($newValue ?? '')) {
                $changes[] = "Campo '$field' cambió de '{$oldValue}' a '{$newValue}'";
            }
        }
        if (!empty($data['password'])) {
            $changes[] = "El campo 'Contraseña' fue modificado.";
        }

        // Si no hay cambios, no hacemos nada en la base de datos.
        if (empty($changes)) {
            echo json_encode(['success' => true, 'message' => 'No se detectaron cambios para actualizar.']);
            $pdo->rollBack(); // Revertimos la transacción vacía
            break; 
        }

        // --- PROCESO DE ACTUALIZACIÓN ---
        $sql = "UPDATE clientes SET 
                    nombre = :nombre, apellido = :apellido, nombre_usuario = :nombre_usuario, 
                    telefono = :telefono, email = :email, id_tipo_cliente = :id_tipo_cliente, 
                    institucion = :institucion, grado_actual = :grado_actual, direccion = :direccion, 
                    dui = :dui, nit = :nit, n_registro = :n_registro, razon_social = :razon_social,
                    modificado_por_usuario_id = :user_id";
        
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
            ':id_cliente' => $customerId,
            ':user_id' => $userId
        ];

        if (!empty($data['password'])) {
            $sql .= ", password_hash = :password_hash";
            $params[':password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        $sql .= " WHERE id_cliente = :id_cliente";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // 3. INSERTAMOS EL LOG DETALLADO EN 'registros_actividad'
        $stmt_log = $pdo->prepare(
            "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
             VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
        );
        
        $description = "Se actualizó al cliente: " . $data['nombre_usuario'] . ".\nDetalles:\n- " . implode("\n- ", $changes);
        
        $stmt_log->execute([
            ':id_usuario'   => $userId,
            ':tipo_accion'  => 'Cliente Modificado',
            ':descripcion'  => $description
        ]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Cliente actualizado correctamente.']);

    } catch (Exception $e) {
        if($pdo->inTransaction()) { $pdo->rollBack(); }
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;
//Procesador de imagenes con python
    
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




//Productos y Bucket e Google para imagenes

case 'admin/deleteProduct':
    // require_admin();
    $data = json_decode(file_get_contents('php://input'), true);
    $productId = $data['id_producto'] ?? 0;
    $userId = $_SESSION['id_usuario'] ?? 1;

    if (!$productId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No se proporcionó el ID del producto.']);
        break;
    }
    
    $pdo->beginTransaction();
    try {
        $stmt_check = $pdo->prepare("SELECT stock_actual FROM productos WHERE id_producto = :id");
        $stmt_check->execute([':id' => $productId]);
        $stock_actual = $stmt_check->fetchColumn();

        if ($stock_actual === false) {
             throw new Exception('El producto que intentas eliminar no existe.');
        }

        if ($stock_actual > 0) {
            http_response_code(409);
            throw new Exception('No se puede eliminar un producto con stock. Realiza un ajuste a cero primero.');
        }

        // Registrar el movimiento de eliminación
        $stmt_log = $pdo->prepare(
            "INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, id_usuario, notas)
             VALUES (:product_id, 'Producto Eliminado', 0, :stock_anterior, 0, :user_id, 'Registro eliminado del sistema')"
        );
        $stmt_log->execute([
            ':product_id' => $productId,
            ':stock_anterior' => $stock_actual, // Será 0
            ':user_id' => $userId
        ]);
        
        // Proceder con la eliminación
        $stmt_delete = $pdo->prepare("DELETE FROM productos WHERE id_producto = :id");
        $stmt_delete->execute([':id' => $productId]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Producto eliminado y movimiento registrado.']);

    } catch (Exception $e) {
        $pdo->rollBack();
        // Si el código de error no fue establecido previamente, usar 400
        $errorCode = http_response_code() >= 400 ? http_response_code() : 400;
        http_response_code($errorCode);
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
    // Recoger y validar datos del formulario
    $codigo_producto = trim($_POST['codigo_producto'] ?? '');
    $nombre_producto = trim($_POST['nombre_producto'] ?? '');
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
        ':url_imagen' => $url_imagen,
        ':stock_actual' => $stock_actual,
        ':stock_minimo' => $stock_minimo,
        ':stock_maximo' => $stock_maximo,
        ':tipo_de_venta_id' => $tipo_de_venta_id,
        ':estado_id' => $estado_id,
        ':usa_inventario' => $usa_inventario,
        ':creado_por' => $creado_por,
        ':proveedor_id' => $proveedor_id
    ]);

    $lastProductId = $pdo->lastInsertId();

    if (isset($_FILES['url_imagen']) && $_FILES['url_imagen']['error'] === UPLOAD_ERR_OK) {
        // (Tu lógica de subida a GCS permanece aquí sin cambios)
        require_once __DIR__ . '/../vendor/autoload.php';
        // ... (código de subida)
        $stmt_update_img = $pdo->prepare("UPDATE productos SET url_imagen = :url_imagen WHERE id_producto = :id_producto");
        $stmt_update_img->execute([':url_imagen' => $url_imagen, ':id_producto' => $lastProductId]);
    }

    // --- INICIO DE LA LÓGICA DE LOGGING ---
    if ($creado_por) { // Solo registrar si hay un usuario en sesión
        $stmt_log = $pdo->prepare(
            "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
             VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
        );
        $description = 'Se creó el nuevo producto: ' . $nombre_producto . ' (Código: ' . $codigo_producto . ')';
        $stmt_log->execute([
            ':id_usuario'   => $creado_por,
            ':tipo_accion'  => 'Producto Creado',
            ':descripcion'  => $description
        ]);
    }
    // --- FIN DE LA LÓGICA DE LOGGING ---

    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => "Producto '" . htmlspecialchars($nombre_producto) . "' ingresado exitosamente."]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
      $pdo->rollBack();
    }
    
    http_response_code(400);
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
            $message = count($productIds) . ' producto(s) inactivado(s) en la tienda.';
            break;

                    // --- CÓDIGO INTEGRADO ---
    case 'activate':
                        // Asumiendo que el estado 'Activo' tiene el ID 1
            $stmt = $pdo->prepare("UPDATE productos SET estado = 1 WHERE id_producto IN ($placeholders)");
            $stmt->execute($productIds);
            $message = count($productIds) . ' producto(s) activado(s) en la tienda.';
            break;
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
    $userId = $_SESSION['id_usuario'] ?? null;

    $allowed_fields = ['nombre_producto', 'precio_venta']; 
    
    if ($productId && in_array($field, $allowed_fields) && $value !== null && $userId) {
        $pdo->beginTransaction();
        try {
            // Obtenemos el nombre del producto para el log
            $stmt_info = $pdo->prepare("SELECT nombre_producto FROM productos WHERE id_producto = :id");
            $stmt_info->execute([':id' => $productId]);
            $productName = $stmt_info->fetchColumn();

            // Actualizamos el producto (como antes, pero ahora también modificado_por_usuario_id)
            $stmt = $pdo->prepare(
                "UPDATE productos SET {$field} = :value, modificado_por_usuario_id = :user_id WHERE id_producto = :id"
            );
            $stmt->execute([':value' => $value, ':user_id' => $userId, ':id' => $productId]);
            
            // Insertamos el registro del evento
            $stmt_log = $pdo->prepare(
                "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion) 
                 VALUES (:id_usuario, :tipo_accion, :descripcion)"
            );
            $description = "Actualización rápida en '$productName': campo '$field' cambió a '$value'.";
            $stmt_log->execute([
                ':id_usuario' => $userId,
                ':tipo_accion' => 'Producto Modificado',
                ':descripcion' => $description
            ]);
            
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Producto actualizado.']);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Datos inválidos o sesión no iniciada.']);
    }
    break;












// REEMPLAZA ESTE BLOQUE COMPLETO EN api/index.php

case 'admin/updateProduct':
    $pdo->beginTransaction();
    try {
        $productId = $_POST['id_producto'] ?? 0;
        $userId = $_SESSION['id_usuario'] ?? null;

        if (!$productId) { throw new Exception('ID de producto no válido.'); }
        if (!$userId) { throw new Exception('Sesión de administrador no válida.'); }

        // --- INICIO DE LA LÓGICA CORREGIDA ---
        // 1. Obtenemos el estado ACTUAL del producto desde la BD.
        $stmt_check = $pdo->prepare("SELECT stock_actual, usa_inventario FROM productos WHERE id_producto = :id");
        $stmt_check->execute([':id' => $productId]);
        $product_current_state = $stmt_check->fetch(PDO::FETCH_ASSOC);

        if (!$product_current_state) {
            throw new Exception('El producto que intentas modificar no existe.');
        }
        
        $current_stock = (int)$product_current_state['stock_actual'];
        $current_usa_inventario = (int)$product_current_state['usa_inventario'];

        // 2. Determinamos el NUEVO estado que viene del formulario.
        $new_usa_inventario_from_form = isset($_POST['usa_inventario_checkbox']) ? 1 : 0;

        // 3. LÓGICA DE DECISIÓN FINAL (LA CLAVE DE LA CORRECCIÓN):
        // Si el producto ya gestiona inventario y tiene stock, el checkbox está deshabilitado
        // y no se envía. En este caso, forzamos a que el valor se mantenga en 1.
        if ($current_usa_inventario === 1 && $current_stock > 0) {
            $final_usa_inventario = 1;
        } else {
            // En cualquier otro caso (stock es 0 o nunca usó inventario),
            // respetamos lo que venga del formulario.
            $final_usa_inventario = $new_usa_inventario_from_form;
        }
        // --- FIN DE LA LÓGICA CORREGIDA ---
        
        // El resto de la recolección y validación de datos permanece igual
        $codigo_producto = trim($_POST['codigo_producto'] ?? '');
        $nombre_producto = trim($_POST['nombre_producto'] ?? '');
        $departamento_id = filter_var($_POST['departamento'] ?? '', FILTER_VALIDATE_INT);
        $precio_venta = filter_var($_POST['precio_venta'] ?? '', FILTER_VALIDATE_FLOAT);

        if (empty($codigo_producto) || empty($nombre_producto) || $departamento_id === false || $precio_venta === false) {
            throw new Exception("Por favor, completa todos los campos obligatorios.");
        }
        
        $precio_compra = filter_var($_POST['precio_compra'] ?? 0, FILTER_VALIDATE_FLOAT, FILTER_NULL_ON_FAILURE) ?? 0.00;
        $precio_mayoreo = filter_var($_POST['precio_mayoreo'] ?? 0, FILTER_VALIDATE_FLOAT, FILTER_NULL_ON_FAILURE) ?? 0.00;
        $tipo_de_venta_id = filter_var($_POST['tipo_de_venta'] ?? '', FILTER_VALIDATE_INT);
        $estado_id = filter_var($_POST['estado'] ?? '', FILTER_VALIDATE_INT);
        $proveedor_id = filter_var($_POST['proveedor'] ?? '', FILTER_VALIDATE_INT);
        $stock_actual = $final_usa_inventario ? filter_var($_POST['stock_actual'] ?? 0, FILTER_VALIDATE_INT) : 0;
        $stock_minimo = $final_usa_inventario ? filter_var($_POST['stock_minimo'] ?? 0, FILTER_VALIDATE_INT) : 0;
        $stock_maximo = $final_usa_inventario ? filter_var($_POST['stock_maximo'] ?? 0, FILTER_VALIDATE_INT) : 0;
        $url_imagen = $_POST['url_imagen'] ?? '';

        // Actualización en la base de datos usando $final_usa_inventario
        $sql_update = "UPDATE productos SET 
                        codigo_producto = :codigo_producto, nombre_producto = :nombre_producto, departamento = :departamento, 
                        precio_compra = :precio_compra, precio_venta = :precio_venta, precio_mayoreo = :precio_mayoreo, 
                        url_imagen = :url_imagen, stock_actual = :stock_actual, stock_minimo = :stock_minimo, 
                        stock_maximo = :stock_maximo, tipo_de_venta = :tipo_de_venta, estado = :estado, 
                        usa_inventario = :usa_inventario, proveedor = :proveedor, modificado_por_usuario_id = :user_id 
                       WHERE id_producto = :id_producto";
                       
        $stmt_update = $pdo->prepare($sql_update);
        $stmt_update->execute([
            ':codigo_producto' => $codigo_producto, ':nombre_producto' => $nombre_producto, ':departamento' => $departamento_id,
            ':precio_compra' => $precio_compra, ':precio_venta' => $precio_venta, ':precio_mayoreo' => $precio_mayoreo,
            ':url_imagen' => $url_imagen, ':stock_actual' => $stock_actual, ':stock_minimo' => $stock_minimo,
            ':stock_maximo' => $stock_maximo, ':tipo_de_venta' => $tipo_de_venta_id, ':estado' => $estado_id,
            ':usa_inventario' => $final_usa_inventario, ':proveedor' => $proveedor_id, 
            ':user_id' => $userId,
            ':id_producto' => $productId
        ]);
        
        // Lógica de Logging (sin cambios)
        $stmt_log = $pdo->prepare(
            "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
             VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
        );
        $description = "Se actualizó el producto (formulario): '" . $nombre_producto . "' (Código: " . $codigo_producto . ")";
        $stmt_log->execute([
            ':id_usuario'   => $userId,
            ':tipo_accion'  => 'Producto Modificado',
            ':descripcion'  => $description
        ]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Producto actualizado correctamente.']);
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break; 


//Layout de los sliders de la web
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
    $default_settings = [
        'show_main_carousel' => true,
        'show_offers_carousel' => true,
        'show_department_carousel' => true,
        'hide_products_without_image' => false,
        'offers_carousel_title' => 'Aprovecha estas oportunidades',
        'offers_carousel_dept' => 0,
        'dept_carousel_title_prefix' => 'Lo que siempre buscas en ',
        'dept_carousel_dept' => 8,
        'show_product_price' => true,
        'show_product_code' => true,
        'details_for_logged_in_only' => false,
        'show_product_department' => true 
    ];
    $config = file_exists($configFile) ? include($configFile) : [];
    $final_config = array_merge($default_settings, $config);

    // (El resto de la lógica de este 'case' no necesita cambios)
    
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

    $settings = [
        'show_main_carousel' => $final_config['show_main_carousel'],
        'show_offers_carousel' => $final_config['show_offers_carousel'],
        'show_department_carousel' => $final_config['show_department_carousel'],
        'hide_products_without_image' => $final_config['hide_products_without_image'],
        
        'offers_carousel_title' => $final_config['offers_carousel_title'],
        'offers_carousel_dept' => $final_config['offers_carousel_dept'],
        'dept_carousel_title_prefix' => $final_config['dept_carousel_title_prefix'],
        'dept_carousel_dept' => $final_config['dept_carousel_dept'],
        
        'show_product_price' => $final_config['show_product_price'],
        'show_product_code' => $final_config['show_product_code'],
        'details_for_logged_in_only' => $final_config['details_for_logged_in_only'],
        'show_product_department' => $final_config['show_product_department'],

        'offers_carousel_config' => ['title' => $offers_final_title, 'filters' => $offers_final_filters],
        'department_carousel_config' => ['title' => $department_final_title, 'filters' => ['department_id' => $final_config['dept_carousel_dept'], 'limit' => 8]]
    ];

    echo json_encode(['success' => true, 'settings' => $settings]);
    break;
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
    $historical_statuses = [2, 3, 7, 8, 9, 10, 11, 13, 14, 17, 20, 23];
    
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
        if (empty($items)) {
            continue;
        }
        //
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
    if (!isset($_SESSION['id_cliente'])) {
        throw new Exception('Debes iniciar sesión para finalizar el envio de tu lista.');
    }
    
    $client_id = $_SESSION['id_cliente'];
    $cart_id = getOrCreateCart($pdo, $client_id, false);
    
    if (!$cart_id) {
        throw new Exception("Tu lista está vacía, no hay nada que procesar.");
    }

    // Iniciar transacción para garantizar la integridad de los datos
    $pdo->beginTransaction();
    try {
        // 1. Obtener el número de orden más alto para este cliente
        $stmt_max_order = $pdo->prepare(
            "SELECT MAX(numero_orden_cliente) FROM carritos_compra WHERE id_cliente = :client_id"
        );
        $stmt_max_order->execute([':client_id' => $client_id]);
        $max_order = $stmt_max_order->fetchColumn();
        
        // Si no tiene órdenes previas, este será el número 1. Si no, será el siguiente.
        $new_order_number = ($max_order) ? $max_order + 1 : 1;

        // 2. Actualizar el carrito para marcarlo como "En Proceso" y asignar el nuevo número de orden
        $stmt = $pdo->prepare(
            "UPDATE carritos_compra 
             SET estado_id = 8, numero_orden_cliente = :order_number 
             WHERE id_carrito = :cart_id AND id_cliente = :client_id AND estado_id = 1"
        );
        
        $stmt->execute([
            ':order_number' => $new_order_number,
            ':cart_id'      => $cart_id,
            ':client_id'    => $client_id
        ]);

        if ($stmt->rowCount() > 0) {
            // Si todo fue bien, confirma los cambios en la base de datos
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Lista enviada con éxito.']);
        } else {
            // Si no se actualizó ninguna fila, algo salió mal (ej. el carrito ya estaba procesado)
            throw new Exception('No se pudo procesar el envio de lista. Es posible que la lista ya estuviera procesada.');
        }

    } catch (Exception $e) {
        // Si ocurre cualquier error, revierte todos los cambios
        $pdo->rollBack();
        // Lanza la excepción para que el manejador de errores principal la capture
        throw $e; 
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
    if (!preg_match("/^[a-zA-Z\s]+$/", $data['nombre'])) {
        throw new Exception("El nombre solo puede contener letras y espacios.");
    }
    if (!empty($data['apellido']) && !preg_match("/^[a-zA-Z\s]+$/", $data['apellido'])) {
        throw new Exception("El apellido solo puede contener letras y espacios.");
    }
        if (!preg_match('/^[0-9]{8}$/', $data['telefono'])) {
        throw new Exception("El teléfono es obligatorio y debe tener 8 dígitos.");
    }

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
    // Parámetros de la URL (sin cambios)
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 16;
    $offset = ($page - 1) * $limit;
    $department_id = isset($_GET['department_id']) ? (int)$_GET['department_id'] : null;
    $search_term = isset($_GET['search']) ? trim($_GET['search']) : '';
    $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'random';
    $order = isset($_GET['order']) ? strtoupper($_GET['order']) : 'ASC';
    $filter_name = '';
    $ofertas_only = isset($_GET['ofertas']) && $_GET['ofertas'] === 'true';
    $hide_no_image = isset($_GET['hide_no_image']) && $_GET['hide_no_image'] === 'true';

    // Validación de seguridad (sin cambios)
    $allowedSorts = ['nombre_producto', 'precio_venta', 'precio_compra', 'random'];
    if (!in_array($sort_by, $allowedSorts)) { $sort_by = 'random'; }
    if (!in_array($order, ['ASC', 'DESC'])) { $order = 'ASC'; }

    // --- LÓGICA DE OFERTAS MEJORADA CON CADUCIDAD ---
    $is_user_logged_in = isset($_SESSION['id_cliente']);

    // La consulta SQL ahora es más inteligente.
    // Comprueba la exclusividad Y la fecha de caducidad.
    $select_fields = "p.id_producto, p.codigo_producto, p.nombre_producto, p.departamento, p.precio_venta, p.url_imagen,
                      p.oferta_exclusiva, p.oferta_caducidad, -- Devolvemos estos campos para depuración
                      CASE
                          -- Condición 1: La oferta no es válida si está caducada
                          WHEN p.oferta_caducidad IS NOT NULL AND p.oferta_caducidad < NOW() THEN 0
                          -- Condición 2: Si es exclusiva, solo se muestra a usuarios logueados
                          WHEN p.oferta_exclusiva = 1 AND " . ($is_user_logged_in ? "1=1" : "1=0") . " THEN p.precio_oferta
                          -- Condición 3: Si no es exclusiva, se muestra a todos
                          WHEN p.oferta_exclusiva = 0 THEN p.precio_oferta
                          -- Si no cumple ninguna condición, no hay oferta
                          ELSE 0
                      END AS precio_oferta";
    // --- FIN DE LA LÓGICA MEJORADA ---

    // El resto de la construcción de la consulta permanece igual
    $base_sql = "FROM productos p INNER JOIN departamentos d ON p.departamento = d.id_departamento";
    $where_clauses = ["p.estado = 1"];
    $params = [];

    if ($hide_no_image) {
        $where_clauses[] = "(p.url_imagen IS NOT NULL AND p.url_imagen != '' AND p.url_imagen != '0')";
    }
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
        $oferta_condition = "(p.precio_oferta IS NOT NULL AND p.precio_oferta > 0 AND p.precio_oferta < p.precio_venta AND (p.oferta_caducidad IS NULL OR p.oferta_caducidad > NOW()))";
        if (!$is_user_logged_in) {
            $oferta_condition .= " AND p.oferta_exclusiva = 0";
        }
        $where_clauses[] = $oferta_condition;
        $filter_name = "Productos en Oferta";
    }

    $where_sql = " WHERE " . implode(" AND ", $where_clauses);
    
    // Paginación y ejecución (sin cambios)
    $countSql = "SELECT COUNT(*) " . $base_sql . $where_sql;
    $stmtCount = $pdo->prepare($countSql);
    $stmtCount->execute($params);
    $total_products = $stmtCount->fetchColumn();
    $total_pages = ceil($total_products / $limit);
    
    $sql = "SELECT " . $select_fields . ", d.departamento AS nombre_departamento " . $base_sql . $where_sql;
    
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
function logActivity(PDO $pdo, int $userId, string $actionType, string $description) {
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO registros_actividad (id_usuario, tipo_accion, descripcion, fecha) 
             VALUES (:id_usuario, :tipo_accion, :descripcion, NOW())"
        );
        
        $stmt->execute([
            ':id_usuario'   => $userId,
            ':tipo_accion'  => $actionType,
            ':descripcion'  => $description
        ]);
    } catch (Exception $e) {
        // En un entorno de producción, podrías registrar este error en un archivo en lugar de detener el script.
        // Por ahora, lo dejamos así para no interrumpir el flujo principal en caso de que falle el log.
        error_log("Fallo al registrar actividad: " . $e->getMessage());
    }
}


?>