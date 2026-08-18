<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trainly - Encontrar Amizades</title>
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/amizades.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

    <?php include __DIR__ . '/includes/nav.php'; ?>

    <main class="friends-container">
        <!-- Cabeçalho e Busca Descentralizada do estilo Strava -->
        <div class="friends-header-modern">
            <h1>Encontre seus amigos</h1>
            <p>Conecte-se com outros atletas e acompanhe suas atividades.</p>
            
            <div class="modern-search-bar">
                <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Busque por nome, cidade ou esporte...">
                <button class="btn-primary">Pesquisar</button>
            </div>
        </div>

        <!-- Grade de Usuários (Cards) -->
        <div class="users-grid">
            
            <div class="user-card">
                <div class="card-avatar" style="background:#3b82f6;">
                    <span style="color:#fff; font-size:26px; font-weight:700;">V</span>
                </div>
                <h3>Vitor Eduardo</h3>
                <span class="rank-badge-mini" style="--rank-color:#d4a017;">Ouro · Nível 12</span>
                <span class="card-location">Ribeirão Pires, SP</span>
                <span class="card-mutual">Lenda local perto de você</span>
                <button class="btn-connect">Conectar</button>
            </div>

            <div class="user-card">
                <div class="card-avatar" style="background:#ef4444;">
                    <span style="color:#fff; font-size:26px; font-weight:700;">R</span>
                </div>
                <h3>Rafael Andrade</h3>
                <span class="rank-badge-mini" style="--rank-color:#6366f1;">Diamante · Nível 22</span>
                <span class="card-location">Ribeirão Pires, SP</span>
                <span class="card-mutual">Lenda local perto de você</span>
                <button class="btn-connect">Conectar</button>
            </div>

            <div class="user-card">
                <div class="card-avatar" style="background:#10b981;">
                    <span style="color:#fff; font-size:26px; font-weight:700;">V</span>
                </div>
                <h3>Victor Gabriel</h3>
                <span class="rank-badge-mini" style="--rank-color:#8a94a6;">Prata · Nível 7</span>
                <span class="card-location">Ribeirão Pires, SP</span>
                <span class="card-mutual">Lenda local perto de você</span>
                <button class="btn-connect">Conectar</button>
            </div>

            <div class="user-card">
                <div class="card-avatar" style="background:#f59e0b;">
                    <span style="color:#fff; font-size:26px; font-weight:700;">V</span>
                </div>
                <h3>Vinicius Andrade</h3>
                <span class="rank-badge-mini" style="--rank-color:#a5672f;">Bronze · Nível 3</span>
                <span class="card-location">Ribeirão Pires, SP</span>
                <span class="card-mutual">Lenda local perto de você</span>
                <button class="btn-connect">Conectar</button>
            </div>

            <div class="user-card">
                <div class="card-avatar" style="background:#8b5cf6;">
                    <span style="color:#fff; font-size:26px; font-weight:700;">P</span>
                </div>
                <h3>Pedro Miranda</h3>
                <span class="rank-badge-mini" style="--rank-color:#2fb6c4;">Platina · Nível 17</span>
                <span class="card-location">Ribeirão Pires, SP</span>
                <span class="card-mutual">Lenda local perto de você</span>
                <button class="btn-connect">Conectar</button>
            </div>

        </div>
    </main>

    <?php include __DIR__ . '/includes/footer.php'; ?>
    <script src="js/main.js"></script>
</body>
</html>