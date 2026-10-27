# API Trainly (Edge Function no Supabase)

API REST do Trainly, hospedada no próprio Supabase: o mesmo banco do app e do site.
Tudo que é criado pela API aparece no app e no site (e vice-versa).

- **Código:** `supabase/functions/trainly-api/index.ts` (um arquivo, organizado por assunto)
- **Documentação interativa (estilo Swagger):** `api-docs.php`, no site
- **Especificação OpenAPI 3.0:** `docs/openapi.json`
- **Endereço:** `https://SEU-PROJETO.supabase.co/functions/v1/trainly-api`

## Rotas (32)

| Assunto | Método e caminho | O que faz |
|---|---|---|
| Geral | `GET /` | Informações da API |
| Geral | `GET /saude` | Status (a API está no ar?) |
| Autenticação | `POST /auth/login` | E-mail e senha → token |
| Perfil | `GET /perfil` | Meus dados + nível, patente, XP |
| Perfil | `PUT /perfil` | Editar nome, bio, localização |
| Atividades | `GET /atividades` | Listar (filtros `tipo`, `limite`) |
| Atividades | `POST /atividades` | Cadastrar (calcula o XP) |
| Atividades | `GET /atividades/{id}` | Visualizar |
| Atividades | `PUT /atividades/{id}` | Editar (só as suas) |
| Atividades | `DELETE /atividades/{id}` | Excluir (só as suas) |
| Rotas | `GET /rotas` | Listar (suas + de quem você segue) |
| Rotas | `POST /rotas` | Cadastrar (trajeto com 2+ pontos) |
| Rotas | `GET /rotas/{id}` | Visualizar |
| Rotas | `PUT /rotas/{id}` | Editar (só as suas) |
| Rotas | `DELETE /rotas/{id}` | Excluir (só as suas) |
| Clubes | `GET /clubes` | Meus clubes |
| Clubes | `POST /clubes` | Criar clube |
| Clubes | `POST /clubes/entrar` | Entrar com código de convite |
| Clubes | `GET /clubes/{id}` | Ver clube e membros |
| Clubes | `PUT /clubes/{id}` | Editar (só quem criou) |
| Clubes | `DELETE /clubes/{id}` | Excluir (só quem criou) |
| Clubes | `POST /clubes/{id}/sair` | Sair do clube |
| Publicações | `GET /publicacoes` | Feed (suas + de quem você segue) |
| Publicações | `POST /publicacoes` | Publicar texto |
| Publicações | `DELETE /publicacoes/{id}` | Excluir (só as suas) |
| Amigos | `GET /amigos` | Quem eu sigo |
| Amigos | `POST /amigos/{id}` | Seguir |
| Amigos | `DELETE /amigos/{id}` | Deixar de seguir |
| Usuários | `GET /usuarios?busca=` | Buscar atletas pelo nome |
| Usuários | `GET /usuarios/{id}` | Perfil público |
| Gamificação | `GET /sequencia` | Sequência semanal (foguinho) |
| Gamificação | `GET /desafios` | Desafios de hoje e da semana |

Respostas sempre em JSON. Erros vêm como `{ "erro": "mensagem", "status": 400 }`, com o código
HTTP certo: 400 (dado inválido), 401 (sem login), 403 (sem permissão), 404 (não encontrado),
405 (método errado), 409 (já existe).

## Como publicar (pelo painel, sem instalar nada)

1. Entre em **supabase.com** → seu projeto → **Edge Functions** (menu da esquerda).
2. Clique em **Deploy a new function** → **Via Editor**.
3. Dê o nome **`trainly-api`** (exatamente assim, é o que aparece no endereço).
4. Apague o código de exemplo, cole **todo** o conteúdo de `index.ts` e clique em **Deploy function**.
5. Abra a função → **Details** (ou **Settings**) → **desligue "Verify JWT"** (às vezes aparece como
   "Enforce JWT verification") e salve.
   - Por quê: o site usa a chave nova `sb_publishable_...`, que não é um JWT, e essa checagem
     automática só entende as chaves antigas. A própria API confere a chave pública e o token de login.
6. Abra `api-docs.php` no site: o selo deve ficar **Online**. Teste `GET /saude` e depois `GET /perfil`.

> Pela linha de comando (opcional): `supabase functions deploy trainly-api --no-verify-jwt`
> (o arquivo `supabase/config.toml` já deixa isso configurado).

## Como funciona a segurança

- Toda chamada precisa da **chave pública** no cabeçalho `apikey` (a mesma do site).
- As rotas de dados precisam do **token de login** em `Authorization: Bearer <token>`.
- A API conversa com o banco **como o próprio usuário**: as regras de acesso (RLS) continuam valendo,
  então ninguém consegue editar ou apagar o que não é seu. Nenhuma chave secreta é usada.

## Como testar sem publicar (opcional, para quem programa)

O arquivo exporta `tratarRequisicao(req)`. Com a variável `TRAINLY_API_TESTE=1` ele não sobe o servidor,
então dá pra importar num teste do Deno e chamar as rotas com um Supabase de mentira.
