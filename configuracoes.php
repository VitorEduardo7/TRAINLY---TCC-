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
            <a class="settings-back" href="perfil.php">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Voltar ao perfil
            </a>
            <h1 class="page-title-big">Configurações</h1>
            <p>Sua conta, a aparência do site e os recursos de acessibilidade.</p>
        </div>

        <!-- ================= CONTA ================= -->
        <section class="settings-card" id="accountCard" aria-labelledby="secConta">
            <h2 id="secConta">Conta</h2>

            <div class="setting-row acc-row">
                <div class="setting-label">
                    <b>E-mail</b>
                    <span id="accEmail">Carregando...</span>
                </div>
                <button type="button" class="acc-row-btn" data-acc-toggle aria-expanded="false" aria-controls="emailPanel">Alterar e-mail</button>
            </div>
            <p class="acc-pending" id="accPending" role="status" hidden></p>

            <div class="acc-panel" id="emailPanel" hidden>
                <form id="emailForm" novalidate>
                    <div class="acc-field">
                        <label for="newEmail">Novo e-mail</label>
                        <input type="email" id="newEmail" autocomplete="email" placeholder="novo@email.com" required>
                    </div>
                    <div class="acc-field">
                        <label for="emailCurrentPass">Sua senha atual</label>
                        <div class="pass-wrap">
                            <input type="password" id="emailCurrentPass" autocomplete="current-password" required>
                            <button type="button" class="pass-eye" data-show-pass="emailCurrentPass" aria-label="Mostrar senha" aria-pressed="false">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                        </div>
                    </div>
                    <p class="acc-hint">Vamos mandar um link de confirmação. Seu e-mail só muda depois que você abrir esse link; até lá, continue entrando com o e-mail atual.</p>
                    <div class="acc-actions">
                        <button type="submit" class="btn-primary">Enviar link de confirmação</button>
                    </div>
                    <p class="acc-msg" id="emailMsg" role="status" aria-live="polite"></p>
                </form>
            </div>

            <div class="setting-row acc-row">
                <div class="setting-label">
                    <b>Senha</b>
                    <span>Troque sempre que achar que alguém pode saber.</span>
                </div>
                <button type="button" class="acc-row-btn" data-acc-toggle aria-expanded="false" aria-controls="passwordPanel">Alterar senha</button>
            </div>

            <div class="acc-panel" id="passwordPanel" hidden>
                <form id="passwordForm" novalidate>
                    <div class="acc-field">
                        <label for="passCurrent">Senha atual</label>
                        <div class="pass-wrap">
                            <input type="password" id="passCurrent" autocomplete="current-password" required>
                            <button type="button" class="pass-eye" data-show-pass="passCurrent" aria-label="Mostrar senha" aria-pressed="false">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                        </div>
                    </div>
                    <div class="acc-field">
                        <label for="newPass">Nova senha</label>
                        <div class="pass-wrap">
                            <input type="password" id="newPass" autocomplete="new-password" aria-describedby="passRules passMeterLabel" required>
                            <button type="button" class="pass-eye" data-show-pass="newPass" aria-label="Mostrar senha" aria-pressed="false">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                        </div>
                        <div class="pass-meter" id="passMeter" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                        <span class="pass-meter-label" id="passMeterLabel" aria-live="polite"></span>
                    </div>
                    <div class="acc-field">
                        <label for="confirmPass">Repita a nova senha</label>
                        <input type="password" id="confirmPass" autocomplete="new-password" required>
                    </div>
                    <ul class="pass-rules" id="passRules">
                        <li data-check="length">Pelo menos 8 caracteres</li>
                        <li data-check="lettersNumbers">Letras e números</li>
                        <li data-check="mixed">Maiúsculas e minúsculas ou um símbolo (recomendado)</li>
                        <li data-check="match">As duas senhas são iguais</li>
                    </ul>
                    <div class="acc-actions">
                        <button type="submit" class="btn-primary" disabled>Salvar nova senha</button>
                    </div>
                    <p class="acc-msg" id="passMsg" role="status" aria-live="polite"></p>
                </form>
            </div>

            <div class="setting-row acc-row">
                <div class="setting-label">
                    <b>Sair da conta</b>
                    <span>Encerra a sessão neste aparelho.</span>
                </div>
                <button type="button" class="acc-row-btn danger" id="accLogout">Sair</button>
            </div>
        </section>

        <!-- ================= APARÊNCIA ================= -->
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

        <!-- ================= ACESSIBILIDADE ================= -->
        <section class="settings-card" aria-labelledby="secAcessibilidade">
            <h2 id="secAcessibilidade">Acessibilidade</h2>

            <div class="setting-row">
                <div class="setting-label">
                    <b>Libras (VLibras)</b>
                    <span>Mostra o botão do VLibras, do Governo Federal, que traduz os textos do site para Libras com um avatar.</span>
                </div>
                <button type="button" class="switch" role="switch" aria-checked="false" aria-label="Libras com VLibras" data-pref="libras"></button>
            </div>

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
                    <b>Fonte de alta legibilidade</b>
                    <span>Troca as letras pela Atkinson Hyperlegible, feita para pessoas com baixa visão.</span>
                </div>
                <button type="button" class="switch" role="switch" aria-checked="false" aria-label="Fonte de alta legibilidade" data-pref="legibleFont"></button>
            </div>

            <div class="setting-row">
                <div class="setting-label">
                    <b>Espaçamento de leitura</b>
                    <span>Mais espaço entre linhas, letras e palavras. Ajuda em casos de dislexia.</span>
                </div>
                <button type="button" class="switch" role="switch" aria-checked="false" aria-label="Espaçamento de leitura" data-pref="readingSpacing"></button>
            </div>

            <div class="setting-row">
                <div class="setting-label">
                    <b>Destacar links</b>
                    <span>Sublinha todos os links para não depender só da cor.</span>
                </div>
                <button type="button" class="switch" role="switch" aria-checked="false" aria-label="Destacar links" data-pref="underlineLinks"></button>
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
                <p class="pv-text"><b>Seu treino de hoje</b><br>Texto de exemplo para conferir tamanho, contraste e cores. <a href="#secPrevia">Isto é um link.</a></p>
                <span class="pv-chip up">+12% vs. 7 dias antes</span>
                <span class="pv-chip down">-8% vs. 7 dias antes</span>
                <div class="pv-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
            </div>
        </section>

        <div class="settings-actions">
            <button type="button" class="settings-reset" id="settingsReset">Restaurar aparência e acessibilidade</button>
        </div>

    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
<?php include __DIR__ . '/includes/data-scripts.php'; ?>
<script src="js/main.js"></script>
</body>
</html>