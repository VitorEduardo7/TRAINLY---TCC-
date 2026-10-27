<?php
// Página atual (ex: "dashboard.php") — usada para destacar o item ativo,
// tanto na barra lateral (computador) quanto na barra de abas (celular).
$trainlyPage = basename($_SERVER['SCRIPT_NAME'] ?? '');
$navActive = function (string $file) use ($trainlyPage): string {
    return $trainlyPage === $file ? ' class="active" aria-current="page"' : '';
};
?>
<!-- Navegação: barra lateral no computador; no celular vira barra no topo
     (logo, sino, avatar) + barra de abas flutuante embaixo. -->
<nav class="navbar sidebar" aria-label="Navegação principal">
    <!-- Acessibilidade: primeiro item do Tab pula direto pro conteúdo -->
    <a href="#conteudo" class="skip-link">Pular para o conteúdo</a>

    <div class="nav-container">

        <div class="nav-left">
            <a href="/TRAINLY---TCC-/dashboard.php" class="brand-logo" aria-label="Trainly, início">
                <img src="img/trainly-icon.png" alt="Trainly" class="logo-img">
            </a>

            <div class="nav-tools">
                <button class="icon-btn" data-theme-toggle aria-label="Trocar tema claro/escuro" title="Trocar tema"></button>

                <button class="icon-btn" data-notif aria-label="Notificações">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </button>
            </div>
        </div>

        <ul class="nav-links">
            <li>
                <a href="/TRAINLY---TCC-/dashboard.php"<?= $navActive('dashboard.php') ?>>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"></path>
                    </svg>
                    <span>Início</span>
                </a>
            </li>
            <li>
                <a href="/TRAINLY---TCC-/atividades.php"<?= $navActive('atividades.php') ?>>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span>Atividades</span>
                </a>
            </li>
            <li>
                <a href="/TRAINLY---TCC-/explorar.php"<?= $navActive('explorar.php') ?>>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"></path>
                        <path d="M9 4v14"></path>
                        <path d="M15 6v14"></path>
                    </svg>
                    <span>Explorar</span>
                </a>
            </li>
            <li>
                <a href="/TRAINLY---TCC-/amizades.php"<?= $navActive('amizades.php') ?>>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>Amigos</span>
                </a>
            </li>
            <li>
                <a href="/TRAINLY---TCC-/clubes.php"<?= $navActive('clubes.php') ?>>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M8 21h8"></path>
                        <path d="M12 17v4"></path>
                        <path d="M7 4h10v5a5 5 0 0 1-10 0V4z"></path>
                        <path d="M17 5h3v2a4 4 0 0 1-4 4"></path>
                        <path d="M7 5H4v2a4 4 0 0 0 4 4"></path>
                    </svg>
                    <span>Clubes</span>
                </a>
            </li>
        </ul>

        <div class="nav-right">
            <!-- Cartão do usuário: abre o menu com Perfil, Configurações e Sair -->
            <div class="profile-menu-wrapper">
                <button class="nav-user<?= in_array($trainlyPage, ['perfil.php', 'configuracoes.php'], true) ? ' active' : '' ?>" type="button" data-profile-toggle aria-expanded="false" aria-controls="profileMenu">
                    <span class="user-avatar-small"><span>?</span></span>
                    <span class="nav-user-text">
                        <span class="nav-user-name" data-user-name>Carregando...</span>
                        <span class="nav-user-level" data-user-level></span>
                    </span>
                    <svg class="nav-user-more" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="12" cy="5" r="1.8"></circle>
                        <circle cx="12" cy="12" r="1.8"></circle>
                        <circle cx="12" cy="19" r="1.8"></circle>
                    </svg>
                    <span class="sr-only">Abrir menu do perfil</span>
                </button>

                <div class="profile-menu" id="profileMenu" data-profile-menu>
                    <a href="/TRAINLY---TCC-/perfil.php" class="pm-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Meu perfil
                    </a>
                    <a href="/TRAINLY---TCC-/configuracoes.php" class="pm-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Configurações
                    </a>
                    <div class="pm-sep" aria-hidden="true"></div>
                    <a href="#" class="pm-item pm-danger" data-logout>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sair da conta
                    </a>
                </div>
            </div>
        </div>

    </div>
</nav>