/* =========================================================
   TRAINLY - main.js
   Camada de dados + interações compartilhadas entre páginas.

   Agora conectado a uma API real (Node/Express + MySQL).
   Só a seção 2 (CAMADA DE DADOS) e os pontos que chamavam
   getData()/saveData() de forma síncrona mudaram — o resto
   (patentes, XP, mapa GPS) continua igual.
   ========================================================= */

(function () {
  "use strict";

  const API_BASE = "http://localhost/TRAINLY---TCC-/api"; // ajuste "trainly" para o nome real da sua pasta
  const TOKEN_KEY = "trainly_token";

  /* ---------------------------------------------------------
     1. SISTEMA DE PATENTES E NÍVEL (inalterado)
     --------------------------------------------------------- */
  const RANKS = [
    { name: "Bronze", min: 1, color: "#a5672f" },
    { name: "Prata", min: 5, color: "#8a94a6" },
    { name: "Ouro", min: 10, color: "#d4a017" },
    { name: "Platina", min: 15, color: "#2fb6c4" },
    { name: "Diamante", min: 20, color: "#6366f1" }
  ];

  function getRankForLevel(level) {
    let current = RANKS[0];
    for (const r of RANKS) {
      if (level >= r.min) current = r;
    }
    return current;
  }

  function levelInfo(totalXp) {
    let level = 1;
    let xpToNext = 100;
    let remaining = totalXp;
    while (remaining >= xpToNext) {
      remaining -= xpToNext;
      level++;
      xpToNext = level * 100;
    }
    return {
      level,
      xpIntoLevel: remaining,
      xpToNext,
      progressPct: Math.max(4, Math.round((remaining / xpToNext) * 100)),
      rank: getRankForLevel(level)
    };
  }

  function xpFromActivity(distanceKm, durationSec) {
    const base = distanceKm * 10;
    const timeBonus = durationSec / 60;
    return Math.max(5, Math.round(base + timeBonus));
  }

  /* ---------------------------------------------------------
     2. CAMADA DE DADOS (agora fala com a API/MySQL)
     --------------------------------------------------------- */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async function apiRequest(path, options = {}) {
    const token = getToken();
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      clearToken();
      if (!location.pathname.endsWith("login.html")) {
        location.href = "login.html";
      }
      throw new Error("Não autenticado");
    }
    if (!res.ok) {
      let msg = "Erro na requisição";
      try {
        msg = (await res.json()).error || msg;
      } catch (e) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // Substitui a antiga leitura do localStorage: busca os dados do usuário logado
  async function getData() {
    const { data } = await apiRequest("/me");
    return data;
  }

  // Login/cadastro: guarda o token e devolve os dados iniciais do usuário
  async function login(email, password) {
    const { token, data } = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setToken(token);
    return data;
  }

  async function register(name, email, password) {
    const { token, data } = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
    setToken(token);
    return data;
  }

  function logout() {
    clearToken();
    location.href = "login.html";
  }

  async function getFollowing() {
    const { following } = await apiRequest("/following");
    return following;
  }

  async function followUser(name) {
    await apiRequest("/following/" + encodeURIComponent(name), { method: "POST" });
  }

  async function unfollowUser(name) {
    await apiRequest("/following/" + encodeURIComponent(name), { method: "DELETE" });
  }

  function computeStats(data) {
    const acts = data.activities || [];
    const totalKm = acts.reduce((s, a) => s + a.distanceKm, 0);
    const totalSec = acts.reduce((s, a) => s + a.durationSec, 0);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = acts.filter((a) => new Date(a.date).getTime() >= oneWeekAgo);
    return {
      totalActivities: acts.length,
      totalKm,
      totalSec,
      activitiesThisWeek: thisWeek.length,
      avgSecPerWeek: thisWeek.reduce((s, a) => s + a.durationSec, 0)
    };
  }

  // ---- NOVO: métricas por semana civil (segunda a domingo), com comparação ----
  function startOfWeek(d) {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    dt.setDate(dt.getDate() + diff);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function isSameCivilWeek(dateStr, ref) {
    const s = startOfWeek(ref);
    const e = new Date(s);
    e.setDate(e.getDate() + 7);
    const d = new Date(dateStr);
    return d >= s && d < e;
  }

  function formatPace(min, km) {
    if (!km) return "--";
    const paceMin = min / km;
    const m = Math.floor(paceMin);
    const s = Math.round((paceMin - m) * 60);
    return m + "'" + String(s).padStart(2, "0") + '"';
  }

  function computeWeekMetrics(data) {
    const acts = data.activities || [];
    const now = new Date();
    const prevRef = new Date(now);
    prevRef.setDate(prevRef.getDate() - 7);

    const thisWeek = acts.filter((a) => isSameCivilWeek(a.date, now));
    const prevWeek = acts.filter((a) => isSameCivilWeek(a.date, prevRef));

    const sum = (arr, key) => arr.reduce((s, a) => s + a[key], 0);
    const km = sum(thisWeek, "distanceKm");
    const prevKm = sum(prevWeek, "distanceKm");
    const durSec = sum(thisWeek, "durationSec");
    const prevDurSec = sum(prevWeek, "durationSec");

    const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);

    return {
      km, prevKm, durSec, prevDurSec,
      count: thisWeek.length, prevCount: prevWeek.length,
      kmDelta: pct(km, prevKm),
      durDelta: pct(durSec, prevDurSec),
      countDelta: pct(thisWeek.length, prevWeek.length),
      avgPaceMin: km > 0 ? durSec / 60 / km : 0,
      prevAvgPaceMin: prevKm > 0 ? prevDurSec / 60 / prevKm : 0
    };
  }

  function renderMetricsGrid(el, data) {
    if (!el) return;
    const wm = computeWeekMetrics(data);
    const paceDelta = wm.prevAvgPaceMin > 0
      ? Math.round(((wm.prevAvgPaceMin - wm.avgPaceMin) / wm.prevAvgPaceMin) * 100)
      : 0;

    const deltaHtml = (v) => {
      const cls = v >= 0 ? "delta-up" : "delta-down";
      const sign = v >= 0 ? "+" : "";
      return '<span class="metric-delta ' + cls + '">' + sign + v + "% vs semana passada</span>";
    };

    el.innerHTML =
      '<div class="metric-card">' +
        '<div class="metric-label">Km esta semana</div>' +
        '<div class="metric-value">' + wm.km.toFixed(1).replace(".", ",") + ' <span>km</span></div>' +
        deltaHtml(wm.kmDelta) +
      "</div>" +
      '<div class="metric-card">' +
        '<div class="metric-label">Tempo ativo</div>' +
        '<div class="metric-value">' + formatHM(wm.durSec) + "</div>" +
        deltaHtml(wm.durDelta) +
      "</div>" +
      '<div class="metric-card">' +
        '<div class="metric-label">Ritmo médio</div>' +
        '<div class="metric-value">' + (wm.km > 0 ? formatPace(wm.durSec / 60, wm.km) : "--") + ' <span>/km</span></div>' +
        deltaHtml(paceDelta) +
      "</div>" +
      '<div class="metric-card">' +
        '<div class="metric-label">Atividades</div>' +
        '<div class="metric-value">' + wm.count + "</div>" +
        deltaHtml(wm.countDelta) +
      "</div>";
  }

  const TYPE_ICONS = { Corrida: "🏃", Ciclismo: "🚴", Natação: "🏊", Caminhada: "🚶" };

  function renderActivityList(cardEl, listEl, walkthroughEl, data) {
    if (!listEl || !cardEl) return;
    const acts = [...(data.activities || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (acts.length === 0) {
      cardEl.style.display = "none";
      if (walkthroughEl) walkthroughEl.style.display = "";
      return;
    }
    cardEl.style.display = "";
    if (walkthroughEl) walkthroughEl.style.display = "none";

    listEl.innerHTML = acts.slice(0, 10).map((a) => {
      const d = new Date(a.date);
      const dateLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) +
        ", " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const type = a.type || "Corrida";
      const title = a.title || (type + " registrada");
      const icon = TYPE_ICONS[type] || "🏃";
      const extraStats = (a.heartRate || a.elevationM)
        ? '<div><div class="act-stat-label">Freq.</div><div class="act-stat-value">' + (a.heartRate ? a.heartRate + " bpm" : "—") + '</div></div>' +
          '<div><div class="act-stat-label">Elevação</div><div class="act-stat-value">' + (a.elevationM ? a.elevationM + "m" : "—") + '</div></div>'
        : "";
      return (
        '<div class="activity-item" data-activity-id="' + a.id + '">' +
          '<div class="activity-item-top">' +
            '<div class="activity-item-info">' +
              '<div class="act-icon">' + icon + '</div>' +
              "<div>" +
                '<div class="act-type">' + type + '</div>' +
                '<div class="act-title">' + title + '</div>' +
                '<div class="act-date">' + dateLabel + "</div>" +
              "</div>" +
            "</div>" +
            '<button class="kudos-btn' + (a.likedByMe ? " liked" : "") + '" data-action="like">👍 <span>' + (a.likeCount || 0) + "</span></button>" +
          "</div>" +
          '<div class="act-stats">' +
            '<div><div class="act-stat-label">Distância</div><div class="act-stat-value">' + a.distanceKm.toFixed(2).replace(".", ",") + ' km</div></div>' +
            '<div><div class="act-stat-label">Duração</div><div class="act-stat-value">' + formatClock(a.durationSec) + '</div></div>' +
            '<div><div class="act-stat-label">Ritmo</div><div class="act-stat-value">' + formatPace(a.durationSec / 60, a.distanceKm) + '/km</div></div>' +
            extraStats +
          "</div>" +
        "</div>"
      );
    }).join("");

    wireActivitySocial(listEl);
  }

  function wireActivitySocial(listEl) {
    if (listEl.dataset.wired === "1") return;
    listEl.dataset.wired = "1";

    listEl.addEventListener("click", async (e) => {
      const likeBtn = e.target.closest('[data-action="like"]');
      if (!likeBtn) return;

      const isLiked = likeBtn.classList.contains("liked");
      likeBtn.disabled = true;
      try {
        const { likeCount, likedByMe } = await toggleLike(
          likeBtn.closest(".activity-item").dataset.activityId,
          isLiked
        );
        likeBtn.querySelector("span").textContent = likeCount;
        likeBtn.classList.toggle("liked", likedByMe);
      } catch (err) {
        showToast(err.message || "Não foi possível curtir agora.");
      } finally {
        likeBtn.disabled = false;
      }
    });
  }

  function renderWeeklyChart(chartEl, totalEl, data) {
    if (!chartEl) return;
    const acts = data.activities || [];
    const now = new Date();
    const s = startOfWeek(now);
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      const km = acts
        .filter((a) => new Date(a.date).toDateString() === d.toDateString())
        .reduce((sum, a) => sum + a.distanceKm, 0);
      days.push({ date: d, km });
    }

    const max = Math.max(...days.map((d) => d.km), 1);
    const todayStr = now.toDateString();

    chartEl.innerHTML = days.map((d) => {
      const isToday = d.date.toDateString() === todayStr;
      const h = Math.max(3, Math.round((d.km / max) * 100));
      const label = weekdays[d.date.getDay()];
      return (
        '<div class="chart-col">' +
          '<div class="chart-bar' + (isToday ? " today" : "") + '" style="height:' + h + '%"></div>' +
          '<div class="chart-day' + (isToday ? " today" : "") + '">' + label + "</div>" +
        "</div>"
      );
    }).join("");

    if (totalEl) {
      const total = days.reduce((s, d) => s + d.km, 0);
      totalEl.textContent = total.toFixed(1).replace(".", ",") + " km";
    }
  }

  function renderPersonalRecords(el, data) {
    if (!el) return;
    const acts = data.activities || [];
    if (acts.length === 0) {
      el.innerHTML = '<p class="empty-state">Sem recordes ainda — grave sua primeira atividade no mapa.</p>';
      return;
    }

    const longest = [...acts].sort((a, b) => b.distanceKm - a.distanceKm)[0];
    const fastest = [...acts].filter((a) => a.distanceKm > 0)
      .sort((a, b) => (a.durationSec / a.distanceKm) - (b.durationSec / b.distanceKm))[0];
    const longestDur = [...acts].sort((a, b) => b.durationSec - a.durationSec)[0];

    const row = (label, val, dateStr) =>
      '<div class="pr-row">' +
        "<div>" +
          '<div class="pr-label">' + label + "</div>" +
          '<div class="pr-date">' + new Date(dateStr).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) + "</div>" +
        "</div>" +
        '<div class="pr-value">' + val + "</div>" +
      "</div>";

    el.innerHTML =
      row("Maior distância", longest.distanceKm.toFixed(1).replace(".", ",") + " km", longest.date) +
      row("Melhor ritmo", formatPace(fastest.durationSec / 60, fastest.distanceKm) + "/km", fastest.date) +
      row("Maior duração", formatHM(longestDur.durationSec), longestDur.date);
  }

  function renderGoalWidget(el, data) {
    if (!el) return;
    const goal = data.monthlyGoalKm || 100;
    const now = new Date();
    const acts = data.activities || [];
    const km = acts
      .filter((a) => {
        const d = new Date(a.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, a) => s + a.distanceKm, 0);

    const pct = Math.min(100, Math.round((km / goal) * 100));
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();

    el.innerHTML =
      '<div class="goal-row"><span>Distância</span><b>' + km.toFixed(0) + " / " + goal + " km</b></div>" +
      '<div class="goal-bar"><div class="goal-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="goal-note">' + pct + "% concluído · faltam " + daysLeft + " dias</div>";
  }

  // Agora grava a atividade no servidor (que calcula o XP e atualiza o total).
  // extras é opcional: { type, title, heartRate, elevationM }
  async function recordActivity(distanceKm, durationSec, extras = {}) {
    const { data, xpEarned } = await apiRequest("/activities", {
      method: "POST",
      body: JSON.stringify({ distanceKm, durationSec, ...extras })
    });
    return { data, xpEarned };
  }

  // ---- NOVO: curtidas ----
  async function toggleLike(activityId, currentlyLiked) {
    return apiRequest("/activities/" + activityId + "/like", {
      method: currentlyLiked ? "DELETE" : "POST"
    });
  }

  async function claimDailyReward() {
    const { data } = await apiRequest("/reward", { method: "POST" });
    return data;
  }

  /* ---------------------------------------------------------
     3. HELPERS DE FORMATAÇÃO (inalterado)
     --------------------------------------------------------- */
  function formatKm(km) {
    return km.toFixed(2).replace(".", ",") + " km";
  }

  function formatHM(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h + "h " + m + "m";
  }

  function formatClock(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  // Ex.: 57m 12s / 1h 22m — usado na lista da página de atividades
  function formatDurationHM(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return h + "h " + m + "m";
    return m + "m " + String(s).padStart(2, "0") + "s";
  }

  /* ---------------------------------------------------------
     4. TOAST (inalterado)
     --------------------------------------------------------- */
  function showToast(message) {
    let toast = document.querySelector(".trainly-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "trainly-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  /* ---------------------------------------------------------
     5. NAVBAR (inalterado, + botão de sair se existir)
     --------------------------------------------------------- */
  function initNavbar() {
    const hamburger = document.querySelector(".hamburger-btn");
    const navLinks = document.querySelector(".nav-links");
    if (hamburger && navLinks) {
      hamburger.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("open");
        hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }

    const bellBtn = document.querySelector(".icon-btn[data-notif]");
    if (bellBtn) {
      const panel = document.createElement("div");
      panel.className = "notif-panel";
      panel.innerHTML =
        '<div class="notif-panel-header">Notificações</div>' +
        '<div class="notif-empty">Nenhuma notificação por aqui ainda.<br>Complete uma atividade para começar a receber novidades.</div>';
      bellBtn.parentElement.style.position = "relative";
      bellBtn.parentElement.appendChild(panel);
      bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!panel.contains(e.target) && e.target !== bellBtn) {
          panel.classList.remove("open");
        }
      });
    }

    // Se existir um botão/link com [data-logout] em alguma página, ele desloga.
    const logoutBtn = document.querySelector("[data-logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    }
  }

  /* ---------------------------------------------------------
     6. WIDGET DE PATENTE (inalterado)
     --------------------------------------------------------- */
  function renderRankWidget(el, data) {
    if (!el) return;
    const info = levelInfo(data.xp);
    el.innerHTML =
      '<div class="rank-widget-top">' +
      '<span class="rank-badge" style="--rank-color:' + info.rank.color + '">' + info.rank.name + "</span>" +
      '<span class="rank-level">Nível ' + info.level + "</span>" +
      "</div>" +
      '<div class="xp-bar"><div class="xp-bar-fill" style="width:' + info.progressPct + "%; background:" + info.rank.color + ';"></div></div>' +
      '<span class="xp-label">' + info.xpIntoLevel + " / " + info.xpToNext + " XP para o próximo nível</span>";
  }

  /* ---------------------------------------------------------
     NOVO: Modal de registrar atividade manualmente (dashboard)
     --------------------------------------------------------- */
  function initRegisterModal(data, rankEl, onSaved) {
    const overlay = document.getElementById("registerOverlay");
    if (!overlay) return;

    // Evita colar o mesmo listener de novo toda vez que o dashboard recarrega
    if (overlay.dataset.wired === "1") return;
    overlay.dataset.wired = "1";

    const openBtn = document.getElementById("openRegisterBtn");
    const cancelBtn = document.getElementById("cancelRegisterBtn");
    const saveBtn = document.getElementById("saveRegisterBtn");

    function open() {
      document.getElementById("fType").value = "Corrida";
      document.getElementById("fTitle").value = "";
      document.getElementById("fDist").value = "";
      document.getElementById("fDur").value = "";
      document.getElementById("fHr").value = "";
      document.getElementById("fElev").value = "";
      overlay.classList.add("open");
    }
    function close() {
      overlay.classList.remove("open");
    }

    if (openBtn) openBtn.addEventListener("click", open);
    if (cancelBtn) cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const type = document.getElementById("fType").value;
        const title = document.getElementById("fTitle").value.trim();
        const distanceKm = parseFloat(document.getElementById("fDist").value) || 0;
        const durationMin = parseFloat(document.getElementById("fDur").value) || 0;
        const heartRate = document.getElementById("fHr").value;
        const elevationM = document.getElementById("fElev").value;

        if (distanceKm <= 0 || durationMin <= 0) {
          showToast("Preencha ao menos distância e duração.");
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Salvando...";
        try {
          const { xpEarned } = await recordActivity(distanceKm, Math.round(durationMin * 60), {
            type, title, heartRate, elevationM
          });
          showToast("Atividade registrada! +" + xpEarned + " XP");
          close();
          if (onSaved) onSaved();
        } catch (e) {
          showToast(e.message || "Não foi possível salvar a atividade.");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Salvar atividade";
        }
      });
    }
  }

  /* ---------------------------------------------------------
     7. INICIALIZAÇÃO POR PÁGINA (agora assíncrona)
     --------------------------------------------------------- */
  async function initDashboard() {
    const rankEl = document.getElementById("rankWidget");
    if (!rankEl) return;

    const data = await getData();
    const stats = computeStats(data);
    const following = await getFollowing();

    renderRankWidget(rankEl, data);

    const nameEl = document.getElementById("userName");
    if (nameEl) nameEl.textContent = data.name;

    const followingEl = document.getElementById("statFollowing");
    const activitiesEl = document.getElementById("statActivities");
    if (followingEl) followingEl.textContent = following.length;
    if (activitiesEl) activitiesEl.textContent = stats.totalActivities;

    const rewardBtn = document.getElementById("rewardBtn");
    if (rewardBtn) {
      const today = new Date().toDateString();
      if (data.lastDailyReward === today) {
        rewardBtn.textContent = "Resgatado hoje";
        rewardBtn.disabled = true;
      }
      rewardBtn.addEventListener("click", async () => {
        rewardBtn.disabled = true;
        try {
          const fresh = await claimDailyReward();
          showToast("+20 XP resgatados! Volte amanhã para mais.");
          rewardBtn.textContent = "Resgatado hoje";
          renderRankWidget(rankEl, fresh);
        } catch (e) {
          rewardBtn.disabled = false;
          showToast(e.message || "Não foi possível resgatar agora.");
        }
      });
    }

    const emptyNote = document.getElementById("noActivityNote");
    if (emptyNote && stats.totalActivities === 0) {
      emptyNote.style.display = "block";
    }

    // NOVO: métricas da semana, atividades recentes, volume semanal e recordes
    renderMetricsGrid(document.getElementById("metricsGrid"), data);
    renderActivityList(
      document.getElementById("activitiesCard"),
      document.getElementById("activityList"),
      document.getElementById("walkthroughCard"),
      data
    );
    renderWeeklyChart(document.getElementById("weekChart"), document.getElementById("weekTotal"), data);
    renderPersonalRecords(document.getElementById("prList"), data);
    renderGoalWidget(document.getElementById("goalWidget"), data);

    initRegisterModal(data, rankEl, () => initDashboard());
  }

  async function initPerfil() {
    const rankEl = document.getElementById("rankWidgetPerfil");
    if (!rankEl) return;

    const data = await getData();
    const stats = computeStats(data);
    const following = await getFollowing();

    renderRankWidget(rankEl, data);

    const distEl = document.getElementById("perfilDistancia");
    const tempoEl = document.getElementById("perfilTempo");
    const totalEl = document.getElementById("perfilTotalAtividades");
    const semanaEl = document.getElementById("perfilAtividadesSemana");
    const mediaEl = document.getElementById("perfilMediaSemana");
    const seguindoEl = document.getElementById("perfilSeguindo");

    if (distEl) distEl.textContent = formatKm(stats.totalKm);
    if (tempoEl) tempoEl.textContent = formatHM(stats.totalSec);
    if (totalEl) totalEl.textContent = stats.totalActivities;
    if (semanaEl) semanaEl.textContent = stats.activitiesThisWeek;
    if (mediaEl) mediaEl.textContent = formatHM(stats.avgSecPerWeek);
    if (seguindoEl) seguindoEl.textContent = following.length;

    const tabs = document.querySelectorAll(".tab-item");
    const panels = document.querySelectorAll("[data-tab-panel]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.getAttribute("data-tab");
        panels.forEach((p) => {
          p.style.display = p.getAttribute("data-tab-panel") === target ? "" : "none";
        });
      });
    });

    const heatmapLink = document.querySelector(".banner-link");
    if (heatmapLink) {
      heatmapLink.addEventListener("click", (e) => {
        e.preventDefault();
        showToast("Heatmap em desenvolvimento — precisa de histórico real de rotas 🚧");
      });
    }
  }

  /* ---------------------------------------------------------
     NOVO: Página "Minhas Atividades" (atividades.html)
     --------------------------------------------------------- */
  const ATIVIDADE_TYPE_COLORS = {
    Corrida: "#2f7dfd",
    Ciclismo: "#22c1c9",
    Natação: "#10b981",
    Caminhada: "#f5a623"
  };

  function renderAtividadesSummary(data) {
    const acts = data.activities || [];
    const totalKm = acts.reduce((s, a) => s + a.distanceKm, 0);
    const totalSec = acts.reduce((s, a) => s + a.durationSec, 0);
    const totalElev = acts.reduce((s, a) => s + (Number(a.elevationM) || 0), 0);

    const countEl = document.getElementById("sumCount");
    const distEl = document.getElementById("sumDist");
    const timeEl = document.getElementById("sumTime");
    const elevEl = document.getElementById("sumElev");

    if (countEl) countEl.textContent = acts.length;
    if (distEl) distEl.textContent = Math.round(totalKm).toLocaleString("pt-BR") + " km";
    if (timeEl) timeEl.textContent = formatHM(totalSec);
    if (elevEl) elevEl.textContent = Math.round(totalElev).toLocaleString("pt-BR") + " m";
  }

  function renderAtividadesList(listEl, emptyEl, data, filterType) {
    if (!listEl) return;
    let acts = [...(data.activities || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filterType && filterType !== "Todos") {
      acts = acts.filter((a) => (a.type || "Corrida") === filterType);
    }

    if (acts.length === 0) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    listEl.innerHTML = acts.map((a) => {
      const d = new Date(a.date);
      const dateLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) +
        ", " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const type = a.type || "Corrida";
      const title = a.title || (type + " registrada");
      const icon = TYPE_ICONS[type] || "🏃";
      const color = ATIVIDADE_TYPE_COLORS[type] || "var(--primary-blue)";

      return (
        '<div class="atividade-item activity-item" style="--type-color:' + color + '" data-activity-id="' + a.id + '">' +
          '<div class="atividade-left">' +
            '<div class="atividade-icon">' + icon + '</div>' +
            '<div class="atividade-info">' +
              '<h3>' + title + '</h3>' +
              '<p>' + dateLabel + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="atividade-stats">' +
            '<div class="atividade-stat"><div class="atividade-stat-label">Distância</div><div class="atividade-stat-value">' + a.distanceKm.toFixed(1).replace(".", ",") + ' km</div></div>' +
            '<div class="atividade-stat"><div class="atividade-stat-label">Duração</div><div class="atividade-stat-value">' + formatDurationHM(a.durationSec) + '</div></div>' +
            '<div class="atividade-stat"><div class="atividade-stat-label">Ritmo</div><div class="atividade-stat-value">' + formatPace(a.durationSec / 60, a.distanceKm) + '/km</div></div>' +
            '<div class="atividade-stat"><div class="atividade-stat-label">FC média</div><div class="atividade-stat-value">' + (a.heartRate ? a.heartRate + ' bpm' : '—') + '</div></div>' +
          '</div>' +
          '<button class="atividade-ver-btn" data-action="toggle-expand">Ver →</button>' +
          '<div class="atividade-expand">' +
            '<div class="atividade-stat" style="text-align:left;"><div class="atividade-stat-label">Elevação</div><div class="atividade-stat-value">' + (a.elevationM ? a.elevationM + ' m' : '—') + '</div></div>' +
            '<button class="kudos-btn' + (a.likedByMe ? " liked" : "") + '" data-action="like">👍 <span>' + (a.likeCount || 0) + '</span></button>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function wireAtividadesInteractions(listEl) {
    wireActivitySocial(listEl);

    if (listEl.dataset.expandWired === "1") return;
    listEl.dataset.expandWired = "1";
    listEl.addEventListener("click", (e) => {
      const verBtn = e.target.closest('[data-action="toggle-expand"]');
      if (!verBtn) return;
      const row = verBtn.closest(".atividade-item");
      const panel = row && row.querySelector(".atividade-expand");
      if (!panel) return;
      const isOpen = panel.classList.toggle("open");
      verBtn.textContent = isOpen ? "Fechar ↑" : "Ver →";
    });
  }

  async function initAtividades() {
    const listEl = document.getElementById("atividadesList");
    if (!listEl) return;

    const data = await getData();
    window.__atividadesState = window.__atividadesState || { filter: "Todos" };
    const state = window.__atividadesState;
    const emptyEl = document.getElementById("atividadesEmpty");

    renderAtividadesSummary(data);
    renderAtividadesList(listEl, emptyEl, data, state.filter);
    wireAtividadesInteractions(listEl);

    const tabsWrap = document.querySelector(".filter-tabs");
    if (tabsWrap && tabsWrap.dataset.wired !== "1") {
      tabsWrap.dataset.wired = "1";
      tabsWrap.querySelectorAll(".filter-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
          tabsWrap.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
          state.filter = pill.dataset.filter;
          renderAtividadesList(listEl, emptyEl, data, state.filter);
        });
      });
    }

    initRegisterModal(data, null, () => initAtividades());
  }

  async function initAmizades() {
    const grid = document.querySelector(".users-grid");
    if (!grid) return;

    const following = new Set(await getFollowing());

    document.querySelectorAll(".user-card").forEach((card) => {
      const name = card.querySelector("h3").textContent.trim();
      const btn = card.querySelector(".btn-connect");
      if (following.has(name)) {
        btn.textContent = "Conectado";
        btn.classList.add("connected");
      }
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          if (!following.has(name)) {
            await followUser(name);
            following.add(name);
            btn.textContent = "Conectado";
            btn.classList.add("connected");
            showToast("Você agora está conectado com " + name);
          } else {
            await unfollowUser(name);
            following.delete(name);
            btn.textContent = "Conectar";
            btn.classList.remove("connected");
          }
        } catch (e) {
          showToast(e.message || "Não foi possível concluir a ação.");
        } finally {
          btn.disabled = false;
        }
      });
    });

    const searchInput = document.querySelector(".modern-search-bar input");
    const searchBtn = document.querySelector(".modern-search-bar .btn-primary");
    const cards = Array.from(document.querySelectorAll(".user-card"));

    function applyFilter() {
      const term = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      cards.forEach((card) => {
        const haystack = card.textContent.toLowerCase();
        const match = term === "" || haystack.includes(term);
        card.style.display = match ? "" : "none";
        if (match) visibleCount++;
      });
      let emptyMsg = grid.parentElement.querySelector(".no-results");
      if (visibleCount === 0) {
        if (!emptyMsg) {
          emptyMsg = document.createElement("p");
          emptyMsg.className = "no-results";
          emptyMsg.textContent = "Nenhum atleta encontrado para essa busca.";
          grid.insertAdjacentElement("afterend", emptyMsg);
        }
      } else if (emptyMsg) {
        emptyMsg.remove();
      }
    }

    if (searchInput && searchBtn) {
      searchBtn.addEventListener("click", (e) => {
        e.preventDefault();
        applyFilter();
      });
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") applyFilter();
      });
    }
  }

  /* ---------------------------------------------------------
     8. MAPA: rastreamento real via Geolocation API + Leaflet
     --------------------------------------------------------- */
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function initMapa() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    let map, marker, polyline;
    let path = [];
    let watchId = null;
    let seconds = 0;
    let timerInterval = null;
    let distanceKm = 0;
    let isRunning = false;

    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const gpsStatus = document.getElementById("gpsStatus");

    function setupMap(lat, lon) {
      if (typeof L === "undefined") return;
      map = L.map(mapEl).setView([lat, lon], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);
      marker = L.marker([lat, lon]).addTo(map);
      polyline = L.polyline([], { color: "#267CEE", weight: 5 }).addTo(map);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (gpsStatus) gpsStatus.textContent = "GPS pronto";
          setupMap(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          if (gpsStatus) gpsStatus.textContent = "Sem sinal de GPS — ative a localização";
          setupMap(-23.55, -46.63);
        },
        { enableHighAccuracy: true }
      );
    } else {
      if (gpsStatus) gpsStatus.textContent = "Este navegador não suporta geolocalização";
      setupMap(-23.55, -46.63);
    }

    async function toggleWorkout() {
      isRunning = !isRunning;

      if (isRunning) {
        startBtn.style.display = "none";
        pauseBtn.style.display = "block";
        path = [];
        distanceKm = 0;
        seconds = 0;

        if (!navigator.geolocation) {
          showToast("Geolocalização indisponível — não é possível gravar a rota.");
        } else {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              if (path.length > 0) {
                const last = path[path.length - 1];
                const segment = haversineKm(last[0], last[1], latitude, longitude);
                if (segment > 0.003) {
                  distanceKm += segment;
                }
              }
              path.push([latitude, longitude]);
              if (map && marker && polyline) {
                marker.setLatLng([latitude, longitude]);
                polyline.setLatLngs(path);
                map.panTo([latitude, longitude]);
              }
              document.getElementById("distance").textContent = formatKm(distanceKm);
            },
            () => showToast("Não foi possível acessar sua localização."),
            { enableHighAccuracy: true, maximumAge: 1000 }
          );
        }

        timerInterval = setInterval(() => {
          seconds++;
          document.getElementById("timer").textContent = formatClock(seconds);
          const paceMinPerKm = distanceKm > 0 ? seconds / 60 / distanceKm : 0;
          const paceEl = document.getElementById("pace");
          if (paceEl) {
            if (paceMinPerKm > 0 && isFinite(paceMinPerKm)) {
              const m = Math.floor(paceMinPerKm);
              const s = Math.round((paceMinPerKm - m) * 60);
              paceEl.textContent = m + "'" + String(s).padStart(2, "0") + '"';
            } else {
              paceEl.textContent = "0'00\"";
            }
          }
        }, 1000);
      } else {
        startBtn.style.display = "block";
        pauseBtn.style.display = "none";
        clearInterval(timerInterval);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);

        if (distanceKm > 0.01) {
          try {
            const { xpEarned } = await recordActivity(distanceKm, seconds);
            showToast("Atividade gravada! +" + xpEarned + " XP");
          } catch (e) {
            showToast(e.message || "Não foi possível salvar a atividade.");
          }
        } else {
          showToast("Atividade muito curta para ser salva.");
        }
        setTimeout(() => {
          window.location.href = "dashboard.php";
        }, 900);
      }
    }

    if (startBtn) startBtn.addEventListener("click", toggleWorkout);
    if (pauseBtn) pauseBtn.addEventListener("click", toggleWorkout);
  }

  /* ---------------------------------------------------------
     9. AUTENTICAÇÃO (login.html) + guarda de rota
     --------------------------------------------------------- */
  const PUBLIC_PAGES = ["login.html"];

  function isPublicPage() {
    return PUBLIC_PAGES.some((p) => location.pathname.endsWith(p));
  }

  function initAuthForms() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    if (!loginForm && !registerForm) return; // não é a página de login

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const btn = loginForm.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
          await login(email, password);
          window.location.href = "dashboard.php";
        } catch (err) {
          showToast(err.message || "Não foi possível entrar.");
          btn.disabled = false;
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const btn = registerForm.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
          await register(name, email, password);
          window.location.href = "dashboard.php";
        } catch (err) {
          showToast(err.message || "Não foi possível criar a conta.");
          btn.disabled = false;
        }
      });
    }
  }

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initNavbar();

    if (isPublicPage()) {
      initAuthForms();
      return;
    }

    // Páginas protegidas: sem token, manda pro login.
    if (!getToken()) {
      window.location.href = "login.html";
      return;
    }

    initDashboard();
    initPerfil();
    initAtividades();
    initAmizades();
    initMapa();
  });

  window.Trainly = { getData, levelInfo, xpFromActivity, showToast, logout };
})();