<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Início</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/dashboard.css">
<link rel="stylesheet" href="css/feed.css">
<link rel="stylesheet" href="css/posts.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="main-container dashboard-wide" id="dashboardPage">

    <!-- Cabeçalho: data, saudação, chama de sequência e atalho pra registrar -->
    <header class="dash-header">
        <div>
            <span class="datestamp" id="dateStamp"></span>
            <h1 class="greeting" id="greetingText">Olá!</h1>
        </div>
        <div class="dash-actions">
            <div id="streakSlot"></div>
            <a class="btn-primary dash-cta" href="atividades.php?nova=1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
                Registrar atividade
            </a>
        </div>
    </header>

    <!-- Destaques: a volta de XP na pista + a semana -->
    <section class="dash-hero" aria-label="Seu progresso">
        <div class="lap-card" id="levelCard"></div>

        <div class="week-card">
            <div class="week-head">
                <h2 id="weekTitle">Últimos 7 dias</h2>
                <div class="week-nav">
                    <button type="button" class="week-nav-btn" id="weekPrevBtn" aria-label="Semana anterior">&#8249;</button>
                    <button type="button" class="week-nav-btn" id="weekNextBtn" aria-label="Próxima semana">&#8250;</button>
                </div>
            </div>
            <div class="week-range" id="weekRange"></div>

            <div class="week-hero">
                <span class="week-km" id="weekTotal">0,0</span>
                <span class="week-unit">km</span>
                <span class="week-delta" id="weekDelta"></span>
            </div>
            <div class="week-sub" id="weekSub"></div>

            <div class="chart" id="weekChart"></div>
            <div class="week-day-info" id="weekDayInfo"></div>

            <!-- Tempo, ritmo e atividades da semana mostrada -->
            <div class="week-stats" id="metricsGrid"></div>
        </div>
    </section>

    <div class="dashboard-columns">

        <!-- Coluna principal: feed -->
        <main class="feed-content-wide">
            <h2 class="feed-title">Feed de amigos</h2>

            <div class="feed-composer">
                <div class="feed-avatar" id="composerAvatar">?</div>
                <label for="composerInput" class="sr-only">Nova publicação</label>
                <input type="text" id="composerInput" placeholder="No que você está pensando?" readonly>
                <button class="btn-primary" id="composerBtn">Publicar</button>
            </div>

            <div id="feedList"></div>
            <p id="feedEmpty" class="empty-state" style="display:none;">
                Seu feed está vazio. Crie uma publicação ou siga outros atletas na página de Amigos para ver as publicações deles aqui.
            </p>

            <div class="card walkthrough-card" id="walkthroughCard" style="display:none;">
                <div class="walkthrough-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div>
                    <h3>Registre sua primeira atividade</h3>
                    <p id="noActivityNote">Seus km, sua volta de XP e os desafios começam a andar assim que você registrar o primeiro treino.</p>
                    <a class="btn-primary" href="atividades.php?nova=1">Registrar atividade</a>
                </div>
            </div>
        </main>

        <!-- Coluna lateral: desafios, meta e quem treinou hoje -->
        <aside class="dashboard-sidebar" aria-label="Desafios e metas">
            <div class="card sidebar-block quests-card" id="questsCard" style="display:none;">
                <div class="sidebar-block-header">
                    <h2>Desafios</h2>
                    <span class="quests-count" id="questsCount"></span>
                </div>
                <div id="questsList"></div>
            </div>

            <div class="card sidebar-block">
                <div class="sidebar-block-header">
                    <h2 id="goalTitle">Meta do mês</h2>
                    <button class="goal-edit-btn" id="editGoalBtn" type="button">Editar</button>
                </div>
                <div id="goalWidget"></div>
            </div>

            <div class="card sidebar-block">
                <h2>Treinaram hoje</h2>
                <div id="activeTodayList"></div>
            </div>
        </aside>

    </div>
</div>

<!-- Modal de criar publicação (texto + foto opcional) -->
<div class="overlay" id="createPostOverlay">
    <div class="modal">
        <h3>Criar publicação</h3>
        <div class="field">
            <label for="postContent">O que você quer compartilhar?</label>
            <textarea id="postContent" rows="4" maxlength="1000" placeholder="Escreva algo para seus amigos..."></textarea>
        </div>
        <div class="field">
            <label for="postPhoto">Foto (opcional)</label>
            <input type="file" id="postPhoto" accept="image/png, image/jpeg, image/webp">
        </div>
        <div class="modal-actions">
            <button class="btn-secondary" id="cancelPostBtn" type="button">Cancelar</button>
            <button class="btn-primary" id="savePostBtn" type="button">Publicar</button>
        </div>
    </div>
</div>

<!-- Modal: editar meta do mês -->
<div class="overlay" id="editGoalOverlay">
    <div class="modal">
        <h3>Editar meta do mês</h3>
        <div class="field">
            <label for="goalType">Tipo de meta</label>
            <select id="goalType">
                <option value="km">Distância (km)</option>
                <option value="activities">Número de atividades</option>
                <option value="hours">Tempo ativo (horas)</option>
            </select>
        </div>
        <div class="field">
            <label for="goalValue">Valor da meta</label>
            <input type="number" id="goalValue" step="0.1" min="0.1" placeholder="Ex: 50">
        </div>
        <div class="modal-actions">
            <button class="btn-secondary" id="cancelGoalBtn" type="button">Cancelar</button>
            <button class="btn-primary" id="saveGoalBtn" type="button">Salvar meta</button>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<?php include __DIR__ . '/includes/data-scripts.php'; ?>
<script src="js/main.js"></script>
<script src="js/posts.js"></script>
</body>
</html>