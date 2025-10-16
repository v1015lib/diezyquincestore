<?php
//Router para llamar a login principal y no exponerla en public_html
session_start();
require_once __DIR__ . '/../../api/login.php';

?>