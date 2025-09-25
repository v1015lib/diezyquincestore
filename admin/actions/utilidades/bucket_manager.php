<div id="bucket-manager-container">
    <div class="list-header">
        <h3>Administrador de Archivos del Bucket</h3>
    </div>
    <p>Gestiona las imágenes almacenadas en el bucket. Usa las casillas para seleccionar múltiples imágenes.</p>
    <div id="bucket-manager-feedback" class="form-message"></div>

    <div class="bucket-batch-actions">
        <div class="form-group">
            <label for="select-all-bucket-images" style="font-weight: 600;">Seleccionar Todo</label>
            <input type="checkbox" id="select-all-bucket-images" style="width: 20px; height: 20px;">
        </div>
        <button id="download-bucket-zip-btn" class="action-btn" disabled>Descargar ZIP Seleccionados</button>
    </div>
    <div class="product-list-container" id="bucket-image-grid">
        </div>
    <div id="bucket-loading-indicator" style="text-align: center; padding: 1rem; display: none;">Cargando...</div>
</div>

<style>
	 .bucket-batch-actions {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid #dee2e6;
    }

    .bucket-item .file-selector {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 20px;
        height: 20px;
        z-index: 10;
        cursor: pointer;
    }
    
    .bucket-item img {
        position: relative; /* Necesario para el selector */
    }
    #bucket-image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
        max-height: 70vh;
        overflow-y: auto;
        padding: 1rem;
    }
    .bucket-item {
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 0.5rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .bucket-item img {
        max-width: 100%;
        height: 120px;
        object-fit: cover;
    }
    .bucket-item .file-name {
        font-size: 0.8rem;
        word-break: break-all;
        margin: 0.5rem 0;
        flex-grow: 1;
    }
    .bucket-item-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 0.5rem;
    }

    /* --- INICIO DE NUEVOS ESTILOS PARA ÍCONOS --- */
    .bucket-item-actions .action-btn {
        /* Reset de estilos para que se vean como íconos */
        all: unset; 
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        
        /* Apariencia circular */
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid #dee2e6;
        background-color: #f8f9fa;
        cursor: pointer;
        
        /* Tamaño del ícono */
        font-size: 1rem;
        
        transition: all 0.2s ease;
    }

    .bucket-item-actions .action-btn:hover {
        background-color: #e2e6ea;
        border-color: #adb5bd;
    }
    
    /* Estilo específico para el botón de eliminar */
    .bucket-item-actions .delete-btn {
        color: #dc3545; /* Rojo para el ícono */
    }
    
    .bucket-item-actions .delete-btn:hover {
        background-color: #dc3545; /* Fondo rojo al pasar el mouse */
        color: white; /* Ícono blanco */
    }
       .bucket-batch-actions {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid #dee2e6;
    }

    .bucket-item .file-selector {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 20px;
        height: 20px;
        z-index: 10;
        cursor: pointer;
    }
    
    .bucket-item img {
        position: relative;
    }
    /* --- FIN DE NUEVOS ESTILOS --- */
</style>