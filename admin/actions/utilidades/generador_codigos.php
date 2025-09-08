<div class="form-container" id="barcode-generator-wrapper">
    <h3>Generador de Códigos de Barras EAN-13</h3>
    <p>
        Esta herramienta genera códigos de 13 dígitos únicos que no existen en tu base de datos.
        Todos los códigos comenzarán con el prefijo <strong>1015</strong> y tendrán un dígito de control válido.
    </p>

    <form id="generate-barcodes-form" class="form-container" style="padding: 1rem; border: none; box-shadow: none;">
        <div class="form-group">
            <label for="quantity">Cantidad de códigos a generar:</label>
            <input type="number" id="quantity" name="quantity" min="1" max="100" required value="10">
            <button type="submit" class="action-btn form-submit-btn">Generar Códigos</button>
        </div>
        <div id="generator-feedback" class="form-message"></div>
    </form>

    <fieldset class="form-fieldset" style="margin-top: 2rem; display: none;" id="results-container">
        <legend class="form-section-header">Resultados</legend>
        
        <div class="barcode-results-grid">
            <div class="barcode-column">
                <h4>Códigos Generados:</h4>
                <textarea id="generated-codes-output" rows="10" readonly></textarea>
                <button id="copy-codes-btn" class="action-btn" style="margin-top: 1rem;">Copiar Códigos</button>
            </div>
            <div class="barcode-column">
                <h4>Previsualización de Códigos de Barras:</h4>
                <div id="barcode-preview-container">
                    <p>Aquí se mostrarán las imágenes...</p>
                </div>
                <button id="download-barcodes-btn" class="action-btn form-submit-btn" style="margin-top: 1rem;" disabled>Descargar Códigos de Barras (ZIP)</button>
            </div>
        </div>
    </fieldset>
    </div>