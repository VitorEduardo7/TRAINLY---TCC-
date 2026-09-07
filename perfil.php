<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Meu Perfil</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/dashboard-metrics.css">
<link rel="stylesheet" href="css/perfil.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="profile-cover" id="profileCover">
    <button class="btn-secondary cover-edit-btn" id="editCoverBtn">✏️ Editar capa</button>
    <input type="file" id="coverInput" accept="image/png, image/jpeg, image/webp" style="display:none;">

    <div class="profile-avatar-wrapper">
        <div class="profile-avatar-big" id="profileAvatarBig">M</div>
        <button class="avatar-edit-btn" id="editAvatarBtn" title="Trocar foto de perfil" aria-label="Trocar foto de perfil">✏️</button>
        <input type="file" id="avatarInput" accept="image/png, image/jpeg, image/webp" style="display:none;">
    </div>
</div>

<div class="main-container profile-container">

    <div class="profile-top">
        <div class="profile-identity">
            <h1 id="profileName">Carregando...</h1>
            <p class="profile-handle" id="profileHandle"></p>
            <p class="profile-bio" id="profileBio"></p>
        </div>
        <div class="profile-actions">
            <button class="btn-secondary" id="shareProfileBtn">Compartilhar Perfil</button>
            <button class="btn-primary" id="editProfileBtn">✏️ Editar Perfil</button>
        </div>
    </div>

    <div class="profile-stats-row">
        <div class="profile-stat-card">
            <div class="ps-value" id="statActivities">0</div>
            <div class="ps-label">Atividades</div>
        </div>
        <div class="profile-stat-card">
            <div class="ps-value" id="statFollowers">0</div>
            <div class="ps-label">Seguidores</div>
        </div>
        <div class="profile-stat-card">
            <div class="ps-value" id="statFollowing">0</div>
            <div class="ps-label">Seguindo</div>
        </div>
        <div class="profile-stat-card">
            <div class="ps-value" id="statKudos">0</div>
            <div class="ps-label">Kudos recebidos</div>
        </div>
        <div class="profile-stat-card">
            <div class="ps-value">0</div>
            <div class="ps-label">Conquistas</div>
        </div>
    </div>

    <nav class="profile-tabs-new">
        <button class="tab-item-new active" data-tab="atividades">ATIVIDADES</button>
        <button class="tab-item-new" data-tab="estatisticas">ESTATÍSTICAS</button>
        <button class="tab-item-new" data-tab="conquistas">CONQUISTAS</button>
    </nav>

    <div data-tab-panel-new="atividades">
        <div class="activities-grid" id="profileActivitiesGrid"></div>
        <p class="empty-state" id="profileActivitiesEmpty" style="display:none; padding:32px 0; text-align:center;">
            Você ainda não registrou nenhuma atividade.
        </p>
    </div>

    <div data-tab-panel-new="estatisticas" style="display:none;">
        <div class="stats-grid-2col">
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

            <div class="card">
                <h3 class="stats-card-title">Recordes Pessoais</h3>
                <div id="perfilRecordesIcon"></div>
            </div>
        </div>

        <div class="card" style="margin-top:20px;">
            <h3 class="stats-card-title" id="consistencyTitle">Consistência</h3>
            <div class="consistency-calendar" id="consistencyGrid"></div>
            <div class="consistency-summary">
                <div class="cs-item"><b id="csActiveDays">0 / 0</b><span>Dias ativos no mês</span></div>
                <div class="cs-item"><b id="csStreak">0 dias</b><span>Maior sequência</span></div>
                <div class="cs-item"><b id="csPct">0%</b><span>Taxa de consistência</span></div>
            </div>
        </div>
    </div>

    <div data-tab-panel-new="conquistas" style="display:none;">
        <p class="empty-state" style="padding:32px 0; text-align:center;">
            Sistema de conquistas em breve 🏅
        </p>
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

<?php include __DIR__ . '/includes/footer.php'; ?>
<script src="js/main.js"></script>
</body>
</html>