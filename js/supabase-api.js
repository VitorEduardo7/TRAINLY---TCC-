/* =========================================================
   TRAINLY - supabase-api.js
   Camada de dados do SITE falando direto com o Supabase, o MESMO banco
   do app. Um clube, atividade, publicação ou seguidor criado no site
   aparece no app (e vice-versa), porque os dois leem e gravam nas
   mesmas tabelas.

   Como funciona: o main.js e o posts.js continuam chamando
   apiRequest("/clubs"), apiRequest("/me")... igual faziam com a API PHP.
   Quando o js/supabase-config.js está com DATA_SOURCE = "supabase", o
   apiRequest repassa a chamada para TrainlySupabase.request(), que
   responde com o MESMO formato que a api/index.php devolvia. Por isso o
   resto do site não precisou mudar.

   Para voltar à API PHP + MySQL antiga, basta trocar DATA_SOURCE para
   "mysql" no js/supabase-config.js.

   Carregar DEPOIS de: supabase-js (CDN) e js/supabase-config.js.
   Carregar ANTES de: js/main.js e js/posts.js.
   ========================================================= */
(function () {
  "use strict";

  const cfg = window.TRAINLY_CONFIG || {};
  const enabled = (cfg.DATA_SOURCE || "supabase") === "supabase";
  const libLoaded = !!(window.supabase && window.supabase.createClient);

  const sb = enabled && libLoaded && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: "trainly-supabase-auth" }
      })
    : null;

  /* ---------------------------------------------------------
     1. ERROS
     --------------------------------------------------------- */
  // Mesmo "contrato" do fetch da API PHP: o main.js só olha a mensagem e,
  // no caso de 401, manda pro login.
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status || 400;
    }
  }

  // Traduz os erros do Supabase/Postgres pra mensagens em português.
  function translateError(error, fallback) {
    if (!error) return new ApiError(fallback || "Erro na requisição", 400);
    const code = error.code || "";
    const msg = String(error.message || "");
    if (code === "42501" || /row-level security|permission denied/i.test(msg)) {
      return new ApiError(fallback || "Você não tem permissão para fazer isso.", 403);
    }
    if (code === "23514") return new ApiError("Algum valor informado não é aceito. Confira os campos.", 400);
    if (code === "23503") return new ApiError("O item relacionado não existe mais.", 404);
    if (code === "PGRST301" || /JWT expired|invalid JWT/i.test(msg)) return new ApiError("Não autenticado", 401);
    if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(msg)) {
      return new ApiError("Sem conexão com o servidor. Confira a internet e tente de novo.", 503);
    }
    return new ApiError(fallback || msg || "Erro na requisição", 400);
  }

  // Desembrulha { data, error } do supabase-js: devolve data ou lança o erro.
  function unwrap(result, fallback) {
    if (result.error) throw translateError(result.error, fallback);
    return result.data;
  }

  /* ---------------------------------------------------------
     2. SESSÃO
     --------------------------------------------------------- */
  async function currentUserId() {
    const { data } = await sb.auth.getSession();
    const id = data && data.session && data.session.user && data.session.user.id;
    if (!id) throw new ApiError("Não autenticado", 401);
    return id;
  }

  async function hasSession() {
    if (!sb) return false;
    const { data } = await sb.auth.getSession();
    return !!(data && data.session);
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
  }

  /* ---------------------------------------------------------
     3. HELPERS DE DATA, NÚMERO E LISTAS
     --------------------------------------------------------- */
  const pad = (n) => String(n).padStart(2, "0");

  // O PHP devolvia datas no horário LOCAL, sem fuso ("2026-10-20T19:30:00").
  // O main.js usa isso em vários lugares (ex.: s.slice(0, 10) pra pegar o
  // dia), então convertemos o timestamptz do Supabase pro mesmo formato.
  function toLocalIso(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function localDateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // "2026-10-20" -> Date local à meia-noite (sem o deslocamento de fuso
  // que new Date("2026-10-20") causaria).
  function parseLocalDate(s, endOfDay) {
    const p = String(s).slice(0, 10).split("-").map(Number);
    return endOfDay ? new Date(p[0], p[1] - 1, p[2], 23, 59, 59) : new Date(p[0], p[1] - 1, p[2], 0, 0, 0);
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Segunda-feira 00:00 da semana atual (igual ao get_week_start() do PHP).
  function startOfWeek() {
    const d = startOfToday();
    const dow = d.getDay(); // 0 = domingo
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return d;
  }

  function num(v) {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function intOrNull(v) {
    if (v === undefined || v === null || v === "") return null;
    const n = parseInt(v, 10);
    return isFinite(n) ? n : null;
  }

  function xpFromActivity(distanceKm, durationSec) {
    return Math.max(5, Math.round(distanceKm * 10 + durationSec / 60));
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  const uniq = (arr) => Array.from(new Set(arr.filter((x) => x !== null && x !== undefined)));

  // O Supabase devolve no máximo 1000 linhas por consulta. Isso aqui busca
  // página por página até acabar (usado em listas que podem crescer, como
  // todas as atividades de alguém).
  async function fetchAllPages(buildQuery) {
    const pageSize = 1000;
    let from = 0;
    let all = [];
    for (;;) {
      const rows = unwrap(await buildQuery().range(from, from + pageSize - 1));
      all = all.concat(rows || []);
      if (!rows || rows.length < pageSize) return all;
      from += pageSize;
    }
  }

  // Consulta com ".in(coluna, ids)" quebrada em partes, pra URL não ficar
  // gigante quando a lista de ids é grande.
  async function selectIn(table, columns, column, ids, extra) {
    if (!ids.length) return [];
    let all = [];
    for (const part of chunk(uniq(ids), 150)) {
      const rows = await fetchAllPages(() => {
        let q = sb.from(table).select(columns).in(column, part);
        if (extra) q = extra(q);
        return q;
      });
      all = all.concat(rows);
    }
    return all;
  }

  // Os N itens mais recentes de um grupo de pessoas (feeds). Cada parte da
  // lista de ids já volta limitada; depois junta, ordena e corta.
  async function latestIn(table, columns, column, ids, dateColumn, limit, extra) {
    if (!ids.length) return [];
    let all = [];
    for (const part of chunk(uniq(ids), 150)) {
      let q = sb.from(table).select(columns).in(column, part);
      if (extra) q = extra(q);
      all = all.concat(unwrap(await q.order(dateColumn, { ascending: false }).limit(limit)) || []);
    }
    all.sort((a, b) => new Date(b[dateColumn]) - new Date(a[dateColumn]));
    return all.slice(0, limit);
  }

  async function countRows(table, filter) {
    const res = await filter(sb.from(table).select("*", { count: "exact", head: true }));
    if (res.error) throw translateError(res.error);
    return res.count || 0;
  }

  async function profilesMap(ids) {
    const rows = await selectIn("profiles", "id, name, avatar_url, location", "id", ids);
    return new Map(rows.map((p) => [p.id, p]));
  }

  async function followingIds(userId) {
    const rows = await fetchAllPages(() => sb.from("following").select("followed_id").eq("follower_id", userId));
    return rows.map((r) => r.followed_id);
  }

  async function followerIds(userId) {
    const rows = await fetchAllPages(() => sb.from("following").select("follower_id").eq("followed_id", userId));
    return rows.map((r) => r.follower_id);
  }

  /* ---------------------------------------------------------
     4. FOTOS (Supabase Storage)
     --------------------------------------------------------- */
  const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

  function validateImage(file, maxMb) {
    if (!IMAGE_TYPES[file.type]) {
      throw new ApiError("Formato de imagem não suportado (use JPG, PNG ou WEBP)", 400);
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new ApiError("Imagem muito grande (máx. " + maxMb + "MB)", 400);
    }
  }

  function randomId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // Envia a imagem pra pasta do próprio usuário (<user_id>/...) e devolve a
  // URL pública. As regras do Storage só deixam cada um gravar na sua pasta.
  async function uploadImage(bucket, userId, file, prefix) {
    const path = userId + "/" + (prefix ? prefix + "-" + Date.now() : randomId()) + "." + IMAGE_TYPES[file.type];
    const res = await sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: true });
    if (res.error) {
      throw new ApiError("Não foi possível enviar a imagem: " + (res.error.message || "erro no envio"), 400);
    }
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  // Apaga um arquivo antigo a partir da URL pública. Se falhar, não atrapalha
  // a ação principal (o arquivo só fica sobrando no Storage).
  async function removeImageByUrl(bucket, url) {
    if (!url) return;
    const marker = "/storage/v1/object/public/" + bucket + "/";
    const idx = url.indexOf(marker);
    if (idx < 0) return;
    const path = decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
    try { await sb.storage.from(bucket).remove([path]); } catch (e) { /* ignora */ }
  }

  /* ---------------------------------------------------------
     5. "BUILDERS": montam os objetos no formato que o main.js espera
        (mesmos nomes de campos do helpers.php)
     --------------------------------------------------------- */
  function mapActivity(a, likesByActivity, viewerId, extra) {
    const likes = likesByActivity.get(a.id) || [];
    return Object.assign({
      id: a.id,
      date: toLocalIso(a.date),
      type: a.type || "Corrida",
      title: a.title,
      photoUrl: a.photo_url || null,
      distanceKm: num(a.distance_km),
      durationSec: num(a.duration_sec),
      heartRate: a.heart_rate !== null && a.heart_rate !== undefined ? num(a.heart_rate) : null,
      elevationM: a.elevation_m !== null && a.elevation_m !== undefined ? num(a.elevation_m) : null,
      xpEarned: num(a.xp_earned),
      likeCount: likes.length,
      likedByMe: likes.includes(viewerId)
    }, extra || {});
  }

  async function likesFor(activityIds) {
    const rows = await selectIn("activity_likes", "activity_id, user_id", "activity_id", activityIds);
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.activity_id)) map.set(r.activity_id, []);
      map.get(r.activity_id).push(r.user_id);
    });
    return map;
  }

  const ACTIVITY_COLUMNS = "id, user_id, date, type, title, photo_url, distance_km, duration_sec, heart_rate, elevation_m, xp_earned";

  // Cache curtinho do /me: várias partes da mesma página pedem os dados do
  // usuário ao mesmo tempo (navbar, dashboard...). Qualquer alteração limpa.
  let meCache = null;
  function clearMeCache() { meCache = null; }

  async function buildUserData(userId) {
    if (meCache && meCache.userId === userId && Date.now() - meCache.at < 3000) return meCache.promise;
    const promise = buildUserDataFresh(userId);
    meCache = { userId, at: Date.now(), promise };
    promise.catch(() => clearMeCache());
    return promise;
  }

  async function buildUserDataFresh(userId) {
    const profile = unwrap(await sb.from("profiles")
      .select("id, name, bio, location, cover_url, avatar_url, xp, monthly_goal_type, monthly_goal_value, last_daily_reward")
      .eq("id", userId).maybeSingle());
    if (!profile) throw new ApiError("Usuário não encontrado", 404);

    const acts = await fetchAllPages(() => sb.from("activities").select(ACTIVITY_COLUMNS)
      .eq("user_id", userId).order("date", { ascending: true }).order("id", { ascending: true }));
    const likes = await likesFor(acts.map((a) => a.id));
    const followersCount = await countRows("following", (q) => q.eq("followed_id", userId));

    let kudos = 0;
    likes.forEach((list) => { kudos += list.length; });

    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      coverPhotoUrl: profile.cover_url || null,
      avatarPhotoUrl: profile.avatar_url || null,
      xp: num(profile.xp),
      monthlyGoalType: profile.monthly_goal_type || "km",
      monthlyGoalValue: num(profile.monthly_goal_value) || 100,
      activities: acts.map((a) => mapActivity(a, likes, userId)),
      followersCount,
      kudosReceived: kudos,
      // Igual ao toDateString() do JS, que é como o dashboard compara
      lastDailyReward: profile.last_daily_reward ? parseLocalDate(profile.last_daily_reward).toDateString() : null
    };
  }

  async function buildPublicProfile(targetId, viewerId) {
    const user = unwrap(await sb.from("profiles")
      .select("id, name, bio, location, cover_url, avatar_url, created_at")
      .eq("id", targetId).maybeSingle());
    if (!user) return null;

    const recent = unwrap(await sb.from("activities").select(ACTIVITY_COLUMNS)
      .eq("user_id", targetId).order("date", { ascending: false }).limit(12));
    const allIds = await fetchAllPages(() => sb.from("activities").select("id").eq("user_id", targetId));
    const likes = await likesFor(allIds.map((a) => a.id));

    let kudos = 0;
    likes.forEach((list) => { kudos += list.length; });

    const [followersCount, followingCount, isFollowingCount] = await Promise.all([
      countRows("following", (q) => q.eq("followed_id", targetId)),
      countRows("following", (q) => q.eq("follower_id", targetId)),
      countRows("following", (q) => q.eq("follower_id", viewerId).eq("followed_id", targetId))
    ]);

    return {
      id: user.id,
      name: user.name,
      bio: user.bio,
      location: user.location,
      coverPhotoUrl: user.cover_url || null,
      avatarPhotoUrl: user.avatar_url || null,
      memberSince: toLocalIso(user.created_at),
      activitiesCount: allIds.length,
      followersCount,
      followingCount,
      kudosReceived: kudos,
      isFollowing: isFollowingCount > 0,
      isSelf: targetId === viewerId,
      activities: recent.map((a) => {
        const m = mapActivity(a, likes, viewerId);
        delete m.heartRate;
        delete m.xpEarned;
        return m;
      })
    };
  }

  // Cards de atleta (busca e sugestões da página Amizades)
  async function buildUserCards(rows, viewerId) {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const monthStart = startOfToday();
    monthStart.setDate(1);

    const [acts, followersRows, theirFollowing, myFollowing] = await Promise.all([
      selectIn("activities", "user_id, distance_km, date", "user_id", ids),
      selectIn("following", "follower_id, followed_id", "followed_id", ids),
      selectIn("following", "follower_id, followed_id", "follower_id", ids),
      followingIds(viewerId)
    ]);
    const mine = new Set(myFollowing);

    return rows.map((r) => {
      const userActs = acts.filter((a) => a.user_id === r.id);
      const kmMonth = userActs
        .filter((a) => new Date(a.date) >= monthStart)
        .reduce((s, a) => s + num(a.distance_km), 0);
      const mutualCount = theirFollowing.filter((f) => f.follower_id === r.id && mine.has(f.followed_id)).length;
      return {
        id: r.id,
        name: r.name,
        location: r.location || null,
        avatarPhotoUrl: r.avatar_url || null,
        kmMonth,
        activitiesCount: userActs.length,
        followersCount: followersRows.filter((f) => f.followed_id === r.id).length,
        mutualCount,
        isFollowing: mine.has(r.id)
      };
    });
  }

  // Soma do km da semana de cada pessoa (rankings de amigos e de clube)
  async function weekKmBy(userIds) {
    const acts = await selectIn("activities", "user_id, distance_km", "user_id", userIds,
      (q) => q.gte("date", startOfWeek().toISOString()));
    const km = new Map(userIds.map((id) => [id, 0]));
    acts.forEach((a) => km.set(a.user_id, (km.get(a.user_id) || 0) + num(a.distance_km)));
    return km;
  }

  function sortByValueThenName(list, key) {
    return list.sort((a, b) => (b[key] - a[key]) || String(a.name).localeCompare(String(b.name), "pt-BR"));
  }

  // ---- Clubes ----
  async function buildClubs(clubs, viewerId) {
    if (!clubs.length) return [];
    const members = await selectIn("club_members", "club_id, user_id, role", "club_id", clubs.map((c) => c.id));
    return clubs.map((c) => {
      const clubMembers = members.filter((m) => m.club_id === c.id);
      const me = clubMembers.find((m) => m.user_id === viewerId);
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        inviteCode: c.invite_code,
        memberCount: clubMembers.length,
        isMember: !!me,
        // Admin = papel "admin" no clube (mesma regra do app). Quem cria o
        // clube já entra como admin automaticamente.
        isAdmin: !!(me && me.role === "admin"),
        isOwner: c.created_by === viewerId
      };
    });
  }

  async function clubMembersWithProfiles(clubId) {
    const members = unwrap(await sb.from("club_members").select("user_id, role, silenced").eq("club_id", clubId));
    const profiles = await profilesMap(members.map((m) => m.user_id));
    return members.map((m) => {
      const p = profiles.get(m.user_id) || {};
      return { id: m.user_id, name: p.name || "Atleta", avatarPhotoUrl: p.avatar_url || null, role: m.role, silenced: !!m.silenced };
    });
  }

  async function buildClubLeaderboard(clubId) {
    // Membro silenciado pelo admin fica fora dos rankings do clube (mesma
    // regra que o app usa nos desafios e na Guerra de Clã).
    const members = (await clubMembersWithProfiles(clubId)).filter((m) => !m.silenced);
    const km = await weekKmBy(members.map((m) => m.id));
    return sortByValueThenName(members.map((m) => ({
      id: m.id, name: m.name, avatarPhotoUrl: m.avatarPhotoUrl, weekKm: km.get(m.id) || 0
    })), "weekKm");
  }

  // ---- Desafios de clube ----
  const METRICS = {
    km: { unit: "km", value: (acts) => acts.reduce((s, a) => s + num(a.distance_km), 0) },
    activities: { unit: "atividades", value: (acts) => acts.length },
    hours: { unit: "h", value: (acts) => acts.reduce((s, a) => s + num(a.duration_sec), 0) / 3600 },
    days: { unit: "dias", value: (acts) => new Set(acts.map((a) => localDateStr(new Date(a.date)))).size }
  };

  // Monta vários desafios de uma vez, com uma consulta só de atividades.
  async function buildChallenges(rows, clubId) {
    if (!rows.length) return [];
    const members = (await clubMembersWithProfiles(clubId)).filter((m) => !m.silenced);
    const minStart = rows.reduce((min, c) => (c.start_date < min ? c.start_date : min), rows[0].start_date);
    const maxEnd = rows.reduce((max, c) => (c.end_date > max ? c.end_date : max), rows[0].end_date);
    const rangeEnd = parseLocalDate(maxEnd);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    const acts = await selectIn("activities", "user_id, date, distance_km, duration_sec", "user_id",
      members.map((m) => m.id),
      (q) => q.gte("date", parseLocalDate(minStart).toISOString()).lt("date", rangeEnd.toISOString()));

    return rows.map((c) => buildChallenge(c, members, acts));
  }

  function buildChallenge(c, members, allActs) {
    const metric = METRICS[c.metric] ? c.metric : "km";
    const start = parseLocalDate(c.start_date);
    const endExclusive = parseLocalDate(c.end_date);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const inRange = allActs.filter((a) => {
      const d = new Date(a.date);
      return d >= start && d < endExclusive;
    });

    const leaderboard = sortByValueThenName(members.map((m) => ({
      id: m.id,
      name: m.name,
      avatarPhotoUrl: m.avatarPhotoUrl,
      value: METRICS[metric].value(inRange.filter((a) => a.user_id === m.id))
    })), "value");

    const today = localDateStr(new Date());
    const startTs = start.getTime();
    const endTs = parseLocalDate(c.end_date, true).getTime();
    const now = Date.now();
    const status = c.end_date < today ? "finished" : c.start_date > today ? "upcoming" : "active";
    const totalDays = Math.max(1, Math.round((endTs - startTs) / 86400000));
    const elapsedPct = status === "finished" ? 100 : status === "upcoming" ? 0
      : Math.min(100, Math.max(0, Math.round(((now - startTs) / (endTs - startTs)) * 100)));
    const winner = status === "finished" && leaderboard.length && leaderboard[0].value > 0 ? leaderboard[0] : null;

    return {
      id: c.id,
      title: c.title,
      metric,
      unit: METRICS[metric].unit,
      startDate: c.start_date,
      endDate: c.end_date,
      status,
      totalDays,
      elapsedPct,
      daysLeft: Math.max(0, Math.ceil((endTs - now) / 86400000)),
      leaderboard,
      winner
    };
  }

  // ---- Publicações ----
  async function buildPosts(rows, viewerId) {
    if (!rows.length) return [];
    const ids = rows.map((p) => p.id);
    const [likes, comments, iFollow, followMe] = await Promise.all([
      selectIn("post_likes", "post_id, user_id", "post_id", ids),
      selectIn("post_comments", "id, post_id, user_id, content, created_at", "post_id", ids,
        (q) => q.order("created_at", { ascending: true })),
      followingIds(viewerId),
      followerIds(viewerId)
    ]);
    const profiles = await profilesMap(rows.map((p) => p.user_id).concat(comments.map((c) => c.user_id)));
    const friends = new Set(iFollow.concat(followMe));

    return rows.map((p) => {
      const author = profiles.get(p.user_id) || {};
      const postLikes = likes.filter((l) => l.post_id === p.id);
      return {
        id: p.id,
        authorId: p.user_id,
        authorName: author.name || "Atleta",
        authorAvatarUrl: author.avatar_url || null,
        content: p.content,
        photoUrl: p.photo_url || null,
        date: toLocalIso(p.created_at),
        likeCount: postLikes.length,
        likedByMe: postLikes.some((l) => l.user_id === viewerId),
        canLike: p.user_id === viewerId || friends.has(p.user_id),
        isMine: p.user_id === viewerId,
        comments: comments.filter((c) => c.post_id === p.id).map((c) => mapPostComment(c, profiles))
      };
    });
  }

  function mapPostComment(c, profiles) {
    const u = profiles.get(c.user_id) || {};
    return {
      id: c.id,
      userId: c.user_id,
      userName: u.name || "Atleta",
      userAvatarUrl: u.avatar_url || null,
      content: c.content,
      date: toLocalIso(c.created_at)
    };
  }

  // ---- Rotas ----
  function mapRoute(r, creatorName, viewerId) {
    const path = Array.isArray(r.path) ? r.path : [];
    const first = path[0] || [0, 0];
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      difficulty: r.difficulty,
      terrain: r.terrain,
      distanceKm: num(r.distance_km),
      elevationM: num(r.elevation_m),
      ratingAvg: null,   // avaliação de rotas ainda não existe no banco do app
      ratingCount: 0,
      startLat: num(first[0]),
      startLng: num(first[1]),
      path,
      creatorId: r.created_by,
      creatorName: creatorName || null,
      isMine: r.created_by === viewerId
    };
  }

  function routePayload(body) {
    const name = String(body.name || "").trim();
    const distanceKm = num(body.distanceKm);
    const path = Array.isArray(body.path) ? body.path : [];
    if (!name || distanceKm <= 0 || path.length < 2) {
      throw new ApiError("Preencha o nome, a distância e marque ao menos 2 pontos no mapa", 400);
    }
    return {
      name,
      type: String(body.type || "").trim() || "Corrida",
      difficulty: String(body.difficulty || "").trim() || "Moderada",
      terrain: String(body.terrain || "").trim() || null,
      distance_km: distanceKm,
      elevation_m: intOrNull(body.elevationM) || 0,
      path: path.map((p) => [num(p[0]), num(p[1])])
    };
  }

  // ---- Notificações ----
  async function buildNotifications(userId) {
    const rows = unwrap(await sb.from("notifications")
      .select("id, type, actor_id, activity_id, post_id, club_id, challenge_id, item_count, read_at, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(20));

    const [actors, acts, challenges, clubs] = await Promise.all([
      profilesMap(rows.map((n) => n.actor_id)),
      selectIn("activities", "id, title", "id", rows.map((n) => n.activity_id)),
      selectIn("club_challenges", "id, title", "id", rows.map((n) => n.challenge_id)),
      selectIn("clubs", "id, name", "id", rows.map((n) => n.club_id))
    ]);
    const title = (list, id, key) => { const x = list.find((i) => i.id === id); return x ? x[key] : null; };

    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      actorId: n.actor_id,
      actorName: (actors.get(n.actor_id) || {}).name || "Alguém",
      activityId: n.activity_id,
      activityTitle: title(acts, n.activity_id, "title"),
      postId: n.post_id,
      count: num(n.item_count) || 1,
      clubId: n.club_id,
      clubName: title(clubs, n.club_id, "name"),
      challengeTitle: title(challenges, n.challenge_id, "title"),
      read: n.read_at !== null,
      date: toLocalIso(n.created_at)
    }));
  }

  /* ---------------------------------------------------------
     6. ROTAS (mesmos caminhos da api/index.php)
     --------------------------------------------------------- */
  function readBody(options) {
    const body = options.body;
    if (!body) return {};
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const out = {};
      body.forEach((value, key) => { out[key] = value; });
      return out;
    }
    if (typeof body === "string") {
      try { return JSON.parse(body); } catch (e) { return {}; }
    }
    return body;
  }

  function fileFrom(body, key) {
    const f = body[key];
    return f && typeof f === "object" && "size" in f && f.size > 0 ? f : null;
  }

  async function activityOwnedBy(activityId, userId) {
    const a = unwrap(await sb.from("activities").select("id, user_id, photo_url, xp_earned").eq("id", activityId).maybeSingle());
    if (!a) throw new ApiError("Atividade não encontrada", 404);
    if (a.user_id !== userId) throw new ApiError("Você só pode alterar suas próprias atividades", 403);
    return a;
  }

  function activityFields(body) {
    const distanceKm = num(body.distanceKm);
    const durationSec = Math.round(num(body.durationSec));
    if (distanceKm <= 0 || durationSec <= 0) {
      throw new ApiError("distanceKm e durationSec são obrigatórios", 400);
    }
    const title = body.title !== undefined && String(body.title).trim() !== "" ? String(body.title).trim() : null;
    return {
      type: String(body.type || "").trim() || "Corrida",
      title,
      distance_km: distanceKm,
      duration_sec: durationSec,
      heart_rate: intOrNull(body.heartRate),
      elevation_m: intOrNull(body.elevationM),
      // O banco recalcula esse valor se o xp_seguro.sql estiver instalado
      xp_earned: xpFromActivity(distanceKm, durationSec)
    };
  }

  async function postVisible(postId) {
    const p = unwrap(await sb.from("posts").select("id, user_id, photo_url").eq("id", postId).maybeSingle());
    if (!p) throw new ApiError("Publicação não encontrada", 404);
    return p;
  }

  async function clubById(clubId) {
    const c = unwrap(await sb.from("clubs").select("*").eq("id", clubId).maybeSingle());
    if (!c) throw new ApiError("Clube não encontrado", 404);
    return c;
  }

  async function isClubAdmin(clubId, userId) {
    const m = unwrap(await sb.from("club_members").select("role").eq("club_id", clubId).eq("user_id", userId).maybeSingle());
    return !!(m && m.role === "admin");
  }

  // [método, regex do caminho, função(match, body, query)]
  const ROUTES = [
    // ---------- Autenticação ----------
    ["POST", /^auth\/register$/, async (m, body) => {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      const password = String(body.password || "");
      if (!name || !email || password.length < 8) {
        throw new ApiError("Preencha nome, e-mail e senha (mín. 8 caracteres)", 400);
      }
      const res = await sb.auth.signUp({ email, password, options: { data: { name } } });
      if (res.error) {
        if (/already registered|already exists/i.test(res.error.message)) {
          throw new ApiError("Já existe uma conta com esse e-mail", 409);
        }
        if (/password/i.test(res.error.message)) throw new ApiError("Senha fraca: use pelo menos 8 caracteres.", 400);
        if (/email/i.test(res.error.message)) throw new ApiError("E-mail inválido.", 400);
        throw translateError(res.error, "Não foi possível criar a conta.");
      }
      // Com "confirmar e-mail" ligado no Supabase, o e-mail já usado volta
      // como um usuário sem identidades, e o cadastro novo volta sem sessão.
      if (res.data.user && Array.isArray(res.data.user.identities) && res.data.user.identities.length === 0) {
        throw new ApiError("Já existe uma conta com esse e-mail", 409);
      }
      if (!res.data.session) {
        throw new ApiError("Conta criada! Confirme seu e-mail pelo link que enviamos e depois faça login.", 400);
      }
      clearMeCache();
      return { token: "supabase", data: await buildUserData(res.data.user.id) };
    }],

    ["POST", /^auth\/login$/, async (m, body) => {
      const email = String(body.email || "").trim();
      const password = String(body.password || "");
      const res = await sb.auth.signInWithPassword({ email, password });
      if (res.error) {
        if (/not confirmed/i.test(res.error.message)) throw new ApiError("Confirme seu e-mail antes de entrar.", 400);
        if (/invalid login|invalid credentials/i.test(res.error.message)) throw new ApiError("E-mail ou senha inválidos", 400);
        throw translateError(res.error, "Não foi possível entrar.");
      }
      clearMeCache();
      return { token: "supabase", data: await buildUserData(res.data.user.id) };
    }],

    ["GET", /^me$/, async (m, body, query, me) => ({ data: await buildUserData(me) })],

    // ---------- Atividades ----------
    ["POST", /^activities$/, async (m, body, query, me) => {
      const fields = activityFields(body);
      const photo = fileFrom(body, "photo");
      if (photo) {
        validateImage(photo, 5);
        fields.photo_url = await uploadImage("activity-photos", me, photo);
      }
      const row = unwrap(await sb.from("activities").insert(Object.assign({ user_id: me }, fields)).select("xp_earned").single(),
        "Erro ao salvar atividade");
      clearMeCache();
      return { data: await buildUserData(me), xpEarned: num(row.xp_earned) };
    }],

    ["GET", /^activities\/summary$/, async (m, body, query, me) => {
      const daysMap = { week: 7, month: 30, "6months": 182, year: 365 };
      const period = daysMap[query.get("period")] ? query.get("period") : "year";
      const days = daysMap[period];
      const since = startOfToday();
      since.setDate(since.getDate() - days);

      const rows = await fetchAllPages(() => sb.from("activities").select("date, distance_km, duration_sec, elevation_m")
        .eq("user_id", me).gte("date", since.toISOString()).order("date", { ascending: true }));

      const daySet = new Set(rows.map((r) => localDateStr(new Date(r.date))));
      const activeDays = Array.from(daySet).sort();
      let longest = 0;
      let current = 0;
      let prev = null;
      activeDays.forEach((d) => {
        const diff = prev ? Math.round((parseLocalDate(d) - parseLocalDate(prev)) / 86400000) : 0;
        current = prev && diff === 1 ? current + 1 : 1;
        longest = Math.max(longest, current);
        prev = d;
      });

      return { data: {
        period,
        distanceKm: Math.round(rows.reduce((s, r) => s + num(r.distance_km), 0) * 100) / 100,
        durationSec: rows.reduce((s, r) => s + num(r.duration_sec), 0),
        elevationM: rows.reduce((s, r) => s + num(r.elevation_m), 0),
        activitiesCount: rows.length,
        activeDays: activeDays.length,
        longestStreak: longest,
        consistencyRate: Math.round((activeDays.length / days) * 100),
        totalDays: days
      } };
    }],

    ["POST", /^activities\/([^/]+)\/like$/, async (m, body, query, me, method) => likeToggle("activity_likes", "activity_id", m[1], me, method,
      "Você não pode curtir essa atividade.")],
    ["DELETE", /^activities\/([^/]+)\/like$/, async (m, body, query, me, method) => likeToggle("activity_likes", "activity_id", m[1], me, method)],

    ["PUT", /^activities\/([^/]+)$/, async (m, body, query, me) => {
      const old = await activityOwnedBy(m[1], me);
      const fields = activityFields(body);
      const row = unwrap(await sb.from("activities").update(fields).eq("id", m[1]).eq("user_id", me).select("xp_earned").single(),
        "Erro ao editar atividade");
      clearMeCache();
      return { data: await buildUserData(me), xpDelta: num(row.xp_earned) - num(old.xp_earned) };
    }],

    ["DELETE", /^activities\/([^/]+)$/, async (m, body, query, me) => {
      const old = await activityOwnedBy(m[1], me);
      unwrap(await sb.from("activities").delete().eq("id", m[1]).eq("user_id", me), "Erro ao excluir atividade");
      await removeImageByUrl("activity-photos", old.photo_url);
      clearMeCache();
      return { data: await buildUserData(me), xpRemoved: num(old.xp_earned) };
    }],

    // ---------- Recompensa diária ----------
    ["POST", /^reward$/, async (m, body, query, me) => {
      const res = await sb.rpc("claim_daily_reward");
      if (res.error) {
        if (/already_claimed/.test(res.error.message)) throw new ApiError("Recompensa de hoje já foi resgatada", 409);
        throw translateError(res.error);
      }
      clearMeCache();
      return { data: await buildUserData(me) };
    }],

    // ---------- Pessoas ----------
    ["GET", /^users\/search$/, async (m, body, query, me) => {
      const q = String(query.get("q") || "").trim();
      if (q.length < 2) return { users: [] };
      const pattern = "%" + q.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
      const rows = unwrap(await sb.from("profiles").select("id, name, location, avatar_url")
        .neq("id", me).ilike("name", pattern).order("name", { ascending: true }).limit(20));
      return { users: await buildUserCards(rows, me) };
    }],

    ["GET", /^users\/suggested$/, async (m, body, query, me) => {
      const [rows, mine] = await Promise.all([
        sb.from("profiles").select("id, name, location, avatar_url").neq("id", me).limit(300).then((r) => unwrap(r)),
        followingIds(me)
      ]);
      const following = new Set(mine);
      const candidates = rows.filter((r) => !following.has(r.id));
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      return { users: await buildUserCards(candidates.slice(0, 8), me) };
    }],

    ["GET", /^users\/([^/]+)\/profile$/, async (m, body, query, me) => {
      const profile = await buildPublicProfile(m[1], me);
      if (!profile) throw new ApiError("Usuário não encontrado", 404);
      return { profile };
    }],

    ["GET", /^users\/([^/]+)\/posts$/, async (m, body, query, me) => {
      // A regra de "só amigos veem" fica no banco: pra quem não é amigo, a
      // consulta já volta vazia.
      const rows = unwrap(await sb.from("posts").select("*").eq("user_id", m[1])
        .order("created_at", { ascending: false }).limit(30));
      return { posts: await buildPosts(rows, me) };
    }],

    ["GET", /^friends\/leaderboard$/, async (m, body, query, me) => {
      const ids = await followingIds(me);
      const [profiles, km] = await Promise.all([profilesMap(ids), weekKmBy(ids)]);
      const list = ids.map((id) => {
        const p = profiles.get(id) || {};
        return { id, name: p.name || "Atleta", avatarPhotoUrl: p.avatar_url || null, weekKm: km.get(id) || 0 };
      });
      return { leaderboard: sortByValueThenName(list, "weekKm").slice(0, 10) };
    }],

    ["GET", /^following$/, async (m, body, query, me) => {
      const ids = await followingIds(me);
      const profiles = await profilesMap(ids);
      const list = ids.map((id) => ({ id, name: (profiles.get(id) || {}).name || "Atleta" }));
      list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      return { following: list };
    }],

    ["POST", /^following\/([^/]+)$/, async (m, body, query, me) => {
      if (m[1] === me) throw new ApiError("Você não pode seguir a si mesmo", 400);
      const res = await sb.from("following").insert({ follower_id: me, followed_id: m[1] });
      if (res.error && res.error.code !== "23505") throw translateError(res.error, "Não é possível seguir esse atleta.");
      clearMeCache();
      return { ok: true };
    }],

    ["DELETE", /^following\/([^/]+)$/, async (m, body, query, me) => {
      if (m[1] === me) throw new ApiError("Você não pode seguir a si mesmo", 400);
      unwrap(await sb.from("following").delete().eq("follower_id", me).eq("followed_id", m[1]));
      clearMeCache();
      return { ok: true };
    }],

    // ---------- Feed ----------
    ["GET", /^feed$/, async (m, body, query, me) => {
      const ids = [me].concat(await followingIds(me));
      const top = await latestIn("activities", ACTIVITY_COLUMNS, "user_id", ids, "date", 30);
      const [likes, authors] = await Promise.all([likesFor(top.map((a) => a.id)), profilesMap(top.map((a) => a.user_id))]);
      return { feed: top.map((a) => {
        const author = authors.get(a.user_id) || {};
        const item = mapActivity(a, likes, me, {
          authorId: a.user_id,
          authorName: author.name || "Atleta",
          authorAvatarUrl: author.avatar_url || null
        });
        delete item.heartRate;
        delete item.xpEarned;
        return item;
      }) };
    }],

    ["GET", /^feed\/active-today$/, async (m, body, query, me) => {
      const ids = await followingIds(me);
      const rows = await selectIn("activities", "user_id, type, distance_km, date", "user_id", ids,
        (q) => q.gte("date", startOfToday().toISOString()));
      rows.sort((a, b) => new Date(b.date) - new Date(a.date));
      const profiles = await profilesMap(rows.map((r) => r.user_id));
      const seen = new Set();
      const active = [];
      rows.forEach((r) => {
        if (seen.has(r.user_id)) return;
        seen.add(r.user_id);
        const p = profiles.get(r.user_id) || {};
        active.push({ id: r.user_id, name: p.name || "Atleta", avatarPhotoUrl: p.avatar_url || null, type: r.type || "Corrida", distanceKm: num(r.distance_km) });
      });
      return { active };
    }],

    // ---------- Publicações ----------
    ["POST", /^posts$/, async (m, body, query, me) => {
      const content = String(body.content || "").trim();
      const photo = fileFrom(body, "photo");
      if (!content && !photo) throw new ApiError("Escreva algo ou anexe uma foto para publicar", 400);
      if (content.length > 2000) throw new ApiError("Publicação muito longa (máx. 2000 caracteres)", 400);
      let photoUrl = null;
      if (photo) {
        validateImage(photo, 5);
        photoUrl = await uploadImage("post-photos", me, photo);
      }
      const row = unwrap(await sb.from("posts").insert({ user_id: me, content: content || null, photo_url: photoUrl }).select("*").single());
      return { post: (await buildPosts([row], me))[0] };
    }],

    ["GET", /^posts\/feed$/, async (m, body, query, me) => {
      const ids = [me].concat(await followingIds(me));
      const rows = await latestIn("posts", "*", "user_id", ids, "created_at", 30);
      return { feed: await buildPosts(rows, me) };
    }],

    ["GET", /^posts\/mine$/, async (m, body, query, me) => {
      const rows = unwrap(await sb.from("posts").select("*").eq("user_id", me).order("created_at", { ascending: false }).limit(30));
      return { posts: await buildPosts(rows, me) };
    }],

    ["DELETE", /^posts\/([^/]+)$/, async (m, body, query, me) => {
      const post = await postVisible(m[1]);
      if (post.user_id !== me) throw new ApiError("Você só pode apagar suas próprias publicações", 403);
      unwrap(await sb.from("posts").delete().eq("id", m[1]));
      await removeImageByUrl("post-photos", post.photo_url);
      return { ok: true };
    }],

    ["POST", /^posts\/([^/]+)\/like$/, async (m, body, query, me, method) => {
      await postVisible(m[1]);
      return likeToggle("post_likes", "post_id", m[1], me, method, "Você só pode curtir publicações de quem é seu amigo");
    }],
    ["DELETE", /^posts\/([^/]+)\/like$/, async (m, body, query, me, method) => {
      await postVisible(m[1]);
      return likeToggle("post_likes", "post_id", m[1], me, method);
    }],

    ["GET", /^posts\/([^/]+)\/comments$/, async (m, body, query, me) => {
      await postVisible(m[1]);
      const rows = unwrap(await sb.from("post_comments").select("id, post_id, user_id, content, created_at")
        .eq("post_id", m[1]).order("created_at", { ascending: true }));
      const profiles = await profilesMap(rows.map((c) => c.user_id));
      return { comments: rows.map((c) => mapPostComment(c, profiles)) };
    }],

    ["POST", /^posts\/([^/]+)\/comments$/, async (m, body, query, me) => {
      await postVisible(m[1]);
      const content = String(body.content || "").trim();
      if (!content) throw new ApiError("Escreva um comentário", 400);
      if (content.length > 500) throw new ApiError("Comentário muito longo (máx. 500 caracteres)", 400);
      const row = unwrap(await sb.from("post_comments").insert({ post_id: m[1], user_id: me, content })
        .select("id, post_id, user_id, content, created_at").single(),
        "Você só pode comentar em publicações de quem é seu amigo");
      return { comment: mapPostComment(row, await profilesMap([me])) };
    }],

    // ---------- Rotas (página Explorar) ----------
    ["GET", /^routes$/, async (m, body, query, me) => {
      const type = String(query.get("type") || "Todos").trim();
      const ids = [me].concat(await followingIds(me));
      const rows = await selectIn("routes", "*", "created_by", ids, (q) => {
        let qq = q.order("created_at", { ascending: false });
        if (type && type !== "Todos") qq = qq.eq("type", type);
        return qq;
      });
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const creators = await profilesMap(rows.map((r) => r.created_by));
      return { routes: rows.map((r) => mapRoute(r, (creators.get(r.created_by) || {}).name, me)) };
    }],

    ["POST", /^routes$/, async (m, body, query, me) => {
      const row = unwrap(await sb.from("routes").insert(Object.assign({ created_by: me }, routePayload(body))).select("*").single());
      return { route: mapRoute(row, (await profilesMap([me])).get(me).name, me) };
    }],

    ["PUT", /^routes\/([^/]+)$/, async (m, body, query, me) => {
      await routeOwnedBy(m[1], me);
      const row = unwrap(await sb.from("routes").update(routePayload(body)).eq("id", m[1]).select("*").single());
      return { route: mapRoute(row, (await profilesMap([me])).get(me).name, me) };
    }],

    ["DELETE", /^routes\/([^/]+)$/, async (m, body, query, me) => {
      await routeOwnedBy(m[1], me);
      unwrap(await sb.from("routes").delete().eq("id", m[1]));
      return { ok: true };
    }],

    // ---------- Perfil ----------
    ["PUT", /^profile$/, async (m, body, query, me) => {
      const name = String(body.name || "").trim();
      const bio = body.bio !== undefined && body.bio !== null ? String(body.bio).trim() : null;
      const location = body.location !== undefined && body.location !== null ? String(body.location).trim() : null;
      if (!name) throw new ApiError("O nome não pode ficar vazio", 400);
      if (bio && bio.length > 280) throw new ApiError("A bio pode ter no máximo 280 caracteres", 400);
      unwrap(await sb.from("profiles").update({ name, bio: bio || null, location: location || null }).eq("id", me));
      clearMeCache();
      return { data: await buildUserData(me) };
    }],

    ["PUT", /^profile\/goal$/, async (m, body, query, me) => {
      const goalType = String(body.goalType || "").trim();
      const goalValue = num(body.goalValue);
      if (!["km", "activities", "hours"].includes(goalType)) throw new ApiError("Tipo de meta inválido", 400);
      if (goalValue <= 0) throw new ApiError("Informe um valor de meta maior que zero", 400);
      unwrap(await sb.from("profiles").update({ monthly_goal_type: goalType, monthly_goal_value: goalValue }).eq("id", me));
      clearMeCache();
      return { data: await buildUserData(me) };
    }],

    ["POST", /^profile\/cover$/, async (m, body, query, me) => {
      const file = fileFrom(body, "cover");
      if (!file) throw new ApiError("Nenhuma imagem enviada", 400);
      validateImage(file, 8);
      const old = unwrap(await sb.from("profiles").select("cover_url").eq("id", me).single());
      const url = await uploadImage("covers", me, file, "cover");
      unwrap(await sb.from("profiles").update({ cover_url: url }).eq("id", me));
      await removeImageByUrl("covers", old && old.cover_url);
      clearMeCache();
      return { data: await buildUserData(me) };
    }],

    ["POST", /^profile\/avatar$/, async (m, body, query, me) => {
      const file = fileFrom(body, "avatar");
      if (!file) throw new ApiError("Nenhuma imagem enviada", 400);
      validateImage(file, 5);
      // Mesmo bucket e mesmo formato de caminho que o app usa
      const url = await uploadImage("avatars", me, file, "avatar");
      unwrap(await sb.from("profiles").update({ avatar_url: url }).eq("id", me));
      clearMeCache();
      return { data: await buildUserData(me) };
    }],

    // ---------- Clubes ----------
    ["POST", /^clubs$/, async (m, body, query, me) => {
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim() || null;
      if (!name) throw new ApiError("Nome do clube é obrigatório", 400);
      const row = unwrap(await sb.from("clubs").insert({ name, description, created_by: me }).select("*").single(),
        "Erro ao criar clube");
      return { club: (await buildClubs([row], me))[0] };
    }],

    ["GET", /^clubs$/, async (m, body, query, me) => {
      const memberships = unwrap(await sb.from("club_members").select("club_id").eq("user_id", me));
      const rows = await selectIn("clubs", "*", "id", memberships.map((x) => x.club_id));
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { clubs: await buildClubs(rows, me) };
    }],

    ["POST", /^clubs\/join$/, async (m, body, query, me) => {
      const code = String(body.code || "").trim().toUpperCase();
      if (!code) throw new ApiError("Informe um código de convite", 400);
      const club = unwrap(await sb.from("clubs").select("*").eq("invite_code", code).maybeSingle());
      if (!club) throw new ApiError("Código de convite inválido", 404);
      const res = await sb.from("club_members").insert({ club_id: club.id, user_id: me });
      if (res.error && res.error.code !== "23505") throw translateError(res.error, "Não foi possível entrar no clube.");
      return { club: (await buildClubs([club], me))[0] };
    }],

    ["GET", /^clubs\/([^/]+)$/, async (m, body, query, me) => {
      const club = await clubById(m[1]);
      const detail = (await buildClubs([club], me))[0];
      detail.leaderboard = await buildClubLeaderboard(club.id);
      return { club: detail };
    }],

    ["PUT", /^clubs\/([^/]+)$/, async (m, body, query, me) => {
      const club = await clubById(m[1]);
      if (club.created_by !== me) throw new ApiError("Só quem criou o clube pode editar ou apagar", 403);
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim() || null;
      if (!name) throw new ApiError("Nome do clube é obrigatório", 400);
      const row = unwrap(await sb.from("clubs").update({ name, description }).eq("id", m[1]).select("*").single());
      return { club: (await buildClubs([row], me))[0] };
    }],

    ["DELETE", /^clubs\/([^/]+)$/, async (m, body, query, me) => {
      const club = await clubById(m[1]);
      if (club.created_by !== me) throw new ApiError("Só quem criou o clube pode editar ou apagar", 403);
      unwrap(await sb.from("clubs").delete().eq("id", m[1]));
      return { ok: true };
    }],

    ["POST", /^clubs\/([^/]+)\/leave$/, async (m, body, query, me) => {
      unwrap(await sb.from("club_members").delete().eq("club_id", m[1]).eq("user_id", me));
      return { ok: true };
    }],

    ["POST", /^clubs\/([^/]+)\/challenges$/, async (m, body, query, me) => {
      await clubById(m[1]);
      if (!(await isClubAdmin(m[1], me))) throw new ApiError("Só o administrador do clube pode criar desafios", 403);
      const title = String(body.title || "").trim();
      const startDate = String(body.startDate || "").trim();
      const endDate = String(body.endDate || "").trim();
      const metric = String(body.metric || "").trim() || "km";
      if (!title || !startDate || !endDate) throw new ApiError("Preencha título, data de início e data de fim", 400);
      if (!METRICS[metric]) throw new ApiError("Tipo de desafio inválido", 400);
      if (endDate < startDate) throw new ApiError("A data de fim não pode ser antes da data de início", 400);
      const row = unwrap(await sb.from("club_challenges").insert({
        club_id: m[1], title, metric, start_date: startDate, end_date: endDate, created_by: me
      }).select("*").single(), "Só o administrador do clube pode criar desafios");
      return { challenge: (await buildChallenges([row], m[1]))[0] };
    }],

    ["GET", /^clubs\/([^/]+)\/challenges$/, async (m, body, query, me) => {
      const today = localDateStr(new Date());
      const rows = unwrap(await sb.from("club_challenges").select("*").eq("club_id", m[1]).gte("end_date", today));
      // Primeiro o que já começou; depois o próximo a começar
      rows.sort((a, b) => ((a.start_date > today) - (b.start_date > today)) || a.start_date.localeCompare(b.start_date));
      const first = rows[0];
      return { challenge: first ? (await buildChallenges([first], m[1]))[0] : null };
    }],

    ["GET", /^clubs\/([^/]+)\/challenges\/history$/, async (m, body, query, me) => {
      const today = localDateStr(new Date());
      const rows = unwrap(await sb.from("club_challenges").select("*").eq("club_id", m[1]).lt("end_date", today)
        .order("end_date", { ascending: false }).limit(10));
      return { challenges: await buildChallenges(rows, m[1]) };
    }],

    // ---------- Notificações ----------
    ["GET", /^notifications$/, async (m, body, query, me) => {
      const [notifications, unreadCount] = await Promise.all([
        buildNotifications(me),
        countRows("notifications", (q) => q.eq("user_id", me).is("read_at", null))
      ]);
      return { notifications, unreadCount };
    }],

    ["POST", /^notifications\/read-all$/, async (m, body, query, me) => {
      unwrap(await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me).is("read_at", null));
      return { ok: true };
    }],

    ["GET", /^health$/, async () => ({ ok: true })]
  ];

  async function routeOwnedBy(routeId, userId) {
    const r = unwrap(await sb.from("routes").select("id, created_by").eq("id", routeId).maybeSingle());
    if (!r) throw new ApiError("Rota não encontrada", 404);
    if (r.created_by !== userId) throw new ApiError("Você só pode editar ou apagar rotas que você mesmo criou", 403);
    return r;
  }

  async function likeToggle(table, column, id, me, method, forbiddenMsg) {
    if (method === "POST") {
      const res = await sb.from(table).insert({ [column]: id, user_id: me });
      if (res.error && res.error.code !== "23505") throw translateError(res.error, forbiddenMsg);
    } else {
      unwrap(await sb.from(table).delete().eq(column, id).eq("user_id", me));
    }
    const likeCount = await countRows(table, (q) => q.eq(column, id));
    clearMeCache();
    return { likeCount, likedByMe: method === "POST" };
  }

  /* ---------------------------------------------------------
     7. ENTRADA: request(path, options) — mesma assinatura do apiRequest
     --------------------------------------------------------- */
  const PUBLIC_PATHS = [/^auth\//, /^health$/];

  async function request(path, options) {
    options = options || {};
    if (!sb) {
      throw new ApiError(libLoaded
        ? "Supabase não configurado: confira js/supabase-config.js."
        : "Não foi possível carregar o Supabase (sem internet?). Recarregue a página.", 503);
    }
    const method = String(options.method || "GET").toUpperCase();
    const clean = String(path).replace(/^\//, "");
    const [route, rawQuery] = clean.split("?");
    const query = new URLSearchParams(rawQuery || "");
    const body = readBody(options);

    const isPublic = PUBLIC_PATHS.some((re) => re.test(route));
    const me = isPublic ? null : await currentUserId();

    for (const [m, re, handler] of ROUTES) {
      if (m !== method) continue;
      const match = route.match(re);
      if (match) {
        try {
          return await handler(match, body, query, me, method);
        } catch (e) {
          if (e instanceof ApiError) throw e;
          throw translateError(e);
        }
      }
    }
    throw new ApiError("Rota não encontrada: " + method + " /" + route, 404);
  }

  window.TrainlySupabase = {
    enabled,
    request,
    hasSession,
    signOut,
    client: sb
  };
})();
