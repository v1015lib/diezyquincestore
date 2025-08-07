export function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidemenu = document.getElementById('sidemenu');
    const closeSidemenuBtn = document.getElementById('close-sidemenu');

    if (mobileMenuToggle && sidemenu) { 
        mobileMenuToggle.addEventListener('click', () => {
            sidemenu.classList.add('active');
        });
    }

    if (closeSidemenuBtn && sidemenu) { 
        closeSidemenuBtn.addEventListener('click', () => {
            sidemenu.classList.remove('active');
        });
    }

    // Opcional: cerrar el menú al hacer clic fuera de él (solo en móviles)
    document.addEventListener('click', (event) => {
        // Asegúrate de que el breakpoint de tablet (768) coincida con tu SCSS
        if (window.innerWidth < 768 && 
            sidemenu && sidemenu.classList.contains('active') &&
            !sidemenu.contains(event.target) &&
            (!mobileMenuToggle || !mobileMenuToggle.contains(event.target))) { 
            sidemenu.classList.remove('active');
        }
    });
}