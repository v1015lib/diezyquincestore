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
    
    #bucket-image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
        max-height: 70vh;
        overflow-y: auto;
        padding: 1rem;
    }
    .bucket-item {
        /* ▼▼▼ LA LÍNEA CORREGIDA ESTÁ AQUÍ ▼▼▼ */
        position: relative; /* Esta línea es la corrección clave */
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

    .bucket-item-actions .action-btn {
        all: unset; 
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid #dee2e6;
        background-color: #f8f9fa;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
    }

    .bucket-item-actions .action-btn:hover {
        background-color: #e2e6ea;
        border-color: #adb5bd;
    }
    
    .bucket-item-actions .delete-btn {
        color: #dc3545;
    }
    
    .bucket-item-actions .delete-btn:hover {
        background-color: #dc3545;
        color: white;
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
    
    #bucket-image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
        max-height: 70vh;
        overflow-y: auto;
        padding: 1rem;
    }
    .bucket-item {
        /* ▼▼▼ LA LÍNEA CORREGIDA ESTÁ AQUÍ ▼▼▼ */
        position: relative; /* Esta línea es la corrección clave */
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

    .bucket-item-actions .action-btn {
        all: unset; 
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid #dee2e6;
        background-color: #f8f9fa;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
    }

    .bucket-item-actions .action-btn:hover {
        background-color: #e2e6ea;
        border-color: #adb5bd;
    }
    
    .bucket-item-actions .delete-btn {
        color: #dc3545;
    }
    
    .bucket-item-actions .delete-btn:hover {
        background-color: #dc3545;
        color: white;
    }
</style>