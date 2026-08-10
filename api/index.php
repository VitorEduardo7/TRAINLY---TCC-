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

// Extrai o caminho depois de "/api/" (funciona com ou sem mod_rewrite bonito)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^.*?/api/?#', '', $uri);
$path = trim($path, '/');

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
// POST /activities
// ---------------------------------------------------------------
if ($path === 'activities' && $method === 'POST') {
    $userId = require_auth();
    $body = json_body();
    $distanceKm = (float) ($body['distanceKm'] ?? 0);
    $durationSec = (int) ($body['durationSec'] ?? 0);
    $type = trim($body['type'] ?? '') ?: 'Corrida';
    $title = isset($body['title']) && trim($body['title']) !== '' ? trim($body['title']) : null;
    $heartRate = isset($body['heartRate']) && $body['heartRate'] !== '' ? (int) $body['heartRate'] : null;
    $elevationM = isset($body['elevationM']) && $body['elevationM'] !== '' ? (int) $body['elevationM'] : null;

    if ($distanceKm <= 0 || $durationSec <= 0) {
        json_response(['error' => 'distanceKm e durationSec são obrigatórios'], 400);
    }

    $xpEarned = xp_from_activity($distanceKm, $durationSec);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO activities (user_id, type, title, date, distance_km, duration_sec, heart_rate, elevation_m, xp_earned) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $type, $title, $distanceKm, $durationSec, $heartRate, $elevationM, $xpEarned]);

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
// GET /following
// ---------------------------------------------------------------
if ($path === 'following' && $method === 'GET') {
    $userId = require_auth();
    $stmt = $pdo->prepare('SELECT followed_name FROM following WHERE user_id = ?');
    $stmt->execute([$userId]);
    $names = array_column($stmt->fetchAll(), 'followed_name');
    json_response(['following' => $names]);
}

// ---------------------------------------------------------------
// POST /following/{name}  e  DELETE /following/{name}
// ---------------------------------------------------------------
if (preg_match('#^following/(.+)$#', $path, $m)) {
    $userId = require_auth();
    $name = urldecode($m[1]);

    if ($method === 'POST') {
        $stmt = $pdo->prepare('INSERT IGNORE INTO following (user_id, followed_name) VALUES (?, ?)');
        $stmt->execute([$userId, $name]);
        json_response(['ok' => true], 201);
    }

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM following WHERE user_id = ? AND followed_name = ?');
        $stmt->execute([$userId, $name]);
        json_response(['ok' => true], 204);
    }
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
// GET /health
// ---------------------------------------------------------------
if ($path === 'health') {
    json_response(['ok' => true]);
}

// Nenhuma rota bateu
json_response(['error' => 'Rota não encontrada: ' . $method . ' /' . $path], 404);