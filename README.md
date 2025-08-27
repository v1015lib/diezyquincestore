***Checklist para Sistema Multi-Tienda***

# Fase 1: Cambios en la Base de Datos
- [x] Crear Tabla `tiendas`: Para registrar cada una de tus sucursales (ID, nombre, dirección, etc.).
- [x] Crear Tabla `inventario_tienda`: La tabla central que conectará productos, tiendas y stock.
- [x] Modificar Tabla `usuarios`: Añadir una columna `id_tienda` para asignar empleados a una sucursal.
- [ ] **(Pendiente)** Modificar Tabla `ventas`: Añadir una columna `id_tienda` para registrar dónde se realizó cada venta.
- [x] **(Omitido)** Migrar Datos de Stock: Se omitió por estar en entorno de desarrollo con datos de prueba.
- [ ] **(Pendiente Final)** Modificar Tabla `productos`: Eliminar la columna `stock_actual` para convertirla en un catálogo maestro.

***

# Fase 2: Actualizaciones en el Panel de Administración

- [x] Crear Módulo "Gestionar Tiendas": Una nueva sección en el panel para crear, ver y editar tus sucursales.
- [x] Actualizar Módulo "Usuarios":
    - [x] Añadir un menú desplegable en el formulario para asignar una tienda a cada empleado.
    - [ ] **(Pendiente)** Guardar el `id_tienda` del empleado en la sesión (`$_SESSION`) al iniciar sesión.
- [x] Actualizar Módulo "Inventario":
    - [x] Modificar los formularios de "Agregar Stock" y "Ajuste" para que los administradores elijan una tienda y los empleados apliquen los cambios automáticamente a su tienda asignada.
    - [x] Actualizar la API para que todas las operaciones de inventario afecten a la tabla `inventario_tienda`.
- [x] Actualizar Módulo "Productos":
    - [x] En la lista de productos, la columna "Stock" ahora debe mostrar la suma total de todas las tiendas.
    - [ ] **(Pendiente Final)** Eliminar por completo los campos de stock de los formularios para "Agregar" y "Modificar" producto.

## **Tareas Críticas Pendientes - Fase 2**

- [ ] **Actualizar Punto de Venta (POS):**
    - [ ] El POS debe leer el `id_tienda` del empleado desde la sesión `($_SESSION)`.
    - [ ] Las consultas de stock (`pos_get_product_by_code`) deben filtrar el inventario por el `id_tienda` del empleado.
    - [ ] La finalización de venta (`pos_finalize_sale`) debe deducir el stock de la tienda correcta.
    - [ ] Se debe registrar el `id_tienda` en la tabla `ventas` al finalizar una compra en el POS.

- [ ] **Actualizar Reportes (Dashboard y Estadísticas):**
    - [ ] Añadir un filtro desplegable de "Tiendas" en los módulos de Estadísticas y Dashboard.
    - [ ] Modificar las APIs de reportes (`getSalesStats`, `getProductStats`, etc.) para que acepten un `id_tienda` como parámetro y filtren los resultados.

***

# Fase 3: Cambios en la Tienda en Línea (Web del Cliente)

- [ ] Definir una "Bodega Web": Elegir una de tus tiendas (ej. `id_tienda = 1`) como la fuente de inventario para todas las compras en línea.
- [ ] Actualizar Consultas de Stock: Modificar la API pública para que la disponibilidad de productos y el proceso de checkout (`finalizar_compra.php`, `checkout-with-card`, etc.) verifiquen y descuenten el stock únicamente de la bodega web designada.