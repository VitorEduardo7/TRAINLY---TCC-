<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Explorar</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/dashboard-metrics.css">
<link rel="stylesheet" href="css/atividades.css">
<link rel="stylesheet" href="css/explorar.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="main-container explorar-container">

    <span class="page-eyebrow">Descubra novos locais</span>
    <h1 class="page-title-big">EXPLORAR</h1>

    <div class="explorar-toolbar">
        <div class="search-bar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="routeSearch" placeholder="Buscar rotas, percursos...">
        </div>
        <div class="filter-tabs" id="routeFilterTabs">
            <button class="filter-pill active" data-filter="Todos">Todos</button>
            <button class="filter-pill" data-filter="Corrida">Corrida</button>
            <button class="filter-pill" data-filter="Ciclismo">Ciclismo</button>
            <button class="filter-pill" data-filter="Trilha">Trilha</button>
        </div>
        <button class="btn-primary" id="openAddRouteBtn">+ Adicionar Rota</button>
    </div>

    <div class="explorar-grid">
        <div class="routes-list">
            <h2 class="routes-section-title">Minhas Rotas</h2>
            <div id="myRoutesList"></div>
            <p id="myRoutesEmpty" class="empty-state" style="display:none;">
                Você ainda não cadastrou nenhuma rota.
            </p>

            <h2 class="routes-section-title" style="margin-top:24px;">Rotas de Amigos</h2>
            <div id="friendsRoutesList"></div>
            <p id="friendsRoutesEmpty" class="empty-state" style="display:none;">
                Ninguém que você segue cadastrou uma rota ainda.
            </p>
        </div>

        <div class="explorar-map-col">
            <div id="exploreMap"></div>
            <div class="route-detail-bar" id="routeDetailBar" style="display:none;"></div>
        </div>
    </div>
</div>

<!-- Modal: adicionar rota nova -->
<div class="overlay" id="addRouteOverlay">
    <div class="modal modal-wide">
        <h3>Adicionar Rota</h3>
        <p class="modal-hint">Clique no mapa abaixo para marcar o traçado da rota (mínimo 2 pontos). Clique em "Desfazer" para remover o último ponto.</p>

        <div id="drawMap"></div>
        <div class="draw-map-actions">
            <span id="drawPointsCount">0 pontos marcados</span>
            <button class="btn-secondary" type="button" id="undoPointBtn">Desfazer último ponto</button>
        </div>

        <div class="field">
            <label>Nome da rota</label>
            <input type="text" id="rName" placeholder="Ex: Circuito Ibirapuera">
        </div>
        <div class="field-row">
            <div class="field">
                <label>Tipo</label>
                <select id="rType">
                    <option value="Corrida">Corrida</option>
                    <option value="Ciclismo">Ciclismo</option>
                    <option value="Trilha">Trilha</option>
                </select>
            </div>
            <div class="field">
                <label>Dificuldade</label>
                <select id="rDifficulty">
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                </select>
            </div>
        </div>
        <div class="field-row">
            <div class="field">
                <label>Distância (km)</label>
                <input type="number" id="rDist" step="0.01" min="0" placeholder="calculada automaticamente">
            </div>
            <div class="field">
                <label>Elevação (m, opcional)</label>
                <input type="number" id="rElev" step="1" min="0" placeholder="0">
            </div>
        </div>
        <div class="field">
            <label>Terreno (opcional)</label>
            <input type="text" id="rTerrain" placeholder="Ex: Asfalto, Ciclovia, Terra...">
        </div>

        <div class="modal-actions">
            <button class="btn-secondary" id="cancelAddRouteBtn" type="button">Cancelar</button>
            <button class="btn-primary" id="saveRouteBtn" type="button">Salvar rota</button>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script src="js/main.js"></script>
</body>
</html>