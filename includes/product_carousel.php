<?php
// public_html/includes/product_carousel.php

/**
 * @param string $id El ID único para este carrusel.
 * @param string $title El título que se mostrará sobre el carrusel.
 * @param array $filters Los filtros de productos para este carrusel.
 */
function render_product_carousel($id, $title, $filters) {
    // Convertimos los filtros a atributos de datos para que JavaScript pueda leerlos.
    $data_attributes = '';
    foreach ($filters as $key => $value) {
        $data_attributes .= " data-" . htmlspecialchars($key) . "='" . htmlspecialchars($value) . "'";
    }
?>
    <section class="product-carousel-section">
        <h2><?php echo htmlspecialchars($title); ?></h2>
        <div class="product-carousel-container" id="<?php echo htmlspecialchars($id); ?>" <?php echo $data_attributes; ?>>
            <div class="product-carousel-slides">
                </div>
            <button class="carousel-control prev">&#10094;</button>
            <button class="carousel-control next">&#10095;</button>
        </div>
    </section>
<?php
}
?>