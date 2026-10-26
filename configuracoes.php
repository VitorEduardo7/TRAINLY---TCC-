<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Configurações</title>
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/configuracoes.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/nav.php'; ?>

<div class="main-container">
    <div class="settings-wrap" id="settingsPage">

        <div class="settings-head">
            <h1 class="page-title-big">CONFIGURAÇÕES</h1>
            <p>Aparência e acessibilidade. As escolhas ficam salvas neste aparelho.</p>
        </div>

        <section class="settings-card" aria-labelledby="secAparencia">
            <h2 id="secAparencia">Aparência</h2>
            <div class="setting-row">
                <div class="setting-label">
                    <b>Tema</b>
                    <span>Escuro, claro ou o mesmo do seu aparelho.</span>
                </div>
                <div class="seg-group" role="group" aria-label="Tema" data-pref="theme">
                    <button type="button" data-value="dark" aria-pressed="false">Escuro</button>
                    <button type="button" data-value="light" aria-pressed="false">Claro</button>
                    <button type="button" data-value="system" aria-pressed="false">Sistema</button>
                </div>
            </div>
        </section>

        <section class="settings-card" aria-labelledby="secAcessibilidade">
            <h2 id="secAcessibilidade">Acessibilidade</h2>

            <div class="setting-row">
                <div class="setting-label">
                    <b>Tamanho do texto</b>
                    <span>Aumenta a interface inteira para facilitar a leitura.</span>
                </div>
                <div class="seg-group" role="group" aria-label="Tamanho do texto" data-pref="textSize">
                    <button type="button" data-value="normal" aria-pressed="false">Normal</button>
                    <button type="button" data-value="large" aria-pressed="false">Grande</button>
                    <button type="button" data-value="xlarge" aria-pressed="false">Maior</button>
                </div>
            </div>

            <div class="setting-row">
                <div class="setting-label">
                    <b>Alto contraste</b>
                    <span>Textos e bordas mais fortes para enxergar melhor.</span>
                </div>
                <button type="button" class="switch" role="switch" aria-checked="false" aria-label="Alto contraste" data-pref="contrast"></button>
            </div>

            <div class="setting-row">
                <div class="setting-label">
                    <b>Reduzir animações</b>
                    <span>Desliga transições e movimentos da tela.</span>
                </div>
                <button type="button" class="switch" role="switch" aria-checked="false" aria-label="Reduzir animações" data-pref="reduceMotion"></button>
            </div>

            <div class="setting-row">
                <div class="setting-label">
                    <b>Daltonismo</b>
                    <span>Troca verde e vermelho por cores mais fáceis de diferenciar.</span>
                </div>
                <div class="seg-group" role="group" aria-label="Daltonismo" data-pref="colorBlind">
                    <button type="button" data-value="none" aria-pressed="false">Nenhum</button>
                    <button type="button" data-value="protanopia" aria-pressed="false">Protanopia</button>
                    <button type="button" data-value="deuteranopia" aria-pressed="false">Deuteranopia</button>
                    <button type="button" data-value="tritanopia" aria-pressed="false">Tritanopia</button>
                </div>
            </div>
        </section>

        <section class="settings-card" aria-labelledby="secPrevia">
            <h2 id="secPrevia">Pré-visualização</h2>
            <div class="settings-preview">
                <p class="pv-text"><b>Seu treino de hoje</b><br>Texto de exemplo para conferir tamanho, contraste e cores.</p>
                <span class="pv-chip up">+12% vs semana passada</span>
                <span class="pv-chip down">-8% vs semana passada</span>
                <div class="pv-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
            </div>
        </section>

        <div class="settings-actions">
            <button type="button" class="settings-reset" id="settingsReset">Restaurar padrões</button>
        </div>

    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<?php include __DIR__ . '/includes/data-scripts.php'; ?>
<script src="js/main.js"></script>
</body>
</html>