<?php
// =========================================================
// TRAINLY - index.php (página de boas-vindas, antes do login)
//
// Link para baixar o app. Enquanto estiver vazio (''), o botão aparece
// como "Em breve" e o QR code fica escondido. Quando o app tiver um link
// (APK, Expo ou loja), é só colar aqui, ex.: 'https://expo.dev/...'
// =========================================================
$linkDoApp = '';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trainly - Treine. Suba de nível.</title>
<meta name="description" content="Registre corridas, pedaladas, nados e caminhadas, ganhe XP e suba de Bronze a Diamante com seus amigos. No app e no site.">
<link rel="stylesheet" href="css/global.css">
<link rel="stylesheet" href="css/boas-vindas.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="lp">
<a href="#conteudo" class="skip-link">Pular para o conteúdo</a>

<!-- ===================== TOPO ===================== -->
<header class="lp-top">
    <div class="lp-wrap lp-top-inner">
        <a class="lp-logo" href="index.php" aria-label="Trainly, página inicial">
            <img src="img/trainly-icon.png" alt="" class="logo-img">
            <span class="lp-word" aria-hidden="true">TRAIN<b>LY</b></span>
        </a>

        <nav class="lp-nav" aria-label="Seções da página">
            <a href="#como-funciona">Como funciona</a>
            <a href="#patentes">Patentes</a>
            <a href="#recursos">Recursos</a>
            <a href="#app">App</a>
            <a href="#acessibilidade">Acessibilidade</a>
        </nav>

        <div class="lp-actions">
            <button type="button" class="lp-icon-btn" data-theme-toggle aria-label="Trocar tema claro/escuro" title="Trocar tema"></button>
            <a class="lp-btn lp-btn-ghost lp-btn-sm lp-only-wide" href="login.php" data-guest>Entrar</a>
            <a class="lp-btn lp-btn-primary lp-btn-sm" href="login.php?cadastro" data-guest>Criar conta</a>
            <a class="lp-btn lp-btn-primary lp-btn-sm" href="dashboard.php" data-member hidden>Ir para o Início</a>
        </div>
    </div>
</header>

<main id="conteudo" tabindex="-1">

    <!-- ===================== 1. DESTAQUE ===================== -->
    <section class="lp-hero" aria-labelledby="lp-titulo">
        <div class="lp-wrap lp-hero-grid">
            <div class="lp-hero-text">
                <ul class="lp-sports" aria-label="Esportes do Trainly">
                    <li>Corrida</li>
                    <li>Ciclismo</li>
                    <li>Natação</li>
                    <li>Caminhada</li>
                </ul>

                <h1 id="lp-titulo" class="lp-display">Treine.<em>Suba de nível.</em></h1>

                <p class="lp-lead">
                    Cada treino vira <b>XP</b>. Suba de <b>Bronze a Diamante</b>, mantenha o foguinho
                    aceso toda semana e dispute com seus amigos, no app ou no site.
                </p>

                <div class="lp-ctas">
                    <a class="lp-btn lp-btn-primary" href="login.php?cadastro" data-guest>
                        Criar conta grátis
                        <svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </a>
                    <a class="lp-btn lp-btn-ghost" href="login.php" data-guest>Já tenho conta</a>
                    <a class="lp-btn lp-btn-primary" href="dashboard.php" data-member hidden>
                        Continuar treinando
                        <svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </a>
                </div>

                <ul class="lp-proof">
                    <li><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>100% grátis</li>
                    <li><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Mesma conta no app e no site</li>
                    <li><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Com Libras</li>
                </ul>
            </div>

            <!-- Ilustração: o mesmo cartão de nível da página Início (dados de exemplo) -->
            <figure class="lp-stage" role="img" aria-label="Exemplo do Trainly: atleta da patente Ouro, nível 12, com 640 de 1.200 XP na volta atual, 6 semanas seguidas de treino e uma corrida de 5 km que valeu 80 XP.">
                <div class="lap-card lp-lap" style="--rank-color:#d4a017" aria-hidden="true">
                    <div class="lap-top">
                        <div class="lap-id">
                            <svg class="lap-hex" viewBox="0 0 52 58"><polygon points="26,2 49,15 49,43 26,56 3,43 3,15"/><text x="26" y="38" text-anchor="middle">12</text></svg>
                            <div><div class="lap-rank">Ouro</div><div class="lap-level">Nível 12</div></div>
                        </div>
                        <div class="lap-total"><b>7.240 XP</b><span>total acumulado</span></div>
                    </div>
                    <div class="lap-track">
                        <svg viewBox="0 0 640 170">
                            <rect class="t-outer" x="4" y="4" width="632" height="162" rx="81"/>
                            <rect class="t-inner" x="36" y="36" width="568" height="98" rx="49"/>
                            <rect class="t-lane" x="20" y="20" width="600" height="130" rx="65"/>
                            <path class="t-progress" d="M320 150 H555 A65 65 0 0 0 555 20 H85 A65 65 0 0 0 85 150 Z" pathLength="100" stroke-dasharray="53.3 100"/>
                            <line class="t-start" x1="320" y1="136" x2="320" y2="164"/>
                            <circle class="t-halo" cx="275.5" cy="20" r="11"/>
                            <circle class="t-dot" cx="275.5" cy="20" r="6.5"/>
                        </svg>
                        <div class="lap-center"><div class="lap-xp">640<small> / 1.200 XP</small></div><div class="lap-caption">nesta volta</div></div>
                    </div>
                    <div class="lap-foot"><span>Faltam <b>560 XP</b> pro nível 13</span><span>Próxima patente: <b class="gold">Platina</b> no nível 15</span></div>
                </div>

                <div class="lp-float lp-f-xp" aria-hidden="true">
                    <span class="lp-bubble">+80</span>
                    <span><b>Corrida · 5,0 km</b><small>30 min · +80 XP</small></span>
                </div>
                <div class="lp-float lp-f-streak" aria-hidden="true">
                    <span class="lp-bubble"><svg viewBox="0 0 24 24"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.3-5 .2 1.6 1 2.7 2.2 3.2C11 8.6 11 5 12 2z"/></svg></span>
                    <span><b>6 semanas seguidas</b><small>Sequência ativa</small></span>
                </div>
                <div class="lp-float lp-f-friends" aria-hidden="true">
                    <span class="lp-avs"><i style="background:#8b5cf6">VE</i><i style="background:#ef4444">AL</i><i style="background:#10b981">JP</i></span>
                    <small>3 amigos treinaram hoje</small>
                </div>
            </figure>
        </div>
    </section>

    <!-- ===================== 2. COMO FUNCIONA ===================== -->
    <section class="lp-band lp-alt" id="como-funciona" aria-labelledby="t-como">
        <div class="lp-wrap">
            <div data-reveal>
                <span class="lp-kicker"><i></i>Como funciona</span>
                <h2 id="t-como" class="lp-display lp-sec-title">Três passos. Nenhuma desculpa.</h2>
                <p class="lp-sec-sub">Do primeiro treino à patente Diamante, o caminho é sempre o mesmo.</p>
            </div>

            <ol class="lp-steps lp-stagger" data-reveal>
                <li class="lp-step">
                    <span class="lp-step-n" aria-hidden="true">1</span>
                    <span class="lp-icon lp-tone-blue"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/></svg></span>
                    <h3>Registre</h3>
                    <p>Grave o treino com GPS no app ou cadastre pelo site: distância, tempo, foto e trajeto.</p>
                    <span class="lp-tag">Corrida · Ciclismo · Natação · Caminhada</span>
                </li>
                <li class="lp-step">
                    <span class="lp-step-n" aria-hidden="true">2</span>
                    <span class="lp-icon lp-tone-gold"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg></span>
                    <h3>Ganhe XP</h3>
                    <p>Cada quilômetro e cada minuto viram experiência. Desafios e a recompensa diária dão XP extra.</p>
                    <span class="lp-tag lp-gold">km × 10 + minutos</span>
                </li>
                <li class="lp-step">
                    <span class="lp-step-n" aria-hidden="true">3</span>
                    <span class="lp-icon lp-tone-violet"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 7v10l-8 5-8-5V7l8-5z"/><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5"/></svg></span>
                    <h3>Suba de nível</h3>
                    <p>Complete a volta na pista, passe de nível e conquiste as patentes, de Bronze até Diamante.</p>
                    <span class="lp-tag">5 patentes · níveis sem limite</span>
                </li>
            </ol>
        </div>
    </section>

    <!-- ===================== 3. SIMULADOR DE XP ===================== -->
    <section class="lp-band" aria-labelledby="t-sim">
        <div class="lp-wrap lp-sim">
            <div data-reveal>
                <span class="lp-kicker"><i></i>Experimente</span>
                <h2 id="t-sim" class="lp-display lp-sec-title">Quanto vale o seu treino?</h2>
                <p class="lp-sec-sub">Coloque a distância e o tempo do seu último treino e veja quanto XP ele daria no Trainly. Sem precisar criar conta.</p>
            </div>

            <form class="lp-sim-card" id="simForm" data-reveal novalidate>
                <div class="lp-sim-row">
                    <div class="lp-field">
                        <label for="simEsporte">Esporte</label>
                        <div class="lp-in lp-select">
                            <select id="simEsporte">
                                <option value="Corrida" data-km="5" data-min="30">Corrida</option>
                                <option value="Ciclismo" data-km="20" data-min="60">Ciclismo</option>
                                <option value="Natação" data-km="1" data-min="30">Natação</option>
                                <option value="Caminhada" data-km="3" data-min="40">Caminhada</option>
                            </select>
                        </div>
                    </div>
                    <div class="lp-field">
                        <label for="simKm">Distância</label>
                        <div class="lp-in"><input id="simKm" type="number" inputmode="decimal" min="0" max="500" step="0.1" value="5"><span aria-hidden="true">km</span></div>
                    </div>
                    <div class="lp-field">
                        <label for="simMin">Tempo</label>
                        <div class="lp-in"><input id="simMin" type="number" inputmode="numeric" min="0" max="1440" step="1" value="30"><span aria-hidden="true">min</span></div>
                    </div>
                </div>

                <div class="lp-sim-out">
                    <div class="lp-sim-xp" id="simXp">+80 XP</div>
                    <div class="lp-sim-formula" id="simConta">5 km × 10 = <b>50</b><br>30 minutos = <b>30</b><br>Total = <b class="lp-gold">80 XP</b></div>
                </div>

                <div class="lp-segbar" id="simBar" aria-hidden="true">
                    <i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i>
                </div>
                <div class="lp-sim-note">
                    <span id="simNivel">Para um atleta novo: <b>80 de 100 XP</b> do nível 1</span>
                    <span id="simMeta">Treinos assim até a <b>Prata</b>: <b>13</b></span>
                </div>
                <p class="sr-only" id="simAviso" aria-live="polite"></p>
            </form>
        </div>
    </section>

    <!-- ===================== 4. PATENTES ===================== -->
    <section class="lp-band lp-alt" id="patentes" aria-labelledby="t-patentes">
        <div class="lp-wrap lp-center">
            <div data-reveal>
                <span class="lp-kicker"><i></i>Patentes</span>
                <h2 id="t-patentes" class="lp-display lp-sec-title">De Bronze a Diamante</h2>
                <p class="lp-sec-sub">Sua patente aparece no perfil, no feed e nos rankings. Todo mundo vê o quanto você treinou.</p>
            </div>

            <ol class="lp-ranks lp-stagger" data-reveal>
                <li style="--c:#a5672f"><svg viewBox="0 0 52 58" aria-hidden="true"><polygon points="26,2 49,15 49,43 26,56 3,43 3,15"/><text x="26" y="37" text-anchor="middle">1</text></svg><h3>Bronze</h3><p>a partir do nível 1</p></li>
                <li style="--c:#8a94a6"><svg viewBox="0 0 52 58" aria-hidden="true"><polygon points="26,2 49,15 49,43 26,56 3,43 3,15"/><text x="26" y="37" text-anchor="middle">5</text></svg><h3>Prata</h3><p>a partir do nível 5</p></li>
                <li style="--c:#d4a017"><svg viewBox="0 0 52 58" aria-hidden="true"><polygon points="26,2 49,15 49,43 26,56 3,43 3,15"/><text x="26" y="37" text-anchor="middle">10</text></svg><h3>Ouro</h3><p>a partir do nível 10</p></li>
                <li style="--c:#2fb6c4"><svg viewBox="0 0 52 58" aria-hidden="true"><polygon points="26,2 49,15 49,43 26,56 3,43 3,15"/><text x="26" y="37" text-anchor="middle">15</text></svg><h3>Platina</h3><p>a partir do nível 15</p></li>
                <li style="--c:#6366f1"><svg viewBox="0 0 52 58" aria-hidden="true"><polygon points="26,2 49,15 49,43 26,56 3,43 3,15"/><text x="26" y="37" text-anchor="middle">20</text></svg><h3>Diamante</h3><p>a partir do nível 20</p></li>
            </ol>
        </div>
    </section>

    <!-- ===================== 5. RECURSOS ===================== -->
    <section class="lp-band" id="recursos" aria-labelledby="t-recursos">
        <div class="lp-wrap">
            <div data-reveal>
                <span class="lp-kicker"><i></i>Recursos</span>
                <h2 id="t-recursos" class="lp-display lp-sec-title">Motivo pra treinar todo dia</h2>
            </div>

            <div class="lp-bento lp-stagger" data-reveal>
                <article class="lp-feat lp-span3">
                    <span class="lp-icon lp-tone-flame"><svg class="lp-ic lp-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.3-5 .2 1.6 1 2.7 2.2 3.2C11 8.6 11 5 12 2z"/></svg></span>
                    <h3>Sequência semanal</h3>
                    <p>Treine pelo menos uma vez por semana e mantenha o foguinho aceso. Tem proteção pra semana difícil.</p>
                    <div class="lp-weeks" aria-hidden="true"><i class="on">S1</i><i class="on">S2</i><i class="on">S3</i><i class="on">S4</i><i class="on">S5</i><i class="on">S6</i><i>S7</i></div>
                </article>

                <article class="lp-feat lp-span3">
                    <span class="lp-icon lp-tone-green"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg></span>
                    <h3>Desafios do dia e da semana</h3>
                    <div class="lp-quests" aria-hidden="true">
                        <div>Corra 3 km hoje <span>+30 XP</span><i class="lp-qbar"><i style="width:70%"></i></i></div>
                        <div>Treine 3 vezes na semana <span>+80 XP</span><i class="lp-qbar"><i style="width:33%"></i></i></div>
                    </div>
                    <p class="sr-only">Exemplos: correr 3 km hoje, treinar 3 vezes na semana. Cada desafio completo dá XP.</p>
                </article>

                <article class="lp-feat lp-span2 lp-tall">
                    <span class="lp-icon lp-tone-violet"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3z"/></svg></span>
                    <h3>Clubes e Guerra de Clã</h3>
                    <p>Crie um clube, chame a galera com um código e disputem o ranking da semana.</p>
                    <div class="lp-board" aria-hidden="true">
                        <div><span class="pos">1</span><i style="background:#10b981"></i>Ana L.<b>42,1 km</b></div>
                        <div class="me"><span class="pos">2</span><i style="background:#3b5bdb"></i>Você<b>38,5 km</b></div>
                        <div><span class="pos">3</span><i style="background:#ef4444"></i>João P.<b>31,0 km</b></div>
                        <div><span class="pos">4</span><i style="background:#f59e0b"></i>Bia S.<b>24,7 km</b></div>
                        <div><span class="pos">5</span><i style="background:#8b5cf6"></i>Vitor E.<b>19,2 km</b></div>
                    </div>
                </article>

                <article class="lp-feat lp-span4">
                    <span class="lp-icon lp-tone-blue"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg></span>
                    <h3>Rotas no mapa</h3>
                    <p class="lp-narrow">Descubra percursos de quem você segue, com distância, dificuldade e trajeto.</p>
                    <svg class="lp-mapmini" viewBox="0 0 700 140" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
                        <path class="road" d="M0 110 C120 90 160 130 260 100 S420 40 520 70 S640 120 700 90" stroke-width="18"/>
                        <path class="road" d="M0 40 C140 60 220 20 330 50 S520 120 700 30" stroke-width="12"/>
                        <path class="route" d="M380 120 C420 80 470 100 500 60 S580 30 620 50"/>
                        <circle cx="380" cy="120" r="8" class="start"/><circle cx="620" cy="50" r="8" class="end"/>
                    </svg>
                </article>

                <article class="lp-feat lp-span4">
                    <span class="lp-icon lp-tone-pink"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/></svg></span>
                    <h3>Feed com amigos</h3>
                    <p class="lp-narrow">Publique, curta e comente. Só seus amigos veem o que você posta.</p>
                    <div class="lp-post" aria-hidden="true">
                        <div class="who"><i></i><span>Ana L.<small>há 2 h · Corrida</small></span></div>
                        Primeiro 10 km sem parar! Bora que a Platina tá chegando.
                        <div class="acts">
                            <span class="liked"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.4 4.3 6.7C19.5 16.4 12 21 12 21z"/></svg>12</span>
                            <span><svg viewBox="0 0 24 24" class="stroke"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>4 comentários</span>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    </section>

    <!-- ===================== 6. APP + SITE ===================== -->
    <section class="lp-band lp-alt" id="app" aria-labelledby="t-app">
        <div class="lp-wrap lp-devices">
            <div class="lp-dev-stage" data-reveal aria-hidden="true">
                <div class="lp-laptop">
                    <div class="lp-screen">
                        <div class="sk-side"></div>
                        <div class="sk-main"><div class="sk" style="width:40%"></div><div class="sk-row"><div class="sk gold"></div><div class="sk"></div></div><div class="sk"></div></div>
                    </div>
                    <div class="lp-base"></div>
                </div>
                <div class="lp-phone">
                    <div class="notch"></div>
                    <div class="sk gold"></div>
                    <div class="sk"></div><div class="sk"></div>
                    <div class="sk tab"></div>
                </div>
            </div>

            <div data-reveal>
                <span class="lp-kicker"><i></i>App + site</span>
                <h2 id="t-app" class="lp-display lp-sec-title">Uma conta. Dois jeitos de treinar.</h2>
                <ul class="lp-sync">
                    <li><span class="lp-icon lp-tone-blue"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg></span><span><b>No celular</b>Grave o treino com GPS, veja o trajeto no mapa e acompanhe os desafios.</span></li>
                    <li><span class="lp-icon lp-tone-blue"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg></span><span><b>No computador</b>Veja sua evolução, organize clubes e crie rotas na tela grande.</span></li>
                    <li><span class="lp-icon lp-tone-blue"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8"/><path d="M21 4v5h-5M3 20v-5h5"/></svg></span><span><b>Tudo sincronizado</b>É o mesmo banco de dados: o que você faz em um aparece no outro.</span></li>
                </ul>

                <div class="lp-store">
<?php if ($linkDoApp !== ''): ?>
                    <div class="lp-qr" id="appQr" data-link="<?= htmlspecialchars($linkDoApp, ENT_QUOTES, 'UTF-8') ?>" role="img" aria-label="QR code para baixar o app"></div>
                    <div>
                        <a class="lp-btn lp-btn-primary" href="<?= htmlspecialchars($linkDoApp, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener">
                            <svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>Baixar o app
                        </a>
                        <p class="lp-store-hint">Ou aponte a câmera do celular para o código</p>
                    </div>
<?php else: ?>
                    <span class="lp-btn lp-btn-ghost lp-soon" aria-disabled="true">
                        <svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>App em breve
                    </span>
                    <p class="lp-store-hint">Enquanto isso, dá pra usar tudo pelo site.</p>
<?php endif; ?>
                </div>
            </div>
        </div>
    </section>

    <!-- ===================== 7. ACESSIBILIDADE ===================== -->
    <section class="lp-band" id="acessibilidade" aria-labelledby="t-a11y">
        <div class="lp-wrap">
            <div class="lp-a11y" data-reveal>
                <div>
                    <span class="lp-kicker"><i></i>Acessibilidade</span>
                    <h2 id="t-a11y" class="lp-display lp-sec-title">Esporte é pra todo mundo</h2>
                    <p class="lp-sec-sub">O Trainly foi pensado para que qualquer pessoa consiga usar, com recursos que você liga em Configurações.</p>
                </div>
                <ul class="lp-a11y-grid">
                    <li class="big"><span class="lp-icon"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.3 15a1.5 1.5 0 0 1 2.5-1.7L8 16"/></svg></span><span><b>Tradução em Libras</b><small>Com o VLibras, do Governo Federal, em todas as páginas. E dá pra usar tudo só pelo teclado.</small></span></li>
                    <li><span class="lp-icon"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg></span><b>Alto contraste</b><small>Cores mais fortes</small></li>
                    <li><span class="lp-icon"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></span><b>Modo daltonismo</b><small>3 tipos</small></li>
                    <li><span class="lp-icon"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V5h16v2M9 19h6M12 5v14"/></svg></span><b>Fonte legível</b><small>E texto maior</small></li>
                    <li><span class="lp-icon"><svg class="lp-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg></span><b>Menos animações</b><small>Tela mais calma</small></li>
                </ul>
            </div>
        </div>
    </section>

    <!-- ===================== 8. PERGUNTAS FREQUENTES ===================== -->
    <section class="lp-band lp-alt" aria-labelledby="t-faq">
        <div class="lp-wrap lp-faq">
            <div data-reveal>
                <span class="lp-kicker"><i></i>Dúvidas</span>
                <h2 id="t-faq" class="lp-display lp-sec-title">Perguntas frequentes</h2>
                <p class="lp-sec-sub">Ainda com dúvida? Crie sua conta e explore. É grátis e leva menos de um minuto.</p>
            </div>
            <div class="lp-faq-list" data-reveal>
                <details open>
                    <summary>O Trainly é grátis?</summary>
                    <p>Sim. Todos os recursos são gratuitos, no app e no site.</p>
                </details>
                <details>
                    <summary>Preciso do app para usar?</summary>
                    <p>Não. Pelo site você cadastra treinos, acompanha seu nível, participa de clubes e conversa com os amigos. O app é o jeito mais prático de gravar o treino com GPS na hora.</p>
                </details>
                <details>
                    <summary>Quem vê meus treinos e publicações?</summary>
                    <p>Seus treinos aparecem no seu perfil e no feed de quem segue você, e só pessoas com conta no Trainly conseguem ver. Já as publicações são mais reservadas: só os seus amigos veem.</p>
                </details>
                <details>
                    <summary>Como meus dados são protegidos?</summary>
                    <p>O login é feito pelo Supabase, e a senha fica guardada de forma criptografada. Regras dentro do próprio banco de dados garantem que só você consegue alterar ou apagar o que é seu.</p>
                </details>
                <details>
                    <summary>Funciona para natação e ciclismo?</summary>
                    <p>Sim. Dá para registrar corrida, ciclismo, natação e caminhada, e todos contam XP com a mesma regra.</p>
                </details>
            </div>
        </div>
    </section>

    <!-- ===================== 9. CHAMADA FINAL ===================== -->
    <section class="lp-band" aria-labelledby="t-final">
        <div class="lp-wrap">
            <div class="lp-final" data-reveal>
                <div>
                    <h2 id="t-final" class="lp-display">Seu nível 1<br>começa hoje.</h2>
                    <p data-guest>Crie sua conta em menos de um minuto.</p>
                    <p data-member hidden>Seus treinos estão te esperando.</p>
                </div>
                <a class="lp-btn lp-btn-white" href="login.php?cadastro" data-guest>Criar conta grátis</a>
                <a class="lp-btn lp-btn-white" href="dashboard.php" data-member hidden>Ir para o Início</a>
            </div>
        </div>
    </section>
</main>

<!-- ===================== RODAPÉ ===================== -->
<footer class="lp-footer">
    <div class="lp-wrap lp-footer-inner">
        <div>
            <a class="lp-logo lp-logo-lg" href="index.php" aria-label="Trainly, página inicial">
                <img src="img/trainly-icon.png" alt="" class="logo-img">
                <span class="lp-word" aria-hidden="true">TRAIN<b>LY</b></span>
            </a>
            <p>Treine. Suba de nível.<br>Projeto de TCC.</p>
        </div>
        <nav class="lp-footer-cols" aria-label="Links do rodapé">
            <div>
                <h2>Trainly</h2>
                <ul>
                    <li><a href="#como-funciona">Como funciona</a></li>
                    <li><a href="#patentes">Patentes</a></li>
                    <li><a href="#recursos">Recursos</a></li>
                    <li><a href="#acessibilidade">Acessibilidade</a></li>
                </ul>
            </div>
            <div>
                <h2>Conta</h2>
                <ul>
                    <li><a href="login.php">Entrar</a></li>
                    <li><a href="login.php?cadastro">Criar conta</a></li>
                    <li><a href="#app">App</a></li>
                </ul>
            </div>
            <div>
                <h2>Projeto</h2>
                <ul>
                    <li><a href="api-docs.php">API</a></li>
                </ul>
            </div>
        </nav>
    </div>
    <div class="lp-wrap lp-copy">
        <span>© 2026 Trainly · Projeto de TCC</span>
        <span>Feito com Supabase · Disponível em Libras</span>
    </div>
</footer>

<?php include __DIR__ . '/includes/data-scripts.php'; ?>
<script src="js/main.js"></script>
<?php if ($linkDoApp !== ''): ?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
<?php endif; ?>
<script src="js/boas-vindas.js"></script>
</body>
</html>