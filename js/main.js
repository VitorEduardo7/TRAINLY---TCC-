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

  const API_BASE = "http://localhost/TRAINLY---TCC-/api/index.php";
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
    const isFormData = options.body instanceof FormData;

    // Monta a URL usando ?route=xxx (não depende de mod_rewrite/.htaccess
    // funcionando no servidor — evita os problemas de 404 do XAMPP).
    const clean = path.replace(/^\//, "");
    const [route, existingQuery] = clean.split("?");
    const url = API_BASE + "?route=" + encodeURIComponent(route) + (existingQuery ? "&" + existingQuery : "");

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

  // ---- NOVO: amigos reais (por ID), busca e feed ----
  async function getFollowing() {
    const { following } = await apiRequest("/following");
    return following; // [{id, name}]
  }

  async function followUser(userId) {
    await apiRequest("/following/" + userId, { method: "POST" });
  }

  async function unfollowUser(userId) {
    await apiRequest("/following/" + userId, { method: "DELETE" });
  }

  async function searchUsers(query) {
    const { users } = await apiRequest("/users/search?q=" + encodeURIComponent(query));
    return users; // [{id, name, isFollowing}]
  }

  async function getFeed() {
    const { feed } = await apiRequest("/feed");
    return feed;
  }

  async function getActiveToday() {
    const { active } = await apiRequest("/feed/active-today");
    return active;
  }

  // ---- NOVO: Clubes ----
  async function createClub(name, description) {
    const { club } = await apiRequest("/clubs", {
      method: "POST",
      body: JSON.stringify({ name, description })
    });
    return club;
  }

  async function getMyClubs() {
    const { clubs } = await apiRequest("/clubs");
    return clubs;
  }

  async function joinClub(code) {
    const { club } = await apiRequest("/clubs/join", {
      method: "POST",
      body: JSON.stringify({ code })
    });
    return club;
  }

  async function getClubDetail(id) {
    const { club } = await apiRequest("/clubs/" + id);
    return club;
  }

  async function leaveClub(id) {
    return apiRequest("/clubs/" + id + "/leave", { method: "POST" });
  }

  // ---- NOVO: editar perfil e foto de capa ----
  async function updateProfile(payload) {
    const { data } = await apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return data;
  }

  async function uploadCoverPhoto(file) {
    const form = new FormData();
    form.append("cover", file);
    const { data } = await apiRequest("/profile/cover", {
      method: "POST",
      body: form
    });
    return data;
  }

  async function uploadAvatarPhoto(file) {
    const form = new FormData();
    form.append("avatar", file);
    const { data } = await apiRequest("/profile/avatar", {
      method: "POST",
      body: form
    });
    return data;
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

  /* ---------------------------------------------------------
     NOVO: Feed de amigos (dashboard)
     --------------------------------------------------------- */
  const AVATAR_COLORS = ["#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6"];

  function avatarColor(seed) {
    let hash = 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function initials(name) {
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }

  function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return mins + "min atrás";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h atrás";
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ontem";
    if (days < 7) return days + "d atrás";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  function renderFeed(listEl, emptyEl, feed) {
    if (!listEl) return;
    if (!feed.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    listEl.innerHTML = feed.map((p) => {
      const type = p.type || "Corrida";
      const icon = TYPE_ICONS[type] || "🏃";
      const title = p.title || (type + " registrada");
      const photoHtml = p.photoUrl
        ? '<img class="feed-photo" src="' + p.photoUrl + '" alt="Foto da atividade">'
        : "";

      return (
        '<div class="feed-post">' +
          '<div class="feed-post-top">' +
            '<div class="feed-post-author">' +
              '<div class="feed-avatar" style="background:' + avatarColor(p.authorId) + '">' + initials(p.authorName) + "</div>" +
              "<div>" +
                '<div class="feed-author-name">' + p.authorName + "</div>" +
                '<div class="feed-post-meta">' + timeAgo(p.date) + " · " + type + " " + icon + "</div>" +
              "</div>" +
            "</div>" +
            '<span class="feed-type-badge">' + type.toUpperCase() + "</span>" +
          "</div>" +
          '<div class="feed-post-title">' + title + "</div>" +
          photoHtml +
          '<div class="act-stats" style="grid-template-columns:repeat(4,1fr);margin-top:14px;">' +
            '<div><div class="act-stat-label">Distância</div><div class="act-stat-value">' + p.distanceKm.toFixed(1).replace(".", ",") + ' km</div></div>' +
            '<div><div class="act-stat-label">Duração</div><div class="act-stat-value">' + formatClock(p.durationSec) + '</div></div>' +
            '<div><div class="act-stat-label">Ritmo</div><div class="act-stat-value">' + formatPace(p.durationSec / 60, p.distanceKm) + '/km</div></div>' +
            '<div><div class="act-stat-label">Elevação</div><div class="act-stat-value">' + (p.elevationM ? p.elevationM + "m" : "—") + '</div></div>' +
          "</div>" +
          '<div class="feed-post-footer" data-activity-id="' + p.id + '">' +
            '<button class="kudos-btn' + (p.likedByMe ? " liked" : "") + '" data-action="like">👍 <span>' + (p.likeCount || 0) + "</span></button>" +
            '<span class="comment-icon">💬 0</span>' +
            '<button class="share-btn" type="button">↗ Compartilhar</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    // curtidas (reaproveita a lógica já existente)
    listEl.querySelectorAll(".feed-post-footer").forEach((footer) => {
      const likeBtn = footer.querySelector('[data-action="like"]');
      if (!likeBtn) return;
      likeBtn.addEventListener("click", async () => {
        const isLiked = likeBtn.classList.contains("liked");
        likeBtn.disabled = true;
        try {
          const { likeCount, likedByMe } = await toggleLike(footer.dataset.activityId, isLiked);
          likeBtn.querySelector("span").textContent = likeCount;
          likeBtn.classList.toggle("liked", likedByMe);
        } catch (err) {
          showToast(err.message || "Não foi possível curtir agora.");
        } finally {
          likeBtn.disabled = false;
        }
      });
    });

    listEl.querySelectorAll(".share-btn").forEach((btn) => {
      btn.addEventListener("click", () => showToast("Compartilhamento externo ainda em desenvolvimento 🚧"));
    });
  }

  function renderActiveToday(el, active) {
    if (!el) return;
    if (!active.length) {
      el.innerHTML = '<p class="empty-state">Ninguém que você segue treinou hoje ainda.</p>';
      return;
    }
    el.innerHTML = active.map((a) => {
      const icon = TYPE_ICONS[a.type] || "🏃";
      return (
        '<div class="active-friend-row">' +
          '<div class="feed-avatar small" style="background:' + avatarColor(a.id) + '">' + initials(a.name) + "</div>" +
          "<div>" +
            '<div class="active-friend-name">' + a.name + "</div>" +
            '<div class="active-friend-meta">' + a.type + " · " + a.distanceKm.toFixed(1).replace(".", ",") + " km</div>" +
          "</div>" +
          '<span class="active-friend-icon">' + icon + "</span>" +
        "</div>"
      );
    }).join("");
  }

  // Agora grava a atividade no servidor (que calcula o XP e atualiza o total).
  // extras é opcional: { type, title, heartRate, elevationM, photoFile }
  async function recordActivity(distanceKm, durationSec, extras = {}) {
    const { photoFile, ...rest } = extras;
    const form = new FormData();
    form.append("distanceKm", distanceKm);
    form.append("durationSec", durationSec);
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") form.append(key, value);
    });
    if (photoFile) form.append("photo", photoFile);

    const { data, xpEarned } = await apiRequest("/activities", {
      method: "POST",
      body: form
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

    // Dropdown do avatar: Meu perfil / Sair
    const profileToggle = document.querySelector("[data-profile-toggle]");
    const profileMenu = document.querySelector("[data-profile-menu]");
    if (profileToggle && profileMenu) {
      profileToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!profileMenu.contains(e.target) && e.target !== profileToggle) {
          profileMenu.classList.remove("open");
        }
      });
    }

    // Se existir um botão/link com [data-logout] em alguma página, ele desloga.
    const logoutBtn = document.querySelector("[data-logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Tem certeza que quer sair da sua conta?")) {
          logout();
        }
      });
    }
  }

  /* ---------------------------------------------------------
     NOVO: mantém o avatar da navbar sempre igual ao usuário logado
     (antes era um "M" fixo no HTML, igual em qualquer conta)
     --------------------------------------------------------- */
  async function initNavbarAvatar() {
    const avatars = document.querySelectorAll(".user-avatar-small");
    if (!avatars.length) return;
    try {
      const data = await getData();
      avatars.forEach((el) => {
        const span = el.querySelector("span") || el;
        if (data.avatarPhotoUrl) {
          el.style.backgroundImage = "url('" + data.avatarPhotoUrl + "')";
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
          span.textContent = "";
        } else {
          el.style.backgroundImage = "";
          span.textContent = initials(data.name || "?");
        }
      });
    } catch (e) {
      // se der erro, deixa o avatar como estava (não quebra a navbar)
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
    const composerInput = document.getElementById("composerInput");
    const composerBtn = document.getElementById("composerBtn");
    const cancelBtn = document.getElementById("cancelRegisterBtn");
    const saveBtn = document.getElementById("saveRegisterBtn");

    function open() {
      document.getElementById("fType").value = "Corrida";
      document.getElementById("fTitle").value = "";
      document.getElementById("fDist").value = "";
      document.getElementById("fDur").value = "";
      document.getElementById("fHr").value = "";
      document.getElementById("fElev").value = "";
      const photoInput = document.getElementById("fPhoto");
      if (photoInput) photoInput.value = "";
      overlay.classList.add("open");
    }
    function close() {
      overlay.classList.remove("open");
    }

    if (openBtn) openBtn.addEventListener("click", open);
    if (composerInput) composerInput.addEventListener("focus", open);
    if (composerBtn) composerBtn.addEventListener("click", open);
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
        const photoInput = document.getElementById("fPhoto");
        const photoFile = photoInput && photoInput.files[0] ? photoInput.files[0] : null;

        if (distanceKm <= 0 || durationMin <= 0) {
          showToast("Preencha ao menos distância e duração.");
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Salvando...";
        try {
          const { xpEarned } = await recordActivity(distanceKm, Math.round(durationMin * 60), {
            type, title, heartRate, elevationM, photoFile
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
    const metricsEl = document.getElementById("metricsGrid");
    if (!metricsEl) return; // não é a página do painel

    const data = await getData();
    const stats = computeStats(data);
    const following = await getFollowing();

    // Cabeçalho: data + saudação
    const now = new Date();
    const dateEl = document.getElementById("dateStamp");
    if (dateEl) {
      dateEl.textContent = now
        .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short", year: "numeric" })
        .toUpperCase();
    }
    const greetingEl = document.getElementById("greetingText");
    if (greetingEl) {
      const hour = now.getHours();
      const saud = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      const firstName = (data.name || "Atleta").split(" ")[0];
      greetingEl.textContent = saud + ", " + firstName.toUpperCase() + " 👋";
    }
    const composerAvatar = document.getElementById("composerAvatar");
    if (composerAvatar) composerAvatar.textContent = initials(data.name || "?");

    // O widget de patente e o nome não aparecem mais no dashboard
    // (ficaram só na página de Perfil), mas seguem funcionando lá.
    const rankEl = document.getElementById("rankWidget");
    if (rankEl) renderRankWidget(rankEl, data);

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
          if (rankEl) renderRankWidget(rankEl, fresh);
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

    // Métricas da semana, feed de amigos, volume semanal e recordes
    renderMetricsGrid(metricsEl, data);

    const feed = await getFeed();
    renderFeed(document.getElementById("feedList"), document.getElementById("feedEmpty"), feed);

    const active = await getActiveToday();
    renderActiveToday(document.getElementById("activeTodayList"), active);

    renderWeeklyChart(document.getElementById("weekChart"), document.getElementById("weekTotal"), data);
    renderPersonalRecords(document.getElementById("prList"), data);
    renderGoalWidget(document.getElementById("goalWidget"), data);

    initRegisterModal(data, rankEl, () => initDashboard());
  }

  async function initPerfil() {
    const nameEl = document.getElementById("profileName");
    if (!nameEl) return; // não é a página de perfil

    const data = await getData();
    const stats = computeStats(data);
    const following = await getFollowing();

    function paintProfile(d) {
      nameEl.textContent = d.name;
      const handle = "@" + d.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
      document.getElementById("profileHandle").textContent =
        handle + (d.location ? " · 📍 " + d.location : "");
      document.getElementById("profileBio").textContent = d.bio || "Sem bio ainda — clique em Editar Perfil para adicionar.";

      const avatarEl = document.getElementById("profileAvatarBig");
      if (avatarEl) {
        if (d.avatarPhotoUrl) {
          avatarEl.style.backgroundImage = "url('" + d.avatarPhotoUrl + "')";
          avatarEl.style.backgroundSize = "cover";
          avatarEl.style.backgroundPosition = "center";
          avatarEl.textContent = "";
        } else {
          avatarEl.style.backgroundImage = "";
          avatarEl.textContent = initials(d.name);
        }
      }

      const coverEl = document.getElementById("profileCover");
      if (coverEl && d.coverPhotoUrl) {
        coverEl.style.backgroundImage = "url('" + d.coverPhotoUrl + "')";
      }

      document.getElementById("statActivities").textContent = stats.totalActivities;
      document.getElementById("statFollowers").textContent = d.followersCount || 0;
      document.getElementById("statFollowing").textContent = following.length;
      document.getElementById("statKudos").textContent = d.kudosReceived || 0;
    }
    paintProfile(data);

    const acts = [...(data.activities || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Aba Estatísticas: Resumo do ano
    const year = new Date().getFullYear();
    const yearActs = acts.filter((a) => new Date(a.date).getFullYear() === year);
    const yearKm = yearActs.reduce((s, a) => s + a.distanceKm, 0);
    const yearSec = yearActs.reduce((s, a) => s + a.durationSec, 0);
    const yearElev = yearActs.reduce((s, a) => s + (a.elevationM || 0), 0);
    const yearDistinctDays = new Set(yearActs.map((a) => new Date(a.date).toDateString())).size;

    const yearTitleEl = document.getElementById("statsYearTitle");
    if (yearTitleEl) yearTitleEl.textContent = "Resumo " + year;
    const distEl = document.getElementById("perfilDistancia");
    const tempoEl = document.getElementById("perfilTempo");
    const elevEl = document.getElementById("perfilElevacao");
    const totalAnoEl = document.getElementById("perfilTotalAno");
    const diasAtivosEl = document.getElementById("perfilDiasAtivos");
    if (distEl) distEl.textContent = yearKm.toFixed(2).replace(".", ",") + " km";
    if (tempoEl) tempoEl.textContent = formatHM(yearSec);
    if (elevEl) elevEl.textContent = yearElev.toFixed(0) + " m";
    if (totalAnoEl) totalAnoEl.textContent = yearActs.length;
    if (diasAtivosEl) diasAtivosEl.textContent = yearDistinctDays + " dias";

    // Recordes pessoais com ícone (mesma lógica de sempre, layout novo)
    const recordsEl = document.getElementById("perfilRecordesIcon");
    if (recordsEl) {
      if (!acts.length) {
        recordsEl.innerHTML = '<p class="empty-state">Sem recordes ainda.</p>';
      } else {
        const longest = [...acts].sort((a, b) => b.distanceKm - a.distanceKm)[0];
        const fastest = [...acts].filter((a) => a.distanceKm > 0)
          .sort((a, b) => (a.durationSec / a.distanceKm) - (b.durationSec / b.distanceKm))[0];
        const longestDur = [...acts].sort((a, b) => b.durationSec - a.durationSec)[0];

        const row = (icon, color, label, value, dateStr) =>
          '<div class="record-icon-row">' +
            '<div class="record-icon-badge" style="background:' + color + '22;color:' + color + ';">' + icon + "</div>" +
            '<div class="record-icon-info">' +
              '<div class="record-icon-label">' + label + "</div>" +
              '<div class="record-icon-date">' + new Date(dateStr).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) + "</div>" +
            "</div>" +
            '<div class="record-icon-value">' + value + "</div>" +
          "</div>";

        recordsEl.innerHTML =
          row("📏", "#3b82f6", "Maior distância", longest.distanceKm.toFixed(1).replace(".", ",") + " km", longest.date) +
          row("⚡", "#f59e0b", "Melhor ritmo", formatPace(fastest.durationSec / 60, fastest.distanceKm) + "/km", fastest.date) +
          row("🏆", "#22c55e", "Maior duração", formatHM(longestDur.durationSec), longestDur.date);
      }
    }

    // Calendário de consistência (mês atual)
    const calGrid = document.getElementById("consistencyGrid");
    if (calGrid) {
      const now = new Date();
      const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      const titleEl = document.getElementById("consistencyTitle");
      if (titleEl) titleEl.textContent = "Consistência — " + monthNames[now.getMonth()] + " " + now.getFullYear();

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const firstWeekday = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
      const activeDaysSet = new Set(
        acts
          .filter((a) => {
            const d = new Date(a.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })
          .map((a) => new Date(a.date).getDate())
      );

      const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      let html = dayLabels.map((l) => '<div class="consistency-day-label">' + l + "</div>").join("");
      for (let i = 0; i < firstWeekday; i++) html += '<div class="consistency-day empty"></div>';
      for (let d = 1; d <= daysInMonth; d++) {
        html += '<div class="consistency-day' + (activeDaysSet.has(d) ? " active" : "") + '"></div>';
      }
      calGrid.innerHTML = html;

      // Maior sequência de dias consecutivos ativos
      let longestStreak = 0, current = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        if (activeDaysSet.has(d)) {
          current++;
          longestStreak = Math.max(longestStreak, current);
        } else {
          current = 0;
        }
      }
      const pct = Math.round((activeDaysSet.size / daysInMonth) * 100);

      const csActive = document.getElementById("csActiveDays");
      const csStreak = document.getElementById("csStreak");
      const csPct = document.getElementById("csPct");
      if (csActive) csActive.textContent = activeDaysSet.size + " / " + daysInMonth;
      if (csStreak) csStreak.textContent = longestStreak + (longestStreak === 1 ? " dia" : " dias");
      if (csPct) csPct.textContent = pct + "%";
    }

    // Grade de atividades (aba Atividades)
    const grid = document.getElementById("profileActivitiesGrid");
    const emptyEl = document.getElementById("profileActivitiesEmpty");

    if (!acts.length) {
      grid.innerHTML = "";
      emptyEl.style.display = "block";
    } else {
      emptyEl.style.display = "none";
      grid.innerHTML = acts.map((a) => {
        const d = new Date(a.date);
        const type = a.type || "Corrida";
        const photoStyle = a.photoUrl ? "background-image:url('" + a.photoUrl + "');" : "";
        return (
          '<div class="pa-card">' +
            '<div class="pa-photo" style="' + photoStyle + '"><span class="pa-badge">' + type.toUpperCase() + "</span></div>" +
            '<div class="pa-body">' +
              '<div class="pa-title">' + (a.title || (type + " registrada")) + "</div>" +
              '<div class="pa-date">' + d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) + "</div>" +
              '<div class="pa-stats">' +
                "<div><b>" + a.distanceKm.toFixed(1).replace(".", ",") + " km</b>Dist.</div>" +
                "<div><b>" + formatClock(a.durationSec) + "</b>Tempo</div>" +
                "<div><b>" + formatPace(a.durationSec / 60, a.distanceKm) + "/km</b>Ritmo</div>" +
                '<div class="pa-kudos">👍 ' + (a.likeCount || 0) + "</div>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("");
    }

    // Abas Atividades / Estatísticas / Conquistas
    const tabs = document.querySelectorAll(".tab-item-new");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.getAttribute("data-tab");
        document.querySelectorAll("[data-tab-panel-new]").forEach((p) => {
          p.style.display = p.getAttribute("data-tab-panel-new") === target ? "" : "none";
        });
      });
    });

    // Modal: editar perfil (nome, localização, bio)
    const editBtn = document.getElementById("editProfileBtn");
    const editOverlay = document.getElementById("editProfileOverlay");
    const cancelEditBtn = document.getElementById("cancelEditProfileBtn");
    const saveProfileBtn = document.getElementById("saveProfileBtn");

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        document.getElementById("epName").value = data.name || "";
        document.getElementById("epLocation").value = data.location || "";
        document.getElementById("epBio").value = data.bio || "";
        editOverlay.classList.add("open");
      });
    }
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => editOverlay.classList.remove("open"));
    editOverlay.addEventListener("click", (e) => { if (e.target === editOverlay) editOverlay.classList.remove("open"); });

    if (saveProfileBtn) {
      saveProfileBtn.addEventListener("click", async () => {
        const name = document.getElementById("epName").value.trim();
        const location = document.getElementById("epLocation").value.trim();
        const bio = document.getElementById("epBio").value.trim();
        if (!name) {
          showToast("O nome não pode ficar vazio.");
          return;
        }
        saveProfileBtn.disabled = true;
        try {
          const fresh = await updateProfile({ name, location, bio });
          showToast("Perfil atualizado!");
          editOverlay.classList.remove("open");
          paintProfile(fresh);
        } catch (e) {
          showToast(e.message || "Não foi possível salvar.");
        } finally {
          saveProfileBtn.disabled = false;
        }
      });
    }

    // Upload de foto de capa
    const editCoverBtn = document.getElementById("editCoverBtn");
    const coverInput = document.getElementById("coverInput");
    if (editCoverBtn && coverInput) {
      editCoverBtn.addEventListener("click", () => coverInput.click());
      coverInput.addEventListener("change", async () => {
        const file = coverInput.files[0];
        if (!file) return;
        editCoverBtn.textContent = "Enviando...";
        try {
          const fresh = await uploadCoverPhoto(file);
          paintProfile(fresh);
          showToast("Capa atualizada!");
        } catch (e) {
          showToast(e.message || "Não foi possível enviar a imagem.");
        } finally {
          editCoverBtn.textContent = "✏️ Editar capa";
        }
      });
    }

    // Upload de foto de perfil (avatar)
    const editAvatarBtn = document.getElementById("editAvatarBtn");
    const avatarInput = document.getElementById("avatarInput");
    if (editAvatarBtn && avatarInput) {
      editAvatarBtn.addEventListener("click", () => avatarInput.click());
      avatarInput.addEventListener("change", async () => {
        const file = avatarInput.files[0];
        if (!file) return;
        try {
          const fresh = await uploadAvatarPhoto(file);
          paintProfile(fresh);
          await initNavbarAvatar();
          showToast("Foto de perfil atualizada!");
        } catch (e) {
          showToast(e.message || "Não foi possível enviar a imagem.");
        }
      });
    }

    // Compartilhar perfil (copia o link)
    const shareBtn = document.getElementById("shareProfileBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        navigator.clipboard?.writeText(window.location.href);
        showToast("Link do perfil copiado!");
      });
    }
  }

  async function initAmizades() {
    const grid = document.getElementById("usersGrid");
    if (!grid) return; // não é a página de amigos

    const searchInput = document.getElementById("friendSearch");
    const emptyEl = document.getElementById("usersEmpty");
    const titleEl = document.getElementById("usersListTitle");

    function renderUserCards(users) {
      if (!users.length) {
        grid.innerHTML = "";
        emptyEl.style.display = "block";
        return;
      }
      emptyEl.style.display = "none";

      grid.innerHTML = users.map((u) => (
        '<div class="user-card" data-user-id="' + u.id + '">' +
          '<div class="user-card-avatar" style="background:' + avatarColor(u.id) + '">' + initials(u.name) + "</div>" +
          '<div class="user-card-name">' + u.name + "</div>" +
          '<div class="user-card-location">' + (u.location || "Localização não informada") + "</div>" +
          '<div class="user-card-stats">' +
            "<div><b>" + u.kmMonth.toFixed(0) + "</b><span>km/mês</span></div>" +
            "<div><b>" + u.activitiesCount + "</b><span>atividades</span></div>" +
            "<div><b>" + u.followersCount + "</b><span>seguidores</span></div>" +
          "</div>" +
          (u.mutualCount > 0 ? '<div class="user-card-mutual">🤝 ' + u.mutualCount + " amigo" + (u.mutualCount > 1 ? "s" : "") + " em comum</div>" : "") +
          '<div class="user-card-actions">' +
            '<button class="btn-view-profile" type="button">Ver Perfil</button>' +
            '<button class="btn-connect' + (u.isFollowing ? " connected" : "") + '" type="button">' + (u.isFollowing ? "Conectado" : "+ Seguir") + "</button>" +
          "</div>" +
        "</div>"
      )).join("");

      grid.querySelectorAll(".user-card").forEach((card) => {
        const userId = card.dataset.userId;
        const connectBtn = card.querySelector(".btn-connect");
        const viewBtn = card.querySelector(".btn-view-profile");

        connectBtn.addEventListener("click", async () => {
          const isFollowing = connectBtn.classList.contains("connected");
          connectBtn.disabled = true;
          try {
            if (!isFollowing) {
              await followUser(userId);
              connectBtn.textContent = "Conectado";
              connectBtn.classList.add("connected");
            } else {
              await unfollowUser(userId);
              connectBtn.textContent = "+ Seguir";
              connectBtn.classList.remove("connected");
            }
          } catch (e) {
            showToast(e.message || "Não foi possível concluir a ação.");
          } finally {
            connectBtn.disabled = false;
          }
        });

        viewBtn.addEventListener("click", () => {
          showToast("Perfis públicos de outros atletas ainda estão em desenvolvimento 🚧");
        });
      });
    }

    async function loadSuggested() {
      titleEl.textContent = "Atletas Sugeridos";
      grid.innerHTML = '<p class="empty-state">Carregando...</p>';
      try {
        const users = await apiRequest("/users/suggested");
        renderUserCards(users.users);
      } catch (e) {
        grid.innerHTML = "";
        emptyEl.textContent = "Não foi possível carregar sugestões agora.";
        emptyEl.style.display = "block";
      }
    }

    async function doSearch() {
      const term = searchInput.value.trim();
      if (term.length < 2) {
        loadSuggested();
        return;
      }
      titleEl.textContent = "Resultados da busca";
      grid.innerHTML = '<p class="empty-state">Buscando...</p>';
      try {
        const users = await searchUsers(term);
        renderUserCards(users);
      } catch (e) {
        grid.innerHTML = "";
        emptyEl.textContent = "Não foi possível buscar agora.";
        emptyEl.style.display = "block";
      }
    }

    let searchTimer;
    searchInput.addEventListener("keyup", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(doSearch, 350);
    });

    loadSuggested();

    // Sidebar: Ativos Agora
    try {
      const active = await getActiveToday();
      renderActiveToday(document.getElementById("activeTodayList"), active);
    } catch (e) {
      document.getElementById("activeTodayList").innerHTML = '<p class="empty-state">Não foi possível carregar.</p>';
    }

    // Sidebar: Ranking da Semana (entre quem você segue)
    try {
      const { leaderboard } = await apiRequest("/friends/leaderboard");
      const lbEl = document.getElementById("friendsLeaderboard");
      if (!leaderboard.length) {
        lbEl.innerHTML = '<p class="empty-state">Siga outros atletas para ver o ranking aqui.</p>';
      } else {
        lbEl.innerHTML = leaderboard.map((m, i) => (
          '<div class="lb-row">' +
            '<div class="lb-pos">' + (i + 1) + "</div>" +
            '<div class="small-avatar" style="background:' + avatarColor(m.id) + '">' + initials(m.name) + "</div>" +
            '<div class="lb-name">' + m.name + "</div>" +
            '<div class="lb-km">' + m.weekKm.toFixed(1).replace(".", ",") + " km</div>" +
          "</div>"
        )).join("");
      }
    } catch (e) {
      document.getElementById("friendsLeaderboard").innerHTML = '<p class="empty-state">Não foi possível carregar o ranking.</p>';
    }
  }

  /* ---------------------------------------------------------
     NOVO: Página "Minhas Atividades" — histórico completo com filtros
     --------------------------------------------------------- */
  async function initAtividades() {
    const tabsEl = document.querySelector(".filter-tabs");
    if (!tabsEl) return; // não é a página de atividades

    const data = await getData();
    let currentType = "Todos";

    function renderSummary(acts) {
      const year = new Date().getFullYear();
      const thisYear = acts.filter((a) => new Date(a.date).getFullYear() === year);
      const totalKm = thisYear.reduce((s, a) => s + a.distanceKm, 0);
      const totalSec = thisYear.reduce((s, a) => s + a.durationSec, 0);
      const totalElev = thisYear.reduce((s, a) => s + (a.elevationM || 0), 0);

      const countEl = document.getElementById("sumCount");
      const distEl = document.getElementById("sumDist");
      const timeEl = document.getElementById("sumTime");
      const elevEl = document.getElementById("sumElev");

      if (countEl) countEl.textContent = thisYear.length;
      if (distEl) distEl.textContent = totalKm.toFixed(0).replace(".", ",") + " km";
      if (timeEl) timeEl.textContent = formatHM(totalSec);
      if (elevEl) elevEl.textContent = totalElev.toFixed(0) + " m";
    }

    function renderList() {
      const all = [...(data.activities || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
      const filtered = currentType === "Todos" ? all : all.filter((a) => (a.type || "Corrida") === currentType);

      renderSummary(all);

      const listEl = document.getElementById("atividadesList");
      const emptyEl = document.getElementById("atividadesEmpty");
      if (!listEl) return;

      if (filtered.length === 0) {
        listEl.innerHTML = "";
        if (emptyEl) emptyEl.style.display = "block";
        return;
      }
      if (emptyEl) emptyEl.style.display = "none";

      listEl.innerHTML = filtered.map((a) => {
        const d = new Date(a.date);
        const dateLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) +
          ", " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const type = a.type || "Corrida";
        const title = a.title || (type + " registrada");
        const icon = TYPE_ICONS[type] || "🏃";
        const hrValue = a.heartRate ? a.heartRate + " bpm" : "—";

        return (
          '<div class="activity-item" data-activity-id="' + a.id + '" style="margin-bottom:14px;">' +
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
            '<div class="act-stats" style="grid-template-columns:repeat(4,1fr);">' +
              '<div><div class="act-stat-label">Distância</div><div class="act-stat-value">' + a.distanceKm.toFixed(2).replace(".", ",") + ' km</div></div>' +
              '<div><div class="act-stat-label">Duração</div><div class="act-stat-value">' + formatClock(a.durationSec) + '</div></div>' +
              '<div><div class="act-stat-label">Ritmo</div><div class="act-stat-value">' + formatPace(a.durationSec / 60, a.distanceKm) + '/km</div></div>' +
              '<div><div class="act-stat-label">FC média</div><div class="act-stat-value">' + hrValue + '</div></div>' +
            "</div>" +
          "</div>"
        );
      }).join("");

      wireActivitySocial(listEl);
    }

    tabsEl.querySelectorAll(".filter-pill").forEach((tab) => {
      tab.addEventListener("click", () => {
        tabsEl.querySelectorAll(".filter-pill").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentType = tab.dataset.filter;
        renderList();
      });
    });

    renderList();
    initRegisterModal(data, null, () => initAtividades());
  }

  /* ---------------------------------------------------------
     8. MAPA: rastreamento real via Geolocation API + Leaflet
     --------------------------------------------------------- */
  // ---- NOVO: Rotas (página Explorar) ----
  async function getRoutes(type) {
    const { routes } = await apiRequest("/routes?type=" + encodeURIComponent(type || "Todos"));
    return routes;
  }

  async function createRoute(payload) {
    const { route } = await apiRequest("/routes", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return route;
  }

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
          window.location.href = "dashboard.html";
        }, 900);
      }
    }

    if (startBtn) startBtn.addEventListener("click", toggleWorkout);
    if (pauseBtn) pauseBtn.addEventListener("click", toggleWorkout);
  }

  /* ---------------------------------------------------------
     NOVO: Página Explorar (rotas prontas cadastradas por usuários)
     --------------------------------------------------------- */
  const ROUTE_TYPE_ICON = { Corrida: "🏃", Ciclismo: "🚴", Trilha: "⛰️" };
  const ROUTE_TYPE_COLOR = { Corrida: "#3b82f6", Ciclismo: "#10b981", Trilha: "#f59e0b" };

  function initExplorar() {
    const listEl = document.getElementById("routesList");
    if (!listEl || typeof L === "undefined") return; // não é a página Explorar

    let allRoutes = [];
    let selectedId = null;
    let map, polylineLayer, markerLayer;

    function setupMainMap() {
      map = L.map("exploreMap").setView([-23.55, -46.63], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);
    }

    function drawRouteOnMap(route) {
      if (polylineLayer) map.removeLayer(polylineLayer);
      if (markerLayer) map.removeLayer(markerLayer);
      if (!route || !route.path.length) return;

      polylineLayer = L.polyline(route.path, { color: ROUTE_TYPE_COLOR[route.type] || "#3b82f6", weight: 5 }).addTo(map);
      markerLayer = L.marker([route.startLat, route.startLng]).addTo(map);
      map.fitBounds(polylineLayer.getBounds(), { padding: [30, 30] });
    }

    function renderDetailBar(route) {
      const bar = document.getElementById("routeDetailBar");
      if (!route) {
        bar.style.display = "none";
        return;
      }
      bar.style.display = "flex";
      bar.innerHTML =
        "<div>" +
          '<div class="route-detail-title">' + route.name + "</div>" +
          '<div class="route-detail-sub">' + route.type + " · " + route.difficulty + (route.terrain ? " · " + route.terrain : "") + "</div>" +
        "</div>" +
        '<div class="route-detail-stats">' +
          '<div><div class="rd-label">Distância</div><div class="rd-value">' + route.distanceKm.toFixed(1).replace(".", ",") + " km</div></div>" +
          '<div><div class="rd-label">Elevação</div><div class="rd-value">' + route.elevationM + " m</div></div>" +
          '<div><div class="rd-label">Avaliação</div><div class="rd-value">' + (route.ratingAvg ? "★ " + route.ratingAvg : "—") + "</div></div>" +
        "</div>" +
        '<a class="btn-primary" href="mapa.php?startLat=' + route.startLat + "&startLng=" + route.startLng + '" style="text-decoration:none;">Iniciar Rota →</a>';
    }

    function renderList(routes) {
      const emptyEl = document.getElementById("routesEmpty");
      if (!routes.length) {
        listEl.innerHTML = "";
        emptyEl.style.display = "block";
        renderDetailBar(null);
        return;
      }
      emptyEl.style.display = "none";

      listEl.innerHTML = routes.map((r) => {
        const icon = ROUTE_TYPE_ICON[r.type] || "🏃";
        const color = ROUTE_TYPE_COLOR[r.type] || "#3b82f6";
        return (
          '<div class="route-card' + (r.id === selectedId ? " selected" : "") + '" data-route-id="' + r.id + '">' +
            '<div class="route-card-top">' +
              '<div class="route-icon" style="background:' + color + '22; color:' + color + ';">' + icon + "</div>" +
              '<div class="route-card-main">' +
                '<div class="route-name">' + r.name + "</div>" +
                '<div class="route-meta">' + r.type + (r.ratingAvg ? " · ★ " + r.ratingAvg + " (" + r.ratingCount + ")" : "") + "</div>" +
                '<div class="route-stats">' + r.distanceKm.toFixed(1).replace(".", ",") + " km <span>↑ " + r.elevationM + "m</span></div>" +
                '<div class="route-tags"><span class="route-tag">' + r.difficulty + "</span>" + (r.terrain ? '<span class="route-tag">' + r.terrain + "</span>" : "") + "</div>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      listEl.querySelectorAll(".route-card").forEach((card) => {
        card.addEventListener("click", () => {
          const id = Number(card.dataset.routeId);
          selectedId = id;
          const route = allRoutes.find((r) => r.id === id);
          listEl.querySelectorAll(".route-card").forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");
          drawRouteOnMap(route);
          renderDetailBar(route);
        });
      });

      // Seleciona a primeira rota automaticamente
      if (!selectedId && routes.length) {
        listEl.querySelector(".route-card").click();
      }
    }

    async function loadAndRender() {
      const activeType = document.querySelector(".filter-pill.active")?.dataset.filter || "Todos";
      const term = document.getElementById("routeSearch").value.trim().toLowerCase();
      allRoutes = await getRoutes(activeType);
      const filtered = term ? allRoutes.filter((r) => r.name.toLowerCase().includes(term)) : allRoutes;
      selectedId = null;
      renderList(filtered);
    }

    setupMainMap();
    loadAndRender();

    document.querySelectorAll("#routeFilterTabs .filter-pill").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#routeFilterTabs .filter-pill").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        loadAndRender();
      });
    });

    const searchInput = document.getElementById("routeSearch");
    let searchTimer;
    searchInput.addEventListener("keyup", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadAndRender, 300);
    });

    /* ---- Modal: adicionar rota nova ---- */
    const addOverlay = document.getElementById("addRouteOverlay");
    const openAddBtn = document.getElementById("openAddRouteBtn");
    const cancelAddBtn = document.getElementById("cancelAddRouteBtn");
    const saveRouteBtn = document.getElementById("saveRouteBtn");
    const undoPointBtn = document.getElementById("undoPointBtn");
    let drawMap, drawPoints = [], drawPolyline, drawMarkers = [];

    function setupDrawMap() {
      if (drawMap) return; // só inicializa uma vez
      drawMap = L.map("drawMap").setView([-23.55, -46.63], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(drawMap);

      drawMap.on("click", (e) => {
        drawPoints.push([e.latlng.lat, e.latlng.lng]);
        redrawDrawMap();
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          drawMap.setView([pos.coords.latitude, pos.coords.longitude], 14);
        });
      }
    }

    function redrawDrawMap() {
      if (drawPolyline) drawMap.removeLayer(drawPolyline);
      drawMarkers.forEach((m) => drawMap.removeLayer(m));
      drawMarkers = [];

      drawPoints.forEach((p) => {
        drawMarkers.push(L.circleMarker(p, { radius: 5, color: "#3b82f6" }).addTo(drawMap));
      });
      if (drawPoints.length > 1) {
        drawPolyline = L.polyline(drawPoints, { color: "#3b82f6", weight: 4 }).addTo(drawMap);
      }

      document.getElementById("drawPointsCount").textContent = drawPoints.length + " pontos marcados";

      let totalKm = 0;
      for (let i = 1; i < drawPoints.length; i++) {
        totalKm += haversineKm(drawPoints[i - 1][0], drawPoints[i - 1][1], drawPoints[i][0], drawPoints[i][1]);
      }
      document.getElementById("rDist").value = totalKm > 0 ? totalKm.toFixed(2) : "";
    }

    function openAddModal() {
      addOverlay.classList.add("open");
      document.getElementById("rName").value = "";
      document.getElementById("rElev").value = "";
      document.getElementById("rTerrain").value = "";
      drawPoints = [];
      setTimeout(() => {
        setupDrawMap();
        drawMap.invalidateSize();
        redrawDrawMap();
      }, 50);
    }
    function closeAddModal() {
      addOverlay.classList.remove("open");
    }

    if (openAddBtn) openAddBtn.addEventListener("click", openAddModal);
    if (cancelAddBtn) cancelAddBtn.addEventListener("click", closeAddModal);
    addOverlay.addEventListener("click", (e) => { if (e.target === addOverlay) closeAddModal(); });
    if (undoPointBtn) {
      undoPointBtn.addEventListener("click", () => {
        drawPoints.pop();
        redrawDrawMap();
      });
    }

    if (saveRouteBtn) {
      saveRouteBtn.addEventListener("click", async () => {
        const name = document.getElementById("rName").value.trim();
        const type = document.getElementById("rType").value;
        const difficulty = document.getElementById("rDifficulty").value;
        const distanceKm = parseFloat(document.getElementById("rDist").value) || 0;
        const elevationM = parseInt(document.getElementById("rElev").value) || 0;
        const terrain = document.getElementById("rTerrain").value.trim();

        if (!name || drawPoints.length < 2 || distanceKm <= 0) {
          showToast("Preencha o nome e marque ao menos 2 pontos no mapa.");
          return;
        }

        saveRouteBtn.disabled = true;
        saveRouteBtn.textContent = "Salvando...";
        try {
          await createRoute({ name, type, difficulty, terrain, distanceKm, elevationM, path: drawPoints });
          showToast("Rota cadastrada com sucesso!");
          closeAddModal();
          loadAndRender();
        } catch (e) {
          showToast(e.message || "Não foi possível salvar a rota.");
        } finally {
          saveRouteBtn.disabled = false;
          saveRouteBtn.textContent = "Salvar rota";
        }
      });
    }
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
          window.location.href = "dashboard.html";
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
          window.location.href = "dashboard.html";
        } catch (err) {
          showToast(err.message || "Não foi possível criar a conta.");
          btn.disabled = false;
        }
      });
    }
  }

  /* ---------------------------------------------------------
     NOVO: Página Clubes
     --------------------------------------------------------- */
  function initClubes() {
    const listEl = document.getElementById("myClubsList");
    if (!listEl) return; // não é a página de clubes

    let myClubs = [];
    let selectedClubId = null;

    function renderMyClubs() {
      if (!myClubs.length) {
        listEl.innerHTML = '<p class="empty-state" style="font-size:13px;">Você ainda não está em nenhum clube.</p>';
        return;
      }
      listEl.innerHTML = myClubs.map((c) => (
        '<div class="club-list-item' + (c.id === selectedClubId ? " selected" : "") + '" data-club-id="' + c.id + '">' +
          '<div class="club-icon">🏆</div>' +
          "<div>" +
            '<div class="club-list-name">' + c.name + (c.isAdmin ? ' <span style="color:var(--primary-blue);font-size:10px;">ADMIN</span>' : "") + "</div>" +
            '<div class="club-list-meta">' + c.memberCount + " membros</div>" +
          "</div>" +
        "</div>"
      )).join("");

      listEl.querySelectorAll(".club-list-item").forEach((item) => {
        item.addEventListener("click", () => selectClub(Number(item.dataset.clubId)));
      });
    }

    async function selectClub(id) {
      selectedClubId = id;
      renderMyClubs();
      const detailEl = document.getElementById("clubDetail");
      detailEl.innerHTML = '<p class="empty-state">Carregando...</p>';
      try {
        const club = await getClubDetail(id);
        renderClubDetail(club);
      } catch (e) {
        detailEl.innerHTML = '<p class="empty-state">Não foi possível carregar esse clube.</p>';
      }
    }

    function renderClubDetail(club) {
      const detailEl = document.getElementById("clubDetail");
      const medals = ["🥇", "🥈", "🥉"];

      const rankingHtml = club.leaderboard.length
        ? club.leaderboard.map((m, i) => (
            '<div class="rank-row">' +
              '<div class="rank-pos">' + (i < 3 ? '<span class="rank-medal">' + medals[i] + "</span>" : i + 1) + "</div>" +
              '<div class="rank-avatar" style="background:' + avatarColor(m.id) + '">' + initials(m.name) + "</div>" +
              '<div class="rank-name">' + m.name + "</div>" +
              '<div class="rank-km">' + m.weekKm.toFixed(1).replace(".", ",") + " km</div>" +
            "</div>"
          )).join("")
        : '<p class="empty-state">Nenhum membro registrou km essa semana ainda.</p>';

      detailEl.innerHTML =
        '<div class="club-detail-header">' +
          "<div>" +
            '<div class="club-detail-title">' + club.name + "</div>" +
            '<div class="club-detail-sub">' + (club.description || "Sem descrição") + " · " + club.memberCount + " membros</div>" +
          "</div>" +
          (club.isAdmin ? "" : '<button class="btn-secondary" id="leaveClubBtn">Sair do clube</button>') +
        "</div>" +
        '<div class="club-invite-box">' +
          "<div>" +
            '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Código de convite</div>' +
            '<div class="club-invite-code">' + club.inviteCode + "</div>" +
          "</div>" +
          '<button class="btn-secondary" id="copyInviteBtn">Copiar</button>' +
        "</div>" +
        '<div class="card">' +
          '<div class="club-ranking-title">🏆 Ranking da semana</div>' +
          rankingHtml +
        "</div>";

      const copyBtn = document.getElementById("copyInviteBtn");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard?.writeText(club.inviteCode);
          showToast("Código copiado!");
        });
      }
      const leaveBtn = document.getElementById("leaveClubBtn");
      if (leaveBtn) {
        leaveBtn.addEventListener("click", async () => {
          if (!confirm("Tem certeza que quer sair do clube \"" + club.name + "\"?")) return;
          try {
            await leaveClub(club.id);
            showToast("Você saiu do clube.");
            selectedClubId = null;
            document.getElementById("clubDetail").innerHTML = '<p class="empty-state" style="padding:60px 0;text-align:center;">Selecione um clube na lista ao lado.</p>';
            loadMyClubs();
          } catch (e) {
            showToast(e.message || "Não foi possível sair do clube.");
          }
        });
      }
    }

    async function loadMyClubs() {
      myClubs = await getMyClubs();
      renderMyClubs();
    }

    loadMyClubs();

    // Modal: criar clube
    const createOverlay = document.getElementById("createClubOverlay");
    const openCreateBtn = document.getElementById("openCreateClubBtn");
    const cancelCreateBtn = document.getElementById("cancelCreateClubBtn");
    const saveCreateBtn = document.getElementById("saveCreateClubBtn");

    if (openCreateBtn) {
      openCreateBtn.addEventListener("click", () => {
        document.getElementById("ccName").value = "";
        document.getElementById("ccDescription").value = "";
        createOverlay.classList.add("open");
      });
    }
    if (cancelCreateBtn) cancelCreateBtn.addEventListener("click", () => createOverlay.classList.remove("open"));
    createOverlay.addEventListener("click", (e) => { if (e.target === createOverlay) createOverlay.classList.remove("open"); });

    if (saveCreateBtn) {
      saveCreateBtn.addEventListener("click", async () => {
        const name = document.getElementById("ccName").value.trim();
        const description = document.getElementById("ccDescription").value.trim();
        if (!name) {
          showToast("Digite um nome para o clube.");
          return;
        }
        saveCreateBtn.disabled = true;
        try {
          const club = await createClub(name, description);
          showToast("Clube criado!");
          createOverlay.classList.remove("open");
          await loadMyClubs();
          selectClub(club.id);
        } catch (e) {
          showToast(e.message || "Não foi possível criar o clube.");
        } finally {
          saveCreateBtn.disabled = false;
        }
      });
    }

    // Entrar com código
    const joinBtn = document.getElementById("joinClubBtn");
    if (joinBtn) {
      joinBtn.addEventListener("click", async () => {
        const code = document.getElementById("joinCodeInput").value.trim();
        if (!code) {
          showToast("Digite um código de convite.");
          return;
        }
        joinBtn.disabled = true;
        try {
          const club = await joinClub(code);
          showToast("Você entrou no clube \"" + club.name + "\"!");
          document.getElementById("joinCodeInput").value = "";
          await loadMyClubs();
          selectClub(club.id);
        } catch (e) {
          showToast(e.message || "Código inválido.");
        } finally {
          joinBtn.disabled = false;
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
    initAmizades();
    initAtividades();
    initExplorar();
    initClubes();
    initMapa();
    initNavbarAvatar();
  });

  window.Trainly = { getData, levelInfo, xpFromActivity, showToast, logout };
})();