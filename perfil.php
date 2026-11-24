<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Meu Perfil</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/dashboard-metrics.css">
<link rel="stylesheet" href="css/feed.css">
<link rel="stylesheet" href="css/posts.css">
<link rel="stylesheet" href="css/perfil.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="profile-cover" id="profileCover">
    <button class="btn-secondary cover-edit-btn" id="editCoverBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Editar capa</span></button>
    <input type="file" id="coverInput" accept="image/png, image/jpeg, image/webp" style="display:none;">

    <div class="profile-avatar-wrapper">
        <div class="profile-avatar-big" id="profileAvatarBig">M</div>
        <!-- Nível (selo na cor da patente, preenchido pelo main.js) -->
        <span class="profile-level-badge" id="profileLevelBadge" aria-hidden="true"></span>
        <button class="avatar-edit-btn" id="editAvatarBtn" title="Trocar foto de perfil" aria-label="Trocar foto de perfil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
        <input type="file" id="avatarInput" accept="image/png, image/jpeg, image/webp" style="display:none;">
    </div>
</div>

<div class="main-container profile-container">

    <div class="profile-top">
        <div class="profile-identity">
            <h1 id="profileName">Carregando...</h1>
            <!-- Patente + foguinho (preenchidos pelo main.js) -->
            <div class="profile-rank" id="profileRank"></div>
            <p class="profile-handle" id="profileHandle"></p>
            <p class="profile-bio" id="profileBio"></p>
        </div>
        <div class="profile-actions">
            <button class="btn-secondary" id="shareProfileBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg><span>Compartilhar</span></button>
            <button class="btn-primary" id="followProfileBtn" style="display:none;">+ Seguir</button>
            <button class="btn-primary" id="editProfileBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><span>Editar perfil</span></button>
            <!-- Configurações ficam dentro do perfil, como no app -->
            <a class="profile-settings-btn" id="profileSettingsBtn" href="configuracoes.php" title="Configurações" aria-label="Configurações">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </a>
        </div>
    </div>

    <div class="profile-stats-row">
        <div class="profile-stat-card">
            <span class="ps-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
            <span class="ps-body"><span class="ps-value" id="statActivities">0</span><span class="ps-label">Atividades</span></span>
        </div>
        <!-- Clicáveis: abrem a janela com a lista de pessoas -->
        <button type="button" class="profile-stat-card stat-link" data-connections="followers" aria-haspopup="dialog">
            <span class="ps-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/></svg></span>
            <span class="ps-body"><span class="ps-value" id="statFollowers">0</span><span class="ps-label">Seguidores</span></span>
        </button>
        <button type="button" class="profile-stat-card stat-link" data-connections="following" aria-haspopup="dialog">
            <span class="ps-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg></span>
            <span class="ps-body"><span class="ps-value" id="statFollowing">0</span><span class="ps-label">Seguindo</span></span>
        </button>
        <div class="profile-stat-card">
            <span class="ps-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></span>
            <span class="ps-body"><span class="ps-value" id="statPosts">0</span><span class="ps-label">Publicações</span></span>
        </div>
    </div>

    <nav class="profile-tabs-new">
        <button class="tab-item-new active" data-tab="publicacoes">Publicações</button>
        <button class="tab-item-new" data-tab="atividades">Atividades</button>
        <button class="tab-item-new" data-tab="estatisticas">Estatísticas</button>
    </nav>

    <div data-tab-panel-new="publicacoes">
        <div class="activities-grid" id="profilePostsList"></div>
        <p class="empty-state" id="profilePostsEmpty" style="display:none; padding:32px 0; text-align:center;">
            Nenhuma publicação por aqui ainda.
        </p>
    </div>

    <div data-tab-panel-new="atividades" style="display:none;">
        <div class="activities-grid" id="profileActivitiesGrid"></div>
        <p class="empty-state" id="profileActivitiesEmpty" style="display:none; padding:32px 0; text-align:center;">
            Você ainda não registrou nenhuma atividade.
        </p>
    </div>

    <div data-tab-panel-new="estatisticas" style="display:none;">
        <div class="stats-grid-2col">
            <div class="stats-col">
                <div class="card">
                    <h3 class="stats-card-title" id="statsYearTitle">Resumo</h3>
                    <div class="resumo-grid">
                        <div class="resumo-item">
                            <span class="resumo-label">Distância Total</span>
                            <span class="resumo-value" id="perfilDistancia">0,00 km</span>
                        </div>
                        <div class="resumo-item">
                            <span class="resumo-label">Tempo Ativo</span>
                            <span class="resumo-value" id="perfilTempo">0h 0m</span>
                        </div>
                        <div class="resumo-item">
                            <span class="resumo-label">Elevação Acum.</span>
                            <span class="resumo-value" id="perfilElevacao">0 m</span>
                        </div>
                        <div class="resumo-item">
                            <span class="resumo-label">Atividades</span>
                            <span class="resumo-value" id="perfilTotalAno">0</span>
                        </div>
                        <div class="resumo-item">
                            <span class="resumo-label">Dias Ativos</span>
                            <span class="resumo-value" id="perfilDiasAtivos">0 dias</span>
                        </div>
                    </div>
                </div>

                <!-- Consistência: as setas trocam o mês (main.js → renderConsistency) -->
                <div class="card consist-card">
                    <div class="cal-head">
                        <h3 class="stats-card-title">Consistência</h3>
                        <div class="cal-nav" id="consistencyNav">
                            <button type="button" class="cal-arrow" data-step="-1" aria-label="Mês anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
                            <span class="cal-month" id="consistencyTitle" aria-live="polite"></span>
                            <button type="button" class="cal-arrow" data-step="1" aria-label="Próximo mês"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></button>
                        </div>
                    </div>
                    <div class="cal-body">
                        <div class="cal-main">
                            <div class="consistency-calendar" id="consistencyGrid" role="img"></div>
                            <div class="cal-foot"><span id="consistencyInfo"></span><span class="cal-legend" aria-hidden="true">Menos<i></i><i class="lv1"></i><i class="lv2"></i><i class="lv3"></i>Mais</span></div>
                        </div>
                        <div class="consistency-summary">
                            <div class="cs-item"><b id="csActiveDays">0 / 0</b><span>Dias ativos no mês</span></div>
                            <div class="cs-item"><b id="csStreak">0 dias</b><span>Maior sequência de dias</span></div>
                            <div class="cs-item"><b id="csPct">0%</b><span>Taxa de consistência</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="stats-col">
                <div class="card">
                    <h3 class="stats-card-title">Recordes pessoais</h3>
                    <div id="perfilRecordesIcon"></div>
                </div>

                <div class="card">
                    <h3 class="stats-card-title">Nível e sequência</h3>
                    <!-- preenchido pelo main.js -->
                    <div class="resumo-grid" id="profileProgress"></div>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- Modal: editar perfil -->
<div class="overlay" id="editProfileOverlay">
    <div class="modal">
        <h3>Editar Perfil</h3>
        <div class="field">
            <label>Nome</label>
            <input type="text" id="epName" placeholder="Seu nome">
        </div>
        <div class="field">
            <label>Localização (opcional)</label>
            <input type="text" id="epLocation" placeholder="Ex: São Paulo, SP">
        </div>
        <div class="field">
            <label>Bio (opcional, máx. 280 caracteres)</label>
            <input type="text" id="epBio" maxlength="280" placeholder="Fale um pouco sobre você...">
        </div>
        <div class="modal-actions">
            <button class="btn-secondary" id="cancelEditProfileBtn" type="button">Cancelar</button>
            <button class="btn-primary" id="saveProfileBtn" type="button">Salvar</button>
        </div>
    </div>
</div>

<!-- Janela: seguidores / seguindo (preenchida pelo main.js) -->
<div class="overlay" id="connOverlay">
    <div class="modal conn-modal" role="dialog" aria-modal="true" aria-labelledby="connTitle">
        <div class="conn-head">
            <h3 id="connTitle">Seguidores</h3>
            <button type="button" class="conn-close" data-conn-close aria-label="Fechar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
            </button>
        </div>

        <div class="conn-tabs" role="group" aria-label="Escolher a lista">
            <button type="button" data-conn-tab="followers" aria-pressed="true">Seguidores <span data-conn-count="followers"></span></button>
            <button type="button" data-conn-tab="following" aria-pressed="false">Seguindo <span data-conn-count="following"></span></button>
        </div>

        <div class="conn-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
            <label for="connSearch" class="sr-only">Pesquisar por nome</label>
            <input type="search" id="connSearch" placeholder="Pesquisar por nome" autocomplete="off">
        </div>

        <ul class="conn-list" id="connList"></ul>
        <p class="sr-only" id="connStatus" aria-live="polite"></p>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<?php include __DIR__ . '/includes/data-scripts.php'; ?>
<script src="js/main.js"></script>
<script src="js/posts.js"></script>
</body>
</html>