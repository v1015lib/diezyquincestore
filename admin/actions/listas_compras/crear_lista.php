<div class="form-container">
    <h3>Crear Nueva Lista de Compras</h3>
    <form id="create-shopping-list-form">
        <div class="form-group">
            <label for="nombre_lista">Nombre de la Lista</label>
            <input type="text" id="nombre_lista" name="nombre_lista" required>
        </div>
        <div class="form-group">
            <label for="id_proveedor">Asignar a Proveedor</label>
            <select id="id_proveedor" name="id_proveedor">
                <option value="">(Opcional) Selecciona un proveedor</option>
                </select>
        </div>
        <button type="submit" class="action-btn">Crear y Añadir Productos</button>
    </form>
</div>