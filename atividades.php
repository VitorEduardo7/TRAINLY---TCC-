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

        <div id="atividadesList"></div>
        <p class="atividades-empty" id="atividadesEmpty" style="display:none;">Nenhuma atividade encontrada. Registre a primeira em "+ Nova Atividade".</p>
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