
<aside class="dashboard-sidemenu" id="admin-sidemenu">
    <div class="dashboard-sidemenu-header">
        <h3 class="menu-text">Panel de Control</h3>
    </div>
    <nav>
        <ul>
            <?php
            // Lógica para mostrar enlaces basados en el rol y permisos
            $rol = $_SESSION['rol'] ?? 'empleado'; // Usamos 'empleado' como default seguro
            $permisos = isset($_SESSION['permisos']) ? json_decode($_SESSION['permisos'], true) : [];
            
            // --- INICIO DE LA CORRECCIÓN ---
            function can_access($module, $rol, $permisos) {
                // El Administrador Global siempre tiene acceso a todo.
                if ($rol === 'administrador_global') {
                    return true;
                }

                // El Admin de Tienda tiene acceso a casi todo, excepto a la gestión de usuarios globales y tiendas.
                if ($rol === 'admin_tienda') {
                    // Módulos prohibidos para el Admin de Tienda
                    $restricted_modules = ['usuarios', 'tiendas'];
                    if (in_array($module, $restricted_modules)) {
                        return false;
                    }
                    return true;
                }
                
                // El Bodeguero tiene acceso a módulos específicos de inventario y compras.
                if ($rol === 'bodeguero') {
                    $allowed_modules = ['inventario', 'listas_compras', 'proveedores', 'productos'];
                    return in_array($module, $allowed_modules);
                }

                // Para roles como 'cajero' o 'empleado', el acceso depende de los permisos JSON.
                return isset($permisos[$module]) && $permisos[$module];
            }
            // --- FIN DE LA CORRECCIÓN ---
            ?>

            <?php if (can_access('dashboard', $rol, $permisos)): ?>
            <li>
                <a href="#" class="nav-link active"  data-module="dashboard">
                <span class="menu-icon">📊</span>
                <span class="menu-text">Dashboard</span>
                </a>
            </li>
            <li class="separator"></li>
            <?php endif; ?>
            
            <?php if (can_access('tiendas', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="tiendas">
                <span class="menu-icon">🏪</span>
                <span class="menu-text">Tiendas</span>
            </a></li>
            <?php endif; ?>

            <?php if (can_access('proveedores', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="proveedores">
                <span class="menu-icon">🚚</span>
                <span class="menu-text">Proveedores</span>
            </a></li>
            <?php endif; ?>
            
            <?php if (can_access('pos', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="pos">
                <span class="menu-icon">🛒</span> 
                <span class="menu-text">Punto de Venta</span>
            </a></li>
            <?php endif; ?>

            
            <?php if (can_access('listas_compras', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="listas_compras">
                <span class="menu-icon">📝</span>
                <span class="menu-text">Listas de Compras</span>
            </a></li>
            <?php endif; ?>

            <?php if (can_access('productos', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="productos">
                <span class="menu-icon">📦</span>
                <span class="menu-text">Productos</span>
            </a></li>
            <?php endif; ?>

            <?php if (can_access('departamentos', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="departamentos">
                <span class="menu-icon">🏬</span>
                <span class="menu-text">Departamentos</span>
            </a></li>
            <?php endif; ?>
            <li class="separator"></li>
            
            <?php if (can_access('clientes', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="clientes">
                <span class="menu-icon">👥</span>
                <span class="menu-text">Clientes</span>
            </a></li>
            <?php endif; ?>
            
            <?php if ($rol === 'administrador_global'): // Corregido: Solo el admin global ve esto ?>
            <li><a href="#" class="nav-link" data-module="usuarios">
                <span class="menu-icon">👤</span>
                <span class="menu-text">Usuarios</span>
            </a></li>
            <?php endif; ?>

            <?php if (can_access('tarjetas', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="tarjetas">
                <span class="menu-icon">💳</span>
                <span class="menu-text">Tarjetas</span>
            </a></li>
            <?php endif; ?>

            <?php if (can_access('inventario', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="inventario">
                <span class="menu-icon">📊</span>
                <span class="menu-text">Inventario</span>
            </a></li>
            <?php endif; ?>
            
            <?php if (can_access('estadisticas', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="estadisticas">
                <span class="menu-icon">📈</span>
                <span class="menu-text">Estadísticas</span>
            </a></li>
            <?php endif; ?>

            <?php if (can_access('web_admin', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="web_admin">
                <span class="menu-icon">⚙️</span>
                <span class="menu-text">Web Admin</span>
            </a></li>
            <?php endif; ?>

            <?php if (can_access('utilidades', $rol, $permisos)): ?>
            <li><a href="#" class="nav-link" data-module="utilidades">
                <span class="menu-icon">🛠️</span>
                <span class="menu-text">Utilidades</span>
            </a></li>
            <?php endif; ?>

            <li class="separator"></li> 
            <li><a href="api/logout.php">
                <span class="menu-icon">🚪</span>
                <span class="menu-text">Cerrar Sesión</span>
            </a></li>
        </ul>
    </nav>
    
    <div class="sidemenu-footer">
        <button id="sidemenu-collapse-btn" title="Colapsar menú">
            <span class="menu-icon">➔</span>
        </button>
    </div>
</aside>