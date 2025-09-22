<?php
// admin/api/download_images.php
session_start();

// Este archivo actúa como un "router" para llamar al script principal
// que contiene la lógica para crear el archivo ZIP.
require_once __DIR__ . '/../../api/download_images.php';
?>