<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Clubes</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/dashboard-metrics.css">
<link rel="stylesheet" href="css/clubes.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="main-container clubes-container">

    <div class="clubes-header">
        <div>
            <span class="page-eyebrow">Compita com amigos</span>
            <h1 class="page-title-big">CLUBES</h1>
        </div>
        <button class="btn-primary" id="openCreateClubBtn">+ Criar Clube</button>
    </div>

    <div class="clubes-grid">
        <div class="clubes-sidebar">
            <h2 class="clubes-section-title">Meus Clubes</h2>
            <div id="myClubsList"></div>

            <h2 class="clubes-section-title" style="margin-top:24px;">Entrar em um clube</h2>
            <div class="join-club-box">
                <input type="text" id="joinCodeInput" placeholder="Código de convite">
                <button class="btn-primary" id="joinClubBtn">Entrar</button>
            </div>
        </div>

        <div class="club-detail" id="clubDetail">
            <p class="empty-state" style="padding:60px 0; text-align:center;">
                Selecione um clube na lista ao lado, crie um novo, ou entre com um código de convite.
            </p>
        </div>
    </div>
</div>

<!-- Modal: criar clube -->
<div class="overlay" id="createClubOverlay">
    <div class="modal">
        <h3>Criar Clube</h3>
        <div class="field">
            <label>Nome do clube</label>
            <input type="text" id="ccName" placeholder="Ex: Corredores SP">
        </div>
        <div class="field">
            <label>Descrição (opcional)</label>
            <input type="text" id="ccDescription" placeholder="Ex: Grupo de corrida de São Paulo">
        </div>
        <div class="modal-actions">
            <button class="btn-secondary" id="cancelCreateClubBtn" type="button">Cancelar</button>
            <button class="btn-primary" id="saveCreateClubBtn" type="button">Criar</button>
        </div>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<script src="js/main.js"></script>
</body>
</html>