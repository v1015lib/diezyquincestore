<?php
// public_html/includes/carrousel-ads.php

require_once __DIR__ . '/../../config/config.php';

try {
    // CORRECCIÓN: Se usan los nombres y valores correctos de la base de datos.
    // Se busca por 'tipo_anuncio' = 'carousel' y 'estado' = 1.
    
    // Obtener anuncios del carrusel principal
    $stmt_slider = $pdo->prepare("SELECT * FROM anuncios_web WHERE tipo_anuncio = 'carousel' AND estado = 1 ORDER BY orden ASC");
    $stmt_slider->execute();
    $anuncios_slider = $stmt_slider->fetchAll(PDO::FETCH_ASSOC);

    // Obtener anuncios de la columna derecha
    $stmt_sidebar = $pdo->prepare("SELECT * FROM anuncios_web WHERE tipo_anuncio = 'sidebar' AND estado = 1 ORDER BY orden ASC");
    $stmt_sidebar->execute();
    $anuncios_sidebar = $stmt_sidebar->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    // Si hay un error, los arrays estarán vacíos y se mostrará el contenido por defecto.
    $anuncios_slider = [];
    $anuncios_sidebar = [];
    error_log("Error al cargar anuncios para el carrusel: " . $e->getMessage());
}
?>

<div class="promo-section">
    
    <div class="promo-main-column">
        <div class="carousel-container">
            <div class="carousel-slides">
                <?php if (!empty($anuncios_slider)): ?>
                    <?php foreach ($anuncios_slider as $index => $anuncio): ?>
                        <div class="carousel-slide <?php echo $index === 0 ? 'active' : ''; ?>">
                            <?php // CORRECCIÓN: Se usa 'url_destino' para el enlace (href) ?>
                            <?php if (!empty($anuncio['url_destino'])): ?>
                                <a href="<?php echo htmlspecialchars($anuncio['url_destino']); ?>" target="_blank">
                                    <img src="<?php echo htmlspecialchars($anuncio['url_imagen']); ?>" alt="Anuncio <?php echo $index + 1; ?>">
                                </a>
                            <?php else: ?>
                                <img src="<?php echo htmlspecialchars($anuncio['url_imagen']); ?>" alt="Anuncio <?php echo $index + 1; ?>">
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="carousel-slide active">
                        <a href="pageuniquecontent.php?department_id=18&campaign=mes_patrio" target="_blank">
                            <img src="./img/add5.jpg" alt="Mes independencia">
                        </a>
                    </div>
                    <div class="carousel-slide">
                        <a href="pageuniquecontent.php?campaign=listas_online">
                            <img src="./img/add1.jpg" alt="Anuncio Listas Online" >
                        </a>
                    </div>
                <?php endif; ?>
            </div>
            <button class="carousel-control prev">&#10094;</button>
            <button class="carousel-control next">&#10095;</button>
        </div>
    </div>

    <div class="promo-sidebar-column">
        <?php if (!empty($anuncios_sidebar)): ?>
            <?php foreach ($anuncios_sidebar as $index => $anuncio): ?>
                <div class="fixed-ad">
                    <?php // CORRECCIÓN: Se usa 'url_destino' para el enlace (href) ?>
                    <?php if (!empty($anuncio['url_destino'])): ?>
                        <a href="<?php echo htmlspecialchars($anuncio['url_destino']); ?>" target="_blank">
                            <img src="<?php echo htmlspecialchars($anuncio['url_imagen']); ?>" alt="Anuncio lateral <?php echo $index + 1; ?>">
                        </a>
                    <?php else: ?>
                        <img src="<?php echo htmlspecialchars($anuncio['url_imagen']); ?>" alt="Anuncio lateral <?php echo $index + 1; ?>">
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="fixed-ad">
                 <a href="pageuniquecontent.php?ofertas=true&campaign=ofertas_todas">
                    <img src="./img/add4.jpg" alt="Ofertas">
                </a>
            </div>
            <div class="fixed-ad">
                <a href="pageuniquecontent.php?campaign=papeleria">
                    <img src="./img/add2.jpg" alt="Anuncio Papeleria">
                </a>
            </div>
        <?php endif; ?>
    </div>
</div>