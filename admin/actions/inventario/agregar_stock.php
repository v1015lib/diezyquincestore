<div class="form-container" id="add-stock-wrapper">
    <div id="product-search-container-stock">
        <h3>Agregar Stock a un Producto</h3>
        <p>Busca un producto por su código para añadir unidades a su inventario.</p>

            <form id="stock-action-form">
                <input type="hidden" name="product_id" value="...">

                <div class="form-group">
                    <label for="id_tienda">Aplicar a Tienda:</label>
                    <select id="id_tienda" name="id_tienda" required>
                        </select>
                </div>

                <div class="form-group">
                    <label for="quantity">Cantidad a Agregar</label>
                    <input type="number" id="quantity" name="quantity" required>
                </div>

            </form>
    </div>

    <div id="stock-form-container" class="hidden" style="margin-top: 2rem;">
        </div>
</div>