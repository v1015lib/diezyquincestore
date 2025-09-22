<div id="processor-controls">
    <h3>Instrucciones</h3>
    <ol>
        <li><strong>Arrastra y suelta</strong> las imágenes en el recuadro punteado o haz clic en él para seleccionarlas.</li>
        <li><strong>Opcional:</strong> Elige una opción de rotación.</li>
        <li>Haz clic en "Subir y Procesar".</li>
    </ol>

    <div id="drop-zone">
        <p>Arrastra y suelta tus imágenes aquí, o haz clic para seleccionarlas.</p>
        <input type="file" id="image-upload-input" name="images[]" multiple accept="image/*">
    </div>
    <div class="form-group" style="justify-content: flex-start; margin: 1rem 0;">
        <label for="rotation-option" style="text-align: left; flex-basis: auto;">Rotación:</label>
        <select id="rotation-option" style="padding: 0.5rem; border: 1px solid #dee2e6;">
            <option value="">Ninguna</option>
            <option value="left">Girar 90° a la Izquierda</option>
            <option value="right">Girar 90° a la Derecha</option>
        </select>
    </div>
    <button id="start-processing-btn" class="action-btn form-submit-btn">Subir y Procesar</button>
</div>

<div id="results-container" class="hidden" style="margin-top: 2rem;">
    <div class="list-header" style="justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3>Resultados del Procesamiento</h3>
        <div class="form-group" style="margin-bottom: 0;">
            <label for="select-all-checkbox" style="font-weight: 600;">Seleccionar Todo</label>
            <input type="checkbox" id="select-all-checkbox" style="width: 20px; height: 20px; cursor: pointer;">
        </div>
    </div>
    <p>Usa la casilla para seleccionar las imágenes que quieres subir a la galería o descargar.</p>
    <div id="processed-files-list"></div>
    <div class="batch-actions-container" style="margin-top: 1rem;">
        <button id="upload-to-gallery-btn" class="action-btn modal-btn-primary" disabled>Subir a Galería</button>
        <button id="download-zip-btn" class="action-btn" style="background-color: #d1ecf1;" disabled>Descargar ZIP</button>
        <button id="clear-results-btn" class="action-btn" style="background-color: #f8d7da;">Limpiar</button>
    </div>
    <div id="results-feedback" style="margin-top: 1rem; font-weight: bold;"></div>
</div>

<div id="processor-output-container" style="margin-top: 2rem;">
    <h4>Consola de Salida:</h4>
    <pre id="processor-output"></pre>
</div>