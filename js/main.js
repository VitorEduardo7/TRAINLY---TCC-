/* =========================================================
   TRAINLY - main.js
   Camada de dados + interações compartilhadas entre páginas.

   IMPORTANTE (leia o README-MELHORIAS.md):
   Este projeto ainda não tem backend/API real. Para o protótipo
   funcionar de ponta a ponta (registrar atividade -> ganhar XP ->
   subir de nível -> refletir no painel e perfil), os dados são
   guardados no localStorage do navegador, no formato exato que
   uma futura API deveria devolver. Trocar por chamadas fetch()
   reais deve exigir mudar só a função getData()/saveData() e as
   funções em ACTIVITY_API abaixo.
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "trainly_user_v1";
  const FOLLOW_KEY = "trainly_following_v1";

  /* ---------------------------------------------------------
     1. SISTEMA DE PATENTES E NÍVEL
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

  // XP acumulado necessário para completar cada nível: nível n custa n*100 XP.
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
     2. CAMADA DE DADOS (substitui a futura API)
     --------------------------------------------------------- */
  function getData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        /* dado corrompido, recomeça */
      }
    }
    return {
      name: "Miguel Bizerra",
      xp: 0,
      activities: [], // { date, distanceKm, durationSec, xpEarned }
      lastDailyReward: null
    };
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getFollowing() {
    const raw = localStorage.getItem(FOLLOW_KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFollowing(list) {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(list));
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

  function recordActivity(distanceKm, durationSec) {
    const data = getData();
    const xpEarned = xpFromActivity(distanceKm, durationSec);
    data.activities.push({
      date: new Date().toISOString(),
      distanceKm,
      durationSec,
      xpEarned
    });
    data.xp += xpEarned;
    saveData(data);
    return { data, xpEarned };
  }

  /* ---------------------------------------------------------
     3. HELPERS DE FORMATAÇÃO
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
     4. TOAST (feedback rápido sem usar alert())
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
    // força reflow para reiniciar a animação se já estava visível
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  /* ---------------------------------------------------------
     5. NAVBAR: menu mobile (hamburger) + notificações
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
  }

  /* ---------------------------------------------------------
     6. WIDGET DE PATENTE (usado no painel e no perfil)
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
     7. INICIALIZAÇÃO POR PÁGINA
     --------------------------------------------------------- */
  function initDashboard() {
    const rankEl = document.getElementById("rankWidget");
    if (!rankEl) return; // não é a página do painel

    const data = getData();
    const stats = computeStats(data);
    const following = getFollowing();

    renderRankWidget(rankEl, data);

    const nameEl = document.getElementById("userName");
    if (nameEl) nameEl.textContent = data.name;

    const followingEl = document.getElementById("statFollowing");
    const activitiesEl = document.getElementById("statActivities");
    if (followingEl) followingEl.textContent = following.length;
    if (activitiesEl) activitiesEl.textContent = stats.totalActivities;

    // Botão "Resgatar" recompensa diária
    const rewardBtn = document.getElementById("rewardBtn");
    if (rewardBtn) {
      const today = new Date().toDateString();
      if (data.lastDailyReward === today) {
        rewardBtn.textContent = "Resgatado hoje";
        rewardBtn.disabled = true;
      }
      rewardBtn.addEventListener("click", () => {
        const fresh = getData();
        const now = new Date().toDateString();
        if (fresh.lastDailyReward === now) return;
        fresh.xp += 20;
        fresh.lastDailyReward = now;
        saveData(fresh);
        showToast("+20 XP resgatados! Volte amanhã para mais.");
        rewardBtn.textContent = "Resgatado hoje";
        rewardBtn.disabled = true;
        renderRankWidget(rankEl, fresh);
      });
    }

    // Se não há nenhuma atividade ainda, avisa no feed em vez de fingir progresso
    const emptyNote = document.getElementById("noActivityNote");
    if (emptyNote && stats.totalActivities === 0) {
      emptyNote.style.display = "block";
    }
  }

  function initPerfil() {
    const rankEl = document.getElementById("rankWidgetPerfil");
    if (!rankEl) return; // não é a página de perfil

    const data = getData();
    const stats = computeStats(data);
    const following = getFollowing();

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

    // Abas Visão Geral / Seguindo / Postagens
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

    // Link do Heatmap ainda não existe de verdade -> avisa em vez de deixar morto
    const heatmapLink = document.querySelector(".banner-link");
    if (heatmapLink) {
      heatmapLink.addEventListener("click", (e) => {
        e.preventDefault();
        showToast("Heatmap em desenvolvimento — precisa de histórico real de rotas 🚧");
      });
    }
  }

  function initAmizades() {
    const grid = document.querySelector(".users-grid");
    if (!grid) return; // não é a página de amizades

    const following = new Set(getFollowing());

    // Marca botões já conectados de visitas anteriores
    document.querySelectorAll(".user-card").forEach((card) => {
      const name = card.querySelector("h3").textContent.trim();
      const btn = card.querySelector(".btn-connect");
      if (following.has(name)) {
        btn.textContent = "Conectado";
        btn.classList.add("connected");
      }
      btn.addEventListener("click", () => {
        const current = getFollowing();
        const idx = current.indexOf(name);
        if (idx === -1) {
          current.push(name);
          btn.textContent = "Conectado";
          btn.classList.add("connected");
          showToast("Você agora está conectado com " + name);
        } else {
          current.splice(idx, 1);
          btn.textContent = "Conectar";
          btn.classList.remove("connected");
        }
        saveFollowing(current);
      });
    });

    // Busca client-side por nome, cidade ou texto de destaque
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
    if (!mapEl) return; // não é a página do mapa

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
      if (typeof L === "undefined") return; // Leaflet não carregou (sem internet)
      map = L.map(mapEl).setView([lat, lon], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);
      marker = L.marker([lat, lon]).addTo(map);
      polyline = L.polyline([], { color: "#267CEE", weight: 5 }).addTo(map);
    }

    // Centraliza o mapa na posição atual assim que a página carrega,
    // mesmo antes de iniciar a atividade.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (gpsStatus) gpsStatus.textContent = "GPS pronto";
          setupMap(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          if (gpsStatus) gpsStatus.textContent = "Sem sinal de GPS — ative a localização";
          setupMap(-23.55, -46.63); // fallback: região de São Paulo
        },
        { enableHighAccuracy: true }
      );
    } else {
      if (gpsStatus) gpsStatus.textContent = "Este navegador não suporta geolocalização";
      setupMap(-23.55, -46.63);
    }

    function toggleWorkout() {
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
                // ignora ruído de GPS parado (< 3 metros)
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
          const { xpEarned } = recordActivity(distanceKm, seconds);
          showToast("Atividade gravada! +" + xpEarned + " XP");
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
     BOOT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initDashboard();
    initPerfil();
    initAmizades();
    initMapa();
  });

  // Exposto globalmente caso algum HTML ainda chame onclick="toggleWorkout()"
  window.Trainly = { getData, saveData, levelInfo, xpFromActivity, showToast };
})();
