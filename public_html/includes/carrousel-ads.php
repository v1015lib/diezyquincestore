
<div class="promo-section">
    
    <div class="promo-main-column">
        <div class="carousel-container">
            <div class="carousel-slides">
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
            </div>
            <button class="carousel-control prev">&#10094;</button>
            <button class="carousel-control next">&#10095;</button>
        </div>
    </div>

    <div class="promo-sidebar-column">
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
    </div>

</div>

<?php
/*
================================================================================
 GUÍA RÁPIDA PARA CONFIGURAR LOS ENLACES DE LOS ANUNCIOS
================================================================================

Aquí puedes definir a dónde llevará cada anuncio cuando un usuario haga clic.
Existen dos métodos principales:

--------------------------------------------------------------------------------
 OPCIÓN 1: FILTRAR LA PÁGINA PRINCIPAL (index.php)
--------------------------------------------------------------------------------
Usa este método para filtros rápidos y directos. El usuario se mantiene en la 
página de inicio, pero la lista de productos cambia.

  A) Para mostrar un DEPARTAMENTO específico:
     - Formato: href="index.php?department_id=ID_DEL_DEPARTAMENTO"
     - Ejemplo: href="index.php?department_id=5"

  B) Para mostrar los resultados de una BÚSQUEDA:
     - Formato: href="index.php?search=PALABRA"
     - Ejemplo: href="index.php?search=escolar"

--------------------------------------------------------------------------------
 OPCIÓN 2: USAR LA PÁGINA DE ATERRIZAJE (pageuniquecontent.php)
--------------------------------------------------------------------------------
Usa este método para campañas especiales que necesitan una página dedicada.

  A) Para mostrar un DEPARTAMENTO en la página especial:
     - Formato: href="pageuniquecontent.php?department_id=ID_DEL_DEPARTAMENTO"
     - Ejemplo: href="pageuniquecontent.php?department_id=18"

  B) Para mostrar TODAS las OFERTAS de la tienda:
     - Formato: href="pageuniquecontent.php?ofertas=true"
     - Ejemplo: href="pageuniquecontent.php?ofertas=true"

  C) Para mostrar OFERTAS DE UN DEPARTAMENTO específico:
     - Formato: href="pageuniquecontent.php?ofertas=true&department_id=ID"
     - Ejemplo: href="pageuniquecontent.php?ofertas=true&department_id=2"

================================================================================
*/
?>

<div class="promo-section">
    </div>