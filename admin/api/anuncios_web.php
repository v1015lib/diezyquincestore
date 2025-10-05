<?php
/**
 * admin/api/anuncios_web.php
 *
 * Este archivo actúa como un router para el panel de administración.
 * Su única función es incluir y ejecutar la API principal de anuncios,
 * permitiendo un punto de acceso centralizado y seguro desde la carpeta /admin/api/.
 */

// Incluimos la implementación real de la API que se encuentra en el directorio raíz /api/.
// La ruta __DIR__ . '/../../api/anuncios_web.php' navega dos niveles hacia arriba 
// desde /admin/api/ para llegar a la raíz y luego entra en /api/.
require_once __DIR__ . '/../../api/anuncios_web.php';
?>