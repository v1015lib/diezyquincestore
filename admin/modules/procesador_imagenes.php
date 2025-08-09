<div class="module-header">
    <h2>Utilidades: Procesador de Imágenes</h2>
</div>

<div class="module-content">
    <div id="processor-controls">
        <h3>Instrucciones</h3>
        <ol>
            <li>Coloca las imágenes originales en la carpeta <strong><code>admin/scripts/entrada/</code></strong> en tu servidor.</li>
            <li>Haz clic en "Iniciar Proceso". El proceso puede tardar varios minutos.</li>
            <li>Una vez finalizado, las imágenes aparecerán en la lista de "Resultados".</li>
        </ol>
        <button id="start-processing-btn" class="action-btn form-submit-btn">Iniciar Proceso</button>
    </div>

    <div id="results-container" class="hidden" style="margin-top: 2rem;">
        <h3>Resultados del Procesamiento</h3>
        <div id="processed-files-list">
            </div>
        <div class="batch-actions-container" style="margin-top: 1rem;">
            <button id="upload-to-gallery-btn" class="action-btn modal-btn-primary" disabled>Subir a Galería</button>
            <button id="download-zip-btn" class="action-btn modal-btn-secondary" disabled>Descargar ZIP</button>
            <button id="clear-results-btn" class="action-btn" style="background-color: #f8d7da;">Limpiar</button>
        </div>
        <div id="results-feedback" style="margin-top: 1rem; font-weight: bold;"></div>
    </div>
    
    <div id="processor-output-container" style="margin-top: 2rem;">
        <h4>Consola de Salida:</h4>
        <pre id="processor-output"></pre>
    </div>
</div>