<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

// ---- CORS ----
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = get_pdo();
$method = $_SERVER['REQUEST_METHOD'];

// Extrai a rota. Prioridade: ?route=xxx (não depende de nenhuma
// configuração do Apache). Se não vier, tenta pela URL bonita
// (/api/xxx), pra quando o mod_rewrite estiver disponível.
if (isset($_GET['route'])) {
    $path = trim($_GET['route'], '/');
} else {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = trim(preg_replace('#^.*?/api/?#', '', $uri), '/');
}

// ---------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------
if ($path === 'auth/register' && $method === 'POST') {
    $body = json_body();
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$name || !$email || strlen($password) < 8) {
        json_response(['error' => 'Preencha nome, e-mail e senha (mín. 8 caracteres)'], 400);
    }

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_response(['error' => 'Já existe uma conta com esse e-mail'], 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, xp) VALUES (?, ?, ?, 0)');
    $stmt->execute([$name, $email, $hash]);
    $userId = (int) $pdo->lastInsertId();

    $token = jwt_encode(['userId' => $userId], $_ENV['JWT_SECRET']);
    json_response(['token' => $token, 'data' => build_user_data($pdo, $userId)], 201);
}

// ---------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------
if ($path === 'auth/login' && $method === 'POST') {
    $body = json_body();
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_response(['error' => 'E-mail ou senha inválidos'], 401);
    }

    $token = jwt_encode(['userId' => (int) $user['id']], $_ENV['JWT_SECRET']);
    json_response(['token' => $token, 'data' => build_user_data($pdo, (int) $user['id'])]);
}

// ---------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------
if ($path === 'me' && $method === 'GET') {
    $userId = require_auth();
    $data = build_user_data($pdo, $userId);
    if (!$data) json_response(['error' => 'Usuário não encontrado'], 404);
    json_response(['data' => $data]);
}

// ---------------------------------------------------------------
// POST /activities  (aceita JSON simples OU multipart/form-data com foto)
// ---------------------------------------------------------------
if ($path === 'activities' && $method === 'POST') {
    $userId = require_auth();

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isMultipart = stripos($contentType, 'multipart/form-data') !== false;
    $body = $isMultipart ? $_POST : json_body();

    $distanceKm = (float) ($body['distanceKm'] ?? 0);
    $durationSec = (int) ($body['durationSec'] ?? 0);
    $type = trim($body['type'] ?? '') ?: 'Corrida';
    $title = isset($body['title']) && trim($body['title']) !== '' ? trim($body['title']) : null;
    $heartRate = isset($body['heartRate']) && $body['heartRate'] !== '' ? (int) $body['heartRate'] : null;
    $elevationM = isset($body['elevationM']) && $body['elevationM'] !== '' ? (int) $body['elevationM'] : null;

    if ($distanceKm <= 0 || $durationSec <= 0) {
        json_response(['error' => 'distanceKm e durationSec são obrigatórios'], 400);
    }

    // ---- Upload de foto (opcional) ----
    $photoPath = null;
    if ($isMultipart && isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $tmpPath = $_FILES['photo']['tmp_name'];
        $mime = mime_content_type($tmpPath);

        if (!isset($allowed[$mime])) {
            json_response(['error' => 'Formato de imagem não suportado (use JPG, PNG ou WEBP)'], 400);
        }
        if ($_FILES['photo']['size'] > 5 * 1024 * 1024) {
            json_response(['error' => 'Imagem muito grande (máx. 5MB)'], 400);
        }

        $uploadDir = __DIR__ . '/../uploads/activities/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
        move_uploaded_file($tmpPath, $uploadDir . $filename);
        $photoPath = 'uploads/activities/' . $filename;
    }

    $xpEarned = xp_from_activity($distanceKm, $durationSec);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO activities (user_id, type, title, photo_path, date, distance_km, duration_sec, heart_rate, elevation_m, xp_earned) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $type, $title, $photoPath, $distanceKm, $durationSec, $heartRate, $elevationM, $xpEarned]);

        $stmt = $pdo->prepare('UPDATE users SET xp = xp + ? WHERE id = ?');
        $stmt->execute([$xpEarned, $userId]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        json_response(['error' => 'Erro ao salvar atividade'], 500);
    }

    json_response(['data' => build_user_data($pdo, $userId), 'xpEarned' => $xpEarned], 201);
}

// ---------------------------------------------------------------
// POST /reward
// ---------------------------------------------------------------
if ($path === 'reward' && $method === 'POST') {
    $userId = require_auth();

    $stmt = $pdo->prepare('SELECT last_daily_reward FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    $today = date('Y-m-d');
    if ($user['last_daily_reward'] === $today) {
        json_response(['error' => 'Recompensa de hoje já foi resgatada'], 409);
    }

    $stmt = $pdo->prepare('UPDATE users SET xp = xp + 20, last_daily_reward = ? WHERE id = ?');
    $stmt->execute([$today, $userId]);

    json_response(['data' => build_user_data($pdo, $userId)]);
}

// ---------------------------------------------------------------
// GET /users/search?q=...  (busca contas reais pra seguir)
// ---------------------------------------------------------------
if ($path === 'users/search' && $method === 'GET') {
    $userId = require_auth();
    $q = trim($_GET['q'] ?? '');
    if (strlen($q) < 2) {
        json_response(['users' => []]);
    }

    $stmt = $pdo->prepare('SELECT id, name, location FROM users WHERE id <> ? AND name LIKE ? ORDER BY name ASC LIMIT 20');
    $stmt->execute([$userId, '%' . $q . '%']);
    $rows = $stmt->fetchAll();

    json_response(['users' => array_map(fn($r) => build_suggested_user($r, $pdo, $userId), $rows)]);
}

// ---------------------------------------------------------------
// GET /users/suggested  (atletas sugeridos pra seguir, sem busca)
// ---------------------------------------------------------------
if ($path === 'users/suggested' && $method === 'GET') {
    $userId = require_auth();

    $stmt = $pdo->prepare(
        "SELECT u.id, u.name, u.location FROM users u
         WHERE u.id <> ?
           AND u.id NOT IN (SELECT followed_user_id FROM following WHERE user_id = ?)
         ORDER BY RAND()
         LIMIT 8"
    );
    $stmt->execute([$userId, $userId]);
    $rows = $stmt->fetchAll();

    json_response(['users' => array_map(fn($r) => build_suggested_user($r, $pdo, $userId), $rows)]);
}

// ---------------------------------------------------------------
// GET /friends/leaderboard  (ranking semanal de quem você segue)
// ---------------------------------------------------------------
if ($path === 'friends/leaderboard' && $method === 'GET') {
    $userId = require_auth();
    json_response(['leaderboard' => build_friends_leaderboard($pdo, $userId)]);
}

// ---------------------------------------------------------------
// GET /following  (lista de quem você segue, contas reais)
// ---------------------------------------------------------------
if ($path === 'following' && $method === 'GET') {
    $userId = require_auth();
    $stmt = $pdo->prepare(
        'SELECT u.id, u.name FROM following f
         JOIN users u ON u.id = f.followed_user_id
         WHERE f.user_id = ? ORDER BY u.name ASC'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    $following = array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $rows);
    json_response(['following' => $following]);
}

// ---------------------------------------------------------------
// POST /following/{id}  e  DELETE /following/{id}
// ---------------------------------------------------------------
if (preg_match('#^following/(\d+)$#', $path, $m)) {
    $userId = require_auth();
    $targetId = (int) $m[1];

    if ($targetId === $userId) {
        json_response(['error' => 'Você não pode seguir a si mesmo'], 400);
    }

    if ($method === 'POST') {
        $stmt = $pdo->prepare('INSERT IGNORE INTO following (user_id, followed_user_id) VALUES (?, ?)');
        $stmt->execute([$userId, $targetId]);
        json_response(['ok' => true], 201);
    }

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM following WHERE user_id = ? AND followed_user_id = ?');
        $stmt->execute([$userId, $targetId]);
        json_response(['ok' => true], 204);
    }
}

// ---------------------------------------------------------------
// GET /feed  (suas atividades + de quem você segue)
// ---------------------------------------------------------------
if ($path === 'feed' && $method === 'GET') {
    $userId = require_auth();
    json_response(['feed' => build_feed($pdo, $userId)]);
}

// ---------------------------------------------------------------
// GET /feed/active-today
// ---------------------------------------------------------------
if ($path === 'feed/active-today' && $method === 'GET') {
    $userId = require_auth();
    json_response(['active' => build_active_today($pdo, $userId)]);
}

// ---------------------------------------------------------------
// POST /activities/{id}/like   e   DELETE /activities/{id}/like
// ---------------------------------------------------------------
if (preg_match('#^activities/(\d+)/like$#', $path, $m)) {
    $userId = require_auth();
    $activityId = (int) $m[1];

    if ($method === 'POST') {
        $stmt = $pdo->prepare('INSERT IGNORE INTO activity_likes (activity_id, user_id) VALUES (?, ?)');
        $stmt->execute([$activityId, $userId]);
    } elseif ($method === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM activity_likes WHERE activity_id = ? AND user_id = ?');
        $stmt->execute([$activityId, $userId]);
    }

    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM activity_likes WHERE activity_id = ?');
    $stmt->execute([$activityId]);
    $count = (int) $stmt->fetch()['c'];

    json_response(['likeCount' => $count, 'likedByMe' => $method === 'POST']);
}

// ---------------------------------------------------------------
// GET /routes?type=Todos|Corrida|Ciclismo|Trilha
// ---------------------------------------------------------------
if ($path === 'routes' && $method === 'GET') {
    require_auth();
    $type = trim($_GET['type'] ?? 'Todos');

    if ($type === 'Todos' || $type === '') {
        $stmt = $pdo->query('SELECT * FROM routes ORDER BY created_at DESC');
    } else {
        $stmt = $pdo->prepare('SELECT * FROM routes WHERE type = ? ORDER BY created_at DESC');
        $stmt->execute([$type]);
    }
    $rows = $stmt->fetchAll();
    json_response(['routes' => array_map('build_route', $rows)]);
}

// ---------------------------------------------------------------
// POST /routes  (cadastrar rota nova)
// ---------------------------------------------------------------
if ($path === 'routes' && $method === 'POST') {
    $userId = require_auth();
    $body = json_body();

    $name = trim($body['name'] ?? '');
    $type = trim($body['type'] ?? '') ?: 'Corrida';
    $difficulty = trim($body['difficulty'] ?? '') ?: 'Iniciante';
    $terrain = trim($body['terrain'] ?? '') ?: null;
    $distanceKm = (float) ($body['distanceKm'] ?? 0);
    $elevationM = (int) ($body['elevationM'] ?? 0);
    $path = $body['path'] ?? [];

    if (!$name || $distanceKm <= 0 || count($path) < 2) {
        json_response(['error' => 'Preencha o nome, a distância e marque ao menos 2 pontos no mapa'], 400);
    }

    $startLat = $path[0][0];
    $startLng = $path[0][1];

    $stmt = $pdo->prepare(
        'INSERT INTO routes (user_id, name, type, difficulty, terrain, distance_km, elevation_m, start_lat, start_lng, path_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $name, $type, $difficulty, $terrain, $distanceKm, $elevationM, $startLat, $startLng, json_encode($path)]);

    $newId = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM routes WHERE id = ?');
    $stmt->execute([$newId]);
    json_response(['route' => build_route($stmt->fetch())], 201);
}

// ---------------------------------------------------------------
// PUT /profile  (editar nome, bio, localização)
// ---------------------------------------------------------------
if ($path === 'profile' && $method === 'PUT') {
    $userId = require_auth();
    $body = json_body();

    $name = trim($body['name'] ?? '');
    $bio = isset($body['bio']) ? trim($body['bio']) : null;
    $location = isset($body['location']) ? trim($body['location']) : null;

    if (!$name) {
        json_response(['error' => 'O nome não pode ficar vazio'], 400);
    }
    if ($bio !== null && strlen($bio) > 280) {
        json_response(['error' => 'A bio pode ter no máximo 280 caracteres'], 400);
    }

    $stmt = $pdo->prepare('UPDATE users SET name = ?, bio = ?, location = ? WHERE id = ?');
    $stmt->execute([$name, $bio ?: null, $location ?: null, $userId]);

    json_response(['data' => build_user_data($pdo, $userId)]);
}

// ---------------------------------------------------------------
// POST /profile/cover  (upload da foto de capa)
// ---------------------------------------------------------------
if ($path === 'profile/cover' && $method === 'POST') {
    $userId = require_auth();

    if (!isset($_FILES['cover']) || $_FILES['cover']['error'] !== UPLOAD_ERR_OK) {
        json_response(['error' => 'Nenhuma imagem enviada'], 400);
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $tmpPath = $_FILES['cover']['tmp_name'];
    $mime = mime_content_type($tmpPath);

    if (!isset($allowed[$mime])) {
        json_response(['error' => 'Formato de imagem não suportado (use JPG, PNG ou WEBP)'], 400);
    }
    if ($_FILES['cover']['size'] > 8 * 1024 * 1024) {
        json_response(['error' => 'Imagem muito grande (máx. 8MB)'], 400);
    }

    $uploadDir = __DIR__ . '/../uploads/covers/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $filename = 'cover_' . $userId . '_' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    move_uploaded_file($tmpPath, $uploadDir . $filename);
    $coverPath = 'uploads/covers/' . $filename;

    $stmt = $pdo->prepare('UPDATE users SET cover_photo = ? WHERE id = ?');
    $stmt->execute([$coverPath, $userId]);

    json_response(['data' => build_user_data($pdo, $userId)]);
}

// ---------------------------------------------------------------
// POST /profile/avatar  (upload da foto de perfil)
// ---------------------------------------------------------------
if ($path === 'profile/avatar' && $method === 'POST') {
    $userId = require_auth();

    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        json_response(['error' => 'Nenhuma imagem enviada'], 400);
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $tmpPath = $_FILES['avatar']['tmp_name'];
    $mime = mime_content_type($tmpPath);

    if (!isset($allowed[$mime])) {
        json_response(['error' => 'Formato de imagem não suportado (use JPG, PNG ou WEBP)'], 400);
    }
    if ($_FILES['avatar']['size'] > 5 * 1024 * 1024) {
        json_response(['error' => 'Imagem muito grande (máx. 5MB)'], 400);
    }

    $uploadDir = __DIR__ . '/../uploads/avatars/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $filename = 'avatar_' . $userId . '_' . bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    move_uploaded_file($tmpPath, $uploadDir . $filename);
    $avatarPath = 'uploads/avatars/' . $filename;

    $stmt = $pdo->prepare('UPDATE users SET avatar_photo = ? WHERE id = ?');
    $stmt->execute([$avatarPath, $userId]);

    json_response(['data' => build_user_data($pdo, $userId)]);
}

// ---------------------------------------------------------------
// POST /clubs  (criar clube)
// ---------------------------------------------------------------
if ($path === 'clubs' && $method === 'POST') {
    $userId = require_auth();
    $body = json_body();
    $name = trim($body['name'] ?? '');
    $description = trim($body['description'] ?? '') ?: null;

    if (!$name) {
        json_response(['error' => 'Nome do clube é obrigatório'], 400);
    }

    $code = strtoupper(bin2hex(random_bytes(4))); // 8 caracteres

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO clubs (name, description, invite_code, created_by) VALUES (?, ?, ?, ?)');
        $stmt->execute([$name, $description, $code, $userId]);
        $clubId = (int) $pdo->lastInsertId();

        $stmt = $pdo->prepare('INSERT INTO club_members (club_id, user_id) VALUES (?, ?)');
        $stmt->execute([$clubId, $userId]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        json_response(['error' => 'Erro ao criar clube'], 500);
    }

    $stmt = $pdo->prepare('SELECT * FROM clubs WHERE id = ?');
    $stmt->execute([$clubId]);
    json_response(['club' => build_club($stmt->fetch(), $pdo, $userId)], 201);
}

// ---------------------------------------------------------------
// GET /clubs  (meus clubes)
// ---------------------------------------------------------------
if ($path === 'clubs' && $method === 'GET') {
    $userId = require_auth();
    $stmt = $pdo->prepare(
        'SELECT c.* FROM clubs c
         JOIN club_members cm ON cm.club_id = c.id
         WHERE cm.user_id = ? ORDER BY c.created_at DESC'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    json_response(['clubs' => array_map(fn($r) => build_club($r, $pdo, $userId), $rows)]);
}

// ---------------------------------------------------------------
// POST /clubs/join  (entrar com código de convite)
// ---------------------------------------------------------------
if ($path === 'clubs/join' && $method === 'POST') {
    $userId = require_auth();
    $body = json_body();
    $code = strtoupper(trim($body['code'] ?? ''));

    if (!$code) {
        json_response(['error' => 'Informe um código de convite'], 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM clubs WHERE invite_code = ?');
    $stmt->execute([$code]);
    $club = $stmt->fetch();

    if (!$club) {
        json_response(['error' => 'Código de convite inválido'], 404);
    }

    $stmt = $pdo->prepare('INSERT IGNORE INTO club_members (club_id, user_id) VALUES (?, ?)');
    $stmt->execute([$club['id'], $userId]);

    json_response(['club' => build_club($club, $pdo, $userId)], 201);
}

// ---------------------------------------------------------------
// GET /clubs/{id}  (detalhe + ranking)
// ---------------------------------------------------------------
if (preg_match('#^clubs/(\d+)$#', $path, $m) && $method === 'GET') {
    $userId = require_auth();
    $clubId = (int) $m[1];

    $stmt = $pdo->prepare('SELECT * FROM clubs WHERE id = ?');
    $stmt->execute([$clubId]);
    $club = $stmt->fetch();
    if (!$club) json_response(['error' => 'Clube não encontrado'], 404);

    $detail = build_club($club, $pdo, $userId);
    $detail['leaderboard'] = build_club_leaderboard($pdo, $clubId);
    json_response(['club' => $detail]);
}

// ---------------------------------------------------------------
// POST /clubs/{id}/leave  (sair do clube)
// ---------------------------------------------------------------
if (preg_match('#^clubs/(\d+)/leave$#', $path, $m) && $method === 'POST') {
    $userId = require_auth();
    $clubId = (int) $m[1];
    $stmt = $pdo->prepare('DELETE FROM club_members WHERE club_id = ? AND user_id = ?');
    $stmt->execute([$clubId, $userId]);
    json_response(['ok' => true]);
}

// ---------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------
if ($path === 'health') {
    json_response(['ok' => true]);
}

// Nenhuma rota bateu
json_response(['error' => 'Rota não encontrada: ' . $method . ' /' . $path], 404);