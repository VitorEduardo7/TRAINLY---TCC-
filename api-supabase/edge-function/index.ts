// =====================================================================
// API TRAINLY — Edge Function do Supabase (Deno + TypeScript)
//
// Endereço:  https://<seu-projeto>.supabase.co/functions/v1/trainly-api
// Documentação interativa (estilo Swagger): api-docs.php, no site.
//
// Organização deste arquivo:
//   1. Configuração
//   2. Respostas e erros
//   3. Autenticação e contexto da requisição
//   4. Regras do jogo (as mesmas do site e do app: XP, nível, patente, sequência)
//   5. Conversores (banco -> JSON da API)
//   6. Rotas, por assunto:
//        Geral · Autenticação · Perfil · Atividades · Rotas (Explorar)
//        Clubes · Publicações · Amigos · Usuários · Gamificação
//   7. Tabela de rotas e servidor
//
// Segurança: a API usa a sessão do PRÓPRIO usuário (token de login), então
// as regras de acesso do banco (RLS) continuam valendo — ninguém lê ou
// altera o que não poderia pelo app ou pelo site. Nenhuma chave secreta é usada.
// =====================================================================

import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------
// 1. CONFIGURAÇÃO
// ---------------------------------------------------------------------
const VERSAO = "1.0.0";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

// Chaves públicas (publishable/anon) do projeto. O Supabase entrega as novas
// em SUPABASE_PUBLISHABLE_KEYS (JSON) e a antiga em SUPABASE_ANON_KEY.
function chavesPublicas(): string[] {
  const chaves: string[] = [];
  try {
    const json = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    for (const v of Object.values(json)) if (typeof v === "string" && v) chaves.push(v);
  } catch (_) { /* variável ausente ou em outro formato */ }
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (anon) chaves.push(anon);
  return chaves;
}
const CHAVES_PUBLICAS = chavesPublicas();
const CHAVE_PUBLICA = CHAVES_PUBLICAS[0] ?? "";

const TIPOS_ATIVIDADE = ["Corrida", "Ciclismo", "Natação", "Caminhada"];
const DIFICULDADES = ["Fácil", "Moderada", "Difícil"];
const FUSO_BRASILIA_MS = -3 * 60 * 60 * 1000; // o Brasil não tem mais horário de verão

// ---------------------------------------------------------------------
// 2. RESPOSTAS E ERROS
// ---------------------------------------------------------------------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

class ErroApi extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(corpo: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

// Erros do banco (Postgres/PostgREST) -> mensagens em português
// deno-lint-ignore no-explicit-any
function traduzirErro(e: any, padrao = "Erro ao acessar o banco de dados"): ErroApi {
  if (e instanceof ErroApi) return e;
  const codigo = String(e?.code ?? "");
  const msg = String(e?.message ?? "");
  if (codigo === "42501" || /row-level security|permission denied/i.test(msg)) {
    return new ErroApi(403, "Você não tem permissão para fazer isso.");
  }
  if (codigo === "23505") return new ErroApi(409, "Esse registro já existe.");
  if (codigo === "23503") return new ErroApi(404, "O item relacionado não existe.");
  if (codigo === "23514" || codigo === "22P02") return new ErroApi(400, "Algum valor enviado não é válido.");
  if (codigo === "PGRST116") return new ErroApi(404, "Não encontrado.");
  return new ErroApi(500, padrao);
}

// Desembrulha { data, error } do supabase-js (sem tipos gerados do banco,
// as linhas chegam como objetos simples)
// deno-lint-ignore no-explicit-any
function ok(res: { data: any; error: any }, padrao?: string): any {
  if (res.error) throw traduzirErro(res.error, padrao);
  return res.data;
}

// ---------------------------------------------------------------------
// 3. AUTENTICAÇÃO E CONTEXTO
// ---------------------------------------------------------------------
type Contexto = {
  req: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  // deno-lint-ignore no-explicit-any
  corpo: any;
  db: SupabaseClient; // cliente com a sessão do usuário (respeita o RLS)
  usuario: User | null;
};

function clienteSupabase(token?: string): SupabaseClient {
  return createClient(SUPABASE_URL, CHAVE_PUBLICA, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenDoCabecalho(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  // A chave pública às vezes vem no lugar do token; ela não identifica ninguém
  if (CHAVES_PUBLICAS.includes(token)) return null;
  return token;
}

function chavePublicaValida(req: Request): boolean {
  if (!CHAVES_PUBLICAS.length) return true; // ambiente local sem chaves configuradas
  const apikey = req.headers.get("apikey") ?? "";
  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return CHAVES_PUBLICAS.includes(apikey) || CHAVES_PUBLICAS.includes(auth);
}

async function usuarioLogado(token: string | null): Promise<User> {
  if (!token) throw new ErroApi(401, "Faça login: envie o token no cabeçalho Authorization (Bearer <token>).");
  const { data, error } = await clienteSupabase(token).auth.getUser(token);
  if (error || !data?.user) throw new ErroApi(401, "Token inválido ou expirado. Faça login de novo.");
  return data.user;
}

async function lerCorpo(req: Request) {
  if (req.method === "GET" || req.method === "DELETE") return {};
  const texto = await req.text();
  if (!texto.trim()) return {};
  try {
    return JSON.parse(texto);
  } catch (_) {
    throw new ErroApi(400, "O corpo da requisição precisa ser um JSON válido.");
  }
}

// ---------------------------------------------------------------------
// 4. REGRAS DO JOGO (iguais às do site e do app)
// ---------------------------------------------------------------------
const PATENTES = [
  { nome: "Bronze", nivelMinimo: 1, cor: "#a5672f" },
  { nome: "Prata", nivelMinimo: 5, cor: "#8a94a6" },
  { nome: "Ouro", nivelMinimo: 10, cor: "#d4a017" },
  { nome: "Platina", nivelMinimo: 15, cor: "#2fb6c4" },
  { nome: "Diamante", nivelMinimo: 20, cor: "#6366f1" },
];

// Nível sobe quando o XP acumulado chega em nivel_atual × 100
function infoNivel(xpTotal: number) {
  let nivel = 1;
  let paraProximo = 100;
  let resto = Math.max(0, Math.floor(xpTotal));
  while (resto >= paraProximo) {
    resto -= paraProximo;
    nivel++;
    paraProximo = nivel * 100;
  }
  const patente = [...PATENTES].reverse().find((p) => nivel >= p.nivelMinimo) ?? PATENTES[0];
  const proxima = PATENTES.find((p) => p.nivelMinimo > nivel) ?? null;
  return {
    nivel,
    xp_total: Math.floor(xpTotal),
    xp_no_nivel: resto,
    xp_para_proximo_nivel: paraProximo,
    xp_faltando: paraProximo - resto,
    patente: patente.nome,
    cor_patente: patente.cor,
    proxima_patente: proxima ? { nome: proxima.nome, nivel: proxima.nivelMinimo } : null,
  };
}

function xpDaAtividade(distanciaKm: number, duracaoSeg: number): number {
  return Math.max(5, Math.round(distanciaKm * 10 + duracaoSeg / 60));
}

function ritmo(duracaoSeg: number, distanciaKm: number): string | null {
  if (!distanciaKm || distanciaKm <= 0) return null;
  const minPorKm = duracaoSeg / 60 / distanciaKm;
  let m = Math.floor(minPorKm);
  let s = Math.round((minPorKm - m) * 60);
  if (s === 60) { m++; s = 0; }
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

// Segunda-feira (data "AAAA-MM-DD") da semana atual, no horário de Brasília
function segundaDaSemana(base = new Date()): Date {
  const d = new Date(base.getTime() + FUSO_BRASILIA_MS);
  const dia = d.getUTCDay(); // 0 = domingo
  d.setUTCDate(d.getUTCDate() - (dia === 0 ? 6 : dia - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function dataISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Mesmo cálculo do gatilho evaluate_weekly_streak: o banco só atualiza a
// sequência quando entra atividade nova, então o estado "de hoje" é estimado aqui.
// deno-lint-ignore no-explicit-any
function estadoDaSequencia(linha: any) {
  const atual = Number(linha?.current_streak ?? 0);
  const congelamentos = linha?.freezes_available == null ? 2 : Number(linha.freezes_available);
  const ultima = linha?.last_active_week ? String(linha.last_active_week).slice(0, 10) : null;
  const base = {
    semanas_seguidas: 0,
    recorde: Number(linha?.longest_streak ?? 0),
    congelamentos,
    ultima_semana_ativa: ultima,
    estado: "nenhuma",
    descricao: "Treine pelo menos uma vez nesta semana para começar.",
  };
  if (!atual || !ultima) return base;
  const semanas = Math.round((segundaDaSemana().getTime() - new Date(ultima + "T00:00:00Z").getTime()) / (7 * 86400000));
  if (semanas <= 0) return { ...base, semanas_seguidas: atual, estado: "ativa", descricao: "Já treinou nesta semana." };
  if (semanas === 1) return { ...base, semanas_seguidas: atual, estado: "pendente", descricao: "Treine até domingo para manter a sequência." };
  const furo = semanas - 1;
  if (congelamentos >= furo) {
    return { ...base, semanas_seguidas: atual, estado: "em_risco", descricao: `${furo} semana(s) sem treino, coberta(s) por congelamento ao registrar a próxima atividade.` };
  }
  return { ...base, estado: "quebrada", descricao: "Sequência interrompida. Registre uma atividade para recomeçar." };
}

// ---------------------------------------------------------------------
// 5. CONVERSORES (banco -> JSON da API, em português)
// ---------------------------------------------------------------------
const COLUNAS_ATIVIDADE = "id, user_id, date, type, title, photo_url, distance_km, duration_sec, heart_rate, elevation_m, xp_earned";

// deno-lint-ignore no-explicit-any
function atividadeJson(a: any) {
  const km = Number(a.distance_km ?? 0);
  const seg = Number(a.duration_sec ?? 0);
  return {
    id: a.id,
    usuario_id: a.user_id,
    tipo: a.type,
    titulo: a.title,
    data: a.date,
    distancia_km: km,
    duracao_seg: seg,
    ritmo: ritmo(seg, km),
    frequencia_cardiaca: a.heart_rate ?? null,
    elevacao_m: a.elevation_m ?? null,
    xp: Number(a.xp_earned ?? 0),
    foto_url: a.photo_url ?? null,
  };
}

// deno-lint-ignore no-explicit-any
function rotaJson(r: any, nomeCriador: string | null, eu: string) {
  const trajeto = Array.isArray(r.path) ? r.path : [];
  return {
    id: r.id,
    nome: r.name,
    tipo: r.type,
    dificuldade: r.difficulty,
    terreno: r.terrain,
    distancia_km: Number(r.distance_km ?? 0),
    elevacao_m: Number(r.elevation_m ?? 0),
    inicio: trajeto[0] ? { lat: Number(trajeto[0][0]), lng: Number(trajeto[0][1]) } : null,
    trajeto,
    criador: { id: r.created_by, nome: nomeCriador },
    e_minha: r.created_by === eu,
    criada_em: r.created_at,
  };
}

// deno-lint-ignore no-explicit-any
function perfilResumoJson(p: any) {
  const n = infoNivel(Number(p.xp ?? 0));
  return {
    id: p.id,
    nome: p.name,
    localizacao: p.location ?? null,
    avatar_url: p.avatar_url ?? null,
    nivel: n.nivel,
    patente: n.patente,
  };
}

async function nomesDosUsuarios(db: SupabaseClient, ids: string[]) {
  const unicos = [...new Set(ids.filter(Boolean))];
  const mapa = new Map<string, string>();
  if (!unicos.length) return mapa;
  const linhas = ok(await db.from("profiles").select("id, name").in("id", unicos));
  for (const l of linhas ?? []) mapa.set(l.id, l.name);
  return mapa;
}

async function idsQueSigo(db: SupabaseClient, eu: string): Promise<string[]> {
  const linhas = ok(await db.from("following").select("followed_id").eq("follower_id", eu));
  return (linhas ?? []).map((l: { followed_id: string }) => l.followed_id);
}

// ---------------------------------------------------------------------
// 6. ROTAS
// ---------------------------------------------------------------------

// ===== Geral =====
function raiz() {
  return {
    nome: "API Trainly",
    versao: VERSAO,
    descricao: "API REST do Trainly: atividades, rotas, clubes, publicações, amigos e gamificação. Mesmo banco do app e do site.",
    documentacao: "Abra api-docs.php no site para ver e testar todas as rotas.",
    autenticacao: "POST /auth/login devolve um token; envie-o em Authorization: Bearer <token>.",
  };
}

function saude() {
  return { status: "ok", versao: VERSAO, horario: new Date().toISOString() };
}

// ===== Autenticação =====
async function login(ctx: Contexto) {
  const email = String(ctx.corpo.email ?? "").trim();
  const senha = String(ctx.corpo.senha ?? "");
  if (!email || !senha) throw new ErroApi(400, "Envie email e senha.");
  const { data, error } = await clienteSupabase().auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (/not confirmed/i.test(error.message)) throw new ErroApi(403, "Confirme seu e-mail antes de entrar.");
    if (/invalid login|invalid credentials/i.test(error.message)) throw new ErroApi(401, "E-mail ou senha inválidos.");
    throw new ErroApi(400, "Não foi possível entrar.");
  }
  return {
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    tipo: "Bearer",
    expira_em: data.session?.expires_at,
    usuario: { id: data.user?.id, email: data.user?.email },
  };
}

// ===== Perfil =====
async function verPerfil(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const p = ok(await ctx.db.from("profiles")
    .select("id, name, bio, location, avatar_url, cover_url, xp, monthly_goal_type, monthly_goal_value, created_at")
    .eq("id", eu).maybeSingle());
  if (!p) throw new ErroApi(404, "Perfil não encontrado.");
  return {
    id: p.id,
    email: ctx.usuario!.email,
    nome: p.name,
    bio: p.bio,
    localizacao: p.location,
    avatar_url: p.avatar_url,
    capa_url: p.cover_url,
    meta_do_mes: { tipo: p.monthly_goal_type ?? "km", valor: Number(p.monthly_goal_value ?? 100) },
    membro_desde: p.created_at,
    ...infoNivel(Number(p.xp ?? 0)),
  };
}

async function editarPerfil(ctx: Contexto) {
  const { nome, bio, localizacao } = ctx.corpo;
  const mudancas: Record<string, unknown> = {};
  if (nome !== undefined) {
    const n = String(nome).trim();
    if (!n) throw new ErroApi(400, "O nome não pode ficar vazio.");
    if (n.length > 60) throw new ErroApi(400, "O nome pode ter no máximo 60 caracteres.");
    mudancas.name = n;
  }
  if (bio !== undefined) {
    const b = bio === null ? "" : String(bio).trim();
    if (b.length > 280) throw new ErroApi(400, "A bio pode ter no máximo 280 caracteres.");
    mudancas.bio = b || null;
  }
  if (localizacao !== undefined) mudancas.location = localizacao === null ? null : String(localizacao).trim() || null;
  if (!Object.keys(mudancas).length) throw new ErroApi(400, "Envie ao menos um campo: nome, bio ou localizacao.");
  ok(await ctx.db.from("profiles").update(mudancas).eq("id", ctx.usuario!.id));
  return verPerfil(ctx);
}

// ===== Atividades =====
// deno-lint-ignore no-explicit-any
function camposDaAtividade(corpo: any, parcial: boolean) {
  const campos: Record<string, unknown> = {};
  if (!parcial || corpo.tipo !== undefined) {
    const tipo = String(corpo.tipo ?? "Corrida").trim();
    if (!TIPOS_ATIVIDADE.includes(tipo)) throw new ErroApi(400, `tipo deve ser: ${TIPOS_ATIVIDADE.join(", ")}.`);
    campos.type = tipo;
  }
  if (!parcial || corpo.distancia_km !== undefined) {
    const km = Number(corpo.distancia_km);
    if (!Number.isFinite(km) || km <= 0 || km > 1000) throw new ErroApi(400, "distancia_km deve ser um número entre 0 e 1000.");
    campos.distance_km = km;
  }
  if (!parcial || corpo.duracao_seg !== undefined) {
    const seg = Math.round(Number(corpo.duracao_seg));
    if (!Number.isFinite(seg) || seg <= 0 || seg > 7 * 86400) throw new ErroApi(400, "duracao_seg deve ser um número de segundos maior que zero.");
    campos.duration_sec = seg;
  }
  if (corpo.titulo !== undefined) campos.title = corpo.titulo === null ? null : String(corpo.titulo).trim().slice(0, 120) || null;
  if (corpo.data !== undefined) {
    const d = new Date(corpo.data);
    if (Number.isNaN(d.getTime())) throw new ErroApi(400, "data deve estar no formato ISO, ex.: 2026-10-27T07:30:00-03:00.");
    if (d.getTime() > Date.now() + 60 * 60 * 1000) throw new ErroApi(400, "A data não pode estar no futuro.");
    campos.date = d.toISOString();
  }
  for (const [chave, coluna] of [["frequencia_cardiaca", "heart_rate"], ["elevacao_m", "elevation_m"]] as const) {
    if (corpo[chave] !== undefined) {
      if (corpo[chave] === null || corpo[chave] === "") { campos[coluna] = null; continue; }
      const v = Math.round(Number(corpo[chave]));
      if (!Number.isFinite(v) || v < 0) throw new ErroApi(400, `${chave} deve ser um número inteiro positivo.`);
      campos[coluna] = v;
    }
  }
  return campos;
}

async function listarAtividades(ctx: Contexto) {
  const limite = Math.min(100, Math.max(1, Number(ctx.query.get("limite") ?? 20) || 20));
  const tipo = ctx.query.get("tipo");
  let q = ctx.db.from("activities").select(COLUNAS_ATIVIDADE)
    .eq("user_id", ctx.usuario!.id).order("date", { ascending: false }).limit(limite);
  if (tipo) q = q.eq("type", tipo);
  const linhas = ok(await q);
  return { total: linhas.length, atividades: linhas.map(atividadeJson) };
}

async function verAtividade(ctx: Contexto) {
  const a = ok(await ctx.db.from("activities").select(COLUNAS_ATIVIDADE).eq("id", ctx.params.id).maybeSingle());
  if (!a) throw new ErroApi(404, "Atividade não encontrada.");
  return atividadeJson(a);
}

async function criarAtividade(ctx: Contexto) {
  const campos = camposDaAtividade(ctx.corpo, false);
  campos.xp_earned = xpDaAtividade(campos.distance_km as number, campos.duration_sec as number);
  const a = ok(await ctx.db.from("activities").insert({ ...campos, user_id: ctx.usuario!.id })
    .select(COLUNAS_ATIVIDADE).single(), "Não foi possível salvar a atividade.");
  return { status: 201, corpo: { atividade: atividadeJson(a), xp_ganho: Number(a.xp_earned ?? 0) } };
}

async function editarAtividade(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const antiga = ok(await ctx.db.from("activities").select(COLUNAS_ATIVIDADE).eq("id", ctx.params.id).eq("user_id", eu).maybeSingle());
  if (!antiga) throw new ErroApi(404, "Atividade não encontrada (ou não é sua).");
  const campos = camposDaAtividade(ctx.corpo, true);
  if (!Object.keys(campos).length) throw new ErroApi(400, "Envie ao menos um campo para alterar.");
  const km = (campos.distance_km ?? antiga.distance_km) as number;
  const seg = (campos.duration_sec ?? antiga.duration_sec) as number;
  campos.xp_earned = xpDaAtividade(Number(km), Number(seg));
  const a = ok(await ctx.db.from("activities").update(campos).eq("id", ctx.params.id).eq("user_id", eu)
    .select(COLUNAS_ATIVIDADE).single(), "Não foi possível editar a atividade.");
  return { atividade: atividadeJson(a), xp_diferenca: Number(a.xp_earned ?? 0) - Number(antiga.xp_earned ?? 0) };
}

async function excluirAtividade(ctx: Contexto) {
  const apagadas = ok(await ctx.db.from("activities").delete().eq("id", ctx.params.id).eq("user_id", ctx.usuario!.id).select("id, xp_earned"));
  if (!apagadas.length) throw new ErroApi(404, "Atividade não encontrada (ou não é sua).");
  return { ok: true, xp_removido: Number(apagadas[0].xp_earned ?? 0) };
}

// ===== Rotas (página Explorar) =====
// deno-lint-ignore no-explicit-any
function camposDaRota(corpo: any, parcial: boolean) {
  const campos: Record<string, unknown> = {};
  if (!parcial || corpo.nome !== undefined) {
    const nome = String(corpo.nome ?? "").trim();
    if (!nome) throw new ErroApi(400, "nome é obrigatório.");
    campos.name = nome.slice(0, 80);
  }
  if (!parcial || corpo.tipo !== undefined) {
    const tipo = String(corpo.tipo ?? "Corrida").trim();
    if (!TIPOS_ATIVIDADE.includes(tipo)) throw new ErroApi(400, `tipo deve ser: ${TIPOS_ATIVIDADE.join(", ")}.`);
    campos.type = tipo;
  }
  if (!parcial || corpo.dificuldade !== undefined) {
    const dif = String(corpo.dificuldade ?? "Moderada").trim();
    if (!DIFICULDADES.includes(dif)) throw new ErroApi(400, `dificuldade deve ser: ${DIFICULDADES.join(", ")}.`);
    campos.difficulty = dif;
  }
  if (corpo.terreno !== undefined) campos.terrain = corpo.terreno === null ? null : String(corpo.terreno).trim() || null;
  if (!parcial || corpo.distancia_km !== undefined) {
    const km = Number(corpo.distancia_km);
    if (!Number.isFinite(km) || km <= 0) throw new ErroApi(400, "distancia_km deve ser maior que zero.");
    campos.distance_km = km;
  }
  if (corpo.elevacao_m !== undefined) campos.elevation_m = Math.max(0, Math.round(Number(corpo.elevacao_m) || 0));
  else if (!parcial) campos.elevation_m = 0;
  if (!parcial || corpo.trajeto !== undefined) {
    const t = Array.isArray(corpo.trajeto) ? corpo.trajeto : [];
    const pontos = t.map((p: unknown) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : null))
      .filter((p: number[] | null) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180);
    if (pontos.length < 2) throw new ErroApi(400, "trajeto precisa de pelo menos 2 pontos [latitude, longitude].");
    campos.path = pontos;
  }
  return campos;
}

async function listarRotas(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const ids = [eu, ...(await idsQueSigo(ctx.db, eu))];
  let q = ctx.db.from("routes").select("*").in("created_by", ids).order("created_at", { ascending: false }).limit(200);
  const tipo = ctx.query.get("tipo");
  if (tipo) q = q.eq("type", tipo);
  const linhas = ok(await q);
  const nomes = await nomesDosUsuarios(ctx.db, linhas.map((r: { created_by: string }) => r.created_by));
  return { total: linhas.length, rotas: linhas.map((r: { created_by: string }) => rotaJson(r, nomes.get(r.created_by) ?? null, eu)) };
}

async function verRota(ctx: Contexto) {
  const r = ok(await ctx.db.from("routes").select("*").eq("id", ctx.params.id).maybeSingle());
  if (!r) throw new ErroApi(404, "Rota não encontrada.");
  const nomes = await nomesDosUsuarios(ctx.db, [r.created_by]);
  return rotaJson(r, nomes.get(r.created_by) ?? null, ctx.usuario!.id);
}

async function criarRota(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const r = ok(await ctx.db.from("routes").insert({ ...camposDaRota(ctx.corpo, false), created_by: eu }).select("*").single(),
    "Não foi possível salvar a rota.");
  const nomes = await nomesDosUsuarios(ctx.db, [eu]);
  return { status: 201, corpo: rotaJson(r, nomes.get(eu) ?? null, eu) };
}

async function editarRota(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const campos = camposDaRota(ctx.corpo, true);
  if (!Object.keys(campos).length) throw new ErroApi(400, "Envie ao menos um campo para alterar.");
  const linhas = ok(await ctx.db.from("routes").update(campos).eq("id", ctx.params.id).eq("created_by", eu).select("*"));
  if (!linhas.length) throw new ErroApi(404, "Rota não encontrada (ou não é sua).");
  const nomes = await nomesDosUsuarios(ctx.db, [eu]);
  return rotaJson(linhas[0], nomes.get(eu) ?? null, eu);
}

async function excluirRota(ctx: Contexto) {
  const linhas = ok(await ctx.db.from("routes").delete().eq("id", ctx.params.id).eq("created_by", ctx.usuario!.id).select("id"));
  if (!linhas.length) throw new ErroApi(404, "Rota não encontrada (ou não é sua).");
  return { ok: true };
}

// ===== Clubes =====
// deno-lint-ignore no-explicit-any
async function clubesJson(db: SupabaseClient, clubes: any[], eu: string) {
  if (!clubes.length) return [];
  const membros = ok(await db.from("club_members").select("club_id, user_id, role").in("club_id", clubes.map((c) => c.id)));
  return clubes.map((c) => {
    const doClube = membros.filter((m: { club_id: string }) => m.club_id === c.id);
    const meu = doClube.find((m: { user_id: string }) => m.user_id === eu);
    return {
      id: c.id,
      nome: c.name,
      descricao: c.description,
      codigo_convite: meu ? c.invite_code : undefined, // só membro vê o código
      membros: doClube.length,
      sou_membro: !!meu,
      sou_admin: !!(meu && meu.role === "admin"),
      sou_criador: c.created_by === eu,
      criado_em: c.created_at,
    };
  });
}

async function listarClubes(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const vinculos = ok(await ctx.db.from("club_members").select("club_id").eq("user_id", eu));
  const ids = vinculos.map((v: { club_id: string }) => v.club_id);
  if (!ids.length) return { total: 0, clubes: [] };
  const clubes = ok(await ctx.db.from("clubs").select("*").in("id", ids).order("created_at", { ascending: false }));
  return { total: clubes.length, clubes: await clubesJson(ctx.db, clubes, eu) };
}

async function verClube(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const c = ok(await ctx.db.from("clubs").select("*").eq("id", ctx.params.id).maybeSingle());
  if (!c) throw new ErroApi(404, "Clube não encontrado.");
  const [clube] = await clubesJson(ctx.db, [c], eu);
  const membros = ok(await ctx.db.from("club_members").select("user_id, role").eq("club_id", c.id));
  const nomes = await nomesDosUsuarios(ctx.db, membros.map((m: { user_id: string }) => m.user_id));
  return {
    ...clube,
    lista_de_membros: membros.map((m: { user_id: string; role: string }) => ({ id: m.user_id, nome: nomes.get(m.user_id) ?? null, papel: m.role ?? "membro" })),
  };
}

async function criarClube(ctx: Contexto) {
  const nome = String(ctx.corpo.nome ?? "").trim();
  if (!nome) throw new ErroApi(400, "nome é obrigatório.");
  const descricao = String(ctx.corpo.descricao ?? "").trim() || null;
  const c = ok(await ctx.db.from("clubs").insert({ name: nome.slice(0, 60), description: descricao, created_by: ctx.usuario!.id })
    .select("*").single(), "Não foi possível criar o clube.");
  const [clube] = await clubesJson(ctx.db, [c], ctx.usuario!.id);
  return { status: 201, corpo: clube };
}

async function editarClube(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const mudancas: Record<string, unknown> = {};
  if (ctx.corpo.nome !== undefined) {
    const n = String(ctx.corpo.nome).trim();
    if (!n) throw new ErroApi(400, "O nome não pode ficar vazio.");
    mudancas.name = n.slice(0, 60);
  }
  if (ctx.corpo.descricao !== undefined) mudancas.description = String(ctx.corpo.descricao ?? "").trim() || null;
  if (!Object.keys(mudancas).length) throw new ErroApi(400, "Envie nome e/ou descricao.");
  const linhas = ok(await ctx.db.from("clubs").update(mudancas).eq("id", ctx.params.id).eq("created_by", eu).select("*"));
  if (!linhas.length) throw new ErroApi(403, "Só quem criou o clube pode editar.");
  const [clube] = await clubesJson(ctx.db, linhas, eu);
  return clube;
}

async function excluirClube(ctx: Contexto) {
  const linhas = ok(await ctx.db.from("clubs").delete().eq("id", ctx.params.id).eq("created_by", ctx.usuario!.id).select("id"));
  if (!linhas.length) throw new ErroApi(403, "Só quem criou o clube pode apagar (ou o clube não existe).");
  return { ok: true };
}

async function entrarNoClube(ctx: Contexto) {
  const codigo = String(ctx.corpo.codigo ?? "").trim().toUpperCase();
  if (!codigo) throw new ErroApi(400, "Envie o codigo de convite.");
  const c = ok(await ctx.db.from("clubs").select("*").eq("invite_code", codigo).maybeSingle());
  if (!c) throw new ErroApi(404, "Código de convite inválido.");
  const res = await ctx.db.from("club_members").insert({ club_id: c.id, user_id: ctx.usuario!.id });
  if (res.error && res.error.code !== "23505") throw traduzirErro(res.error, "Não foi possível entrar no clube.");
  const [clube] = await clubesJson(ctx.db, [c], ctx.usuario!.id);
  return clube;
}

async function sairDoClube(ctx: Contexto) {
  ok(await ctx.db.from("club_members").delete().eq("club_id", ctx.params.id).eq("user_id", ctx.usuario!.id));
  return { ok: true };
}

// ===== Publicações =====
async function feed(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  const ids = [eu, ...(await idsQueSigo(ctx.db, eu))];
  const limite = Math.min(50, Math.max(1, Number(ctx.query.get("limite") ?? 20) || 20));
  const posts = ok(await ctx.db.from("posts").select("id, user_id, content, photo_url, created_at")
    .in("user_id", ids).order("created_at", { ascending: false }).limit(limite));
  const postIds = posts.map((p: { id: string }) => p.id);
  const curtidas = postIds.length ? ok(await ctx.db.from("post_likes").select("post_id, user_id").in("post_id", postIds)) : [];
  const nomes = await nomesDosUsuarios(ctx.db, posts.map((p: { user_id: string }) => p.user_id));
  return {
    total: posts.length,
    publicacoes: posts.map((p: { id: string; user_id: string; content: string; photo_url: string; created_at: string }) => {
      const destas = curtidas.filter((c: { post_id: string }) => c.post_id === p.id);
      return {
        id: p.id,
        autor: { id: p.user_id, nome: nomes.get(p.user_id) ?? null },
        texto: p.content,
        foto_url: p.photo_url,
        criada_em: p.created_at,
        curtidas: destas.length,
        curti: destas.some((c: { user_id: string }) => c.user_id === eu),
        e_minha: p.user_id === eu,
      };
    }),
  };
}

async function criarPublicacao(ctx: Contexto) {
  const texto = String(ctx.corpo.texto ?? "").trim();
  if (!texto) throw new ErroApi(400, "texto é obrigatório (fotos só pelo site ou app).");
  if (texto.length > 2000) throw new ErroApi(400, "Publicação muito longa (máx. 2000 caracteres).");
  const p = ok(await ctx.db.from("posts").insert({ user_id: ctx.usuario!.id, content: texto })
    .select("id, user_id, content, photo_url, created_at").single(), "Não foi possível publicar.");
  return { status: 201, corpo: { id: p.id, texto: p.content, foto_url: p.photo_url, criada_em: p.created_at } };
}

async function excluirPublicacao(ctx: Contexto) {
  const linhas = ok(await ctx.db.from("posts").delete().eq("id", ctx.params.id).eq("user_id", ctx.usuario!.id).select("id"));
  if (!linhas.length) throw new ErroApi(404, "Publicação não encontrada (ou não é sua).");
  return { ok: true };
}

// ===== Amigos =====
async function listarAmigos(ctx: Contexto) {
  const ids = await idsQueSigo(ctx.db, ctx.usuario!.id);
  if (!ids.length) return { total: 0, seguindo: [] };
  const perfis = ok(await ctx.db.from("profiles").select("id, name, location, avatar_url, xp").in("id", ids).order("name"));
  return { total: perfis.length, seguindo: perfis.map(perfilResumoJson) };
}

async function seguir(ctx: Contexto) {
  const eu = ctx.usuario!.id;
  if (ctx.params.id === eu) throw new ErroApi(400, "Você não pode seguir a si mesmo.");
  const alvo = ok(await ctx.db.from("profiles").select("id").eq("id", ctx.params.id).maybeSingle());
  if (!alvo) throw new ErroApi(404, "Usuário não encontrado.");
  const res = await ctx.db.from("following").insert({ follower_id: eu, followed_id: ctx.params.id });
  if (res.error) {
    if (res.error.code === "23505") throw new ErroApi(409, "Você já segue esse atleta.");
    throw traduzirErro(res.error, "Não foi possível seguir.");
  }
  return { status: 201, corpo: { ok: true, seguindo: ctx.params.id } };
}

async function deixarDeSeguir(ctx: Contexto) {
  ok(await ctx.db.from("following").delete().eq("follower_id", ctx.usuario!.id).eq("followed_id", ctx.params.id));
  return { ok: true };
}

// ===== Usuários =====
async function buscarUsuarios(ctx: Contexto) {
  const busca = String(ctx.query.get("busca") ?? "").trim();
  if (busca.length < 2) throw new ErroApi(400, "Envie ?busca= com pelo menos 2 letras.");
  const padrao = "%" + busca.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
  const perfis = ok(await ctx.db.from("profiles").select("id, name, location, avatar_url, xp")
    .neq("id", ctx.usuario!.id).ilike("name", padrao).order("name").limit(20));
  return { total: perfis.length, usuarios: perfis.map(perfilResumoJson) };
}

async function verUsuario(ctx: Contexto) {
  const id = ctx.params.id;
  const p = ok(await ctx.db.from("profiles").select("id, name, bio, location, avatar_url, cover_url, xp, created_at").eq("id", id).maybeSingle());
  if (!p) throw new ErroApi(404, "Usuário não encontrado.");
  const contar = async (tabela: string, coluna: string) => {
    const r = await ctx.db.from(tabela).select("*", { count: "exact", head: true }).eq(coluna, id);
    return r.count ?? 0;
  };
  const [atividades, seguidores, seguindo, sequencia] = await Promise.all([
    contar("activities", "user_id"),
    contar("following", "followed_id"),
    contar("following", "follower_id"),
    ctx.db.from("user_streaks").select("current_streak, longest_streak, freezes_available, last_active_week").eq("user_id", id).maybeSingle(),
  ]);
  const seq = estadoDaSequencia(sequencia.error ? null : sequencia.data);
  return {
    id: p.id,
    nome: p.name,
    bio: p.bio,
    localizacao: p.location,
    avatar_url: p.avatar_url,
    capa_url: p.cover_url,
    membro_desde: p.created_at,
    ...infoNivel(Number(p.xp ?? 0)),
    contagens: { atividades, seguidores, seguindo },
    sequencia: { semanas_seguidas: seq.semanas_seguidas, estado: seq.estado, recorde: seq.recorde },
  };
}

// ===== Gamificação =====
async function verSequencia(ctx: Contexto) {
  const linha = ok(await ctx.db.from("user_streaks")
    .select("current_streak, longest_streak, freezes_available, last_active_week")
    .eq("user_id", ctx.usuario!.id).maybeSingle());
  return estadoDaSequencia(linha);
}

async function verDesafios(ctx: Contexto) {
  // 1) O RPC do app sorteia (sob demanda) os desafios do dia e da semana.
  const rpc = await ctx.db.rpc("get_current_quests");
  if (rpc.error && rpc.error.code !== "PGRST202") console.warn("get_current_quests:", rpc.error.message);

  // 2) Lê os desafios com os modelos (colunas conhecidas)
  const segunda = segundaDaSemana();
  const desde = new Date(segunda.getTime() - 8 * 86400000);
  const linhas = ok(await ctx.db.from("user_quests")
    .select("id, quest_id, period_start, progress, completed, completed_at, quest_templates(title, description, period, goal_type, goal_value, xp_reward)")
    .eq("user_id", ctx.usuario!.id).gte("period_start", dataISO(desde)).order("period_start", { ascending: false }));

  // Só o período vigente de cada tipo (o mais recente, com tolerância de fuso)
  const hojeBR = dataISO(new Date(Date.now() + FUSO_BRASILIA_MS));
  const dias = (a: string, b: string) => Math.round((new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) / 86400000);
  const maisRecente: Record<string, string> = {};
  // deno-lint-ignore no-explicit-any
  const modelo = (l: any) => (Array.isArray(l.quest_templates) ? l.quest_templates[0] : l.quest_templates);
  for (const l of linhas) {
    const t = modelo(l);
    if (!t) continue;
    const ps = String(l.period_start).slice(0, 10);
    const valido = t.period === "daily" ? Math.abs(dias(ps, hojeBR)) <= 1 : dias(ps, dataISO(segunda)) >= -1 && dias(ps, dataISO(segunda)) <= 7;
    if (valido && (!maisRecente[t.period] || ps > maisRecente[t.period])) maisRecente[t.period] = ps;
  }
  // deno-lint-ignore no-explicit-any
  const desafios = linhas.filter((l: any) => modelo(l) && String(l.period_start).slice(0, 10) === maisRecente[modelo(l).period])
    // deno-lint-ignore no-explicit-any
    .map((l: any) => {
      const t = modelo(l);
      const meta = Number(t.goal_value ?? 0);
      const progresso = Number(l.progress ?? 0);
      return {
        id: l.id,
        periodo: t.period === "daily" ? "dia" : "semana",
        titulo: t.title,
        descricao: t.description,
        tipo_de_meta: t.goal_type,
        meta,
        progresso,
        concluido: !!l.completed || (meta > 0 && progresso >= meta),
        xp: Number(t.xp_reward ?? 0),
      };
    });
  return {
    concluidos: desafios.filter((d: { concluido: boolean }) => d.concluido).length,
    total: desafios.length,
    hoje: desafios.filter((d: { periodo: string }) => d.periodo === "dia"),
    esta_semana: desafios.filter((d: { periodo: string }) => d.periodo === "semana"),
  };
}

// ---------------------------------------------------------------------
// 7. TABELA DE ROTAS E SERVIDOR
// ---------------------------------------------------------------------
type Resultado = unknown | { status: number; corpo: unknown };
type Rota = {
  metodo: "GET" | "POST" | "PUT" | "DELETE";
  caminho: string; // ex.: "/atividades/:id"
  publica?: boolean; // não exige login
  acao: (ctx: Contexto) => Resultado | Promise<Resultado>;
};

const ROTAS: Rota[] = [
  // Geral
  { metodo: "GET", caminho: "/", publica: true, acao: raiz },
  { metodo: "GET", caminho: "/saude", publica: true, acao: saude },
  // Autenticação
  { metodo: "POST", caminho: "/auth/login", publica: true, acao: login },
  // Perfil
  { metodo: "GET", caminho: "/perfil", acao: verPerfil },
  { metodo: "PUT", caminho: "/perfil", acao: editarPerfil },
  // Atividades
  { metodo: "GET", caminho: "/atividades", acao: listarAtividades },
  { metodo: "POST", caminho: "/atividades", acao: criarAtividade },
  { metodo: "GET", caminho: "/atividades/:id", acao: verAtividade },
  { metodo: "PUT", caminho: "/atividades/:id", acao: editarAtividade },
  { metodo: "DELETE", caminho: "/atividades/:id", acao: excluirAtividade },
  // Rotas (Explorar)
  { metodo: "GET", caminho: "/rotas", acao: listarRotas },
  { metodo: "POST", caminho: "/rotas", acao: criarRota },
  { metodo: "GET", caminho: "/rotas/:id", acao: verRota },
  { metodo: "PUT", caminho: "/rotas/:id", acao: editarRota },
  { metodo: "DELETE", caminho: "/rotas/:id", acao: excluirRota },
  // Clubes ("/clubes/entrar" vem antes de "/clubes/:id")
  { metodo: "GET", caminho: "/clubes", acao: listarClubes },
  { metodo: "POST", caminho: "/clubes", acao: criarClube },
  { metodo: "POST", caminho: "/clubes/entrar", acao: entrarNoClube },
  { metodo: "GET", caminho: "/clubes/:id", acao: verClube },
  { metodo: "PUT", caminho: "/clubes/:id", acao: editarClube },
  { metodo: "DELETE", caminho: "/clubes/:id", acao: excluirClube },
  { metodo: "POST", caminho: "/clubes/:id/sair", acao: sairDoClube },
  // Publicações
  { metodo: "GET", caminho: "/publicacoes", acao: feed },
  { metodo: "POST", caminho: "/publicacoes", acao: criarPublicacao },
  { metodo: "DELETE", caminho: "/publicacoes/:id", acao: excluirPublicacao },
  // Amigos
  { metodo: "GET", caminho: "/amigos", acao: listarAmigos },
  { metodo: "POST", caminho: "/amigos/:id", acao: seguir },
  { metodo: "DELETE", caminho: "/amigos/:id", acao: deixarDeSeguir },
  // Usuários
  { metodo: "GET", caminho: "/usuarios", acao: buscarUsuarios },
  { metodo: "GET", caminho: "/usuarios/:id", acao: verUsuario },
  // Gamificação
  { metodo: "GET", caminho: "/sequencia", acao: verSequencia },
  { metodo: "GET", caminho: "/desafios", acao: verDesafios },
];

// "/atividades/:id" -> /^\/atividades\/([^/]+)$/ guardando o nome "id"
const ROTAS_COMPILADAS = ROTAS.map((r) => {
  const nomes: string[] = [];
  const padrao = r.caminho.replace(/:([a-z_]+)/gi, (_, nome) => {
    nomes.push(nome);
    return "([^/]+)";
  });
  return { ...r, regex: new RegExp("^" + padrao + "$"), nomes };
});

function caminhoDaApi(url: URL): string {
  // Chega como /trainly-api/atividades (ou /functions/v1/trainly-api/...)
  let p = url.pathname.replace(/^\/(functions\/v1\/)?trainly-api/, "");
  p = p.replace(/\/+$/, "");
  return p || "/";
}

export async function tratarRequisicao(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const inicio = Date.now();
  const url = new URL(req.url);
  const caminho = caminhoDaApi(url);

  try {
    if (!chavePublicaValida(req)) {
      throw new ErroApi(401, "Envie a chave pública do projeto no cabeçalho apikey.");
    }

    const candidatas = ROTAS_COMPILADAS.filter((r) => r.regex.test(caminho));
    if (!candidatas.length) throw new ErroApi(404, `Rota não encontrada: ${req.method} ${caminho}`);
    const rota = candidatas.find((r) => r.metodo === req.method);
    if (!rota) {
      throw new ErroApi(405, `Método ${req.method} não permitido em ${caminho}. Use: ${candidatas.map((r) => r.metodo).join(", ")}.`);
    }

    const valores = caminho.match(rota.regex)!.slice(1);
    const params: Record<string, string> = {};
    rota.nomes.forEach((n, i) => (params[n] = decodeURIComponent(valores[i])));

    const token = tokenDoCabecalho(req);
    const usuario = rota.publica ? null : await usuarioLogado(token);
    const ctx: Contexto = {
      req,
      params,
      query: url.searchParams,
      corpo: await lerCorpo(req),
      db: clienteSupabase(token ?? undefined),
      usuario,
    };

    const resultado = await rota.acao(ctx);
    // deno-lint-ignore no-explicit-any
    const r = resultado as any;
    const resposta = r && typeof r === "object" && "status" in r && "corpo" in r ? json(r.corpo, r.status) : json(resultado);
    console.log(`${req.method} ${caminho} -> ${resposta.status} (${Date.now() - inicio} ms)`);
    return resposta;
  } catch (e) {
    const erro = e instanceof ErroApi ? e : traduzirErro(e, "Erro interno da API.");
    if (erro.status >= 500) console.error(`${req.method} ${caminho}:`, e);
    return json({ erro: erro.message, status: erro.status }, erro.status);
  }
}

// Liga o servidor (nos testes locais a variável abaixo impede, pra poder importar o arquivo)
if (Deno.env.get("TRAINLY_API_TESTE") !== "1") Deno.serve(tratarRequisicao);
