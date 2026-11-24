/*
   TRAINLY - main.js
   Camada de dados + interações compartilhadas entre páginas.

   Os dados vêm do Supabase, o MESMO banco do app (ver js/api/ e
   js/supabase-config.js). O apiRequest() repassa cada chamada para lá.
   */

(function () {
  "use strict";

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
     2. CAMADA DE DADOS (Supabase, o mesmo banco do app)
     O apiRequest() repassa cada chamada para js/api/ (TrainlySupabase).
     --------------------------------------------------------- */

  // Limpeza única: apaga o token da API antiga (PHP + MySQL), que não é
  // mais usada. A sessão agora fica com o próprio Supabase.
  try { localStorage.removeItem("trainly_token"); } catch (e) { /* sem acesso ao storage */ }

  function dataLayer() {
    if (!window.TrainlySupabase) {
      const err = new Error("Não foi possível carregar a conexão com o servidor. Recarregue a página.");
      err.status = 503;
      throw err;
    }
    return window.TrainlySupabase;
  }

  // Páginas protegidas: tem alguém logado?
  async function isLoggedIn() {
    try { return await dataLayer().hasSession(); } catch (e) { return false; }
  }

  async function apiRequest(path, options = {}) {
    try {
      return await dataLayer().request(path, options);
    } catch (err) {
      // Sessão expirada ou inexistente: volta pra página de boas-vindas
      if (err.status === 401 && !isPublicPage()) {
        location.href = "index.php";
      }
      throw err;
    }
  }

  // Substitui a antiga leitura do localStorage: busca os dados do usuário logado
  async function getData() {
    const { data } = await apiRequest("/me");
    return data;
  }

  // Login/cadastro: a sessão fica guardada pelo Supabase; devolve os dados do usuário
  async function login(email, password) {
    const { data } = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    return data;
  }

  async function register(name, email, password) {
    const { data } = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
    return data;
  }

  async function logout() {
    try { await dataLayer().signOut(); } catch (e) { /* sai mesmo assim */ }
    location.href = "index.php"; // depois de sair, volta pra página de boas-vindas
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

  async function updateClub(id, name, description) {
    const { club } = await apiRequest("/clubs/" + id, {
      method: "PUT",
      body: JSON.stringify({ name, description })
    });
    return club;
  }

  async function deleteClub(id) {
    return apiRequest("/clubs/" + id, { method: "DELETE" });
  }

  // ---- NOVO: perfil público de outro usuário ----
  async function getPublicProfile(id) {
    const { profile } = await apiRequest("/users/" + id + "/profile");
    return profile;
  }

  // ---- NOVO: notificações reais ----
  async function getNotifications() {
    return apiRequest("/notifications"); // { notifications, unreadCount }
  }

  async function markNotificationsRead() {
    return apiRequest("/notifications/read-all", { method: "POST" });
  }

  // ---- NOVO: desafios de clube ----
  async function createChallenge(clubId, title, startDate, endDate, metric) {
    const { challenge } = await apiRequest("/clubs/" + clubId + "/challenges", {
      method: "POST",
      body: JSON.stringify({ title, startDate, endDate, metric })
    });
    return challenge;
  }

  async function getChallenge(clubId) {
    const { challenge } = await apiRequest("/clubs/" + clubId + "/challenges");
    return challenge;
  }

  async function getChallengeHistory(clubId) {
    const { challenges } = await apiRequest("/clubs/" + clubId + "/challenges/history");
    return challenges;
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

  const TYPE_ICONS = { Corrida: "", Ciclismo: "", Natação: "", Caminhada: "" };

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
      const icon = TYPE_ICONS[type] || "";
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

  // Volume Semanal: clicar em um dia mostra os km daquele dia; as setas
  // navegam entre semanas (a seta "próxima" para na semana atual).
  function renderWeeklyChart(chartEl, totalEl, data) {
    if (!chartEl) return;

    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weekdaysLong = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    const rangeEl = document.getElementById("weekRange");
    const infoEl = document.getElementById("weekDayInfo");
    const titleEl = document.getElementById("weekTitle");
    const deltaEl = document.getElementById("weekDelta");
    const subEl = document.getElementById("weekSub");
    const statsEl = document.getElementById("metricsGrid");
    const prevBtn = document.getElementById("weekPrevBtn");
    const nextBtn = document.getElementById("weekNextBtn");

    // Estado fica no próprio elemento: o dashboard recarrega depois de registrar
    // uma atividade e a semana que o usuário está vendo não deve resetar.
    chartEl._acts = data.activities || [];
    chartEl._totalEl = totalEl;
    if (chartEl._offset === undefined) chartEl._offset = 0;   // 0 = semana atual, -1 = passada...
    if (chartEl._selected === undefined) chartEl._selected = null;

    const fmtKm = (km) => km.toFixed(1).replace(".", ",") + " km";

    function draw() {
      const acts = chartEl._acts;
      const now = new Date();
      // Janela móvel de 7 dias terminando hoje (igual ao "Últimos 7 dias" do app);
      // as setas andam de 7 em 7 dias pra trás.
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6 + chartEl._offset * 7);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const ds = d.toDateString();
        const dayActs = acts.filter((a) => new Date(a.date).toDateString() === ds);
        days.push({
          date: d,
          km: dayActs.reduce((sum, a) => sum + a.distanceKm, 0),
          sec: dayActs.reduce((sum, a) => sum + a.durationSec, 0),
          count: dayActs.length
        });
      }

      // Dia selecionado: na semana atual começa em "hoje"
      // Nenhum dia aberto de início: o detalhe aparece ao clicar numa barra
      const sel = chartEl._selected;

      const max = Math.max(...days.map((d) => d.km), 1);
      const todayStr = now.toDateString();

      chartEl.innerHTML = days.map((d, idx) => {
        const isToday = d.date.toDateString() === todayStr;
        const h = d.km > 0 ? Math.max(8, Math.round((d.km / max) * 100)) : 6;
        const label = weekdays[d.date.getDay()];
        const barCls = "chart-bar" + (isToday ? " today" : "") + (d.km > 0 ? "" : " rest");
        return (
          '<button type="button" class="chart-col' + (idx === sel ? " selected" : "") + '" data-idx="' + idx + '"' +
            ' aria-label="' + weekdaysLong[d.date.getDay()] + ": " + fmtKm(d.km) + '">' +
            '<div class="' + barCls + '" style="height:' + (d.km > 0 ? h + "%" : h + "px") + '"></div>' +
            '<div class="chart-day' + (isToday ? " today" : "") + '">' + (isToday ? "Hoje" : label) + "</div>" +
          "</button>"
        );
      }).join("");

      // Resumo da semana mostrada: título, km em destaque, comparação e números
      const weekKm = days.reduce((sum, d) => sum + d.km, 0);
      const weekSec = days.reduce((sum, d) => sum + d.sec, 0);
      const weekCount = days.reduce((sum, d) => sum + d.count, 0);
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevKm = acts
        .filter((a) => { const t = new Date(a.date); return t >= prevStart && t < start; })
        .reduce((sum, a) => sum + a.distanceKm, 0);

      if (titleEl) {
        titleEl.textContent = chartEl._offset === 0 ? "Últimos 7 dias" : chartEl._offset === -1 ? "7 dias anteriores" : "Há " + (-chartEl._offset) + " semanas";
      }
      if (deltaEl) {
        if (prevKm > 0 || weekKm > 0) {
          const pctDelta = prevKm > 0 ? Math.round(((weekKm - prevKm) / prevKm) * 100) : 100;
          deltaEl.className = "week-delta " + (pctDelta > 0 ? "up" : pctDelta < 0 ? "down" : "flat");
          deltaEl.textContent = (pctDelta > 0 ? "+" : "") + pctDelta + "% vs. 7 dias antes";
        } else {
          deltaEl.className = "week-delta";
          deltaEl.textContent = "";
        }
      }
      if (subEl) {
        subEl.textContent = weekCount === 0
          ? (chartEl._offset === 0 ? "Nenhum treino nos últimos 7 dias." : "Nenhum treino nesse período.")
          : weekCount + (weekCount === 1 ? " treino" : " treinos") + " · " + formatHM(weekSec) + " em movimento";
      }
      if (statsEl) {
        statsEl.innerHTML =
          '<div class="week-stat"><b>' + formatHM(weekSec) + "</b><span>Tempo</span></div>" +
          '<div class="week-stat"><b>' + (weekKm > 0 ? formatPace(weekSec / 60, weekKm) : "--") + "<small>/km</small></b><span>Ritmo médio</span></div>" +
          '<div class="week-stat"><b>' + weekCount + "</b><span>" + (weekCount === 1 ? "Atividade" : "Atividades") + "</span></div>";
      }

      // Intervalo da semana
      const end = days[6].date;
      const fmtDay = (d) => d.getDate() + " " + months[d.getMonth()];
      if (rangeEl) {
        rangeEl.textContent = fmtDay(start) + " – " + fmtDay(end);
      }

      // Detalhe do dia clicado
      if (infoEl) {
        if (sel === null) {
          infoEl.innerHTML = "";
        } else {
          const d = days[sel];
          const title = weekdaysLong[d.date.getDay()] + ", " + fmtDay(d.date);
          infoEl.innerHTML = d.count === 0
            ? '<div class="week-day-title">' + title + '</div><div class="week-day-empty">Nenhuma atividade neste dia.</div>'
            : '<div class="week-day-title">' + title + "</div>" +
              '<div class="week-day-km">' + fmtKm(d.km) + "</div>" +
              '<div class="week-day-meta">' + d.count + (d.count === 1 ? " atividade" : " atividades") + " · " + formatHM(d.sec) + "</div>";
        }
      }

      // Navegação: não passa da semana atual nem volta antes da primeira atividade
      const firstStart = acts.length
        ? (() => { const f = new Date(Math.min(...acts.map((a) => new Date(a.date).getTime()))); f.setHours(0, 0, 0, 0); return f; })()
        : start;
      if (nextBtn) nextBtn.disabled = chartEl._offset >= 0;
      if (prevBtn) prevBtn.disabled = start.getTime() <= firstStart.getTime();

      if (chartEl._totalEl) {
        // Só o número: a unidade "km" fica ao lado, em letra menor
        const prevShown = typeof chartEl._shownKm === "number" ? chartEl._shownKm : 0;
        chartEl._shownKm = Math.round(weekKm * 10) / 10;
        countUp(chartEl._totalEl, chartEl._shownKm, 1, prevShown);
      }
    }

    chartEl._draw = draw;

    // Listeners ligados uma vez só (o dashboard pode renderizar de novo)
    if (chartEl.dataset.wired !== "1") {
      chartEl.dataset.wired = "1";

      chartEl.addEventListener("click", (e) => {
        const col = e.target.closest(".chart-col");
        if (!col) return;
        const idx = Number(col.dataset.idx);
        chartEl._selected = chartEl._selected === idx ? null : idx;
        chartEl.classList.add("no-anim");
        chartEl._draw();
      });

      if (prevBtn) prevBtn.addEventListener("click", () => {
        chartEl.classList.remove("no-anim");
        chartEl._offset -= 1;
        chartEl._selected = null;
        chartEl._draw();
      });
      if (nextBtn) nextBtn.addEventListener("click", () => {
        if (chartEl._offset >= 0) return;
        chartEl.classList.remove("no-anim");
        chartEl._offset += 1;
        chartEl._selected = null;
        chartEl._draw();
      });
    }

    draw();
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

  // NOVO: meta do mês editável pelo usuário — pode ser por distância (km),
  // número de atividades ou tempo ativo (horas). data.monthlyGoalType e
  // data.monthlyGoalValue vêm da API (/me via build_user_data).
  const GOAL_TYPE_LABELS = { km: "Distância", activities: "Atividades", hours: "Tempo ativo" };

  function computeGoalProgress(data) {
    const type = data.monthlyGoalType || "km";
    const goal = data.monthlyGoalValue || 100;
    const now = new Date();
    const monthActs = (data.activities || []).filter((a) => {
      const d = new Date(a.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    let current = 0;
    let unit = "km";
    if (type === "activities") {
      current = monthActs.length;
      unit = current === 1 ? "atividade" : "atividades";
    } else if (type === "hours") {
      current = monthActs.reduce((s, a) => s + a.durationSec, 0) / 3600;
      unit = "h";
    } else {
      current = monthActs.reduce((s, a) => s + a.distanceKm, 0);
      unit = "km";
    }

    return { type, goal, current, unit };
  }

  function renderGoalWidget(el, data) {
    if (!el) return;
    const { type, goal, current, unit } = computeGoalProgress(data);
    const now = new Date();
    const ratio = goal > 0 ? Math.min(1, current / goal) : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();

    const fmt = (v) => (type === "hours" ? v.toFixed(1).replace(".", ",") : String(Math.round(v)));
    const unitShort = type === "activities" ? (goal === 1 ? "atividade" : "atividades") : unit;
    const left = Math.max(0, goal - current);

    const titleEl = document.getElementById("goalTitle");
    if (titleEl) titleEl.textContent = "Meta de " + now.toLocaleDateString("pt-BR", { month: "long" });

    // 10 parciais, como na meta do mês do app
    let segs = "";
    for (let i = 0; i < 10; i++) {
      const fill = Math.max(0, Math.min(1, ratio * 10 - i));
      segs += '<i><b style="width:' + Math.round(fill * 100) + '%"></b></i>';
    }

    el.innerHTML =
      '<div class="goal-hero"><strong>' + fmt(current) + "</strong><span>/ " + fmt(goal) + " " + unitShort + "</span></div>" +
      '<div class="seg-bar goal-widget-bar" role="progressbar" aria-label="Progresso da meta do mês" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(ratio * 100) + '">' + segs + "</div>" +
      (ratio >= 1
        ? '<div class="goal-note done"><b>Meta batida!</b> Faltam ' + daysLeft + (daysLeft === 1 ? " dia" : " dias") + " pro fim do mês.</div>"
        : '<div class="goal-note">Faltam <b>' + fmt(left) + " " + unitShort + "</b> · " + daysLeft + (daysLeft === 1 ? " dia restante" : " dias restantes") + "</div>");
  }

  async function updateMonthlyGoal(goalType, goalValue) {
    const { data } = await apiRequest("/profile/goal", {
      method: "PUT",
      body: JSON.stringify({ goalType, goalValue })
    });
    return data;
  }

  function initGoalEditModal(data) {
    const overlay = document.getElementById("editGoalOverlay");
    if (!overlay) return;
    if (overlay.dataset.wired === "1") return;
    overlay.dataset.wired = "1";

    const openBtn = document.getElementById("editGoalBtn");
    const cancelBtn = document.getElementById("cancelGoalBtn");
    const saveBtn = document.getElementById("saveGoalBtn");
    const typeSelect = document.getElementById("goalType");
    const valueInput = document.getElementById("goalValue");

    function open() {
      const { type, goal } = computeGoalProgress(data);
      typeSelect.value = type;
      valueInput.value = goal;
      overlay.classList.add("open");
    }
    function close() {
      overlay.classList.remove("open");
    }

    if (openBtn) openBtn.addEventListener("click", open);
    if (cancelBtn) cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const goalType = typeSelect.value;
        const goalValue = parseFloat(valueInput.value);

        if (!goalValue || goalValue <= 0) {
          showToast("Informe um valor de meta maior que zero.");
          return;
        }

        saveBtn.disabled = true;
        try {
          const fresh = await updateMonthlyGoal(goalType, goalValue);
          data.monthlyGoalType = fresh.monthlyGoalType;
          data.monthlyGoalValue = fresh.monthlyGoalValue;
          renderGoalWidget(document.getElementById("goalWidget"), data);
          showToast("Meta do mês atualizada!");
          close();
        } catch (e) {
          showToast(e.message || "Não foi possível salvar a meta.");
        } finally {
          saveBtn.disabled = false;
        }
      });
    }
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

  // NOVO: gera o HTML de um avatar — foto real se existir, senão iniciais coloridas
  function avatarHtml(className, id, name, photoUrl) {
    if (photoUrl) {
      return '<div class="' + className + '" style="background-image:url(\'' + photoUrl + '\');background-size:cover;background-position:center;"></div>';
    }
    return '<div class="' + className + '" style="background:' + avatarColor(id) + '">' + initials(name) + "</div>";
  }

  /* ---------------------------------------------------------
     GAMIFICAÇÃO COMPARTILHADA (Atividades, Explorar, Amigos, Clubes)
     Ícone e cor de cada esporte, avatar com anel da patente e nível,
     chip de XP, pódio dos rankings e "quanto falta pra passar alguém".
     O visual fica no global.css, seção 14.
     --------------------------------------------------------- */
  const SPORTS = {
    Corrida: {
      color: "#3b82f6",
      icon: '<svg viewBox="0 0 24 24"><circle cx="14.5" cy="4.5" r="2"/><path d="M8 21l2.5-5.5 3 2.5V22"/><path d="M6.5 11l3.5-3 4 .5 2.5 3.5H20"/><path d="M10.5 15.5 9.5 12l3.5-3.5"/></svg>'
    },
    Ciclismo: {
      color: "#10b981",
      icon: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>'
    },
    "Natação": {
      color: "#06b6d4",
      icon: '<svg viewBox="0 0 24 24"><path d="M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6s2.4 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1"/><path d="M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1"/></svg>'
    },
    Caminhada: {
      color: "#f59e0b",
      icon: '<svg viewBox="0 0 24 24"><path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4M4 13h4"/></svg>'
    }
  };
  function sportOf(type) { return SPORTS[type] || SPORTS.Corrida; }

  // Quadradinho colorido com o ícone do esporte
  function sportIconHtml(type, extraClass) {
    const sp = sportOf(type);
    return '<span class="sport-ic' + (extraClass ? " " + extraClass : "") + '" style="--sport:' + sp.color + '" aria-hidden="true">' + sp.icon + "</span>";
  }

  // "+80 XP" dourado
  function xpChipHtml(xp, extraClass) {
    return '<span class="xp-chip' + (extraClass ? " " + extraClass : "") + '">+' + Math.round(xp || 0).toLocaleString("pt-BR") + " XP</span>";
  }

  // Avatar com anel na cor da patente e o nível num selinho
  function rankAvatarHtml(u, size) {
    const info = levelInfo(u.xp || 0);
    return '<span class="rank-av rank-av-' + (size || "md") + '" style="--rank-color:' + info.rank.color + '"' +
      ' title="Nível ' + info.level + " · " + info.rank.name + '">' +
      avatarHtml("rank-av-img", u.id, u.name || "?", u.avatarPhotoUrl) +
      '<b class="rank-av-lvl" aria-hidden="true">' + info.level + "</b>" +
    "</span>";
  }
  function rankLabel(xp) {
    const info = levelInfo(xp || 0);
    return '<span class="rank-label" style="--rank-color:' + info.rank.color + '"><i aria-hidden="true"></i>Nível ' + info.level + " · " + info.rank.name + "</span>";
  }

  // Pódio dos 3 primeiros (2º, 1º, 3º). fmtValue(m) devolve o texto do valor.
  function podiumHtml(list, fmtValue) {
    const top = list.slice(0, 3);
    if (!top.length) return "";
    const order = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];
    return '<ol class="g-podium" aria-label="Pódio">' +
      order.map((i) => {
        const m = top[i];
        const href = m.isMe ? "perfil.php" : "perfil.php?user=" + encodeURIComponent(m.id);
        return '<li class="g-podium-col place-' + (i + 1) + (m.isMe ? " is-me" : "") + '">' +
          '<a href="' + href + '" class="g-podium-person">' +
            '<span class="g-podium-crown" aria-hidden="true">' + (i === 0
              ? '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/></svg>' : "") + "</span>" +
            rankAvatarHtml(m, i === 0 ? "lg" : "md") +
            '<span class="g-podium-name">' + (m.isMe ? "Você" : gEsc(m.name)) + "</span>" +
            '<span class="g-podium-value">' + fmtValue(m) + "</span>" +
          "</a>" +
          '<span class="g-podium-step"><span class="sr-only">Posição </span>' + (i + 1) + "º</span>" +
        "</li>";
      }).join("") +
    "</ol>";
  }

  // Frase de incentivo: quanto falta pra passar quem está na frente
  // (ou quanta vantagem você tem). list já vem ordenada, do maior pro menor.
  function rivalLineHtml(list, key, unit, decimals) {
    const idx = list.findIndex((m) => m.isMe);
    if (idx < 0 || list.length < 2) return "";
    const me = list[idx];
    // unit pode ser texto ("km") ou função (v) => "dia"/"dias"
    const fmt = (v) => v.toFixed(decimals).replace(".", ",") + " " + (typeof unit === "function" ? unit(v) : unit);
    let text;
    if (idx === 0) {
      const gap = me[key] - list[1][key];
      if (me[key] <= 0) return "";
      text = gap > 0
        ? "Você está na liderança, <b>" + fmt(gap) + "</b> à frente de " + gEsc(list[1].name.split(" ")[0]) + "."
        : "Você está empatado na liderança. Um treino desempata!";
    } else {
      const ahead = list[idx - 1];
      const gap = Math.max(ahead[key] - me[key], Math.pow(10, -decimals));
      text = "Faltam <b>" + fmt(gap) + "</b> para você passar " + gEsc(ahead.name.split(" ")[0]) +
        " e ficar em <b>" + idx + "º</b>.";
    }
    return '<p class="rival-line"><span class="rival-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg></span><span>' + text + "</span></p>";
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
      const icon = TYPE_ICONS[type] || "";
      const title = p.title || (type + " registrada");
      const photoHtml = p.photoUrl
        ? '<img class="feed-photo" src="' + p.photoUrl + '" alt="Foto da atividade">'
        : "";

      return (
        '<div class="feed-post">' +
          '<div class="feed-post-top">' +
            '<div class="feed-post-author">' +
              avatarHtml("feed-avatar", p.authorId, p.authorName, p.authorAvatarUrl) +
              "<div>" +
                '<div class="feed-author-name">' + p.authorName + "</div>" +
                '<div class="feed-post-meta">' + timeAgo(p.date) + " · " + type + "</div>" +
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
            '<button class="kudos-btn' + (p.likedByMe ? " liked" : "") + '" data-action="like"><span>' + (p.likeCount || 0) + "</span></button>" +
            '<span class="comment-icon">0 comentários</span>' +
            '<button class="share-btn" type="button">Compartilhar</button>' +
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
      btn.addEventListener("click", () => showToast("Compartilhamento externo ainda em desenvolvimento."));
    });
  }

  function renderActiveToday(el, active) {
    if (!el) return;
    if (!active.length) {
      el.innerHTML = emptyBlock("activity", "Ninguém treinou hoje", "Quando quem você segue registrar uma atividade, ela aparece aqui.", true);
      return;
    }
    el.innerHTML = active.map((a) => {
      const icon = TYPE_ICONS[a.type] || "";
      return (
        '<div class="active-friend-row">' +
          avatarHtml("feed-avatar small", a.id, a.name, a.avatarPhotoUrl) +
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

  // ---- NOVO: editar / excluir atividade própria ----
  async function updateActivity(activityId, fields) {
    return apiRequest("/activities/" + activityId, {
      method: "PUT",
      body: JSON.stringify(fields)
    });
  }

  async function deleteActivity(activityId) {
    return apiRequest("/activities/" + activityId, { method: "DELETE" });
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
     NOVO: Estados vazios com ícone (Clubes, Amigos, Explorar...)
     emptyBlock(icone, título, texto, compacto)
     --------------------------------------------------------- */
  const EMPTY_ICONS = {
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
  };

  function emptyBlock(icon, title, text, compact) {
    return (
      '<div class="empty-block' + (compact ? " compact" : "") + '">' +
        '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          (EMPTY_ICONS[icon] || EMPTY_ICONS.activity) + "</svg></div>" +
        '<div class="empty-title">' + title + "</div>" +
        (text ? '<p class="empty-text">' + text + "</p>" : "") +
      "</div>"
    );
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
      panel.innerHTML = '<div class="notif-panel-header">Notificações</div><div class="notif-empty">Carregando...</div>';
      bellBtn.parentElement.style.position = "relative";
      bellBtn.parentElement.appendChild(panel);

      const badge = document.createElement("span");
      badge.className = "notif-badge";
      badge.style.display = "none";
      bellBtn.style.position = "relative";
      bellBtn.appendChild(badge);

      function timeAgoShort(dateStr) {
        const diffMs = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "agora";
        if (mins < 60) return mins + "min";
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + "h";
        return Math.floor(hours / 24) + "d";
      }

      function renderNotifications(notifications, unreadCount) {
        badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
        badge.style.display = unreadCount > 0 ? "flex" : "none";

        if (!notifications.length) {
          panel.innerHTML =
            '<div class="notif-panel-header">Notificações</div>' +
            '<div class="notif-empty">Nenhuma notificação por aqui ainda.<br>Complete uma atividade para começar a receber novidades.</div>';
          return;
        }

        const items = notifications.map((n) => {
          let msg;
          let href = "";
          if (n.type === "like") {
            msg = "<b>" + n.actorName + "</b> curtiu sua atividade" + (n.activityTitle ? ' "' + n.activityTitle + '"' : "");
          } else if (n.type === "comment") {
            // Comentários em atividade são feitos pelo app
            msg = "<b>" + n.actorName + "</b> comentou na sua atividade" + (n.activityTitle ? ' "' + n.activityTitle + '"' : "");
          } else if (n.type === "post_like") {
            msg = "<b>" + n.actorName + "</b> curtiu sua publicação";
          } else if (n.type === "post_comment") {
            msg = "<b>" + n.actorName + "</b> comentou na sua publicação";
          } else if (n.type === "new_post") {
            msg = "<b>" + n.actorName + "</b> " + (n.count > 1 ? "fez " + n.count + " novas publicações" : "fez uma nova publicação");
            href = "dashboard.php";
          } else if (n.type === "club_join") {
            msg = "<b>" + n.actorName + "</b> entrou no seu clube" + (n.clubName ? " <b>" + n.clubName + "</b>" : "");
            href = "clubes.php";
          } else if (n.type === "new_challenge") {
            msg = "<b>" + n.actorName + "</b> criou o desafio \"" + (n.challengeTitle || "") + "\"" +
              (n.clubName ? " no clube <b>" + n.clubName + "</b>" : "");
            href = "clubes.php";
          } else {
            msg = "<b>" + n.actorName + "</b> começou a seguir você";
          }
          return (
            '<div class="notif-item' + (n.read ? "" : " unread") + '"' +
              (href ? ' data-href="' + href + '" style="cursor:pointer;"' : "") + ">" +
              "<div>" +
                '<div class="notif-msg">' + msg + "</div>" +
                '<div class="notif-time">' + timeAgoShort(n.date) + " atrás</div>" +
              "</div>" +
            "</div>"
          );
        }).join("");

        panel.innerHTML =
          '<div class="notif-panel-header">Notificações' +
            (unreadCount > 0 ? '<button class="notif-mark-read" type="button">Marcar como lidas</button>' : "") +
          "</div>" +
          '<div class="notif-list">' + items + "</div>";

        // Notificações de publicação/desafio levam até a página correspondente
        panel.querySelectorAll(".notif-item[data-href]").forEach((el) => {
          el.addEventListener("click", () => { location.href = el.dataset.href; });
        });

        const markBtn = panel.querySelector(".notif-mark-read");
        if (markBtn) {
          markBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
              await markNotificationsRead();
              badge.style.display = "none";
              panel.querySelectorAll(".notif-item.unread").forEach((el) => el.classList.remove("unread"));
              markBtn.remove();
            } catch (err) { /* ignora */ }
          });
        }
      }

      async function loadNotifications() {
        try {
          const { notifications, unreadCount } = await getNotifications();
          renderNotifications(notifications, unreadCount);
        } catch (e) {
          panel.innerHTML = '<div class="notif-panel-header">Notificações</div><div class="notif-empty">Não foi possível carregar.</div>';
        }
      }

      loadNotifications();

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
      const setOpen = (open) => {
        profileMenu.classList.toggle("open", open);
        profileToggle.setAttribute("aria-expanded", open ? "true" : "false");
      };
      profileToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        setOpen(!profileMenu.classList.contains("open"));
      });
      document.addEventListener("click", (e) => {
        if (!profileMenu.contains(e.target) && !profileToggle.contains(e.target)) setOpen(false);
      });
      // Esc fecha o menu e devolve o foco pro botão (teclado)
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && profileMenu.classList.contains("open")) {
          setOpen(false);
          profileToggle.focus();
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

      // Cartão do usuário na barra lateral: nome + nível/patente + anel na cor da patente
      const info = levelInfo(data.xp || 0);
      document.querySelectorAll("[data-user-name]").forEach((el) => { el.textContent = data.name || "Atleta"; });
      document.querySelectorAll("[data-user-level]").forEach((el) => { el.textContent = "Nível " + info.level + " · " + info.rank.name; });
      document.querySelectorAll(".nav-user").forEach((el) => el.style.setProperty("--rank-color", info.rank.color));

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
     NOVO: GAMIFICAÇÃO NO PAINEL (nível/XP, sequência e desafios)
     Mesmo visual do app: barra de XP "nesta volta", chama de sequência
     semanal e desafios Hoje / Esta semana com barras segmentadas.
     --------------------------------------------------------- */
  const GAMIF_ICONS = {
    flame: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    distance_km: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/></svg>',
    activity_count: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    duration_min: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
    snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>'
  };

  function gEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function gFmt(n, max) {
    return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: max == null ? 1 : max });
  }
  function gPlural(n, one, many) {
    return n === 1 ? one : many;
  }

  async function getStreak() {
    try {
      const r = await apiRequest("/streak");
      return r && r.streak ? r.streak : null;
    } catch (e) {
      return null;
    }
  }
  async function getQuests() {
    try {
      const r = await apiRequest("/quests");
      return r && Array.isArray(r.quests) ? r.quests : null;
    } catch (e) {
      return null;
    }
  }

  // O banco só mexe na sequência quando entra uma atividade nova. Aqui estimamos
  // o estado "de hoje" com a mesma regra do gatilho evaluate_weekly_streak:
  //  - treinou nesta semana              -> ativa
  //  - treinou só na semana passada      -> pendente (treine esta semana)
  //  - pulou semanas, congelamentos cobrem -> em risco (usará congelamento)
  //  - pulou semanas, não cobrem          -> quebrada (mostra 0)
  function streakStatus(st) {
    const base = { shown: 0, state: "none", missed: 0 };
    if (!st || !st.current || !st.lastActiveWeek) return base;
    const p = st.lastActiveWeek.split("-").map(Number);
    const last = new Date(p[0], p[1] - 1, p[2]);
    const diffWeeks = Math.round((startOfWeek(new Date()) - last) / (7 * 86400000));
    if (diffWeeks <= 0) return { shown: st.current, state: "active", missed: 0 };
    if (diffWeeks === 1) return { shown: st.current, state: "pending", missed: 0 };
    const missed = diffWeeks - 1;
    if (st.freezes >= missed) return { shown: st.current, state: "frozen", missed };
    return { shown: 0, state: "broken", missed };
  }

  // Ponto na pista: a volta é um "estádio" (duas retas + duas curvas) com
  // largada no meio da reta de baixo, correndo no sentido anti-horário.
  // Mesma geometria do <path> desenhado em renderLevelCard.
  function lapPoint(ratio) {
    const r = 65, half = 235, straight = 470, arc = Math.PI * r;
    const total = 2 * straight + 2 * arc;
    let d = Math.max(0, Math.min(1, ratio)) * total;
    if (d <= half) return { x: 320 + d, y: 150 };
    d -= half;
    if (d <= arc) { const a = Math.PI / 2 - d / r; return { x: 555 + r * Math.cos(a), y: 85 + r * Math.sin(a) }; }
    d -= arc;
    if (d <= straight) return { x: 555 - d, y: 20 };
    d -= straight;
    if (d <= arc) { const a = -Math.PI / 2 - d / r; return { x: 85 + r * Math.cos(a), y: 85 + r * Math.sin(a) }; }
    d -= arc;
    return { x: 85 + d, y: 150 };
  }

  // Número que "corre" até o valor final (respeita "Reduzir animações")
  function prefersLessMotion() {
    return document.documentElement.getAttribute("data-motion") === "reduce" ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function countUp(el, to, decimals, from) {
    if (!el) return;
    const fmt = (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 });
    const start = typeof from === "number" ? from : 0;
    if (prefersLessMotion() || start === to) { el.textContent = fmt(to); return; }
    const dur = 900;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(start + (to - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function nextRankFor(level) {
    return RANKS.find((r) => r.min > level) || null;
  }

  // Card principal do Início: o XP do nível desenhado como uma volta numa
  // pista de atletismo (igual ao app), com o brasão da patente.
  function renderLevelCard(el, data) {
    if (!el) return;
    const info = levelInfo(data.xp || 0);
    const ratio = info.xpToNext > 0 ? info.xpIntoLevel / info.xpToNext : 0;
    const pct = Math.round(ratio * 1000) / 10;
    const dot = lapPoint(ratio);
    const remaining = info.xpToNext - info.xpIntoLevel;
    const next = nextRankFor(info.level);
    el.style.setProperty("--rank-color", info.rank.color);
    el.innerHTML =
      '<div class="lap-top">' +
        '<div class="lap-id">' +
          '<svg class="lap-hex" viewBox="0 0 52 58" role="img" aria-label="Brasão ' + gEsc(info.rank.name) + ", nível " + info.level + '">' +
            '<polygon points="26,2 49,15 49,43 26,56 3,43 3,15"></polygon>' +
            '<text x="26" y="38" text-anchor="middle">' + info.level + "</text>" +
          "</svg>" +
          "<div>" +
            '<div class="lap-rank">' + gEsc(info.rank.name) + "</div>" +
            '<div class="lap-level">Nível ' + info.level + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="lap-total"><b>' + gFmt(data.xp || 0, 0) + " XP</b><span>total acumulado</span></div>" +
      "</div>" +
      '<div class="lap-track">' +
        '<svg viewBox="0 0 640 170" role="img" aria-label="' + gFmt(info.xpIntoLevel, 0) + " de " + gFmt(info.xpToNext, 0) + ' XP nesta volta">' +
          '<rect class="t-outer" x="4" y="4" width="632" height="162" rx="81"></rect>' +
          '<rect class="t-inner" x="36" y="36" width="568" height="98" rx="49"></rect>' +
          '<rect class="t-lane" x="20" y="20" width="600" height="130" rx="65"></rect>' +
          (pct > 0
            ? '<path class="t-progress" d="M320 150 H555 A65 65 0 0 0 555 20 H85 A65 65 0 0 0 85 150 Z" pathLength="100" stroke-dasharray="' + pct + ' 100"></path>'
            : "") +
          '<line class="t-start" x1="320" y1="136" x2="320" y2="164"></line>' +
          '<circle class="t-halo" cx="' + dot.x.toFixed(1) + '" cy="' + dot.y.toFixed(1) + '" r="11"></circle>' +
          '<circle class="t-dot" cx="' + dot.x.toFixed(1) + '" cy="' + dot.y.toFixed(1) + '" r="6.5"></circle>' +
        "</svg>" +
        '<div class="lap-center">' +
          '<div class="lap-xp"><span class="lap-xp-num">' + gFmt(info.xpIntoLevel, 0) + "</span><small> / " + gFmt(info.xpToNext, 0) + " XP</small></div>" +
          '<div class="lap-caption">nesta volta</div>' +
        "</div>" +
      "</div>" +
      '<div class="lap-foot">' +
        "<span>Faltam <b>" + gFmt(remaining, 0) + " XP</b> pro nível " + (info.level + 1) + "</span>" +
        (next
          ? '<span>Próxima patente: <b class="gold">' + gEsc(next.name) + "</b> no nível " + next.min + "</span>"
          : '<span>Você chegou na patente máxima: <b class="gold">' + gEsc(info.rank.name) + "</b></span>") +
      "</div>";
    countUp(el.querySelector(".lap-xp-num"), info.xpIntoLevel, 0);
  }

  // Chama da sequência semanal (cabeçalho do Início)
  function renderStreakChip(slot, streak, data, opts) {
    if (!slot) return;
    if (!streak) { slot.innerHTML = ""; return; }
    const stt = streakStatus(streak);
    const cls = "streak-chip" + (stt.shown > 0 ? " on" : "") + (stt.state === "pending" || stt.state === "frozen" ? " warn" : "");
    slot.innerHTML =
      '<button type="button" class="' + cls + '" aria-label="Sequência de ' + stt.shown + " " + gPlural(stt.shown, "semana", "semanas") + ', ver detalhes">' +
        GAMIF_ICONS.flame + "<b>" + stt.shown + "</b><span>" + gPlural(stt.shown, "semana", "semanas") + "</span>" +
      "</button>";
    slot.querySelector(".streak-chip").addEventListener("click", () => openStreakModal(streak, data, opts || { self: true }));
  }

  // Versão minimalista (aba Estatísticas do perfil): mesma tipografia do "Resumo".
  function renderProfileProgress(el, data, streak, opts) {
    if (!el) return;
    opts = opts || {};
    const self = opts.self !== false;
    const info = levelInfo(data.xp || 0);
    const color = info.rank.color;
    const remaining = info.xpToNext - info.xpIntoLevel;
    const stt = streakStatus(streak);
    const notes = self ? {
      none: "Treine esta semana para começar.",
      active: "Você já treinou nesta semana.",
      pending: "Treine até domingo para manter.",
      frozen: "Um congelamento cobre o intervalo.",
      broken: "Sequência interrompida."
    } : {
      none: "Ainda sem sequência.",
      active: "Treinou nesta semana.",
      pending: "Ainda não treinou nesta semana.",
      frozen: "Congelamento cobrindo o intervalo.",
      broken: "Sequência interrompida."
    };
    const flameOn = stt.shown > 0;
    el.innerHTML =
      '<div class="resumo-item">' +
      '<span class="resumo-label">Nível</span>' +
      '<span class="resumo-value">' + info.level + '<span class="pl-rank" style="color:' + color + '">' + gEsc(info.rank.name) + "</span></span>" +
      '<div class="pl-bar"><i style="width:' + info.progressPct + "%;background:" + color + '"></i></div>' +
      '<span class="pl-note">' + gFmt(info.xpIntoLevel, 0) + " / " + gFmt(info.xpToNext, 0) + " XP · faltam " + gFmt(remaining, 0) + " pro nível " + (info.level + 1) + "</span>" +
      "</div>" +
      '<div class="resumo-item">' +
      '<span class="resumo-label">Sequência</span>' +
      (streak
        ? '<button type="button" class="pl-streak' + (flameOn ? " on" : "") + '" aria-label="Ver detalhes da sequência">' +
          GAMIF_ICONS.flame + '<span class="resumo-value">' + stt.shown + " " + gPlural(stt.shown, "semana", "semanas") + "</span></button>" +
          '<span class="pl-note">' + notes[stt.state] + " Toque para ver detalhes.</span>"
        : '<span class="resumo-value">—</span>') +
      "</div>";
    const btn = el.querySelector(".pl-streak");
    if (btn) btn.addEventListener("click", () => openStreakModal(streak, data, opts));
  }

  function openStreakModal(streak, data, opts) {
    const self = !opts || opts.self !== false;
    const stt = streakStatus(streak);
    const messages = self ? {
      none: "Treine pelo menos uma vez nesta semana para começar sua sequência.",
      active: "Você já treinou nesta semana. Sua sequência está garantida!",
      pending: "Você treinou na semana passada. Registre uma atividade até domingo para a sequência continuar.",
      frozen: "Você ficou " + stt.missed + " " + gPlural(stt.missed, "semana", "semanas") + " sem treinar. Ao registrar uma atividade, " + stt.missed + " " + gPlural(stt.missed, "congelamento cobre", "congelamentos cobrem") + " o intervalo e a sequência continua.",
      broken: "Sua sequência foi interrompida. Registre uma atividade para recomeçar do zero."
    } : {
      none: "Esse atleta ainda não começou uma sequência.",
      active: "Treinou nesta semana. A sequência está garantida.",
      pending: "Treinou na semana passada e ainda não treinou nesta.",
      frozen: "Está " + stt.missed + " " + gPlural(stt.missed, "semana", "semanas") + " sem treinar, mas os congelamentos cobrem o intervalo.",
      broken: "A sequência foi interrompida."
    };

    // Barras de segunda a domingo da semana atual (verde = dia com atividade)
    const monday = startOfWeek(new Date());
    const names = ["S", "T", "Q", "Q", "S", "S", "D"];
    const acts = (data && data.activities) || [];
    const todayStr = new Date().toDateString();
    let days = "";
    for (let i = 0; self && i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = d.toDateString();
      const has = acts.some((a) => new Date(a.date).toDateString() === ds);
      days +=
        '<div class="sm-day' + (has ? " done" : "") + (ds === todayStr ? " today" : "") + '">' +
        "<i></i><span>" + names[i] + "</span></div>";
    }

    const freezes = streak ? streak.freezes : 2;
    const overlay = document.createElement("div");
    overlay.className = "overlay open";
    overlay.innerHTML =
      '<div class="modal streak-modal" role="dialog" aria-modal="true" aria-label="Sua sequência">' +
      '<div class="sm-hero' + (stt.shown > 0 ? " on" : "") + '">' + GAMIF_ICONS.flame + "<b>" + stt.shown + "</b></div>" +
      '<h3>' + gPlural(stt.shown, "semana seguida", "semanas seguidas") + "</h3>" +
      '<p class="sm-msg">' + messages[stt.state] + "</p>" +
      (self ? '<div class="sm-days">' + days + "</div>" : "") +
      '<div class="sm-stats">' +
      '<div><span>Recorde</span><b>' + (streak ? streak.longest : 0) + " " + gPlural(streak ? streak.longest : 0, "semana", "semanas") + "</b></div>" +
      '<div><span>Congelamentos</span><b class="sm-freeze">' + GAMIF_ICONS.snow + freezes + " / 2</b></div>" +
      "</div>" +
      '<p class="sm-help">A semana vai de segunda a domingo e uma atividade já conta. A cada 4 semanas seguidas você ganha 1 congelamento (máximo de 2), que cobre uma semana sem treino.</p>' +
      '<div class="modal-actions"><button type="button" class="btn-primary" id="streakCloseBtn">Entendi</button></div>' +
      "</div>";
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector("#streakCloseBtn").addEventListener("click", close);
    overlay.querySelector("#streakCloseBtn").focus();
  }

  function questProgressText(q) {
    const p = Math.min(q.progress, q.goal);
    if (q.goalType === "distance_km") return gFmt(p, 1) + " de " + gFmt(q.goal, 1) + " km";
    if (q.goalType === "duration_min") return gFmt(p, 0) + " de " + gFmt(q.goal, 0) + " min";
    return gFmt(p, 0) + " de " + gFmt(q.goal, 0) + " " + gPlural(q.goal, "atividade", "atividades");
  }

  function questSegments(q) {
    const n = q.goalType === "activity_count" && q.goal >= 2 && q.goal <= 6 ? Math.round(q.goal) : 8;
    const ratio = q.goal > 0 ? Math.min(1, q.progress / q.goal) : 0;
    let html = "";
    for (let i = 0; i < n; i++) {
      const fill = Math.max(0, Math.min(1, ratio * n - i));
      html += '<i><b style="width:' + Math.round(fill * 100) + '%"></b></i>';
    }
    return html;
  }

  function renderQuests(listEl, countEl, cardEl, quests) {
    if (!listEl) return;
    if (!quests || !quests.length) {
      // Sem desafios (ou rota indisponível): esconde o card em vez de mostrar erro.
      if (cardEl) cardEl.style.display = "none";
      return;
    }
    if (cardEl) cardEl.style.display = "";
    const done = quests.filter((q) => q.completed).length;
    if (countEl) countEl.textContent = done + " de " + quests.length + " concluídos";

    const group = (title, cls, items) => {
      if (!items.length) return "";
      return (
        '<div class="quest-group ' + cls + '"><div class="quest-group-title">' + title + "</div>" +
        items.map((q) =>
          '<div class="quest-row' + (q.completed ? " done" : "") + '"' + (q.description ? ' title="' + gEsc(q.description) + '"' : "") + ">" +
          '<div class="quest-icon">' + (q.completed ? GAMIF_ICONS.check : (GAMIF_ICONS[q.goalType] || GAMIF_ICONS.activity_count)) + "</div>" +
          '<div class="quest-body">' +
          '<div class="quest-top"><span class="quest-title">' + gEsc(q.title) + '</span><span class="quest-xp">+' + q.xp + " XP</span></div>" +
          '<div class="quest-segs seg-bar" aria-hidden="true">' + questSegments(q) + "</div>" +
          '<div class="quest-meta">' +
          (q.completed ? '<span class="quest-done">Concluída</span>' : "<span>" + questProgressText(q) + "</span>") +
          "</div></div></div>"
        ).join("") +
        "</div>"
      );
    };
    listEl.innerHTML =
      group("Hoje", "daily", quests.filter((q) => q.period === "daily")) +
      group("Esta semana", "weekly", quests.filter((q) => q.period === "weekly"));
  }

  // Chamada pelo initDashboard. Não bloqueia o resto da página: o card de nível
  // aparece na hora e sequência/desafios chegam quando a rede responder.
  async function initGamification(data) {
    const levelEl = document.getElementById("levelCard");
    const questsCard = document.getElementById("questsCard");
    renderLevelCard(levelEl, data);
    const [streak, quests] = await Promise.all([getStreak(), getQuests()]);
    renderStreakChip(document.getElementById("streakSlot"), streak, data);
    renderQuests(document.getElementById("questsList"), document.getElementById("questsCount"), questsCard, quests);
  }

  /* ---------------------------------------------------------
     NOVO: Diálogo de confirmação (usado ao excluir atividade)
     Devolve uma Promise<boolean>.
     --------------------------------------------------------- */
  function confirmDialog({ title, message, confirmLabel }) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "overlay open";
      overlay.innerHTML =
        '<div class="modal confirm-modal">' +
          "<h3></h3>" +
          '<p class="confirm-message"></p>' +
          '<div class="modal-actions">' +
            '<button class="btn-secondary" type="button" data-confirm="no">Cancelar</button>' +
            '<button class="btn-danger" type="button" data-confirm="yes"></button>' +
          "</div>" +
        "</div>";
      overlay.querySelector("h3").textContent = title;
      overlay.querySelector(".confirm-message").textContent = message;
      overlay.querySelector('[data-confirm="yes"]').textContent = confirmLabel || "Confirmar";
      document.body.appendChild(overlay);

      function finish(result) {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onKey(e) { if (e.key === "Escape") finish(false); }
      document.addEventListener("keydown", onKey);

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) return finish(false);
        const btn = e.target.closest("[data-confirm]");
        if (btn) finish(btn.dataset.confirm === "yes");
      });
    });
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
      setEditMode(null);
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
      setEditMode(null);
    }

    // Mesmo modal serve para registrar e para editar: com editId ele atualiza
    // a atividade existente em vez de criar uma nova.
    function setEditMode(editId) {
      if (editId) overlay.dataset.editId = String(editId);
      else delete overlay.dataset.editId;
      const h = overlay.querySelector("h3");
      if (h) h.textContent = editId ? "Editar Atividade" : "Registrar Atividade";
      if (saveBtn) saveBtn.textContent = editId ? "Salvar alterações" : "Salvar atividade";
    }

    // Chamado pela lista de atividades (botão Editar)
    overlay._openEdit = (a) => {
      setEditMode(a.id);
      document.getElementById("fType").value = a.type || "Corrida";
      document.getElementById("fTitle").value = a.title || "";
      document.getElementById("fDist").value = a.distanceKm;
      document.getElementById("fDur").value = Math.round((a.durationSec / 60) * 100) / 100;
      document.getElementById("fHr").value = a.heartRate || "";
      document.getElementById("fElev").value = a.elevationM || "";
      const photoInput = document.getElementById("fPhoto");
      if (photoInput) photoInput.value = "";
      overlay.classList.add("open");
    };

    if (openBtn) openBtn.addEventListener("click", open);
    if (cancelBtn) cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    // Vindo do botão "Registrar atividade" do Início (atividades.php?nova=1)
    // ...ou do botão "Fiz essa rota" do Explorar (tipo, km, título e elevação)
    const qs = new URLSearchParams(location.search);
    if (qs.get("nova") === "1") {
      open();
      const tipo = qs.get("tipo");
      if (tipo && ["Corrida", "Ciclismo", "Natação", "Caminhada"].includes(tipo)) document.getElementById("fType").value = tipo;
      if (qs.get("km")) document.getElementById("fDist").value = qs.get("km");
      if (qs.get("titulo")) document.getElementById("fTitle").value = qs.get("titulo");
      if (qs.get("elev")) document.getElementById("fElev").value = qs.get("elev");
      if (qs.get("km")) setTimeout(() => document.getElementById("fDur").focus(), 60);
    }

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

        const editId = overlay.dataset.editId;
        saveBtn.disabled = true;
        saveBtn.textContent = "Salvando...";
        try {
          if (editId) {
            const { xpDelta } = await updateActivity(editId, {
              type, title, heartRate, elevationM,
              distanceKm, durationSec: Math.round(durationMin * 60)
            });
            const xpNote = xpDelta ? " (" + (xpDelta > 0 ? "+" : "") + xpDelta + " XP)" : "";
            showToast("Atividade atualizada!" + xpNote);
          } else {
            const { xpEarned } = await recordActivity(distanceKm, Math.round(durationMin * 60), {
              type, title, heartRate, elevationM, photoFile
            });
            showToast("Atividade registrada! +" + xpEarned + " XP");
          }
          close();
          if (onSaved) onSaved();
        } catch (e) {
          showToast(e.message || "Não foi possível salvar a atividade.");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = overlay.dataset.editId ? "Salvar alterações" : "Salvar atividade";
        }
      });
    }
  }

  /* ---------------------------------------------------------
     7. INICIALIZAÇÃO POR PÁGINA (agora assíncrona)
     --------------------------------------------------------- */
  async function initDashboard() {
    if (!document.getElementById("dashboardPage")) return; // não é a página do painel

    const data = await getData();
    const stats = computeStats(data);
    const following = await getFollowing();

    // Cabeçalho: data + saudação
    const now = new Date();
    const dateEl = document.getElementById("dateStamp");
    if (dateEl) {
      const label = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
      dateEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    }
    const greetingEl = document.getElementById("greetingText");
    if (greetingEl) {
      const hour = now.getHours();
      const saud = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
      const firstName = (data.name || "Atleta").split(" ")[0];
      greetingEl.textContent = saud + ", " + firstName;
    }
    const composerAvatar = document.getElementById("composerAvatar");
    if (composerAvatar) {
      if (data.avatarPhotoUrl) {
        composerAvatar.style.backgroundImage = "url('" + data.avatarPhotoUrl + "')";
        composerAvatar.style.backgroundSize = "cover";
        composerAvatar.style.backgroundPosition = "center";
        composerAvatar.textContent = "";
      } else {
        composerAvatar.textContent = initials(data.name || "?");
      }
    }

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

    // Conta nova (sem atividades): mostra o cartão "Registre sua primeira atividade"
    const walkthrough = document.getElementById("walkthroughCard");
    if (walkthrough) walkthrough.style.display = stats.totalActivities === 0 ? "" : "none";
    const emptyNote = document.getElementById("noActivityNote");
    if (emptyNote && stats.totalActivities === 0) {
      emptyNote.style.display = "block";
    }

    // Métricas da semana, volume semanal e recordes
    // (o feed de amigos agora é carregado por js/posts.js, só com publicações)

    const active = await getActiveToday();
    renderActiveToday(document.getElementById("activeTodayList"), active);

    renderWeeklyChart(document.getElementById("weekChart"), document.getElementById("weekTotal"), data);
    renderPersonalRecords(document.getElementById("prList"), data);
    renderGoalWidget(document.getElementById("goalWidget"), data);
    initGoalEditModal(data);

    // Nível/XP, sequência semanal e desafios (sem await: não trava o painel)
    initGamification(data);

    initRegisterModal(data, rankEl, () => initDashboard());
  }

  // ---------------------------------------------------------
  // Seguidores / Seguindo (perfil.php): janela com a lista de pessoas,
  // busca por nome, link pro perfil e botão de seguir.
  // Funciona no meu perfil e no perfil dos outros.
  // ---------------------------------------------------------
  function initConnections(opts) {
    const overlay = document.getElementById("connOverlay");
    if (!overlay || overlay.dataset.wired === "1") return null;
    overlay.dataset.wired = "1";

    const modal = overlay.querySelector(".conn-modal");
    const titleEl = document.getElementById("connTitle");
    const listEl = document.getElementById("connList");
    const searchEl = document.getElementById("connSearch");
    const statusEl = document.getElementById("connStatus");
    const firstName = String(opts.name || "").trim().split(/\s+/)[0] || "Atleta";
    const cache = {};       // type -> Promise<lista>
    let current = "followers";
    let lastTrigger = null;
    let token = 0;          // ignora respostas antigas se a pessoa trocar de aba rápido

    const TITLES = opts.isSelf
      ? { followers: "Seus seguidores", following: "Quem você segue" }
      : { followers: "Seguidores de " + firstName, following: "Quem " + firstName + " segue" };

    // Busca sem diferenciar maiúscula nem acento ("joao" acha "João")
    const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    function load(type) {
      if (!cache[type]) {
        cache[type] = apiRequest("/users/" + encodeURIComponent(opts.userId) + "/" + type)
          .then((r) => r.users || [])
          .catch((e) => { delete cache[type]; throw e; });
      }
      return cache[type];
    }

    function setCount(type, n) {
      const el = overlay.querySelector('[data-conn-count="' + type + '"]');
      if (el) el.textContent = n;
    }
    function statEl(type) {
      return document.getElementById(type === "followers" ? "statFollowers" : "statFollowing");
    }
    // Contagem inicial nas abas = números dos cartões
    ["followers", "following"].forEach((t) => { const el = statEl(t); if (el) setCount(t, el.textContent); });

    function followLabel(u) {
      if (u.isFollowing) return "Seguindo";
      return u.followsMe ? "Seguir de volta" : "Seguir";
    }

    function avatar(u) {
      if (u.avatarPhotoUrl) {
        return '<span class="conn-av" style="background-image:url(\'' + gEsc(u.avatarPhotoUrl) + '\')" aria-hidden="true"></span>';
      }
      return '<span class="conn-av" style="background:' + avatarColor(u.id) + '" aria-hidden="true">' + gEsc(initials(u.name || "?")) + "</span>";
    }

    function itemHtml(u) {
      const info = levelInfo(u.xp || 0);
      const meta = ["Nível " + info.level + " · " + info.rank.name];
      if (u.location) meta.push(u.location);
      // "segue você" só quando acrescenta algo (na minha lista de seguidores todo mundo me segue)
      const showFollowsMe = u.followsMe && !u.isSelf && !(opts.isSelf && current === "followers");
      const href = u.isSelf ? "perfil.php" : "perfil.php?user=" + encodeURIComponent(u.id);
      return '<li class="conn-item" style="--rank-color:' + info.rank.color + '">' +
        '<a class="conn-link" href="' + href + '">' +
          avatar(u) +
          '<span class="conn-info">' +
            '<span class="conn-name">' + gEsc(u.name) + (u.isSelf ? ' <span class="conn-you">você</span>' : "") + "</span>" +
            '<span class="conn-meta"><i aria-hidden="true"></i>' + gEsc(meta.join(" · ")) + "</span>" +
            (showFollowsMe ? '<span class="conn-tag">Segue você</span>' : "") +
          "</span>" +
        "</a>" +
        (u.isSelf ? "" :
          '<button type="button" class="conn-follow' + (u.isFollowing ? " on" : "") + '" data-follow="' + gEsc(u.id) + '"' +
          ' aria-pressed="' + (u.isFollowing ? "true" : "false") + '" aria-label="' + gEsc(followLabel(u) + ": " + u.name) + '">' +
          followLabel(u) + "</button>") +
        "</li>";
    }

    function emptyHtml(type, searching) {
      if (searching) {
        return '<li class="conn-empty">Ninguém com esse nome nesta lista.</li>';
      }
      if (type === "followers") {
        return '<li class="conn-empty">' + (opts.isSelf
          ? "Ninguém segue você ainda. Compartilhe seu perfil com os amigos!"
          : gEsc(firstName) + " ainda não tem seguidores.") + "</li>";
      }
      return '<li class="conn-empty">' + (opts.isSelf
        ? 'Você ainda não segue ninguém. <a href="amizades.php">Encontrar atletas</a>'
        : gEsc(firstName) + " ainda não segue ninguém.") + "</li>";
    }

    let lastUsers = [];
    function render() {
      const q = norm(searchEl.value.trim());
      const shown = q ? lastUsers.filter((u) => norm(u.name).includes(q)) : lastUsers;
      listEl.innerHTML = shown.length ? shown.map(itemHtml).join("") : emptyHtml(current, !!q);
      statusEl.textContent = q
        ? shown.length + " " + gPlural(shown.length, "pessoa encontrada", "pessoas encontradas")
        : "";
    }

    async function show(type) {
      current = type;
      const my = ++token;
      titleEl.textContent = TITLES[type];
      overlay.querySelectorAll("[data-conn-tab]").forEach((b) => {
        b.setAttribute("aria-pressed", b.dataset.connTab === type ? "true" : "false");
      });
      listEl.setAttribute("aria-busy", "true");
      listEl.innerHTML = '<li class="conn-skel"></li><li class="conn-skel"></li><li class="conn-skel"></li>';
      try {
        const users = await load(type);
        if (my !== token) return;
        lastUsers = users;
        setCount(type, users.length);
        render();
      } catch (e) {
        if (my !== token) return;
        listEl.innerHTML = '<li class="conn-empty">Não foi possível carregar a lista. ' +
          '<button type="button" class="conn-retry">Tentar de novo</button></li>';
      } finally {
        if (my === token) listEl.removeAttribute("aria-busy");
      }
    }

    function open(type, trigger) {
      lastTrigger = trigger || null;
      searchEl.value = "";
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
      show(type);
      setTimeout(() => searchEl.focus(), 30);
    }

    function close() {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (lastTrigger) lastTrigger.focus();
    }

    // Esc fecha; Tab fica preso dentro da janela
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const items = Array.from(modal.querySelectorAll("a[href], button, input")).filter((el) => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    document.querySelectorAll("[data-connections]").forEach((btn) => {
      btn.addEventListener("click", () => open(btn.dataset.connections, btn));
    });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector("[data-conn-close]").addEventListener("click", close);
    overlay.querySelectorAll("[data-conn-tab]").forEach((b) => {
      b.addEventListener("click", () => { if (b.dataset.connTab !== current) { searchEl.value = ""; show(b.dataset.connTab); } });
    });
    searchEl.addEventListener("input", render);

    listEl.addEventListener("click", async (e) => {
      if (e.target.closest(".conn-retry")) { show(current); return; }
      const btn = e.target.closest("[data-follow]");
      if (!btn) return;
      const id = btn.dataset.follow;
      const user = lastUsers.find((u) => String(u.id) === id);
      if (!user) return;
      btn.disabled = true;
      try {
        if (user.isFollowing) await unfollowUser(id); else await followUser(id);
        const nowFollowing = !user.isFollowing;
        // Atualiza a mesma pessoa nas duas listas (se já carregadas)
        for (const t of ["followers", "following"]) {
          if (!cache[t]) continue;
          (await cache[t]).forEach((u) => { if (String(u.id) === id) u.isFollowing = nowFollowing; });
        }
        // No MEU perfil, o número de "Seguindo" muda e a lista precisa recarregar depois
        if (opts.isSelf) {
          const el = statEl("following");
          if (el) el.textContent = Math.max(0, (parseInt(el.textContent, 10) || 0) + (nowFollowing ? 1 : -1));
          if (el) setCount("following", el.textContent);
          if (current !== "following") delete cache.following;
        }
        if (typeof opts.onFollowChange === "function") opts.onFollowChange(id, nowFollowing);
        render();
        const again = listEl.querySelector('[data-follow="' + CSS.escape(id) + '"]');
        if (again) again.focus();
      } catch (err) {
        showToast(err.message || "Não foi possível concluir a ação.");
        btn.disabled = false;
      }
    });

    // Para o resto da página avisar que algo mudou (ex.: botão Seguir do perfil)
    return {
      invalidate(type) { delete cache[type]; },
      setCount
    };
  }

  // ---------------------------------------------------------
  // NOVO: Perfil PÚBLICO de outra pessoa (via perfil.php?user=ID)
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // Perfil: patente no cabeçalho e cartões de atividade
  // (servem pro meu perfil e pro perfil de outra pessoa)
  // ---------------------------------------------------------
  function paintProfileRank(xp) {
    const info = levelInfo(xp || 0);
    document.querySelectorAll(".profile-cover, .profile-container").forEach((el) => el.style.setProperty("--rank-color", info.rank.color));
    const badge = document.getElementById("profileLevelBadge");
    if (badge) {
      badge.textContent = info.level;
      badge.title = "Nível " + info.level + " · " + info.rank.name;
    }
    const rankEl = document.getElementById("profileRank");
    if (rankEl && !rankEl.dataset.painted) {
      rankEl.dataset.painted = "1";
      rankEl.innerHTML = rankLabel(xp) + '<span class="profile-streak-slot" id="profileStreakSlot"></span>';
    }
  }

  function profileActivityCardHtml(a) {
    const d = new Date(a.date);
    const type = a.type || "Corrida";
    const title = a.title || (type + " registrada");
    const stat = (label, value) => "<div><span>" + label + "</span><b>" + value + "</b></div>";
    return (
      '<article class="pa-card activity-item" data-activity-id="' + gEsc(a.id) + '" style="--sport:' + sportOf(type).color + '">' +
        (a.photoUrl ? '<div class="pa-photo" style="background-image:url(\'' + a.photoUrl + '\')"></div>' : "") +
        '<div class="pa-body">' +
          '<div class="pa-head">' +
            sportIconHtml(type) +
            '<div class="pa-head-text">' +
              '<h3 class="pa-title">' + gEsc(title) + "</h3>" +
              '<div class="pa-date">' + type + " · " + d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) + "</div>" +
            "</div>" +
          "</div>" +
          '<div class="pa-stats">' +
            stat("Distância", a.distanceKm.toFixed(1).replace(".", ",") + " km") +
            stat("Tempo", formatClock(a.durationSec)) +
            stat(type === "Ciclismo" ? "Velocidade" : "Ritmo", sportPaceHtml(a)) +
          "</div>" +
          '<div class="pa-foot">' + xpChipHtml(actXp(a)) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  async function renderPublicProfile(targetId) {
    const nameEl = document.getElementById("profileName");
    let profile;
    try {
      profile = await getPublicProfile(targetId);
    } catch (e) {
      nameEl.textContent = "Perfil não encontrado";
      return;
    }

    // Se for o próprio perfil, manda pra versão editável normal
    if (profile.isSelf) {
      window.location.href = "perfil.php";
      return;
    }

    nameEl.textContent = profile.name;
    const handle = "@" + profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    document.getElementById("profileHandle").textContent =
      handle + (profile.location ? " · " + profile.location : "");
    document.getElementById("profileBio").textContent = profile.bio || "Esse atleta ainda não escreveu uma bio.";

    const avatarEl = document.getElementById("profileAvatarBig");
    if (avatarEl) {
      if (profile.avatarPhotoUrl) {
        avatarEl.style.backgroundImage = "url('" + profile.avatarPhotoUrl + "')";
        avatarEl.style.backgroundSize = "cover";
        avatarEl.style.backgroundPosition = "center";
        avatarEl.textContent = "";
      } else {
        avatarEl.textContent = initials(profile.name);
      }
    }
    const coverEl = document.getElementById("profileCover");
    if (coverEl && profile.coverPhotoUrl) {
      coverEl.style.backgroundImage = "url('" + profile.coverPhotoUrl + "')";
      coverEl.classList.add("has-photo");
    }

    document.getElementById("statActivities").textContent = profile.activitiesCount;
    document.getElementById("statFollowers").textContent = profile.followersCount;
    document.getElementById("statFollowing").textContent = profile.followingCount;
    paintProfileRank(profile.xp || 0);
    // No perfil dos outros a chama só aparece se a sequência estiver valendo
    if (profile.streak && streakStatus(profile.streak).shown > 0) {
      renderStreakChip(document.getElementById("profileStreakSlot"), profile.streak, { xp: profile.xp || 0, activities: null }, { self: false });
    }
    const connections = initConnections({ userId: targetId, name: profile.name, isSelf: false });

    // Esconde tudo que só faz sentido no PRÓPRIO perfil
    ["editCoverBtn", "editAvatarBtn", "editProfileBtn", "profileSettingsBtn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    // Mostra e liga o botão de Seguir
    const followBtn = document.getElementById("followProfileBtn");
    if (followBtn) {
      followBtn.style.display = "";
      const paintFollowBtn = (isFollowing) => {
        followBtn.textContent = isFollowing ? "Seguindo" : "+ Seguir";
        followBtn.classList.toggle("btn-secondary", isFollowing);
        followBtn.classList.toggle("btn-primary", !isFollowing);
      };
      paintFollowBtn(profile.isFollowing);
      followBtn.addEventListener("click", async () => {
        followBtn.disabled = true;
        try {
          const wasFollowing = followBtn.textContent.trim() === "Seguindo";
          if (wasFollowing) {
            await unfollowUser(targetId);
            paintFollowBtn(false);
          } else {
            await followUser(targetId);
            paintFollowBtn(true);
          }
          // Número de seguidores da pessoa acompanha o botão
          const fEl = document.getElementById("statFollowers");
          if (fEl) fEl.textContent = Math.max(0, (parseInt(fEl.textContent, 10) || 0) + (wasFollowing ? -1 : 1));
          if (connections) {
            connections.invalidate("followers");
            connections.setCount("followers", fEl ? fEl.textContent : "");
          }
        } catch (e) {
          showToast(e.message || "Não foi possível concluir a ação.");
        } finally {
          followBtn.disabled = false;
        }
      });
    }

    // Publicações, Atividades e Estatísticas do outro usuário — nenhuma aba fica escondida
    const publicActs = [...(profile.activities || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    renderProfileStats(publicActs);
    renderProfileProgress(
      document.getElementById("profileProgress"),
      { xp: profile.xp || 0, activities: null },
      profile.streak || { current: 0, longest: 0, freezes: 2, lastActiveWeek: null },
      { self: false }
    );

    // Grade de atividades públicas (as mais recentes)
    const grid = document.getElementById("profileActivitiesGrid");
    const emptyEl = document.getElementById("profileActivitiesEmpty");
    if (!profile.activities.length) {
      grid.innerHTML = "";
      emptyEl.textContent = "Esse atleta ainda não registrou nenhuma atividade.";
      emptyEl.style.display = "block";
    } else {
      emptyEl.style.display = "none";
      grid.innerHTML = [...profile.activities].sort((a, b) => new Date(b.date) - new Date(a.date)).map(profileActivityCardHtml).join("");
      wireActivitySocial(grid);
    }
  }

  // NOVO: compartilhada entre o próprio perfil e o perfil público de outro usuário,
  // preenche a aba Estatísticas (Resumo do ano, Recordes pessoais, Consistência).
  function renderProfileStats(acts) {
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

    // Recordes pessoais: mesma regra e mesmo visual da página Atividades
    // (o melhor ritmo é só de corrida, sem misturar com ciclismo)
    const recordsEl = document.getElementById("perfilRecordesIcon");
    if (recordsEl) {
      const records = computeRecords(acts);
      recordsEl.innerHTML = records.length
        ? '<ul class="atv-records">' + records.map((r) => {
            const d = new Date(r.act.date);
            return '<li><div class="atv-rec" style="--tone:' + r.tone + '">' +
              '<span class="atv-rec-ic" aria-hidden="true">' + RECORD_ICON + "</span>" +
              '<span class="atv-rec-body"><span class="atv-rec-label">' + r.label + "</span>" +
                '<span class="atv-rec-act">' + gEsc(r.act.title || r.act.type || "Treino") + " · " + d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }) + "</span></span>" +
              '<b class="atv-rec-value">' + r.value(r.act) + "</b>" +
            "</div></li>";
          }).join("") + "</ul>"
        : emptyBlock("trophy", "Sem recordes ainda", "Os recordes aparecem aqui depois dos primeiros treinos.", true);
    }

    // Calendário de consistência, com setas para ver os meses anteriores
    renderConsistency({
      grid: "consistencyGrid", month: "consistencyTitle", nav: "consistencyNav", info: "consistencyInfo",
      active: "csActiveDays", streak: "csStreak", pct: "csPct"
    }, acts);
  }

  // NOVO: liga as abas Publicações/Atividades/Estatísticas — roda tanto no
  // próprio perfil quanto no perfil público de outro usuário.
  function wireProfileTabs() {
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
  }

  async function initPerfil() {
    const nameEl = document.getElementById("profileName");
    if (!nameEl) return; // não é a página de perfil

    wireProfileTabs();

    // NOVO: se a URL tiver ?user=ID, mostra o perfil PÚBLICO de outra pessoa
    const viewUserId = new URLSearchParams(location.search).get("user");
    if (viewUserId) {
      // ID como texto: no Supabase os IDs são UUID (ex.: "3f2a..."), não números
      return renderPublicProfile(viewUserId);
    }

    const data = await getData();
    const stats = computeStats(data);
    const following = await getFollowing();
    let followingCount = following.length; // muda quando segue/deixa de seguir pela janela

    function paintProfile(d) {
      nameEl.textContent = d.name;
      const handle = "@" + d.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
      document.getElementById("profileHandle").textContent =
        handle + (d.location ? " · " + d.location : "");
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
        coverEl.classList.add("has-photo");
      }

      document.getElementById("statActivities").textContent = stats.totalActivities;
      document.getElementById("statFollowers").textContent = d.followersCount || 0;
      document.getElementById("statFollowing").textContent = followingCount;
    }
    paintProfile(data);
    paintProfileRank(data.xp || 0);
    initConnections({
      userId: data.id,
      name: data.name,
      isSelf: true,
      onFollowChange: (id, nowFollowing) => { followingCount = Math.max(0, followingCount + (nowFollowing ? 1 : -1)); }
    });

    // Aba Estatísticas: nível, barra de XP e chama de sequência
    const progressEl = document.getElementById("profileProgress");
    renderProfileProgress(progressEl, data, null, { self: true });
    getStreak().then((st) => {
      renderProfileProgress(progressEl, data, st, { self: true });
      renderStreakChip(document.getElementById("profileStreakSlot"), st, data);
    });

    const acts = [...(data.activities || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    renderProfileStats(acts);

    // Grade de atividades (aba Atividades)
    const grid = document.getElementById("profileActivitiesGrid");
    const emptyEl = document.getElementById("profileActivitiesEmpty");

    if (!acts.length) {
      grid.innerHTML = "";
      emptyEl.style.display = "block";
    } else {
      emptyEl.style.display = "none";
      grid.innerHTML = acts.map(profileActivityCardHtml).join("");
      wireActivitySocial(grid);
    }

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
        const coverLabel = editCoverBtn.querySelector("span") || editCoverBtn;
        coverLabel.textContent = "Enviando...";
        try {
          const fresh = await uploadCoverPhoto(file);
          paintProfile(fresh);
          showToast("Capa atualizada!");
        } catch (e) {
          showToast(e.message || "Não foi possível enviar a imagem.");
        } finally {
          coverLabel.textContent = "Editar capa";
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
        // Link público: quem abrir vê o MEU perfil (sem o ?user=, cada um veria o próprio)
        const url = location.origin + location.pathname + "?user=" + encodeURIComponent(data.id);
        navigator.clipboard?.writeText(url);
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
        emptyEl.innerHTML = searchInput.value.trim().length >= 2
          ? emptyBlock("users", "Nenhum atleta encontrado", "Tente buscar por outro nome.")
          : emptyBlock("users", "Nenhum atleta sugerido", "Quando mais gente entrar no Trainly, os perfis aparecem aqui.");
        emptyEl.style.display = "block";
        return;
      }
      emptyEl.style.display = "none";

      grid.innerHTML = users.map((u) => (
        '<article class="user-card" data-user-id="' + gEsc(u.id) + '" style="--rank-color:' + levelInfo(u.xp || 0).rank.color + '">' +
          '<div class="user-card-top">' +
            rankAvatarHtml(u, "lg") +
            '<div class="user-card-who">' +
              '<a class="user-card-name" href="perfil.php?user=' + encodeURIComponent(u.id) + '">' + gEsc(u.name) + "</a>" +
              rankLabel(u.xp) +
              '<div class="user-card-location">' + (u.location ? gEsc(u.location) : "Localização não informada") + "</div>" +
            "</div>" +
          "</div>" +
          '<div class="user-card-stats">' +
            "<div><b>" + Math.round(u.kmMonth) + "</b><span>km no mês</span></div>" +
            "<div><b>" + u.activitiesCount + "</b><span>" + gPlural(u.activitiesCount, "treino", "treinos") + "</span></div>" +
            "<div><b>" + u.followersCount + "</b><span>" + gPlural(u.followersCount, "seguidor", "seguidores") + "</span></div>" +
          "</div>" +
          (u.mutualCount > 0 ? '<div class="user-card-mutual"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/></svg>' +
            u.mutualCount + " " + gPlural(u.mutualCount, "amigo", "amigos") + " em comum</div>" : "") +
          '<div class="user-card-actions">' +
            '<button class="btn-view-profile" type="button">Ver perfil</button>' +
            '<button class="btn-connect' + (u.isFollowing ? " connected" : "") + '" type="button" aria-pressed="' + (u.isFollowing ? "true" : "false") + '">' + (u.isFollowing ? "Seguindo" : "+ Seguir") + "</button>" +
          "</div>" +
        "</article>"
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
              connectBtn.textContent = "Seguindo";
              connectBtn.classList.add("connected");
              connectBtn.setAttribute("aria-pressed", "true");
            } else {
              await unfollowUser(userId);
              connectBtn.textContent = "+ Seguir";
              connectBtn.classList.remove("connected");
              connectBtn.setAttribute("aria-pressed", "false");
            }
          } catch (e) {
            showToast(e.message || "Não foi possível concluir a ação.");
          } finally {
            connectBtn.disabled = false;
          }
        });

        viewBtn.addEventListener("click", () => {
          window.location.href = "perfil.php?user=" + userId;
        });
      });
    }

    async function loadSuggested() {
      titleEl.textContent = "Atletas sugeridos";
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

    // Lateral: ranking da semana (você entre quem você segue)
    const lbEl = document.getElementById("friendsLeaderboard");
    const resetEl = document.getElementById("lbReset");
    if (resetEl) {
      const daysLeft = 7 - ((new Date().getDay() + 6) % 7);
      resetEl.textContent = daysLeft === 1 ? "Zera amanhã" : "Zera em " + daysLeft + " dias";
    }
    try {
      const { leaderboard } = await apiRequest("/friends/leaderboard");
      const others = leaderboard.filter((m) => !m.isMe);
      if (!others.length) {
        lbEl.innerHTML = emptyBlock("trophy", "Ranking vazio", "Siga outros atletas para disputar o ranking da semana com eles.", true);
      } else {
        const kmTxt = (m) => m.weekKm.toFixed(1).replace(".", ",") + " km";
        const scored = leaderboard.some((m) => m.weekKm > 0);
        const podiumList = scored ? leaderboard.filter((m) => m.weekKm > 0).slice(0, 3) : [];
        const rest = leaderboard.filter((m) => !podiumList.includes(m));
        lbEl.innerHTML =
          (podiumList.length ? podiumHtml(podiumList, kmTxt) : "") +
          '<ol class="g-rank-list">' + rest.map((m) => {
            const pos = m.position || leaderboard.indexOf(m) + 1;
            const gapBefore = m.isMe && leaderboard.indexOf(m) > 0 && leaderboard[leaderboard.indexOf(m) - 1].position !== pos - 1;
            return (gapBefore ? '<li class="g-rank-sep" aria-hidden="true">•••</li>' : "") +
              '<li class="g-rank-row' + (m.isMe ? " is-me" : "") + '">' +
                '<span class="g-rank-pos">' + pos + "</span>" +
                rankAvatarHtml(m, "sm") +
                '<a class="g-rank-name" href="' + (m.isMe ? "perfil.php" : "perfil.php?user=" + encodeURIComponent(m.id)) + '">' + (m.isMe ? "Você" : gEsc(m.name)) +
                  "<small>" + m.weekActivities + " " + gPlural(m.weekActivities, "treino", "treinos") + "</small></a>" +
                '<span class="g-rank-value">' + kmTxt(m) + "</span>" +
              "</li>";
          }).join("") + "</ol>" +
          rivalLineHtml(leaderboard, "weekKm", "km", 1);
      }
    } catch (e) {
      lbEl.innerHTML = '<p class="empty-state">Não foi possível carregar o ranking.</p>';
    }

    // Lateral: quem treinou hoje (entre quem você segue)
    const activeEl = document.getElementById("activeTodayList");
    try {
      const active = await getActiveToday();
      if (!active.length) {
        activeEl.innerHTML = emptyBlock("activity", "Ninguém treinou ainda hoje", "Que tal ser o primeiro? Seus amigos vão ver no feed.", true);
      } else {
        activeEl.innerHTML = '<ul class="active-list">' + active.map((a) => (
          '<li class="active-row">' +
            '<span class="active-av">' + rankAvatarHtml(a, "sm") + sportIconHtml(a.type, "xs") + "</span>" +
            '<a class="active-name" href="perfil.php?user=' + encodeURIComponent(a.id) + '">' + gEsc(a.name) +
              "<small>" + gEsc(a.type) + " · " + (a.distanceKm || 0).toFixed(1).replace(".", ",") + " km" + (a.date ? " · " + timeAgo(a.date) : "") + "</small></a>" +
            (a.xpEarned ? xpChipHtml(a.xpEarned) : "") +
          "</li>"
        )).join("") + "</ul>";
      }
    } catch (e) {
      activeEl.innerHTML = '<p class="empty-state">Não foi possível carregar.</p>';
    }
  }

  /* ---------------------------------------------------------
     NOVO: Página "Minhas Atividades" — histórico completo com filtros
     --------------------------------------------------------- */
  // NOVO: botões Editar / Excluir da lista "Minhas Atividades".
  // O listener é ligado uma vez só; a lista atual fica em listEl._acts.
  function wireActivityActions(listEl) {
    if (listEl.dataset.actionsWired === "1") return;
    listEl.dataset.actionsWired = "1";

    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest(".act-action-btn");
      if (!btn) return;

      const item = btn.closest(".activity-item");
      const id = item.dataset.activityId;
      const act = (listEl._acts || []).find((a) => String(a.id) === id);
      if (!act) return;

      if (btn.dataset.action === "edit") {
        const overlay = document.getElementById("registerOverlay");
        if (overlay && overlay._openEdit) overlay._openEdit(act);
        return;
      }

      if (btn.dataset.action === "delete") {
        const label = act.title || ((act.type || "Corrida") + " registrada");
        const ok = await confirmDialog({
          title: "Excluir atividade",
          message: "Tem certeza que quer excluir \"" + label + "\"? O XP dessa atividade será removido e isso não pode ser desfeito.",
          confirmLabel: "Excluir"
        });
        if (!ok) return;

        btn.disabled = true;
        try {
          const { xpRemoved } = await deleteActivity(id);
          showToast("Atividade excluída" + (xpRemoved ? " (-" + xpRemoved + " XP)" : ""));
          initAtividades();
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || "Não foi possível excluir a atividade.");
        }
      }
    });
  }

  // Ritmo do jeito que cada esporte costuma medir
  function sportPaceHtml(a) {
    const type = a.type || "Corrida";
    if (!a.distanceKm || !a.durationSec) return "—";
    if (type === "Ciclismo") return (a.distanceKm / (a.durationSec / 3600)).toFixed(1).replace(".", ",") + " km/h";
    if (type === "Natação") return formatPace(a.durationSec / 60, a.distanceKm * 10) + "/100m";
    return formatPace(a.durationSec / 60, a.distanceKm) + "/km";
  }
  // XP que a atividade deu (o banco guarda; se faltar, recalcula com a mesma regra)
  function actXp(a) {
    return a.xpEarned || xpFromActivity(a.distanceKm || 0, a.durationSec || 0);
  }
  // Segunda-feira da semana de uma data (horário local)
  function mondayOf(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  // Recordes pessoais (de todas as atividades)
  function computeRecords(acts) {
    const best = (list, score) => list.reduce((b, a) => (score(a) > (b ? score(b) : -Infinity) ? a : b), null);
    // Ritmo mais rápido que 2'30"/km é humanamente impossível (o recorde mundial
    // é ~2'50"/km): é treino digitado errado, então não vale como recorde.
    const runs = acts.filter((a) => (a.type || "Corrida") === "Corrida" && a.distanceKm >= 1 && a.durationSec > 0 &&
      a.durationSec / 60 / a.distanceKm >= 2.5);
    const records = [
      { key: "dist", label: "Maior distância", act: best(acts, (a) => a.distanceKm || 0),
        value: (a) => a.distanceKm.toFixed(2).replace(".", ",") + " km", tone: "var(--ok)" },
      { key: "time", label: "Treino mais longo", act: best(acts, (a) => a.durationSec || 0),
        value: (a) => formatHM(a.durationSec), tone: "#8b8ef5" },
      { key: "pace", label: "Melhor ritmo (corrida)", act: best(runs, (a) => -(a.durationSec / a.distanceKm)),
        value: (a) => formatPace(a.durationSec / 60, a.distanceKm) + "/km", tone: "var(--primary-blue)" },
      { key: "xp", label: "Mais XP num treino", act: best(acts, (a) => actXp(a)),
        value: (a) => "+" + actXp(a).toLocaleString("pt-BR") + " XP", tone: "var(--xp-gold)" }
    ];
    return records.filter((r) => r.act && (r.key !== "dist" || r.act.distanceKm > 0));
  }

  const RECORD_ICON = '<svg viewBox="0 0 24 24"><path d="M7 4h10v3a5 5 0 0 1-10 0V4z"/><path d="M5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4M10 15h4l1 5H9l1-5z"/></svg>';

  async function initAtividades() {
    const tabsEl = document.querySelector(".atv-filters") || document.querySelector(".filter-tabs");
    if (!tabsEl || !document.getElementById("atividadesList")) return; // não é a página de atividades

    const data = await getData();
    const allActs = (data.activities || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    let currentType = "Todos";
    const records = computeRecords(allActs);
    const recordsByAct = new Map();
    records.forEach((r) => {
      const list = recordsByAct.get(String(r.act.id)) || [];
      list.push(r);
      recordsByAct.set(String(r.act.id), list);
    });

    // ---- Nível + XP da semana ----
    function renderLevel() {
      const el = document.getElementById("atvLevel");
      if (!el) return;
      const info = levelInfo(data.xp || 0);
      const weekStart = mondayOf(new Date());
      const weekXp = allActs.filter((a) => new Date(a.date) >= weekStart).reduce((s, a) => s + actXp(a), 0);
      const filled = Math.round((info.xpIntoLevel / info.xpToNext) * 10);
      const next = RANKS.find((r) => r.min > info.level);
      el.style.setProperty("--rank-color", info.rank.color);
      el.innerHTML =
        '<div class="atv-level-hex" aria-hidden="true"><svg viewBox="0 0 52 58"><polygon points="26,2 49,15 49,43 26,56 3,43 3,15"/><text x="26" y="37" text-anchor="middle">' + info.level + "</text></svg></div>" +
        '<div class="atv-level-main">' +
          '<div class="atv-level-top">' +
            '<span class="atv-level-rank">' + info.rank.name + '</span><b class="atv-level-name">Nível ' + info.level + "</b>" +
            '<span class="atv-level-xp">' + info.xpIntoLevel.toLocaleString("pt-BR") + " / " + info.xpToNext.toLocaleString("pt-BR") + " XP</span>" +
          "</div>" +
          '<div class="atv-level-bar" role="progressbar" aria-label="Progresso do nível" aria-valuemin="0" aria-valuemax="' + info.xpToNext + '" aria-valuenow="' + info.xpIntoLevel + '">' +
            Array.from({ length: 10 }, (_, i) => "<i" + (i < filled ? ' class="on"' : "") + "></i>").join("") +
          "</div>" +
          '<div class="atv-level-sub">Faltam <b>' + (info.xpToNext - info.xpIntoLevel).toLocaleString("pt-BR") + " XP</b> para o nível " + (info.level + 1) +
            (next ? " · " + next.name + " no nível " + next.min : " · patente máxima!") + "</div>" +
        "</div>" +
        '<div class="atv-level-week">' +
          '<span class="atv-level-week-label">Nesta semana</span>' +
          xpChipHtml(weekXp, "lg") +
        "</div>";
    }

    // ---- Números do período (Semana / Mês / 6 meses / Ano) ----
    // Períodos do calendário, iguais aos nomes: esta semana (seg-dom),
    // este mês, últimos 6 meses e este ano.
    const PERIODS = {
      week: { title: "Sua semana", suffix: "na semana", start: () => mondayOf(new Date()) },
      month: { title: "Seu mês", suffix: "no mês", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); } },
      "6months": { title: "Seus últimos 6 meses", suffix: "em 6 meses", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 5, 1); } },
      year: { title: "Seu ano", suffix: "no ano", start: () => new Date(new Date().getFullYear(), 0, 1) }
    };
    const periodEl = document.querySelector(".atv-period");
    let currentPeriod = (periodEl && periodEl.querySelector(".period-pill.active") || {}).dataset?.period || "year";

    function renderSummary() {
      const per = PERIODS[currentPeriod] || PERIODS.year;
      const since = per.start();
      const inPeriod = allActs.filter((a) => new Date(a.date) >= since);
      const totalKm = inPeriod.reduce((s, a) => s + a.distanceKm, 0);
      const totalSec = inPeriod.reduce((s, a) => s + a.durationSec, 0);
      const totalXp = inPeriod.reduce((s, a) => s + actXp(a), 0);
      const activeDays = new Set(inPeriod.map((a) => new Date(a.date).toDateString())).size;
      const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
      set("atvPeriodTitle", per.title);
      set("sumCount", String(inPeriod.length));
      set("sumCountLabel", gPlural(inPeriod.length, "Treino", "Treinos") + " · " + activeDays + " " + gPlural(activeDays, "dia ativo", "dias ativos"));
      set("sumDist", (totalKm < 100 ? totalKm.toFixed(1).replace(".", ",") : Math.round(totalKm).toLocaleString("pt-BR")) + "<small>km</small>");
      set("sumDistLabel", "Distância " + per.suffix);
      set("sumTime", Math.floor(totalSec / 3600) + "<small>h</small> " + Math.floor((totalSec % 3600) / 60) + "<small>min</small>");
      set("sumTimeLabel", "Tempo ativo " + per.suffix);
      set("sumXp", "+" + totalXp.toLocaleString("pt-BR"));
      set("sumXpLabel", "XP ganho " + per.suffix);
      // contador em cada filtro (todas as atividades)
      tabsEl.querySelectorAll("[data-count]").forEach((c) => {
        const t = c.dataset.count;
        c.textContent = t === "Todos" ? allActs.length : allActs.filter((a) => (a.type || "Corrida") === t).length;
      });
    }
    if (periodEl && periodEl.dataset.wired !== "1") {
      periodEl.dataset.wired = "1";
      periodEl.querySelectorAll(".period-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          periodEl.querySelectorAll(".period-pill").forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
          btn.classList.add("active");
          btn.setAttribute("aria-pressed", "true");
          periodEl._render(btn.dataset.period);
        });
      });
    }
    // initAtividades roda de novo depois de salvar/excluir: o clique sempre usa o render mais recente
    if (periodEl) periodEl._render = (p) => { currentPeriod = p; renderSummary(); };

    // ---- Recordes na lateral ----
    function renderRecords() {
      const el = document.getElementById("atvRecords");
      if (!el) return;
      if (!records.length) {
        el.innerHTML = '<li class="atv-rec-empty">Registre treinos para bater seus primeiros recordes.</li>';
        return;
      }
      el.innerHTML = records.map((r) => {
        const d = new Date(r.act.date);
        return '<li><button type="button" class="atv-rec" data-goto="' + gEsc(r.act.id) + '" style="--tone:' + r.tone + '">' +
          '<span class="atv-rec-ic" aria-hidden="true">' + RECORD_ICON + "</span>" +
          '<span class="atv-rec-body"><span class="atv-rec-label">' + r.label + "</span>" +
            '<span class="atv-rec-act">' + gEsc(r.act.title || r.act.type || "Treino") + " · " + d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) + "</span></span>" +
          '<b class="atv-rec-value">' + r.value(r.act) + "</b>" +
        "</button></li>";
      }).join("");
    }

    // ---- Lista agrupada por semana ----
    function weekLabel(monday) {
      const thisMonday = mondayOf(new Date());
      const diffWeeks = Math.round((thisMonday - monday) / (7 * 86400000));
      if (diffWeeks === 0) return "Esta semana";
      if (diffWeeks === 1) return "Semana passada";
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const f = (d) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
      return f(monday) + " – " + f(sunday);
    }

    function itemHtml(a) {
      const d = new Date(a.date);
      const type = a.type || "Corrida";
      const sp = sportOf(type);
      const title = a.title || (type + " registrada");
      const dateLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) +
        " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const recs = (recordsByAct.get(String(a.id)) || []).slice(0, 2);
      const stat = (label, value) => '<div class="act-stat"><span>' + label + "</span><b>" + value + "</b></div>";
      return (
        '<article class="activity-item" data-activity-id="' + gEsc(a.id) + '" style="--sport:' + sp.color + '">' +
          sportIconHtml(type, "lg") +
          '<div class="act-body">' +
            '<div class="act-head">' +
              "<div>" +
                '<h3 class="act-title">' + gEsc(title) + "</h3>" +
                '<div class="act-date">' + type + " · " + dateLabel + "</div>" +
              "</div>" +
              '<div class="act-head-right">' +
                xpChipHtml(actXp(a)) +
                '<div class="activity-actions">' +
                  '<button type="button" class="act-action-btn" data-action="edit" aria-label="Editar ' + gEsc(title) + '" title="Editar">' +
                    '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>' +
                  '<button type="button" class="act-action-btn danger" data-action="delete" aria-label="Excluir ' + gEsc(title) + '" title="Excluir">' +
                    '<svg viewBox="0 0 24 24"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>' +
                "</div>" +
              "</div>" +
            "</div>" +
            (recs.length ? '<div class="act-badges">' + recs.map((r) =>
              '<span class="g-badge" style="--tone:' + r.tone + '">' + RECORD_ICON + r.label + "</span>").join("") + "</div>" : "") +
            '<div class="act-stats">' +
              stat("Distância", a.distanceKm.toFixed(2).replace(".", ",") + " km") +
              stat("Duração", formatClock(a.durationSec)) +
              stat(type === "Ciclismo" ? "Velocidade" : "Ritmo", sportPaceHtml(a)) +
              (a.heartRate ? stat("Freq.", a.heartRate + " bpm") : "") +
              (a.elevationM ? stat("Elevação", a.elevationM + " m") : "") +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }

    function renderList() {
      const filtered = currentType === "Todos" ? allActs : allActs.filter((a) => (a.type || "Corrida") === currentType);
      const listEl = document.getElementById("atividadesList");
      const emptyEl = document.getElementById("atividadesEmpty");
      listEl._acts = data.activities || [];
      wireActivityActions(listEl);

      if (!filtered.length) {
        listEl.innerHTML = "";
        emptyEl.innerHTML = currentType === "Todos"
          ? emptyBlock("activity", "Nenhuma atividade ainda", "Registre seu primeiro treino em \"+ Nova Atividade\" e comece a ganhar XP.")
          : emptyBlock("activity", "Nenhuma atividade de " + currentType.toLowerCase(), "Que tal estrear esse esporte? Todo treino vale XP.");
        emptyEl.style.display = "block";
        return;
      }
      emptyEl.style.display = "none";

      // agrupa por semana (segunda a domingo)
      const groups = [];
      filtered.forEach((a) => {
        const monday = mondayOf(new Date(a.date)).getTime();
        let g = groups[groups.length - 1];
        if (!g || g.monday !== monday) { g = { monday, acts: [] }; groups.push(g); }
        g.acts.push(a);
      });

      listEl.innerHTML = groups.map((g) => {
        const km = g.acts.reduce((s, a) => s + a.distanceKm, 0);
        const xp = g.acts.reduce((s, a) => s + actXp(a), 0);
        return '<section class="act-week">' +
          '<header class="act-week-head">' +
            '<h2>' + weekLabel(new Date(g.monday)) + "</h2>" +
            '<span class="act-week-sum">' + g.acts.length + " " + gPlural(g.acts.length, "treino", "treinos") +
              " · " + km.toFixed(1).replace(".", ",") + " km</span>" +
            xpChipHtml(xp) +
          "</header>" +
          g.acts.map(itemHtml).join("") +
        "</section>";
      }).join("");
    }

    // Recorde clicado: rola até a atividade e dá um destaque
    const recordsEl = document.getElementById("atvRecords");
    if (recordsEl && recordsEl.dataset.wired !== "1") {
      recordsEl.dataset.wired = "1";
      recordsEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-goto]");
        if (!btn) return;
        const all = tabsEl.querySelector('[data-filter="Todos"]');
        if (currentType !== "Todos" && all) all.click();
        const item = document.querySelector('.activity-item[data-activity-id="' + CSS.escape(btn.dataset.goto) + '"]');
        if (!item) return;
        item.scrollIntoView({ behavior: "smooth", block: "center" });
        item.classList.remove("flash");
        void item.offsetWidth;
        item.classList.add("flash");
      });
    }

    // initAtividades roda de novo depois de registrar/editar/excluir; os filtros
    // são ligados uma vez só e sempre chamam o renderList mais recente.
    tabsEl._render = () => {
      const activePill = tabsEl.querySelector(".filter-pill.active");
      currentType = activePill ? activePill.dataset.filter : "Todos";
      renderList();
    };
    if (tabsEl.dataset.wired !== "1") {
      tabsEl.dataset.wired = "1";
      tabsEl.querySelectorAll(".filter-pill").forEach((tab) => {
        tab.addEventListener("click", () => {
          tabsEl.querySelectorAll(".filter-pill").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-pressed", "false"); });
          tab.classList.add("active");
          tab.setAttribute("aria-pressed", "true");
          tabsEl._render();
        });
      });
    }

    renderLevel();
    renderSummary();
    renderRecords();
    tabsEl._render();
    initRegisterModal(data, null, () => initAtividades());
    renderConsistency({
      grid: "atvConsistGrid", month: "atvConsistMonth", nav: "atvConsistNav", info: "atvConsistInfo",
      active: "atvCsActive", streak: "atvCsStreak", pct: "atvCsPct"
    }, data.activities || []);
    getStreak().then((st) => renderStreakChip(document.getElementById("atvStreakSlot"), st, data)).catch(() => {});
  }

  /* Calendário de consistência (Perfil e Atividades)
     Mostra o mês atual e deixa voltar até o mês do primeiro treino.
     Cada dia com treino fica azul, mais forte quanto mais km no dia;
     tocar num dia mostra o resumo dele embaixo do calendário.
     ids: { grid, month, nav, info, active, streak, pct } */
  const CAL_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const CAL_DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function renderConsistency(ids, acts) {
    const $ = (id) => (id ? document.getElementById(id) : null);
    const grid = $(ids.grid);
    if (!grid) return;

    const now = new Date();
    const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();
    const currentKey = monthKey(now);
    let firstKey = currentKey;

    // Treinos por dia: "ano-mês-dia" -> { n, km }
    const byDay = new Map();
    acts.forEach((a) => {
      const d = new Date(a.date);
      if (isNaN(d)) return;
      firstKey = Math.min(firstKey, monthKey(d));
      const k = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
      const cur = byDay.get(k) || { n: 0, km: 0 };
      cur.n += 1;
      cur.km += a.distanceKm || 0;
      byDay.set(k, cur);
    });

    const kmTxt = (km) => km.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
    const treinosTxt = (n) => n + " " + gPlural(n, "treino", "treinos");
    let shown = currentKey;
    let monthInfo = "";

    function draw() {
      const y = Math.floor(shown / 12);
      const m = shown % 12;
      const isCurrent = shown === currentKey;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const firstWeekday = new Date(y, m, 1).getDay();
      const monthShort = CAL_MONTHS[m].slice(0, 3).toLowerCase();

      const days = [];
      for (let d = 1; d <= daysInMonth; d++) days.push(byDay.get(y + "-" + m + "-" + d) || null);
      const maxKm = Math.max(0, ...days.map((x) => (x ? x.km : 0)));

      let html = CAL_DAY_LABELS.map((l) => '<div class="consistency-day-label">' + l + "</div>").join("");
      for (let i = 0; i < firstWeekday; i++) html += '<div class="consistency-day empty"></div>';
      days.forEach((info, i) => {
        const d = i + 1;
        let cls = "consistency-day";
        let tip = d + " de " + monthShort;
        if (info) {
          const ratio = maxKm > 0 ? info.km / maxKm : 1;
          cls += " active lv" + (ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1);
          tip += " · " + treinosTxt(info.n) + (info.km > 0 ? " · " + kmTxt(info.km) : "");
        } else if (isCurrent && d > now.getDate()) {
          cls += " is-future";
        } else {
          tip += " · sem treino";
        }
        if (isCurrent && d === now.getDate()) cls += " is-today";
        html += '<div class="' + cls + '" title="' + tip + '" data-tip="' + tip + '"><span class="cd-n">' + d + "</span></div>";
      });
      grid.innerHTML = html;

      // Maior sequência de dias seguidos com treino, dentro do mês
      let longest = 0, run = 0;
      days.forEach((info) => { run = info ? run + 1 : 0; longest = Math.max(longest, run); });
      const activeDays = days.filter(Boolean).length;
      const monthN = days.reduce((s, x) => s + (x ? x.n : 0), 0);
      const monthKm = days.reduce((s, x) => s + (x ? x.km : 0), 0);
      monthInfo = monthN ? treinosTxt(monthN) + (monthKm > 0 ? " · " + kmTxt(monthKm) : "") : "Nenhum treino neste mês";

      const label = CAL_MONTHS[m] + " " + y;
      grid.setAttribute("aria-label", label + ": " + activeDays + " " + gPlural(activeDays, "dia", "dias") + " com treino");
      const monthEl = $(ids.month);
      if (monthEl) monthEl.textContent = label;
      const infoEl = $(ids.info);
      if (infoEl) infoEl.textContent = monthInfo;
      const set = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
      set(ids.active, activeDays + " / " + daysInMonth);
      set(ids.streak, longest + " " + gPlural(longest, "dia", "dias"));
      set(ids.pct, Math.round((activeDays / daysInMonth) * 100) + "%");

      const nav = $(ids.nav);
      if (nav) {
        nav.querySelector('[data-step="-1"]').disabled = shown <= firstKey;
        nav.querySelector('[data-step="1"]').disabled = shown >= currentKey;
      }
    }

    const nav = $(ids.nav);
    if (nav) {
      nav.querySelectorAll("[data-step]").forEach((btn) => {
        btn.onclick = () => {
          shown = Math.min(currentKey, Math.max(firstKey, shown + Number(btn.dataset.step)));
          draw();
        };
      });
    }
    // Tocar num dia mostra o resumo dele (no celular não existe "passar o mouse")
    grid.onclick = (e) => {
      const cell = e.target.closest(".consistency-day:not(.empty)");
      const infoEl = $(ids.info);
      if (!cell || !infoEl) return;
      const wasSelected = cell.classList.contains("is-sel");
      grid.querySelectorAll(".is-sel").forEach((c) => c.classList.remove("is-sel"));
      if (wasSelected) { infoEl.textContent = monthInfo; return; }
      cell.classList.add("is-sel");
      infoEl.textContent = cell.dataset.tip;
    };
    draw();
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

  async function updateRoute(id, payload) {
    const { route } = await apiRequest("/routes/" + id, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return route;
  }

  async function deleteRoute(id) {
    return apiRequest("/routes/" + id, { method: "DELETE" });
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
          window.location.href = "dashboard.php";
        }, 900);
      }
    }

    if (startBtn) startBtn.addEventListener("click", toggleWorkout);
    if (pauseBtn) pauseBtn.addEventListener("click", toggleWorkout);
  }

  /* ---------------------------------------------------------
     NOVO: Página Explorar (rotas prontas cadastradas por usuários)
     --------------------------------------------------------- */
  // Mesmos tipos de rota do app: Corrida, Ciclismo e Caminhada
  const ROUTE_TYPE_COLOR = { Corrida: "#3b82f6", Ciclismo: "#10b981", Caminhada: "#f59e0b" };

  // Quanto tempo e XP uma rota daria, com um ritmo comum de cada esporte
  // (corrida 6 min/km, ciclismo 25 km/h, caminhada 12 min/km) + 1 min a cada
  // 10 m de subida. É só uma estimativa: o XP de verdade vem do treino feito.
  const ROUTE_PACE_MIN_PER_KM = { Corrida: 6, Ciclismo: 2.4, Caminhada: 12 };
  function routeEstimate(r) {
    const pace = ROUTE_PACE_MIN_PER_KM[r.type] || 6;
    const min = Math.max(1, Math.round(r.distanceKm * pace + (r.elevationM || 0) / 10));
    return { min, xp: xpFromActivity(r.distanceKm, min * 60) };
  }
  function fmtMinutes(min) {
    return min >= 60 ? Math.floor(min / 60) + "h" + (min % 60 ? String(min % 60).padStart(2, "0") : "") : min + " min";
  }
  const DIFFICULTY = {
    "Fácil": { level: 1, color: "var(--ok)" },
    "Moderada": { level: 2, color: "#f59e0b" },
    "Difícil": { level: 3, color: "var(--danger, #f0554e)" }
  };
  function difficultyHtml(d) {
    const info = DIFFICULTY[d] || DIFFICULTY.Moderada;
    return '<span class="diff-badge" style="--tone:' + info.color + '">' +
      '<span class="diff-bars" aria-hidden="true">' + [1, 2, 3].map((n) => "<i" + (n <= info.level ? ' class="on"' : "") + "></i>").join("") + "</span>" +
      gEsc(d || "Moderada") + "</span>";
  }

  function initExplorar() {
    const myListEl = document.getElementById("myRoutesList");
    if (!myListEl || typeof L === "undefined") return; // não é a página Explorar
    const friendsListEl = document.getElementById("friendsRoutesList");

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
      const est = routeEstimate(route);
      const doneHref = "atividades.php?nova=1&tipo=" + encodeURIComponent(route.type) +
        "&km=" + encodeURIComponent(route.distanceKm) + "&titulo=" + encodeURIComponent(route.name) +
        (route.elevationM ? "&elev=" + encodeURIComponent(route.elevationM) : "");
      bar.style.setProperty("--sport", sportOf(route.type).color);
      bar.innerHTML =
        '<div class="rd-main">' +
          sportIconHtml(route.type, "lg") +
          "<div>" +
            '<div class="route-detail-title">' + gEsc(route.name) + "</div>" +
            '<div class="route-detail-sub">' + gEsc(route.type) + (route.terrain ? " · " + gEsc(route.terrain) : "") +
              " · criada por " + (route.isMine ? "você" : gEsc(route.creatorName)) + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="route-detail-stats">' +
          '<div><div class="rd-label">Dificuldade</div><div class="rd-value">' + difficultyHtml(route.difficulty) + "</div></div>" +
          '<div><div class="rd-label">Distância</div><div class="rd-value">' + route.distanceKm.toFixed(1).replace(".", ",") + " km</div></div>" +
          '<div><div class="rd-label">Tempo estimado</div><div class="rd-value">≈ ' + fmtMinutes(est.min) + "</div></div>" +
          '<div class="rd-xp"><div class="rd-label">Vale cerca de</div>' + xpChipHtml(est.xp, "lg") + "</div>" +
        "</div>" +
        '<a class="btn-primary rd-done" href="' + doneHref + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Fiz essa rota</a>';
    }

    // Seus números de explorador (contam sempre todas as rotas, sem filtro)
    function renderExploreSummary(routes) {
      const el = document.getElementById("exploreSummary");
      if (!el) return;
      const mine = routes.filter((r) => r.isMine);
      const km = mine.reduce((s, r) => s + r.distanceKm, 0);
      const climb = mine.reduce((s, r) => s + (r.elevationM || 0), 0);
      const item = (tone, icon, value, label) =>
        '<li style="--tone:' + tone + '"><span class="exp-sum-ic" aria-hidden="true">' + icon + "</span><b>" + value + "</b><span>" + label + "</span></li>";
      el.innerHTML =
        item("var(--primary-blue)", '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>', mine.length, gPlural(mine.length, "rota criada", "rotas criadas")) +
        item("var(--ok)", '<svg viewBox="0 0 24 24"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>', km.toFixed(1).replace(".", ",") + " km", "mapeados") +
        item("#f59e0b", '<svg viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>', climb.toLocaleString("pt-BR") + " m", "de subida");
    }

    function selectRoute(id) {
      selectedId = String(id);
      const route = allRoutes.find((r) => String(r.id) === selectedId);
      document.querySelectorAll(".route-card").forEach((c) => c.classList.toggle("selected", c.dataset.routeId === selectedId));
      drawRouteOnMap(route);
      renderDetailBar(route);
    }

    function renderGroup(containerEl, emptyEl, routes, showCreator) {
      if (!routes.length) {
        containerEl.innerHTML = "";
        emptyEl.innerHTML = showCreator
          ? emptyBlock("users", "Nenhuma rota de amigos", "Quando quem você segue cadastrar rotas, elas aparecem aqui.", true)
          : emptyBlock("map", "Nenhuma rota sua ainda", "Desenhe um trajeto no mapa e ele aparece aqui.", true);
        emptyEl.style.display = "block";
        return;
      }
      emptyEl.style.display = "none";

      containerEl.innerHTML = routes.map((r) => {
        const est = routeEstimate(r);
        return (
          '<div class="route-card' + (String(r.id) === selectedId ? " selected" : "") + '" data-route-id="' + gEsc(r.id) + '" style="--sport:' + sportOf(r.type).color + '" tabindex="0" role="button" aria-label="Ver rota ' + gEsc(r.name) + ' no mapa">' +
            '<div class="route-card-top">' +
              sportIconHtml(r.type) +
              '<div class="route-card-main">' +
                '<div class="route-name">' + gEsc(r.name) + "</div>" +
                '<div class="route-meta">' + gEsc(r.type) + (r.terrain ? " · " + gEsc(r.terrain) : "") +
                  (showCreator ? " · por " + gEsc(r.creatorName) : "") + "</div>" +
              "</div>" +
              (!showCreator ? (
                '<div class="route-card-actions">' +
                  '<button class="route-icon-btn" data-edit-route="' + gEsc(r.id) + '" title="Editar" aria-label="Editar rota ' + gEsc(r.name) + '">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path></svg>' +
                  "</button>" +
                  '<button class="route-icon-btn danger" data-delete-route="' + gEsc(r.id) + '" title="Apagar" aria-label="Apagar rota ' + gEsc(r.name) + '">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>' +
                  "</button>" +
                "</div>"
              ) : "") +
            "</div>" +
            '<div class="route-tags">' + difficultyHtml(r.difficulty) + xpChipHtml(est.xp, "route-xp") + "</div>" +
            '<div class="route-stats3">' +
              "<div><b>" + r.distanceKm.toFixed(2).replace(".", ",") + " km</b><span>Distância</span></div>" +
              "<div><b>" + (r.elevationM || 0) + " m</b><span>Subida</span></div>" +
              "<div><b>≈ " + fmtMinutes(est.min) + "</b><span>Tempo estimado</span></div>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      containerEl.querySelectorAll(".route-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest("[data-edit-route], [data-delete-route]")) return;
          selectRoute(card.dataset.routeId);
        });
        card.addEventListener("keydown", (e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target === card) { e.preventDefault(); selectRoute(card.dataset.routeId); }
        });
      });
    }

    function renderList(routes) {
      const myRoutes = routes.filter((r) => r.isMine);
      const friendsRoutes = routes.filter((r) => !r.isMine);

      renderGroup(myListEl, document.getElementById("myRoutesEmpty"), myRoutes, false);
      renderGroup(friendsListEl, document.getElementById("friendsRoutesEmpty"), friendsRoutes, true);
      const myCount = document.getElementById("myRoutesCount");
      const frCount = document.getElementById("friendsRoutesCount");
      if (myCount) myCount.textContent = myRoutes.length;
      if (frCount) frCount.textContent = friendsRoutes.length;

      if (!routes.length) {
        renderDetailBar(null);
        return;
      }

      // Seleciona a primeira rota automaticamente (prioriza as minhas)
      if (!selectedId || !routes.some((r) => String(r.id) === selectedId)) {
        selectRoute((myRoutes[0] || friendsRoutes[0]).id);
      }
    }

    async function loadAndRender() {
      const activeType = document.querySelector(".filter-pill.active")?.dataset.filter || "Todos";
      const term = document.getElementById("routeSearch").value.trim().toLowerCase();
      allRoutes = await getRoutes(activeType);
      if (activeType === "Todos") renderExploreSummary(allRoutes);
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

    /* ---- Modal: adicionar/editar rota ---- */
    const addOverlay = document.getElementById("addRouteOverlay");
    const openAddBtn = document.getElementById("openAddRouteBtn");
    const cancelAddBtn = document.getElementById("cancelAddRouteBtn");
    const saveRouteBtn = document.getElementById("saveRouteBtn");
    const undoPointBtn = document.getElementById("undoPointBtn");
    const modalTitleEl = document.querySelector("#addRouteOverlay h3");
    let drawMap, drawPoints = [], drawPolyline, drawMarkers = [];
    let editingRouteId = null;

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
          if (!drawPoints.length) drawMap.setView([pos.coords.latitude, pos.coords.longitude], 14);
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
        drawMap.fitBounds(drawPolyline.getBounds(), { padding: [20, 20] });
      }

      document.getElementById("drawPointsCount").textContent = drawPoints.length + " pontos marcados";

      let totalKm = 0;
      for (let i = 1; i < drawPoints.length; i++) {
        totalKm += haversineKm(drawPoints[i - 1][0], drawPoints[i - 1][1], drawPoints[i][0], drawPoints[i][1]);
      }
      document.getElementById("rDist").value = totalKm > 0 ? totalKm.toFixed(2) : "";
    }

    function openAddModal() {
      editingRouteId = null;
      if (modalTitleEl) modalTitleEl.textContent = "Adicionar Rota";
      if (saveRouteBtn) saveRouteBtn.textContent = "Salvar rota";
      addOverlay.classList.add("open");
      document.getElementById("rName").value = "";
      document.getElementById("rElev").value = "";
      document.getElementById("rTerrain").value = "";
      document.getElementById("rType").value = "Corrida";
      document.getElementById("rDifficulty").value = "Moderada";
      drawPoints = [];
      setTimeout(() => {
        setupDrawMap();
        drawMap.invalidateSize();
        redrawDrawMap();
      }, 50);
    }

    function openEditModal(route) {
      editingRouteId = route.id;
      if (modalTitleEl) modalTitleEl.textContent = "Editar Rota";
      if (saveRouteBtn) saveRouteBtn.textContent = "Salvar alterações";
      addOverlay.classList.add("open");
      document.getElementById("rName").value = route.name;
      document.getElementById("rType").value = route.type;
      document.getElementById("rDifficulty").value = route.difficulty;
      document.getElementById("rElev").value = route.elevationM || "";
      document.getElementById("rTerrain").value = route.terrain || "";
      document.getElementById("rDist").value = route.distanceKm;
      drawPoints = route.path.map((p) => [p[0], p[1]]);
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
        saveRouteBtn.textContent = editingRouteId ? "Salvando..." : "Salvando...";
        try {
          const payload = { name, type, difficulty, terrain, distanceKm, elevationM, path: drawPoints };
          if (editingRouteId) {
            await updateRoute(editingRouteId, payload);
            showToast("Rota atualizada!");
          } else {
            await createRoute(payload);
            showToast("Rota cadastrada com sucesso!");
          }
          closeAddModal();
          loadAndRender();
        } catch (e) {
          showToast(e.message || "Não foi possível salvar a rota.");
        } finally {
          saveRouteBtn.disabled = false;
          saveRouteBtn.textContent = editingRouteId ? "Salvar alterações" : "Salvar rota";
        }
      });
    }

    // Editar/apagar (delegação de eventos pros botões dentro dos cards de "Minhas Rotas")
    myListEl.addEventListener("click", async (e) => {
      const editBtn = e.target.closest("[data-edit-route]");
      const delBtn = e.target.closest("[data-delete-route]");
      if (editBtn) {
        e.stopPropagation();
        const route = allRoutes.find((r) => String(r.id) === editBtn.dataset.editRoute);
        if (route) openEditModal(route);
        return;
      }
      if (delBtn) {
        e.stopPropagation();
        const id = delBtn.dataset.deleteRoute;
        const route = allRoutes.find((r) => String(r.id) === id);
        if (!confirm('Tem certeza que quer apagar a rota "' + (route ? route.name : "") + '"?')) return;
        try {
          await deleteRoute(id);
          showToast("Rota apagada.");
          loadAndRender();
        } catch (err) {
          showToast(err.message || "Não foi possível apagar a rota.");
        }
      }
    });
  }

  /* ---------------------------------------------------------
     9. AUTENTICAÇÃO (login.php) + guarda de rota
     --------------------------------------------------------- */
  // Páginas que abrem sem login: o login e a página de boas-vindas
  // (index.php, que também abre só pelo endereço da pasta, terminado em "/").
  const PUBLIC_PAGES = ["login.php", "index.php"];

  function isPublicPage() {
    const path = location.pathname;
    return path.endsWith("/") || PUBLIC_PAGES.some((p) => path.endsWith(p));
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
     NOVO: Página Clubes
     --------------------------------------------------------- */
  // Cada clube ganha uma cor fixa (a partir do id) pro brasão
  const CLUB_COLORS = ["#2f7dfd", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
  function clubColor(id) {
    let h = 0;
    String(id).split("").forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    return CLUB_COLORS[h % CLUB_COLORS.length];
  }
  function clubBadgeHtml(club, cls) {
    return '<span class="club-crest ' + (cls || "") + '" style="--club:' + clubColor(club.id) + '" aria-hidden="true">' +
      '<svg viewBox="0 0 40 46"><path d="M20 2 37 8v14c0 11-7.5 18.5-17 22C10.5 40.5 3 33 3 22V8z"/></svg>' +
      "<b>" + gEsc(club.name ? club.name.charAt(0).toUpperCase() : "?") + "</b></span>";
  }

  function initClubes() {
    const listEl = document.getElementById("myClubsList");
    if (!listEl) return; // não é a página de clubes

    let myClubs = [];
    let selectedClubId = null;

    function renderMyClubs() {
      if (!myClubs.length) {
        listEl.innerHTML = emptyBlock("trophy", "Nenhum clube ainda", "Crie um clube pra treinar com a sua turma, ou entre com um código de convite.");
        return;
      }
      listEl.innerHTML = myClubs.map((c) => (
        '<button type="button" class="club-list-item' + (String(c.id) === String(selectedClubId) ? " selected" : "") + '" data-club-id="' + gEsc(c.id) + '"' +
          ' style="--club:' + clubColor(c.id) + '" aria-pressed="' + (String(c.id) === String(selectedClubId) ? "true" : "false") + '">' +
          clubBadgeHtml(c) +
          '<span class="club-list-body">' +
            '<span class="club-list-name">' + gEsc(c.name) + "</span>" +
            '<span class="club-list-meta">' + c.memberCount + " " + gPlural(c.memberCount, "membro", "membros") +
              (c.isAdmin ? ' · <span class="club-admin-tag">Admin</span>' : "") + "</span>" +
          "</span>" +
          '<svg class="club-list-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>' +
        "</button>"
      )).join("");

      listEl.querySelectorAll(".club-list-item").forEach((item) => {
        item.addEventListener("click", () => selectClub(item.dataset.clubId));
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

    async function renderClubDetail(club) {
      const detailEl = document.getElementById("clubDetail");

      // ---- helpers de formatação dos desafios ----
      const METRIC_LABELS = { km: "Distância", activities: "Atividades", hours: "Tempo ativo", days: "Dias ativos" };
      function fmtValue(metric, v) {
        if (metric === "activities" || metric === "days") return String(Math.round(v));
        return v.toFixed(1).replace(".", ",");
      }
      function unitFor(ch, v) {
        const n = Math.round(v);
        if (ch.metric === "activities") return n === 1 ? "atividade" : "atividades";
        if (ch.metric === "days") return n === 1 ? "dia" : "dias";
        return ch.unit;
      }
      function fmtValueUnit(ch, v) { return fmtValue(ch.metric, v) + " " + unitFor(ch, v); }
      function fmtDate(s) {
        const p = String(s).slice(0, 10).split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
      }

      // ---- placar da semana do clube ----
      const lb = club.leaderboard || [];
      const meInClub = lb.find((m) => m.isMe);
      const myPos = meInClub ? lb.indexOf(meInClub) + 1 : null;
      const clubWeekKm = lb.reduce((t, m) => t + (m.weekKm || 0), 0);
      const clubWeekActs = lb.reduce((t, m) => t + (m.weekActivities || 0), 0);
      const clubWeekXp = lb.reduce((t, m) => t + (m.weekXp || 0), 0);
      const daysToReset = 7 - ((new Date().getDay() + 6) % 7);
      const statTile = (tone, icon, value, label) =>
        '<div class="g-stat ' + tone + '"><span class="g-stat-ic" aria-hidden="true">' + icon + "</span>" +
        '<div class="g-stat-body"><div class="g-stat-value">' + value + '</div><div class="g-stat-label">' + label + "</div></div></div>";
      const scoreboardHtml =
        '<div class="g-stats club-scoreboard" aria-label="O clube nesta semana">' +
          statTile("tone-green", '<svg viewBox="0 0 24 24"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
            clubWeekKm.toFixed(1).replace(".", ",") + "<small>km</small>", "juntos nesta semana") +
          statTile("", '<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
            String(clubWeekActs), gPlural(clubWeekActs, "treino do clube", "treinos do clube")) +
          statTile("gold tone-gold", '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
            "+" + clubWeekXp.toLocaleString("pt-BR"), "XP do clube na semana") +
          statTile("tone-violet", '<svg viewBox="0 0 24 24"><path d="M7 4h10v3a5 5 0 0 1-10 0V4z"/><path d="M5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4M10 15h4l1 5H9l1-5z"/></svg>',
            myPos ? myPos + "º<small>de " + lb.length + "</small>" : "—", "sua posição") +
        "</div>";

      // ---- ranking semanal (km) com pódio ----
      const kmTxt = (m) => (m.weekKm || 0).toFixed(1).replace(".", ",") + " km";
      const scoredLb = lb.filter((m) => m.weekKm > 0);
      const podiumMembers = scoredLb.slice(0, 3);
      const restMembers = lb.filter((m) => !podiumMembers.includes(m));
      const rankingHtml = lb.length
        ? (podiumMembers.length ? podiumHtml(podiumMembers, kmTxt) : '<p class="empty-state club-rank-empty">Ninguém pontuou ainda nesta semana. O primeiro treino já vale o 1º lugar!</p>') +
          '<ol class="g-rank-list">' + restMembers.map((m) => (
            '<li class="g-rank-row' + (m.isMe ? " is-me" : "") + '">' +
              '<span class="g-rank-pos">' + (lb.indexOf(m) + 1) + "</span>" +
              rankAvatarHtml(m, "sm") +
              '<a class="g-rank-name" href="' + (m.isMe ? "perfil.php" : "perfil.php?user=" + encodeURIComponent(m.id)) + '">' + (m.isMe ? "Você" : gEsc(m.name)) +
                "<small>" + (m.weekActivities || 0) + " " + gPlural(m.weekActivities || 0, "treino", "treinos") + "</small></a>" +
              '<span class="g-rank-value">' + kmTxt(m) + "</span>" +
            "</li>"
          )).join("") + "</ol>" +
          rivalLineHtml(lb, "weekKm", "km", 1)
        : '<p class="empty-state">Esse clube ainda não tem membros no ranking.</p>';

      let challenge = null;
      let history = [];
      try { challenge = await getChallenge(club.id); } catch (e) { /* ignora */ }
      try { history = await getChallengeHistory(club.id); } catch (e) { /* ignora */ }

      // ---- desafio atual: pódio + lista de progresso ----
      const myId = meInClub ? meInClub.id : null;
      function challengeBodyHtml(ch) {
        const chLb = (ch.leaderboard || []).map((m) => Object.assign({}, m, { isMe: m.id === myId }));
        if (!chLb.length) return '<p class="empty-state challenge-progress-empty">Esse clube ainda não tem membros.</p>';

        const topValue = chLb[0].value || 0;
        const top = chLb.slice(0, 3).filter((m) => m.value > 0);
        const rest = chLb.slice(top.length);
        const podium = top.length
          ? podiumHtml(top, (m) => fmtValueUnit(ch, m.value))
          : '<p class="empty-state challenge-progress-empty">Ninguém pontuou nesse desafio ainda. Quem registrar a primeira atividade sai na frente.</p>';

        const restHtml = rest.length
          ? '<ol class="challenge-progress-list">' +
              rest.map((m, idx) => {
                const pct = topValue > 0 ? Math.max(3, Math.round((m.value / topValue) * 100)) : 0;
                return (
                  '<li class="challenge-progress-row' + (m.isMe ? " is-me" : "") + '">' +
                    '<div class="challenge-progress-pos">' + (top.length + idx + 1) + "º</div>" +
                    rankAvatarHtml(m, "sm") +
                    '<div class="challenge-progress-info">' +
                      '<div class="challenge-progress-name">' + (m.isMe ? "Você" : gEsc(m.name)) + "</div>" +
                      '<div class="challenge-progress-bar"><div class="challenge-progress-bar-fill" style="width:' + pct + '%"></div></div>' +
                    "</div>" +
                    '<div class="challenge-progress-km">' + fmtValueUnit(ch, m.value) + "</div>" +
                  "</li>"
                );
              }).join("") +
            "</ol>"
          : "";
        const dec = ch.metric === "activities" || ch.metric === "days" ? 0 : 1;
        const rival = ch.status === "active" ? rivalLineHtml(chLb, "value", (v) => unitFor(ch, v), dec) : "";
        return podium + restHtml + rival;
      }

      let challengeHtml;
      if (challenge) {
        const statusText = challenge.status === "upcoming"
          ? "Começa em " + fmtDate(challenge.startDate)
          : challenge.daysLeft === 0 ? "Termina hoje"
          : "Termina em " + challenge.daysLeft + (challenge.daysLeft === 1 ? " dia" : " dias");
        challengeHtml =
          '<div class="challenge-card ' + challenge.status + '">' +
            '<div class="challenge-top">' +
              '<div class="challenge-tags">' +
                '<span class="challenge-label">' + (challenge.status === "upcoming" ? "DESAFIO EM BREVE" : "DESAFIO ATIVO") + "</span>" +
                '<span class="metric-badge">' + (METRIC_LABELS[challenge.metric] || "Distância") + "</span>" +
              "</div>" +
              '<span class="challenge-days">' + statusText + "</span>" +
            "</div>" +
            '<div class="challenge-title">' + gEsc(challenge.title) + "</div>" +
            '<div class="challenge-period">' + fmtDate(challenge.startDate) + " até " + fmtDate(challenge.endDate) + "</div>" +
            '<div class="challenge-time-bar"><div class="challenge-time-bar-fill" style="width:' + challenge.elapsedPct + '%"></div></div>' +
            challengeBodyHtml(challenge) +
          "</div>";
      } else {
        challengeHtml =
          '<div class="challenge-empty">' +
            '<div class="challenge-empty-title">Nenhum desafio ativo</div>' +
            "<p>" + (club.isAdmin
              ? "Crie um desafio e faça o clube competir por distância, número de atividades, tempo ativo ou dias ativos."
              : "O administrador do clube ainda não criou um desafio.") + "</p>" +
            (club.isAdmin ? '<button class="btn-primary" id="openChallengeBtn2">Criar desafio</button>' : "") +
          "</div>";
      }

      // ---- histórico de desafios encerrados ----
      const historyHtml = history.length
        ? history.map((h) => (
            '<div class="history-item">' +
              '<div class="history-main">' +
                '<div class="history-title">' + gEsc(h.title) + "</div>" +
                '<div class="history-meta"><span class="metric-badge">' + (METRIC_LABELS[h.metric] || "Distância") + "</span> " +
                  fmtDate(h.startDate) + " - " + fmtDate(h.endDate) + "</div>" +
              "</div>" +
              (h.winner
                ? '<div class="history-winner">' +
                    '<span class="history-trophy" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4h10v3a5 5 0 0 1-10 0V4z"/><path d="M5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4M10 15h4l1 5H9l1-5z"/></svg></span>' +
                    rankAvatarHtml(h.winner, "sm") +
                    "<div>" +
                      '<div class="history-winner-label">Vencedor</div>' +
                      '<div class="history-winner-name">' + (h.winner.id === myId ? "Você" : gEsc(h.winner.name)) + "</div>" +
                      '<div class="history-winner-value">' + fmtValueUnit(h, h.winner.value) + "</div>" +
                    "</div>" +
                  "</div>"
                : '<span class="history-nowinner">Sem vencedor</span>') +
            "</div>"
          )).join("")
        : '<p class="empty-state">Nenhum desafio encerrado ainda.</p>';

      detailEl.innerHTML =
        '<div class="club-hero" style="--club:' + clubColor(club.id) + '">' +
          clubBadgeHtml(club, "lg") +
          '<div class="club-hero-info">' +
            '<h2 class="club-detail-title">' + gEsc(club.name) + "</h2>" +
            '<div class="club-detail-sub">' + (club.description ? gEsc(club.description) : "Sem descrição") + "</div>" +
            '<div class="club-chips">' +
              '<span class="chip">' + club.memberCount + (club.memberCount === 1 ? " membro" : " membros") + "</span>" +
              (club.isAdmin ? '<span class="chip chip-accent">Admin</span>' : "") +
            "</div>" +
          "</div>" +
          '<div class="club-hero-actions">' +
            (club.isAdmin ? '<button class="btn-secondary" id="openChallengeBtn">Criar Desafio</button>' : "") +
            (club.isAdmin ? "" : '<button class="btn-secondary" id="leaveClubBtn">Sair do clube</button>') +
            (club.isAdmin ? (
              '<button class="route-icon-btn" id="editClubBtn" title="Editar clube" aria-label="Editar clube">' +
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path></svg>' +
              "</button>" +
              '<button class="route-icon-btn danger" id="deleteClubBtn" title="Apagar clube" aria-label="Apagar clube">' +
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>' +
              "</button>"
            ) : "") +
          "</div>" +
        "</div>" +
        scoreboardHtml +
        challengeHtml +
        '<div class="club-invite-box">' +
          "<div>" +
            '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Código de convite</div>' +
            '<div class="club-invite-code">' + club.inviteCode + "</div>" +
          "</div>" +
          '<button class="btn-secondary" id="copyInviteBtn">Copiar</button>' +
        "</div>" +
        '<div class="club-columns">' +
          '<section class="card club-rank-card">' +
            '<div class="club-ranking-title"><span>Ranking da semana</span><small>Zera ' + (daysToReset === 1 ? "amanhã" : "em " + daysToReset + " dias") + "</small></div>" +
            rankingHtml +
          "</section>" +
          '<section class="card">' +
            '<div class="club-ranking-title"><span>Histórico de desafios</span></div>' +
            historyHtml +
          "</section>" +
        "</div>";

      ["openChallengeBtn", "openChallengeBtn2"].forEach((btnId) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener("click", () => openChallengeModal(club.id));
      });

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
            document.getElementById("clubDetail").innerHTML = emptyBlock("flag", "Selecione um clube", "Escolha um clube na lista para ver o ranking e os desafios.");
            loadMyClubs();
          } catch (e) {
            showToast(e.message || "Não foi possível sair do clube.");
          }
        });
      }

      const editClubBtn = document.getElementById("editClubBtn");
      if (editClubBtn) {
        editClubBtn.addEventListener("click", () => openEditClubModal(club));
      }
      const deleteClubBtn = document.getElementById("deleteClubBtn");
      if (deleteClubBtn) {
        deleteClubBtn.addEventListener("click", async () => {
          if (!confirm('Tem certeza que quer apagar o clube "' + club.name + '"? Essa ação não pode ser desfeita.')) return;
          try {
            await deleteClub(club.id);
            showToast("Clube apagado.");
            selectedClubId = null;
            document.getElementById("clubDetail").innerHTML = emptyBlock("flag", "Selecione um clube", "Escolha um clube na lista para ver o ranking e os desafios.");
            loadMyClubs();
          } catch (e) {
            showToast(e.message || "Não foi possível apagar o clube.");
          }
        });
      }
    }

    // Modal: editar clube (reaproveita o modal de criar)
    function openEditClubModal(club) {
      const overlay = document.getElementById("createClubOverlay");
      document.querySelector("#createClubOverlay h3").textContent = "Editar Clube";
      document.getElementById("ccName").value = club.name;
      document.getElementById("ccDescription").value = club.description || "";
      document.getElementById("saveCreateClubBtn").textContent = "Salvar alterações";
      overlay.dataset.editingClubId = club.id;
      overlay.classList.add("open");
    }

    // Modal: criar desafio de clube
    function openChallengeModal(clubId) {
      const overlay = document.getElementById("createChallengeOverlay");
      if (!overlay) return;
      document.getElementById("chTitle").value = "";
      const metricSelect = document.getElementById("chMetric");
      if (metricSelect) metricSelect.value = "km";
      // Data LOCAL (toISOString usa UTC e, à noite no Brasil, já devolve o dia seguinte)
      const toLocalISODate = (d) =>
        d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const today = toLocalISODate(new Date());
      const in30days = toLocalISODate(new Date(Date.now() + 30 * 86400000));
      document.getElementById("chStart").value = today;
      document.getElementById("chEnd").value = in30days;
      overlay.classList.add("open");
      overlay.dataset.clubId = clubId;
    }

    const challengeOverlay = document.getElementById("createChallengeOverlay");
    if (challengeOverlay) {
      const cancelBtn = document.getElementById("cancelChallengeBtn");
      const saveBtn = document.getElementById("saveChallengeBtn");
      if (cancelBtn) cancelBtn.addEventListener("click", () => challengeOverlay.classList.remove("open"));
      challengeOverlay.addEventListener("click", (e) => { if (e.target === challengeOverlay) challengeOverlay.classList.remove("open"); });

      if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
          const title = document.getElementById("chTitle").value.trim();
          const startDate = document.getElementById("chStart").value;
          const endDate = document.getElementById("chEnd").value;
          const clubId = challengeOverlay.dataset.clubId;
          const metricEl = document.getElementById("chMetric");
          const metric = metricEl ? metricEl.value : "km";

          if (!title || !startDate || !endDate) {
            showToast("Preencha todos os campos.");
            return;
          }
          if (endDate < startDate) {
            showToast("A data de fim não pode ser antes da data de início.");
            return;
          }
          saveBtn.disabled = true;
          try {
            await createChallenge(clubId, title, startDate, endDate, metric);
            showToast("Desafio criado!");
            challengeOverlay.classList.remove("open");
            selectClub(clubId);
          } catch (e) {
            showToast(e.message || "Não foi possível criar o desafio.");
          } finally {
            saveBtn.disabled = false;
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
        document.querySelector("#createClubOverlay h3").textContent = "Criar Clube";
        saveCreateBtn.textContent = "Criar";
        delete createOverlay.dataset.editingClubId;
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
        const editingId = createOverlay.dataset.editingClubId;
        saveCreateBtn.disabled = true;
        try {
          if (editingId) {
            await updateClub(editingId, name, description);
            showToast("Clube atualizado!");
            createOverlay.classList.remove("open");
            delete createOverlay.dataset.editingClubId;
            await loadMyClubs();
            selectClub(editingId);
          } else {
            const club = await createClub(name, description);
            showToast("Clube criado!");
            createOverlay.classList.remove("open");
            await loadMyClubs();
            selectClub(club.id);
          }
        } catch (e) {
          showToast(e.message || "Não foi possível salvar o clube.");
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
     NOVO: Modo claro / escuro
     --------------------------------------------------------- */
  const THEME_KEY = "trainly_theme";
  const SUN_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  const MOON_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".logo-img").forEach((img) => {
      img.src = theme === "light" ? "img/trainly-icon-light.png" : "img/trainly-icon.png";
    });
  }

  // Preferência de tema: "dark" | "light" | "system" (segue o aparelho).
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function getThemePref() {
    const v = safeGet(THEME_KEY);
    return v === "light" || v === "system" ? v : "dark";
  }
  function resolveTheme(pref) {
    if (pref === "system") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return pref === "light" ? "light" : "dark";
  }
  // Mostra no botão do topo o ícone do modo PRA ONDE vai mudar
  // (lua = "trocar pra escuro" quando já está claro, e vice-versa).
  function paintThemeToggle() {
    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    toggle.innerHTML = isLight ? MOON_ICON : SUN_ICON;
  }
  function setThemePref(pref) {
    safeSet(THEME_KEY, pref);
    applyTheme(resolveTheme(pref));
    paintThemeToggle();
  }

  /* ---------------------------------------------------------
     NOVO: Preferências de acessibilidade (página Configurações)
     Guardadas neste aparelho/navegador, como no app. Cada uma vira um
     atributo no <html> (data-text, data-contrast, data-motion, data-cb)
     que o global.css lê — por isso valem em todas as páginas.
     --------------------------------------------------------- */
  const PREFS_KEY = "trainly_prefs";
  // libras começa LIGADO: quem precisa do VLibras nem sempre sabe que existe a opção
  const PREF_DEFAULTS = {
    textSize: "normal", contrast: false, reduceMotion: false, colorBlind: "none",
    libras: true, legibleFont: false, readingSpacing: false, underlineLinks: false
  };

  function readPrefs() {
    try {
      return Object.assign({}, PREF_DEFAULTS, JSON.parse(safeGet(PREFS_KEY) || "{}"));
    } catch (e) {
      return Object.assign({}, PREF_DEFAULTS);
    }
  }
  function savePrefs(p) {
    safeSet(PREFS_KEY, JSON.stringify(p));
  }
  function applyA11yPrefs(p) {
    const h = document.documentElement;
    const put = (attr, value) => (value ? h.setAttribute(attr, value) : h.removeAttribute(attr));
    put("data-text", p.textSize !== "normal" ? p.textSize : "");
    put("data-contrast", p.contrast ? "high" : "");
    put("data-motion", p.reduceMotion ? "reduce" : "");
    put("data-cb", p.colorBlind !== "none" ? p.colorBlind : "");
    put("data-font", p.legibleFont ? "legible" : "");
    put("data-spacing", p.readingSpacing ? "wide" : "");
    put("data-links", p.underlineLinks ? "underline" : "");
    if (p.legibleFont) loadLegibleFont();
    setVLibras(!!p.libras);
  }

  // Fonte Atkinson Hyperlegible: só é baixada quando a opção é ligada
  function loadLegibleFont() {
    if (document.getElementById("legibleFontCss")) return;
    const link = document.createElement("link");
    link.id = "legibleFontCss";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap";
    document.head.appendChild(link);
  }

  // VLibras (governo federal): traduz o conteúdo do site para Libras com um avatar.
  // Carrega uma vez só, quando ligado; desligar esconde o botão (some de vez no
  // próximo carregamento da página).
  const VLIBRAS_URL = "https://vlibras.gov.br/app";
  function setVLibras(on) {
    const existing = document.querySelector("div[vw]");
    if (!on) {
      if (existing) existing.style.display = "none";
      return;
    }
    if (existing) { existing.style.display = ""; return; }
    if (!document.body || window.__trainlyVLibras) return;
    window.__trainlyVLibras = true;

    const vw = document.createElement("div");
    vw.setAttribute("vw", "");
    vw.className = "enabled";
    const btn = document.createElement("div");
    btn.setAttribute("vw-access-button", "");
    btn.className = "active";
    const wrapper = document.createElement("div");
    wrapper.setAttribute("vw-plugin-wrapper", "");
    const top = document.createElement("div");
    top.className = "vw-plugin-top-wrapper";
    wrapper.appendChild(top);
    vw.appendChild(btn);
    vw.appendChild(wrapper);
    document.body.appendChild(vw);

    const script = document.createElement("script");
    script.src = VLIBRAS_URL + "/vlibras-plugin.js";
    script.async = true;
    script.onload = () => {
      if (!window.VLibras || !window.VLibras.Widget) return;
      new window.VLibras.Widget(VLIBRAS_URL);
      // O widget se liga no "load" da janela; se a página já carregou, dispara na mão
      if (document.readyState === "complete" && typeof window.onload === "function") window.onload();
    };
    script.onerror = () => { window.__trainlyVLibras = false; };
    document.body.appendChild(script);
  }

  let refreshSettingsUi = null; // preenchido por initSettings()

  function initTheme() {
    applyTheme(resolveTheme(getThemePref()));
    applyA11yPrefs(readPrefs());

    // Tema "Sistema": acompanha o aparelho se ele mudar com o site aberto.
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => {
        if (getThemePref() !== "system") return;
        applyTheme(resolveTheme("system"));
        paintThemeToggle();
      };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;
    paintThemeToggle();

    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      setThemePref(current === "light" ? "dark" : "light");
      if (refreshSettingsUi) refreshSettingsUi();
    });
  }

  // Página configuracoes.php
  function initSettings() {
    const root = document.getElementById("settingsPage");
    if (!root) return;
    const groups = root.querySelectorAll(".seg-group[data-pref]");
    const switches = root.querySelectorAll(".switch[data-pref]");

    const valueOf = (key) => (key === "theme" ? getThemePref() : readPrefs()[key]);

    function refresh() {
      groups.forEach((g) => {
        const current = String(valueOf(g.dataset.pref));
        g.querySelectorAll("button[data-value]").forEach((b) => {
          b.setAttribute("aria-pressed", b.dataset.value === current ? "true" : "false");
        });
      });
      const prefs = readPrefs();
      switches.forEach((s) => s.setAttribute("aria-checked", prefs[s.dataset.pref] ? "true" : "false"));
    }

    function setPref(key, value) {
      if (key === "theme") {
        setThemePref(value);
      } else {
        const p = readPrefs();
        p[key] = value;
        savePrefs(p);
        applyA11yPrefs(p);
      }
      refresh();
    }

    groups.forEach((g) => {
      g.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-value]");
        if (b) setPref(g.dataset.pref, b.dataset.value);
      });
    });
    switches.forEach((s) => {
      s.addEventListener("click", () => setPref(s.dataset.pref, !readPrefs()[s.dataset.pref]));
    });

    const reset = document.getElementById("settingsReset");
    if (reset) {
      reset.addEventListener("click", () => {
        savePrefs(Object.assign({}, PREF_DEFAULTS));
        applyA11yPrefs(PREF_DEFAULTS);
        setThemePref("dark");
        refresh();
        showToast("Configurações restauradas");
      });
    }

    refreshSettingsUi = refresh;
    refresh();
    initAccountSettings();
  }

  /* ---------------------------------------------------------
     NOVO: Conta (Configurações) — trocar e-mail e senha
     Sempre pede a senha atual: assim ninguém troca a sua senha
     num computador que você esqueceu logado.
     --------------------------------------------------------- */
  function passwordStrength(pw) {
    const checks = {
      length: pw.length >= 8,
      letters: /[A-Za-zÀ-ÿ]/.test(pw),
      numbers: /\d/.test(pw),
      mixed: /[a-z]/.test(pw) && /[A-Z]/.test(pw) || /[^A-Za-z0-9À-ÿ]/.test(pw)
    };
    let score = 0;
    if (checks.length) score++;
    if (checks.letters && checks.numbers) score++;
    if (checks.mixed) score++;
    if (pw.length >= 12) score++;
    const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
    return { checks, score, label: pw ? labels[score] : "" };
  }

  function initAccountSettings() {
    const card = document.getElementById("accountCard");
    if (!card) return;

    const emailNow = document.getElementById("accEmail");
    const pendingEl = document.getElementById("accPending");

    function showPending(newEmail) {
      if (!pendingEl) return;
      if (newEmail) {
        pendingEl.innerHTML = "";
        const b = document.createElement("b");
        b.textContent = newEmail;
        pendingEl.append("Troca pendente para ", b, ". Abra o link que enviamos para concluir (confira também o e-mail atual e a caixa de spam).");
        pendingEl.hidden = false;
      } else {
        pendingEl.hidden = true;
      }
    }

    apiRequest("/account").then(({ account }) => {
      if (emailNow) emailNow.textContent = account.email || "—";
      showPending(account.newEmail);
    }).catch(() => {
      if (emailNow) emailNow.textContent = "Não foi possível carregar.";
    });

    // Abre/fecha os formulários (um de cada vez)
    card.querySelectorAll("[data-acc-toggle]").forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "true";
        card.querySelectorAll("[data-acc-toggle]").forEach((other) => {
          other.setAttribute("aria-expanded", "false");
          const p = document.getElementById(other.getAttribute("aria-controls"));
          if (p) p.hidden = true;
        });
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        if (panel) {
          panel.hidden = !open;
          if (open) { const first = panel.querySelector("input"); if (first) first.focus(); }
        }
      });
    });

    // Mostrar/ocultar senha
    card.querySelectorAll("[data-show-pass]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.showPass);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-pressed", show ? "true" : "false");
        btn.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
      });
    });

    const setMsg = (el, text, kind) => {
      if (!el) return;
      el.textContent = text || "";
      el.className = "acc-msg" + (kind ? " " + kind : "");
    };

    // ---- Trocar e-mail ----
    const emailForm = document.getElementById("emailForm");
    if (emailForm) {
      const msg = document.getElementById("emailMsg");
      emailForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("newEmail").value.trim();
        const currentPassword = document.getElementById("emailCurrentPass").value;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg(msg, "Digite um e-mail válido.", "error");
        if (!currentPassword) return setMsg(msg, "Digite sua senha atual para confirmar.", "error");
        const submit = emailForm.querySelector("button[type=submit]");
        submit.disabled = true;
        setMsg(msg, "Enviando...", "");
        try {
          const { account } = await apiRequest("/account/email", {
            method: "PUT",
            body: JSON.stringify({ email, currentPassword })
          });
          emailForm.reset();
          setMsg(msg, "Pronto! Enviamos um link de confirmação. A troca só vale depois que você abrir o link.", "ok");
          showPending(account.newEmail || email);
        } catch (err) {
          setMsg(msg, err.message || "Não foi possível trocar o e-mail.", "error");
        } finally {
          submit.disabled = false;
        }
      });
    }

    // ---- Trocar senha ----
    const passForm = document.getElementById("passwordForm");
    if (passForm) {
      const msg = document.getElementById("passMsg");
      const newPass = document.getElementById("newPass");
      const confirmPass = document.getElementById("confirmPass");
      const meter = document.getElementById("passMeter");
      const meterLabel = document.getElementById("passMeterLabel");
      const submit = passForm.querySelector("button[type=submit]");

      function update() {
        const { checks, score, label } = passwordStrength(newPass.value);
        if (meter) meter.dataset.score = newPass.value ? String(score) : "";
        if (meterLabel) meterLabel.textContent = label;
        passForm.querySelectorAll("[data-check]").forEach((li) => {
          const key = li.dataset.check;
          const ok = key === "match"
            ? newPass.value.length > 0 && newPass.value === confirmPass.value
            : key === "lettersNumbers" ? checks.letters && checks.numbers : checks[key];
          li.classList.toggle("ok", !!ok);
        });
        const valid = checks.length && checks.letters && checks.numbers && newPass.value === confirmPass.value;
        submit.disabled = !valid;
      }
      newPass.addEventListener("input", update);
      confirmPass.addEventListener("input", update);
      update();

      passForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById("passCurrent").value;
        if (!currentPassword) return setMsg(msg, "Digite sua senha atual.", "error");
        submit.disabled = true;
        setMsg(msg, "Salvando...", "");
        try {
          await apiRequest("/account/password", {
            method: "PUT",
            body: JSON.stringify({ currentPassword, newPassword: newPass.value })
          });
          passForm.reset();
          update();
          setMsg(msg, "Senha alterada! Use a nova senha no próximo login (no site e no app).", "ok");
        } catch (err) {
          setMsg(msg, err.message || "Não foi possível trocar a senha.", "error");
          update();
        }
      });
    }

    const logoutBtn = document.getElementById("accLogout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        const ok = await confirmDialog({ title: "Sair da conta", message: "Tem certeza que quer sair da sua conta neste aparelho?", confirmLabel: "Sair" });
        if (ok) logout();
      });
    }
  }

  // Aplica tema e acessibilidade já na carga do script (antes do DOMContentLoaded),
  // pra a página não "piscar" no visual padrão.
  applyTheme(resolveTheme(getThemePref()));
  applyA11yPrefs(readPrefs());

  // Alvo do link "Pular para o conteúdo" (primeiro bloco principal da página)
  (function markMainContent() {
    if (document.getElementById("conteudo")) return;
    const main = document.querySelector(".main-container") || document.querySelector("main");
    if (!main) return;
    main.id = main.id || "conteudo";
    if (main.id !== "conteudo") {
      const anchor = document.createElement("span");
      anchor.id = "conteudo";
      anchor.tabIndex = -1;
      main.prepend(anchor);
    } else {
      main.tabIndex = -1;
    }
  })();

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();

    if (isPublicPage()) {
      initNavbar();
      initAuthForms();
      return;
    }

    // Páginas protegidas: sem sessão, manda pra página de boas-vindas (antes
    // de carregar qualquer coisa, inclusive as notificações da navbar).
    if (!(await isLoggedIn())) {
      window.location.href = "index.php";
      return;
    }

    initNavbar();
    initDashboard();
    initPerfil();
    initAmizades();
    initAtividades();
    initExplorar();
    initSettings();
    initClubes();
    initMapa();
    initNavbarAvatar();
  });

  window.Trainly = { getData, levelInfo, xpFromActivity, showToast, logout };
})();