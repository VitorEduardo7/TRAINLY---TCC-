<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Painel Inicial</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/dashboard.css">
<link rel="stylesheet" href="css/feed.css">
<link rel="stylesheet" href="css/posts.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="main-container dashboard-wide">

    <div class="dashboard-header">
        <span class="datestamp" id="dateStamp"></span>
        <h1 class="greeting" id="greetingText">Bom dia! 👋</h1>
    </div>

    <div class="metrics-grid" id="metricsGrid"></div>

    <div class="dashboard-columns">

        <!-- Coluna principal: ações + feed -->
        <main class="feed-content-wide">

            <h2 class="feed-title">FEED DE AMIGOS</h2>

            <div class="feed-composer">
                <div class="feed-avatar" id="composerAvatar" style="background:#2a9ed4;">M</div>
                <input type="text" id="composerInput" placeholder="No que você está pensando?" readonly>
                <button class="btn-primary" id="composerBtn">+ Publicar</button>
            </div>

            <div id="feedList"></div>
            <p id="feedEmpty" class="empty-state" style="display:none; padding:32px 0; text-align:center;">
                Seu feed está vazio. Crie uma publicação ou siga outros atletas na página de Amizades para ver as publicações deles aqui.
            </p>

            <div class="card feed-card" id="walkthroughCard" style="display:none;">
                <div class="feed-header">
                    <h2>Vamos Começar</h2>
                    <p>Listamos alguns passos para ajudar você a aproveitar o Trainly.</p>
                </div>
                <p id="noActivityNote" class="empty-state" style="display:none; margin-bottom:20px;">Você ainda não gravou nenhuma atividade — seus km e XP vão aparecer aqui assim que você concluir a primeira corrida no mapa.</p>
                <div class="feed-item">
                    <div class="feed-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                    </div>
                    <div class="feed-text">
                        <h3>Gravar primeira atividade</h3>
                        <p>Abra o mapa e registre sua primeira corrida diretamente no app.</p>
                        <button class="btn-outline" onclick="window.location.href='mapa.php'">Ir para o Mapa</button>
                    </div>
                </div>
            </div>
        </main>

        <!-- Coluna lateral -->
        <aside class="dashboard-sidebar">
            <div class="card sidebar-block">
                <h2>Volume Semanal</h2>
                <div class="chart" id="weekChart"></div>
                <div class="chart-total"><span>Total</span><b id="weekTotal">0 km</b></div>
            </div>

            <div class="card sidebar-block">
                <h2>Amigos Ativos Hoje</h2>
                <div id="activeTodayList"></div>
            </div>

            <div class="card sidebar-block">
                <h2>Recordes Pessoais</h2>
                <div id="prList"></div>
            </div>

            <div class="card sidebar-block">
                <h2>Meta do Mês</h2>
                <div id="goalWidget"></div>
            </div>
        </aside>

    </div>
</div>

<!-- Modal de criar publicação (texto + foto opcional) -->
<div class="overlay" id="createPostOverlay">
    <div class="modal">
        <h3>Criar Publicação</h3>
        <div class="field">
            <label>O que você quer compartilhar?</label>
            <textarea id="postContent" rows="4" maxlength="1000" placeholder="Escreva algo para seus amigos..."></textarea>
        </div>
        <div class="field">
            <label>Foto (opcional)</label>
            <input type="file" id="postPhoto" accept="image/png, image/jpeg, image/webp">
        </div>
        <div class="modal-actions">
            <button class="btn-secondary" id="cancelPostBtn" type="button">Cancelar</button>
            <button class="btn-primary" id="savePostBtn" type="button">Publicar</button>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<script src="js/main.js"></script>
<script src="js/posts.js"></script>
</body>
</html>