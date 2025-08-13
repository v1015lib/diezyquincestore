<div id="processor-controls">
    <h3>Instrucciones</h3>
    <ol>
        <li>Coloca las imágenes originales en la carpeta <strong><code>admin/scripts/entrada/</code></strong>.</li>
        <li><strong>Opcional:</strong> Elige una opción de rotación.</li>
        <li>Haz clic en "Iniciar Proceso".</li>
    </ol>
    
    <div class="form-group" style="justify-content: flex-start; margin-bottom: 1rem;">
        <label for="rotation-option" style="text-align: left; flex-basis: auto;">Rotación:</label>
        <select id="rotation-option" style="padding: 0.5rem; border: 1px solid #dee2e6;">
            <option value="">Ninguna</option>
            <option value="left">Girar 90° a la Izquierda</option>
            <option value="right">Girar 90° a la Derecha</option>
        </select>
    </div>
    <button id="start-processing-btn" class="action-btn form-submit-btn">Iniciar Proceso</button>
</div>

<div id="results-container" class="hidden" style="margin-top: 2rem;">
    <h3>Resultados del Procesamiento</h3>
    <p>Haz clic en una imagen para descargarla. Usa la casilla para seleccionar las que quieres subir a la galería.</p>
    <div id="processed-files-list"></div>
    <div class="batch-actions-container" style="margin-top: 1rem;">
        <button id="upload-to-gallery-btn" class="action-btn modal-btn-primary" disabled>Subir a Galería</button>
        <button id="clear-results-btn" class="action-btn" style="background-color: #f8d7da;">Limpiar</button>
    </div>
    <div id="results-feedback" style="margin-top: 1rem; font-weight: bold;"></div>
</div>

<div id="processor-output-container" style="margin-top: 2rem;">
    <h4>Consola de Salida:</h4>
    <pre id="processor-output"></pre>
</div>






