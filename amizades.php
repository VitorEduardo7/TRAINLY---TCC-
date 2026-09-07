<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Amigos</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/dashboard-metrics.css">
<link rel="stylesheet" href="css/amizades.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="main-container amigos-container">

    <span class="page-eyebrow">Conecte-se com atletas</span>
    <h1 class="page-title-big">AMIGOS</h1>

    <div class="search-bar" style="max-width:100%;margin-bottom:28px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="friendSearch" placeholder="Buscar atletas pelo nome...">
    </div>

    <div class="amigos-grid">
        <div>
            <h2 class="amigos-section-title" id="usersListTitle">Atletas Sugeridos</h2>
            <div class="users-grid" id="usersGrid"></div>
            <p class="empty-state" id="usersEmpty" style="display:none; padding:20px 0;">Nenhum atleta encontrado.</p>
        </div>

        <aside class="amigos-sidebar">
            <div class="card sidebar-block">
                <h2>Ativos Agora</h2>
                <div id="activeTodayList"></div>
            </div>
            <div class="card sidebar-block">
                <h2>Ranking da Semana</h2>
                <div id="friendsLeaderboard"></div>
            </div>
        </aside>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<script src="js/main.js"></script>
</body>
</html>