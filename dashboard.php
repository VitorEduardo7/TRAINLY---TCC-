<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trainly - Painel Inicial</title>
    <!-- CSS Organizado nas pastas -->
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <link rel="stylesheet" href="css/dashboard-metrics.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

    <?php include __DIR__ . '/includes/nav.php'; ?>

    <div class="main-container">
        <!-- Coluna Esquerda: Perfil -->
        <aside class="profile-sidebar">
            <div class="card profile-card">
                <div class="avatar-large">
                    <span>M</span>
                </div>
                <h2 id="userName">Miguel Bizerra</h2>

                <div id="rankWidget" class="rank-widget"></div>

                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-label">Seguindo</span>
                        <span class="stat-value" id="statFollowing">0</span>
                        <span class="stat-label">Seguidores</span>
                        <span class="stat-value">0</span>
                        <span class="stat-label">Atividades</span>
                        <span class="stat-value" id="statActivities">0</span>
                    </div>
                </div>
                <a href="perfil.html" class="text-link">Editar perfil &gt;</a>
            </div>

            <!-- NOVO: Volume semanal -->
            <div class="card sidebar-block">
                <h2>Volume Semanal</h2>
                <div class="chart" id="weekChart"></div>
                <div class="chart-total"><span>Total</span><b id="weekTotal">0 km</b></div>
            </div>

            <!-- NOVO: Recordes pessoais -->
            <div class="card sidebar-block">
                <h2>Recordes Pessoais</h2>
                <div id="prList"></div>
            </div>

            <!-- NOVO: Meta do mês -->
            <div class="card sidebar-block">
                <h2>Meta do Mês</h2>
                <div id="goalWidget"></div>
            </div>
        </aside>

        <!-- Coluna Central: Feed e Ações -->
        <main class="feed-content">

            <!-- NOVO: Cards de métricas da semana -->
            <div class="metrics-grid" id="metricsGrid"></div>

            <div class="action-cards-grid">
                <div class="card action-card">
                    <div class="action-info">
                        <h3>Recompensa Diária</h3>
                        <p>Resgate seus pontos de login de hoje.</p>
                    </div>
                    <button class="btn-primary" id="rewardBtn">Resgatar</button>
                </div>
                <div class="card action-card">
                    <div class="action-info">
                        <h3>Atividade Bônus</h3>
                        <p>Vá para o mapa e ganhe pontos.</p>
                    </div>
                    <button class="btn-secondary" onclick="window.location.href='mapa.html'">Iniciar</button>
                </div>
            </div>

            <!-- NOVO: Atividades recentes reais (só aparece se já tiver alguma) -->
            <div class="card activities-card" id="activitiesCard" style="display:none;">
                <div class="feed-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                    <h2 style="margin-bottom:0;">Atividades Recentes</h2>
                    <a href="atividades.html" class="text-link">Ver todas &gt;</a>
                </div>
                <div id="activityList"></div>
            </div>

            <div class="card feed-card" id="walkthroughCard">
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
                        <button class="btn-outline" onclick="window.location.href='mapa.html'">Ir para o Mapa</button>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <?php include __DIR__ . '/includes/footer.php'; ?>
    <script src="js/main.js"></script>
</body>
</html>