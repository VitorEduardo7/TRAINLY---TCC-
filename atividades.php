<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trainly - Minhas Atividades</title>
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/dashboard-metrics.css">
    <link rel="stylesheet" href="css/atividades.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

    <?php include __DIR__ . '/includes/nav.php'; ?>

    <div class="atividades-container">
        <div class="page-header-top">
            <div>
                <div class="page-eyebrow">Histórico completo</div>
                <h1 class="page-title-big">Minhas Atividades</h1>
            </div>
            <div class="atv-head-actions">
                <div id="atvStreakSlot"></div>
                <button class="btn-primary" id="openRegisterBtn">+ Nova Atividade</button>
            </div>
        </div>

        <!-- Nível atual: quanto falta pro próximo e XP ganho nesta semana -->
        <section class="atv-level" id="atvLevel" aria-label="Seu nível"></section>

        <!-- Números do período escolhido (preenchidos pelo main.js) -->
        <div class="atv-period-row">
            <h2 class="g-section-title" id="atvPeriodTitle">Seu ano</h2>
            <div class="period-tabs atv-period" role="group" aria-label="Escolher o período">
                <button type="button" class="period-pill" data-period="week" aria-pressed="false">Semana</button>
                <button type="button" class="period-pill" data-period="month" aria-pressed="false">Mês</button>
                <button type="button" class="period-pill" data-period="6months" aria-pressed="false">6 meses</button>
                <button type="button" class="period-pill active" data-period="year" aria-pressed="true">Ano</button>
            </div>
        </div>
        <div class="g-stats atv-stats" aria-live="polite">
            <div class="g-stat">
                <span class="g-stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
                <div class="g-stat-body"><div class="g-stat-value" id="sumCount">0</div><div class="g-stat-label" id="sumCountLabel">Treinos no ano</div></div>
            </div>
            <div class="g-stat tone-green">
                <span class="g-stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg></span>
                <div class="g-stat-body"><div class="g-stat-value" id="sumDist">0<small>km</small></div><div class="g-stat-label" id="sumDistLabel">Distância no ano</div></div>
            </div>
            <div class="g-stat tone-violet">
                <span class="g-stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
                <div class="g-stat-body"><div class="g-stat-value" id="sumTime">0h</div><div class="g-stat-label" id="sumTimeLabel">Tempo ativo no ano</div></div>
            </div>
            <div class="g-stat gold tone-gold">
                <span class="g-stat-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg></span>
                <div class="g-stat-body"><div class="g-stat-value" id="sumXp">0</div><div class="g-stat-label" id="sumXpLabel">XP ganho no ano</div></div>
            </div>
        </div>

        <div class="filter-tabs atv-filters" role="group" aria-label="Filtrar por esporte">
            <button class="filter-pill active" data-filter="Todos">Todos <span class="pill-count" data-count="Todos"></span></button>
            <button class="filter-pill" data-filter="Corrida">Corrida <span class="pill-count" data-count="Corrida"></span></button>
            <button class="filter-pill" data-filter="Ciclismo">Ciclismo <span class="pill-count" data-count="Ciclismo"></span></button>
            <button class="filter-pill" data-filter="Natação">Natação <span class="pill-count" data-count="Natação"></span></button>
            <button class="filter-pill" data-filter="Caminhada">Caminhada <span class="pill-count" data-count="Caminhada"></span></button>
        </div>

        <div class="atividades-columns">
            <div class="atividades-main">
                <div id="atividadesList"></div>
                <div class="atividades-empty" id="atividadesEmpty" style="display:none;"></div>
            </div>

            <!-- Consistência do mês + recordes pessoais -->
            <aside class="atividades-sidebar">
                <div class="stats-card">
                    <div class="stats-card-title" id="atvConsistTitle">Consistência</div>
                    <div class="consistency-grid" id="atvConsistGrid"></div>
                    <div class="consistency-summary">
                        <div class="consistency-summary-item">
                            <span id="atvCsActive">0</span>
                            <label>Dias ativos</label>
                        </div>
                        <div class="consistency-summary-item">
                            <span id="atvCsStreak">0 dias</span>
                            <label>Maior sequência</label>
                        </div>
                        <div class="consistency-summary-item">
                            <span id="atvCsPct">0%</span>
                            <label>Taxa de consistência</label>
                        </div>
                    </div>
                </div>
                <div class="stats-card">
                    <div class="stats-card-title">Recordes pessoais</div>
                    <ul class="atv-records" id="atvRecords"></ul>
                </div>
            </aside>
        </div>
    </div>

    <!-- Modal de registrar atividade manualmente (movido do dashboard) -->
    <div class="overlay" id="registerOverlay">
        <div class="modal">
            <h3>Registrar Atividade</h3>
            <div class="field">
                <label>Tipo</label>
                <select id="fType">
                    <option value="Corrida">Corrida</option>
                    <option value="Ciclismo">Ciclismo</option>
                    <option value="Natação">Natação</option>
                    <option value="Caminhada">Caminhada</option>
                </select>
            </div>
            <div class="field">
                <label>Título (opcional)</label>
                <input type="text" id="fTitle" placeholder="Ex: Corrida matinal no parque">
            </div>
            <div class="field-row">
                <div class="field">
                    <label>Distância (km)</label>
                    <input type="number" id="fDist" step="0.01" min="0" placeholder="10.0">
                </div>
                <div class="field">
                    <label>Duração (min)</label>
                    <input type="number" id="fDur" step="1" min="0" placeholder="45">
                </div>
            </div>
            <div class="field-row">
                <div class="field">
                    <label>Freq. cardíaca (bpm, opcional)</label>
                    <input type="number" id="fHr" step="1" min="0" placeholder="150">
                </div>
                <div class="field">
                    <label>Elevação (m, opcional)</label>
                    <input type="number" id="fElev" step="1" min="0" placeholder="30">
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" id="cancelRegisterBtn" type="button">Cancelar</button>
                <button class="btn-primary" id="saveRegisterBtn" type="button">Salvar atividade</button>
            </div>
        </div>
    </div>

    <?php include __DIR__ . '/includes/footer.php'; ?>
    <?php include __DIR__ . '/includes/data-scripts.php'; ?>
    <script src="js/main.js"></script>
</body>
</html>