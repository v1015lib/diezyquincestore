
<?php

date_default_timezone_set('America/El_Salvador');
define('VAPID_PUBLIC_KEY', 'BDG5Cf1H8iUEROSWsaD8IEB0WGX9bm1Vu34wTvos4Grwe2Qwcdq3s-SH4CrAAbmOvYF7ryRLgR27404IqcV2Zsg');
define('VAPID_PRIVATE_KEY', '3t3Al6iRekyVieDXqfDqN4SzPBDTptqHBwMZJ7TercA');
define('VAPID_SUBJECT', 'mailto:businesscatalogolibreria@gmail.com'); // Cambia esto por tu email
define('DB_HOST', 'localhost');
define('DB_PORT', '3306'); 


define('DB_NAME', 'diezqpys_data_lib'); 

define('DB_USER', 'diezqpys_diezqpys_cpanel');
define('DB_PASS', 'Masterbeta89@1998');



try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);



} catch (PDOException $e) {
    die("Error de conexión a la base de datos: " . $e->getMessage());
}

?>
