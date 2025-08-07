<?php
// includes/product_card.php
// Este archivo es una plantilla de cómo se vería una tarjeta de producto.
// Actualmente, el HTML se genera directamente en product_loader.js
// Si en el futuro decides renderizar productos en el lado del servidor,
// este archivo podría usarse para recibir $product y generar el HTML.

/*
// Ejemplo de cómo podría usarse si se renderiza con PHP:
if (isset($product)) {
?>
<div class="product-card">
    <img src="<?php echo htmlspecialchars($product['url_imagen'] ?? 'https://via.placeholder.com/150'); ?>" alt="<?php echo htmlspecialchars($product['nombre_producto']); ?>">
    <h3><?php echo htmlspecialchars($product['nombre_producto']); ?></h3>
    <p>Departamento: <?php echo htmlspecialchars($product['nombre_departamento']); ?></p>
    <p class="price">Precio: $<?php echo number_format($product['precio_venta'], 2); ?></p>
    <p class="code">Código: <?php echo htmlspecialchars($product['codigo_producto']); ?></p>
    </div>
<?php
}
*/
?>