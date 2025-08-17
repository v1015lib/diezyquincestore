<?php
// api/check_user.php
require_once __DIR__ . '/../config/config.php'; 

header('Content-Type: application/json');

$username = $_GET['username'] ?? '';
$response = ['exists' => false];

if (!empty($username)) {
    try {
        $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE nombre_usuario = :username");
        $stmt->execute(['username' => $username]);

        if ($stmt->fetchColumn()) {
            $response['exists'] = true;
        }
    } catch (PDOException $e) {
        $response['exists'] = false; 
    }
}

echo json_encode($response);
?>