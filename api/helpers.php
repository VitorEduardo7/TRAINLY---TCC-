<?php
require_once __DIR__ . '/jwt.php';

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function get_bearer_token(): ?string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (strpos($auth, 'Bearer ') === 0) {
        return substr($auth, 7);
    }
    return null;
}

// Exige um token válido. Encerra a requisição com 401 se não houver.
function require_auth(): int {
    $token = get_bearer_token();
    if (!$token) {
        json_response(['error' => 'Não autenticado'], 401);
    }
    $payload = jwt_decode($token, $_ENV['JWT_SECRET']);
    if (!$payload || !isset($payload['userId'])) {
        json_response(['error' => 'Token inválido ou expirado'], 401);
    }
    return (int) $payload['userId'];
}

function xp_from_activity(float $distanceKm, int $durationSec): int {
    $base = $distanceKm * 10;
    $timeBonus = $durationSec / 60;
    return (int) max(5, round($base + $timeBonus));
}

// Monta o objeto no mesmo formato que o main.js espera de getData().
function build_user_data(PDO $pdo, int $userId): ?array {
    $stmt = $pdo->prepare('SELECT id, name, xp, monthly_goal_km, last_daily_reward FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) return null;

    $stmt = $pdo->prepare(
        'SELECT a.id, a.date, a.type, a.title, a.distance_km, a.duration_sec, a.heart_rate, a.elevation_m, a.xp_earned,
                (SELECT COUNT(*) FROM activity_likes WHERE activity_id = a.id) AS like_count,
                (SELECT COUNT(*) FROM activity_likes WHERE activity_id = a.id AND user_id = ?) AS liked_by_me
         FROM activities a WHERE a.user_id = ? ORDER BY a.date ASC'
    );
    $stmt->execute([$userId, $userId]);
    $rows = $stmt->fetchAll();

    $activities = array_map(function ($r) {
        return [
            'id' => (int) $r['id'],
            'date' => date('c', strtotime($r['date'])), // ISO 8601
            'type' => $r['type'] ?: 'Corrida',
            'title' => $r['title'],
            'distanceKm' => (float) $r['distance_km'],
            'durationSec' => (int) $r['duration_sec'],
            'heartRate' => $r['heart_rate'] !== null ? (int) $r['heart_rate'] : null,
            'elevationM' => $r['elevation_m'] !== null ? (int) $r['elevation_m'] : null,
            'xpEarned' => (int) $r['xp_earned'],
            'likeCount' => (int) $r['like_count'],
            'likedByMe' => (int) $r['liked_by_me'] > 0,
        ];
    }, $rows);

    return [
        'name' => $user['name'],
        'xp' => (int) $user['xp'],
        'monthlyGoalKm' => (int) $user['monthly_goal_km'],
        'activities' => $activities,
        'lastDailyReward' => $user['last_daily_reward']
            ? date('D M d Y', strtotime($user['last_daily_reward'])) // equivalente ao toDateString() do JS
            : null,
    ];
}