<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Trainly - Documentação</title>
<!-- Página pública: mostra e testa a API (Edge Function "trainly-api" no Supabase).
     Se você estiver logado no site, os testes usam a sua sessão. -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
    :root {
        --bg: #140f2a;
        --card: #211a3e;
        --surface: #2b2352;
        --text: #f3f1fa;
        --muted: #a39fbd;
        --blue: #2f7dfd;
        --gold: #ffc93c;
        --ok: #22c55e;
        --danger: #f0554e;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f1fb; font-family: Inter, system-ui, sans-serif; color: #1f1b2e; }

    .api-hero { background: var(--bg); color: var(--text); padding: 28px 24px 34px; }
    .api-hero-inner { max-width: 1180px; margin: 0 auto; }
    .api-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 26px; }
    .api-logo { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 800; font-size: 26px; letter-spacing: .02em; color: var(--text); text-decoration: none; }
    .api-logo span { color: var(--blue); }
    .api-back { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px; border-radius: 999px; background: var(--surface); color: var(--text); text-decoration: none; font-size: 14px; font-weight: 600; }
    .api-back:hover { background: #3a3068; }

    .api-title { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .api-title h1 { margin: 0; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 52px; line-height: 1; }
    .badge { font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 999px; background: var(--surface); color: var(--muted); }
    .badge.version { background: rgba(255,201,60,.16); color: var(--gold); }
    .badge.status { display: inline-flex; align-items: center; gap: 6px; }
    .badge.status i { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
    .badge.status.on { background: rgba(34,197,94,.16); color: #4ade80; }
    .badge.status.on i { background: var(--ok); }
    .badge.status.off { background: rgba(240,85,78,.16); color: #ff8a84; }
    .badge.status.off i { background: var(--danger); }
    .api-sub { color: var(--muted); font-size: 15px; line-height: 1.55; max-width: 760px; margin: 12px 0 22px; }
    .api-sub code, .api-steps code { background: var(--surface); color: var(--text); padding: 2px 6px; border-radius: 6px; font-size: 13px; }

    .api-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
    .api-step { background: var(--card); border-radius: 20px; padding: 16px 18px; }
    .api-step > b { display: flex; align-items: center; gap: 10px; font-size: 15px; margin-bottom: 6px; }
    .api-step > b em { font-style: normal; width: 26px; height: 26px; border-radius: 50%; background: var(--blue); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
    .api-step p { margin: 0; color: var(--muted); font-size: 13.5px; line-height: 1.5; }
    .api-session { margin-top: 16px; font-size: 14px; color: var(--muted); }
    .api-session b { color: var(--text); }

    .api-base { margin-top: 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--muted); }
    .api-base code { background: var(--surface); color: var(--text); padding: 6px 10px; border-radius: 10px; font-size: 13px; word-break: break-all; }

    .api-docs { max-width: 1180px; margin: -14px auto 40px; padding: 0 16px; }
    .api-docs-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 30px rgba(31,27,46,.08); padding: 8px 8px 20px; }
    /* Ajustes leves no Swagger UI para combinar com o Trainly */
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 24px 16px; }
    .swagger-ui .info .title { font-family: 'Barlow Condensed', sans-serif; font-size: 34px; }
    .swagger-ui .scheme-container { box-shadow: none; padding: 12px 16px; border-radius: 16px; }
    .swagger-ui .opblock { border-radius: 14px; }
    .swagger-ui .opblock .opblock-summary { border-radius: 14px; }
    .swagger-ui .btn { border-radius: 999px; }
    .swagger-ui .btn.authorize { border-color: var(--blue); color: var(--blue); }
    .swagger-ui .btn.authorize svg { fill: var(--blue); }
    .swagger-ui .opblock-tag { font-family: 'Barlow Condensed', sans-serif; font-size: 26px; }
    @media (max-width: 600px) {
        .api-title h1 { font-size: 40px; }
    }
</style>
</head>
<body>

<header class="api-hero">
    <div class="api-hero-inner">
        <div class="api-top">
            <a class="api-logo" href="dashboard.php">TRAIN<span>LY</span></a>
            <a class="api-back" href="dashboard.php">← Voltar ao site</a>
        </div>

        <div class="api-title">
            <h1>API Trainly</h1>
            <span class="badge version">v1.0.0</span>
            <span class="badge">OpenAPI 3.0</span>
            <span class="badge status" id="apiStatus"><i></i><span>Verificando...</span></span>
        </div>
        <p class="api-sub">
            API REST do Trainly hospedada no Supabase (Edge Function <code>trainly-api</code>), usando o mesmo banco do app e do site.
            São 32 rotas organizadas por assunto. Abra qualquer uma, clique em <b>Try it out</b> e depois em <b>Execute</b> para testar.
        </p>

        <div class="api-steps">
            <div class="api-step">
                <b><em>1</em> Entre na sua conta</b>
                <p>Se você já está logado no site, pronto: a página usa a sua sessão. Se não, use <code>POST /auth/login</code>.</p>
            </div>
            <div class="api-step">
                <b><em>2</em> Escolha uma rota</b>
                <p>Ex.: <code>GET /perfil</code> mostra seu nível e patente; <code>POST /atividades</code> registra um treino.</p>
            </div>
            <div class="api-step">
                <b><em>3</em> Teste</b>
                <p><b>Try it out → Execute</b>. A resposta aparece embaixo, com o código HTTP (200, 201, 400, 401, 404...).</p>
            </div>
        </div>

        <p class="api-session" id="apiSession">Verificando sua sessão...</p>
        <div class="api-base">Endereço base: <code id="apiBase">—</code></div>
    </div>
</header>

<main class="api-docs">
    <div class="api-docs-card">
        <div id="swagger"></div>
    </div>
</main>

<!-- Mesma configuração do site (URL do Supabase e chave pública) + sessão -->
<?php include __DIR__ . '/includes/data-scripts.php'; ?>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>
(async function () {
    const cfg = window.TRAINLY_CONFIG || {};
    const base = (cfg.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/trainly-api";
    const chave = cfg.SUPABASE_ANON_KEY || "";
    document.getElementById("apiBase").textContent = base;

    // Token: o da sessão do site (se logado) ou o que vier do POST /auth/login
    let token = null;
    const sessionEl = document.getElementById("apiSession");
    try {
        const client = window.TrainlySupabase && window.TrainlySupabase.client;
        const { data } = client ? await client.auth.getSession() : { data: null };
        const s = data && data.session;
        if (s) {
            token = s.access_token;
            sessionEl.innerHTML = "Testando como <b></b>. As rotas usam a sua sessão do site.";
            sessionEl.querySelector("b").textContent = s.user.email;
        } else {
            sessionEl.textContent = "Você não está logado no site. Use POST /auth/login: o token é guardado automaticamente para os próximos testes.";
        }
    } catch (e) {
        sessionEl.textContent = "Não foi possível ler sua sessão. Use POST /auth/login para testar.";
    }

    // Status da API (GET /saude)
    const statusEl = document.getElementById("apiStatus");
    try {
        const r = await fetch(base + "/saude", { headers: { apikey: chave } });
        statusEl.classList.add(r.ok ? "on" : "off");
        statusEl.querySelector("span").textContent = r.ok ? "Online" : "Fora do ar (" + r.status + ")";
    } catch (e) {
        statusEl.classList.add("off");
        statusEl.querySelector("span").textContent = "Fora do ar — publique a função no Supabase";
    }

    // Carrega a especificação e aponta o servidor pro projeto configurado
    const spec = await (await fetch("api-supabase/edge-function/openapi.json", { cache: "no-store" })).json();
    spec.servers = [{ url: base, description: "Supabase (Edge Function trainly-api)" }];

    window.ui = SwaggerUIBundle({
        spec,
        dom_id: "#swagger",
        deepLinking: true,
        docExpansion: "list",
        defaultModelsExpandDepth: 0,
        displayRequestDuration: true,
        persistAuthorization: true,
        // Toda requisição leva a chave pública e, se houver, o token de login
        requestInterceptor: (req) => {
            req.headers = req.headers || {};
            if (chave) req.headers.apikey = chave;
            if (token && !req.headers.Authorization) req.headers.Authorization = "Bearer " + token;
            return req;
        },
        // Depois de um login pelo próprio Swagger, guarda o token
        responseInterceptor: (res) => {
            try {
                if (/\/auth\/login$/.test(res.url) && res.status === 200) {
                    const body = typeof res.body === "object" ? res.body : JSON.parse(res.text || "{}");
                    if (body.access_token) {
                        token = body.access_token;
                        sessionEl.innerHTML = "Testando como <b></b> (login feito por esta página).";
                        sessionEl.querySelector("b").textContent = (body.usuario && body.usuario.email) || "você";
                    }
                }
            } catch (e) { /* resposta sem JSON */ }
            return res;
        }
    });
})();
</script>
</body>
</html>
