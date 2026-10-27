/* =========================================================
   TRAINLY - boas-vindas.js (só na index.php)
   1. Já está logado? Troca "Entrar / Criar conta" por "Ir para o Início"
   2. Simulador de XP (mesma regra do site: km × 10 + minutos, mínimo 5)
   3. Revelar as seções ao rolar (só se animações estiverem permitidas)
   4. Topo ganha uma linha embaixo depois que a página rola
   5. QR code do app (só quando a index.php tem o link do app)
   Carregar DEPOIS de js/main.js (usa window.Trainly.levelInfo).
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Regras do jogo (as do main.js, com reserva se ele faltar) ---------- */
  function levelInfo(xp) {
    if (window.Trainly && window.Trainly.levelInfo) return window.Trainly.levelInfo(xp);
    let level = 1, toNext = 100, rest = xp;
    while (rest >= toNext) { rest -= toNext; level++; toNext = level * 100; }
    return { level, xpIntoLevel: rest, xpToNext: toNext };
  }
  function xpFromActivity(km, min) {
    if (window.Trainly && window.Trainly.xpFromActivity) return window.Trainly.xpFromActivity(km, min * 60);
    return Math.max(5, Math.round(km * 10 + min));
  }
  // XP total para CHEGAR a um nível (nível 5 = 100 + 200 + 300 + 400 = 1000)
  function xpToReach(level) {
    let total = 0;
    for (let l = 1; l < level; l++) total += l * 100;
    return total;
  }
  const fmt = (n, dec) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });

  function lessMotion() {
    return document.documentElement.getAttribute("data-motion") === "reduce" ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---------- 1. Visitante ou já logado ---------- */
  async function applySessionView() {
    try {
      const api = window.TrainlySupabase;
      if (!api || !(await api.hasSession())) return;
      document.querySelectorAll("[data-guest]").forEach((el) => { el.hidden = true; });
      document.querySelectorAll("[data-member]").forEach((el) => { el.hidden = false; });
    } catch (e) { /* sem sessão: fica a versão de visitante */ }
  }

  /* ---------- 2. Simulador de XP ---------- */
  function initSimulator() {
    const form = document.getElementById("simForm");
    if (!form) return;
    const sport = document.getElementById("simEsporte");
    const kmIn = document.getElementById("simKm");
    const minIn = document.getElementById("simMin");
    const xpEl = document.getElementById("simXp");
    const conta = document.getElementById("simConta");
    const bar = document.getElementById("simBar");
    const nivelEl = document.getElementById("simNivel");
    const metaEl = document.getElementById("simMeta");
    const aviso = document.getElementById("simAviso");
    let lastXp = null;
    let avisoTimer = null;

    const read = (input, max) => {
      const v = parseFloat(String(input.value).replace(",", "."));
      return isFinite(v) && v > 0 ? Math.min(v, max) : 0;
    };

    function render() {
      const km = read(kmIn, 500);
      const min = Math.round(read(minIn, 1440));

      if (km <= 0 || min <= 0) {
        xpEl.textContent = "— XP";
        conta.innerHTML = "Coloque a <b>distância</b><br>e o <b>tempo</b> do treino";
        bar.querySelectorAll("i").forEach((i) => i.classList.remove("on"));
        nivelEl.innerHTML = "Para valer XP, o treino precisa de distância e tempo";
        metaEl.textContent = "";
        lastXp = null;
        return;
      }

      const xp = xpFromActivity(km, min);
      const kmXp = Math.round(km * 10 * 10) / 10;
      xpEl.textContent = "+" + fmt(xp) + " XP";
      if (lastXp !== null && lastXp !== xp && !lessMotion()) {
        xpEl.classList.remove("bump");
        void xpEl.offsetWidth; // reinicia a animação
        xpEl.classList.add("bump");
      }
      lastXp = xp;

      conta.innerHTML =
        fmt(km, km % 1 ? 1 : 0) + " km × 10 = <b>" + fmt(kmXp, kmXp % 1 ? 1 : 0) + "</b><br>" +
        fmt(min) + " minutos = <b>" + fmt(min) + "</b><br>" +
        (xp === 5 && km * 10 + min < 5 ? "Mínimo por treino = " : "Total = ") +
        '<b class="lp-gold">' + fmt(xp) + " XP</b>";

      // Um atleta novo (0 XP) fazendo esse treino
      const info = levelInfo(xp);
      const filled = Math.round((info.xpIntoLevel / info.xpToNext) * 10);
      bar.querySelectorAll("i").forEach((seg, i) => seg.classList.toggle("on", i < filled));
      nivelEl.innerHTML = info.level > 1
        ? "Um atleta novo já iria para o <b>nível " + info.level + "</b>"
        : "Para um atleta novo: <b>" + fmt(xp) + " de 100 XP</b> do nível 1";

      // Quantos treinos assim até a Prata (nível 5) e o Ouro (nível 10)
      const prata = xpToReach(5);
      const ouro = xpToReach(10);
      if (xp < prata) {
        metaEl.innerHTML = "Treinos assim até a <b>Prata</b>: <b>" + fmt(Math.ceil(prata / xp)) + "</b>";
      } else if (xp < ouro) {
        metaEl.innerHTML = "Já chega na <b>Prata</b>! Até o <b>Ouro</b>: <b>" + fmt(Math.ceil(ouro / xp)) + "</b> treinos assim";
      } else {
        metaEl.innerHTML = "Esse treino sozinho já chega no <b>Ouro</b>!";
      }

      // Leitor de tela: avisa o resultado só depois que a pessoa para de digitar
      clearTimeout(avisoTimer);
      avisoTimer = setTimeout(() => {
        aviso.textContent = "Esse treino daria " + fmt(xp) + " XP.";
      }, 700);
    }

    sport.addEventListener("change", () => {
      const opt = sport.options[sport.selectedIndex];
      kmIn.value = opt.dataset.km;
      minIn.value = opt.dataset.min;
      render();
    });
    kmIn.addEventListener("input", render);
    minIn.addEventListener("input", render);
    form.addEventListener("submit", (e) => e.preventDefault());
    render();
  }

  /* ---------- 3. Revelar ao rolar ---------- */
  function initReveal() {
    if (lessMotion() || !("IntersectionObserver" in window)) return;
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    document.documentElement.classList.add("lp-anim");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- 4. Linha no topo ao rolar ---------- */
  function initTopBar() {
    const top = document.querySelector(".lp-top");
    if (!top) return;
    const update = () => top.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- 5. QR code do app ---------- */
  function initQr() {
    const box = document.getElementById("appQr");
    if (!box || typeof window.qrcode !== "function") return;
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(box.dataset.link);
      qr.make();
      box.innerHTML = qr.createSvgTag(4, 0);
    } catch (e) {
      box.hidden = true;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    applySessionView();
    initSimulator();
    initReveal();
    initTopBar();
    initQr();
  });
})();