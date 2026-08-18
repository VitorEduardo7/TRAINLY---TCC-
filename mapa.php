<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trainly - Mapa</title>
    <!-- CSS Organizado nas pastas -->
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/mapa.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>

    <?php include __DIR__ . '/includes/nav.php'; ?>

    <div class="map-layout">
        <!-- Painel Lateral de Controle (Nova Estrutura) -->
        <aside class="workout-sidebar card">
            <div class="workout-header">
                <h1>Gravar Atividade</h1>
                <p id="gpsStatus">Buscando sinal de GPS...</p>
            </div>

            <!-- Métricas em tempo real -->
            <div class="metrics-grid">
                <div class="metric-box full-width">
                    <span>Distância Percorrida</span>
                    <strong id="distance">0,00 km</strong>
                </div>
                <div class="metric-box">
                    <span>Tempo</span>
                    <strong id="timer">00:00</strong>
                </div>
                <div class="metric-box">
                    <span>Ritmo Médio</span>
                    <strong id="pace">0'00"</strong>
                </div>
            </div>

            <!-- Botões de Ação -->
            <div class="workout-controls">
                <button class="btn-start-run" id="startBtn">Iniciar</button>
                <button class="btn-pause-run" id="pauseBtn" style="display: none;">Finalizar</button>
            </div>
        </aside>

        <!-- Mapa real: Leaflet + OpenStreetMap, seguindo a posição do GPS -->
        <main class="map-frame-wrapper">
            <div id="map"></div>
        </main>
    </div>

    <?php include __DIR__ . '/includes/footer.php'; ?>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="js/main.js"></script>
</body>
</html>