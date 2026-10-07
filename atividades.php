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
                <h1 class="page-title">Minhas Atividades</h1>
            </div>
            <button class="btn-primary" id="openRegisterBtn">+ Nova Atividade</button>
        </div>

        <div class="filter-tabs">
            <button class="filter-pill active" data-filter="Todos">Todos</button>
            <button class="filter-pill" data-filter="Corrida">Corrida</button>
            <button class="filter-pill" data-filter="Ciclismo">Ciclismo</button>
            <button class="filter-pill" data-filter="Natação">Natação</button>
            <button class="filter-pill" data-filter="Caminhada">Caminhada</button>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-label">Total de Atividades</div>
                <div class="summary-value" id="sumCount">0</div>
                <div class="summary-sub">Este ano</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Distância Total</div>
                <div class="summary-value" id="sumDist">0 km</div>
                <div class="summary-sub">Este ano</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Tempo Total</div>
                <div class="summary-value" id="sumTime">0h 0m</div>
                <div class="summary-sub">Este ano</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Elevação Total</div>
                <div class="summary-value" id="sumElev">0 m</div>
                <div class="summary-sub">Este ano</div>
            </div>
        </div>

        <div class="atividades-columns">
            <div class="atividades-main">
                <div id="atividadesList"></div>
                <p class="atividades-empty" id="atividadesEmpty" style="display:none;">Nenhuma atividade encontrada. Registre a primeira em "+ Nova Atividade".</p>
            </div>

            <!-- Resumo + Consistência do período (mesmas duas telas da aba
                 Estatísticas do perfil, com seletor de período próprio) -->
            <aside class="atividades-sidebar">
                <div class="period-tabs">
                    <button class="period-pill" data-period="week">Semana</button>
                    <button class="period-pill" data-period="month">Mês</button>
                    <button class="period-pill" data-period="6months">6 Meses</button>
                    <button class="period-pill active" data-period="year">Ano</button>
                </div>

                <div class="stats-card">
                    <div class="stats-card-title" id="atvResumoTitle">Resumo</div>
                    <div class="stats-card-grid">
                        <div class="stats-card-item">
                            <div class="stats-card-label">Distância Total</div>
                            <div class="stats-card-value" id="atvDistancia">0 km</div>
                        </div>
                        <div class="stats-card-item">
                            <div class="stats-card-label">Tempo Ativo</div>
                            <div class="stats-card-value" id="atvTempo">0h 0m</div>
                        </div>
                        <div class="stats-card-item">
                            <div class="stats-card-label">Atividades</div>
                            <div class="stats-card-value" id="atvTotal">0</div>
                        </div>
                        <div class="stats-card-item">
                            <div class="stats-card-label">Dias Ativos</div>
                            <div class="stats-card-value" id="atvDiasAtivos">0 dias</div>
                        </div>
                    </div>
                </div>

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
    <script src="js/main.js"></script>
</body>
</html>