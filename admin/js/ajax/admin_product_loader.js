export let currentAdminProductParams = {};

export async function fetchAndRenderProducts(searchTerm = '') {
    const tableBody = document.getElementById('product-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6">Buscando...</td></tr>';
    
    try {
        const apiUrl = `../api/index.php?resource=admin/getProducts&search=${encodeURIComponent(searchTerm)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();

        tableBody.innerHTML = '';
        if (data.success && data.products.length > 0) {
            data.products.forEach(product => {
                const row = document.createElement('tr');
                row.dataset.productId = product.id_producto;
                const statusClass = (product.nombre_estado || '').toLowerCase() === 'activo' ? 'status-active' : 'status-inactive';
                row.innerHTML = `
                    <td><input type="checkbox" class="product-checkbox"></td>
                    <td>${product.codigo_producto}</td>
                    <td class="editable" data-field="nombre_producto">${product.nombre_producto}</td>
                    <td>${product.departamento}</td>
                    <td class="editable" data-field="precio_venta">$${parseFloat(product.precio_venta).toFixed(2)}</td>
                    <td><span class="status-badge ${statusClass}">${product.nombre_estado}</span></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6">No se encontraron productos para tu búsqueda.</td></tr>';
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar productos: ${error.message}</td></tr>`;
        console.error("Detalle del error:", error);
    }
}