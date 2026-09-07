<nav class="navbar">
    <div class="nav-container">

        <div class="nav-left">

            <a href="/TRAINLY---TCC-/dashboard.php" class="brand-logo">
                <img src="img/logo.png" alt="Trainly" class="logo-img">
            </a>

        </div>

        <ul class="nav-links">
            <li>
                <a href="dashboard.php">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    Dashboard
                </a>
            </li>

            <li>
                <a href="/TRAINLY---TCC-/atividades.php">
                    <!-- Atividades -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12h4l3-9 4 18 3-9h4"></path>
                    </svg>
                    Atividades
                </a>
            </li>

            <li>
                <a href="/TRAINLY---TCC-/explorar.php">
                    <!-- Explorar -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6l6-3 6 3 6-3v18l-6 3-6-3-6 3V6z"></path>
                        <path d="M9 3v18"></path>
                        <path d="M15 6v18"></path>
                    </svg>
                    Explorar
                </a>
            </li>

            <li>
                <a href="/TRAINLY---TCC-/amizades.php">
                    <!-- Amigos -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    Amigos
                </a>
            </li>

            <li>
                <a href="/TRAINLY---TCC-/clubes.php">
                    <!-- Clubes -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 21h8"></path>
                        <path d="M12 17v4"></path>
                        <path d="M7 4h10v5a5 5 0 0 1-10 0V4z"></path>
                        <path d="M17 5h3a2 2 0 0 1 2 2 4 4 0 0 1-4 4"></path>
                        <path d="M7 5H4a2 2 0 0 0-2 2 4 4 0 0 0 4 4"></path>
                    </svg>
                    Clubes
                </a>
            </li>
        </ul>

        <div class="nav-right">

            <button
                class="icon-btn"
                data-notif
                aria-label="Notificações"
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            </button>

            <div class="profile-menu-wrapper">
                <button
                    class="user-avatar-small"
                    data-profile-toggle
                    aria-label="Menu do perfil"
                >
                    <span>M</span>
                </button>

                <div class="profile-menu" data-profile-menu>
                    <a href="/TRAINLY---TCC-/perfil.php">Meu perfil</a>
                    <a href="#" data-logout>Sair</a>
                </div>
            </div>

            <button
                class="hamburger-btn"
                aria-label="Abrir menu"
                aria-expanded="false"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

        </div>

    </div>
</nav>