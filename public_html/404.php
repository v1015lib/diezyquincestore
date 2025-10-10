<?php
// public_html/404.php
$page_type = 'simplified'; // Usamos el header simplificado
http_response_code(404); // Aseguramos que se envíe el código de error correcto
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <?php
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'];
    $path = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
    $base_url = "{$protocol}://{$host}{$path}/";
    ?>
    <base href="<?php echo $base_url; ?>">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página no Encontrada (Error 404) - Variedades 10 y 15</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="shortcut icon" href="img/favicon.png">
    <meta name="robots" content="noindex, follow">
    <style>
        .error-container {
            text-align: center;
            padding: 4rem 2rem;
            max-width: 600px;
            margin: 2rem auto;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .error-code {
            font-size: 5rem;
            font-weight: 900;
            color: #0C0A4E; /* Color primario */
            margin: 0;
        }
        .error-title {
            font-size: 1.5rem;
            color: #343a40; /* Color de texto principal */
            margin-top: 0;
            margin-bottom: 1rem;
        }
        .error-message {
            color: #6c757d; /* Color de texto secundario */
            margin-bottom: 2rem;
        }
        .error-actions .btn-primary {
            background-color: #0C0A4E;
            color: #D4A017; /* Color de acento */
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        .error-actions .btn-primary:hover {
            background-color: #060525;
        }
    </style>
</head>
<body class="page-legal">

    <?php include 'includes/header.php'; ?>

    <main class="error-container">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">¡Ups! Página no encontrada</h2>
        <p class="error-message">
            Lo sentimos, la página que estás buscando no existe o ha sido movida.
            Pero no te preocupes, puedes volver al inicio y encontrar lo que necesitas.
        </p>
        <div class="error-actions">
            <a href="index.php" class="btn-primary">Volver a la Tienda</a>
        </div>
    </main>

    <?php include 'includes/footer.php'; ?>

</body>
</html>