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
    $stmt = $pdo->prepare('SELECT id, name, bio, location, cover_photo, avatar_photo, xp, monthly_goal_km, last_daily_reward FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) return null;

    $stmt = $pdo->prepare(
        'SELECT a.id, a.date, a.type, a.title, a.photo_path, a.distance_km, a.duration_sec, a.heart_rate, a.elevation_m, a.xp_earned,
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
            'photoUrl' => $r['photo_path'] ?: null,
            'distanceKm' => (float) $r['distance_km'],
            'durationSec' => (int) $r['duration_sec'],
            'heartRate' => $r['heart_rate'] !== null ? (int) $r['heart_rate'] : null,
            'elevationM' => $r['elevation_m'] !== null ? (int) $r['elevation_m'] : null,
            'xpEarned' => (int) $r['xp_earned'],
            'likeCount' => (int) $r['like_count'],
            'likedByMe' => (int) $r['liked_by_me'] > 0,
        ];
    }, $rows);

    // Seguidores: quantas pessoas seguem este usuário
    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM following WHERE followed_user_id = ?');
    $stmt->execute([$userId]);
    $followersCount = (int) $stmt->fetch()['c'];

    // Kudos recebidos: soma de curtidas em todas as atividades deste usuário
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS c FROM activity_likes al
         JOIN activities a ON a.id = al.activity_id
         WHERE a.user_id = ?'
    );
    $stmt->execute([$userId]);
    $kudosReceived = (int) $stmt->fetch()['c'];

    return [
        'name' => $user['name'],
        'bio' => $user['bio'],
        'location' => $user['location'],
        'coverPhotoUrl' => $user['cover_photo'],
        'avatarPhotoUrl' => $user['avatar_photo'],
        'xp' => (int) $user['xp'],
        'monthlyGoalKm' => (int) $user['monthly_goal_km'],
        'activities' => $activities,
        'followersCount' => $followersCount,
        'kudosReceived' => $kudosReceived,
        'lastDailyReward' => $user['last_daily_reward']
            ? date('D M d Y', strtotime($user['last_daily_reward'])) // equivalente ao toDateString() do JS
            : null,
    ];
}

// ---- NOVO: sugestões de atletas e ranking entre amigos ----
function build_suggested_user(array $r, PDO $pdo, int $currentUserId): array {
    $userId = (int) $r['id'];

    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(distance_km),0) AS km, COUNT(*) AS c FROM activities
         WHERE user_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())"
    );
    $stmt->execute([$userId]);
    $monthRow = $stmt->fetch();

    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM activities WHERE user_id = ?');
    $stmt->execute([$userId]);
    $activitiesCount = (int) $stmt->fetch()['c'];

    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM following WHERE followed_user_id = ?');
    $stmt->execute([$userId]);
    $followersCount = (int) $stmt->fetch()['c'];

    // Amigos em comum: pessoas que tanto eu quanto essa pessoa seguimos
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS c FROM following f1
         JOIN following f2 ON f1.followed_user_id = f2.followed_user_id
         WHERE f1.user_id = ? AND f2.user_id = ?'
    );
    $stmt->execute([$currentUserId, $userId]);
    $mutualCount = (int) $stmt->fetch()['c'];

    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM following WHERE user_id = ? AND followed_user_id = ?');
    $stmt->execute([$currentUserId, $userId]);
    $isFollowing = (int) $stmt->fetch()['c'] > 0;

    return [
        'id' => $userId,
        'name' => $r['name'],
        'location' => $r['location'] ?? null,
        'kmMonth' => (float) $monthRow['km'],
        'activitiesCount' => $activitiesCount,
        'followersCount' => $followersCount,
        'mutualCount' => $mutualCount,
        'isFollowing' => $isFollowing,
    ];
}

function build_friends_leaderboard(PDO $pdo, int $userId, int $limit = 10): array {
    $weekStart = get_week_start();
    $stmt = $pdo->prepare(
        'SELECT u.id, u.name, COALESCE(SUM(CASE WHEN a.date >= ? THEN a.distance_km ELSE 0 END), 0) AS week_km
         FROM following f
         JOIN users u ON u.id = f.followed_user_id
         LEFT JOIN activities a ON a.user_id = u.id
         WHERE f.user_id = ?
         GROUP BY u.id, u.name
         ORDER BY week_km DESC
         LIMIT ' . (int) $limit
    );
    $stmt->execute([$weekStart, $userId]);
    $rows = $stmt->fetchAll();
    return array_map(function ($r) {
        return ['id' => (int) $r['id'], 'name' => $r['name'], 'weekKm' => (float) $r['week_km']];
    }, $rows);
}
function get_week_start(): string {
    $today = new DateTime();
    $dow = (int) $today->format('N'); // 1 (seg) a 7 (dom)
    $today->modify('-' . ($dow - 1) . ' days');
    $today->setTime(0, 0, 0);
    return $today->format('Y-m-d H:i:s');
}

function build_club(array $c, PDO $pdo, ?int $currentUserId = null): array {
    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM club_members WHERE club_id = ?');
    $stmt->execute([$c['id']]);
    $memberCount = (int) $stmt->fetch()['c'];

    $isMember = false;
    if ($currentUserId) {
        $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM club_members WHERE club_id = ? AND user_id = ?');
        $stmt->execute([$c['id'], $currentUserId]);
        $isMember = (int) $stmt->fetch()['c'] > 0;
    }

    return [
        'id' => (int) $c['id'],
        'name' => $c['name'],
        'description' => $c['description'],
        'inviteCode' => $c['invite_code'],
        'memberCount' => $memberCount,
        'isMember' => $isMember,
        'isAdmin' => $currentUserId && (int) $c['created_by'] === $currentUserId,
    ];
}

function build_club_leaderboard(PDO $pdo, int $clubId): array {
    $weekStart = get_week_start();
    $stmt = $pdo->prepare(
        "SELECT u.id, u.name,
                COALESCE(SUM(CASE WHEN a.date >= ? THEN a.distance_km ELSE 0 END), 0) AS week_km
         FROM club_members cm
         JOIN users u ON u.id = cm.user_id
         LEFT JOIN activities a ON a.user_id = u.id
         WHERE cm.club_id = ?
         GROUP BY u.id, u.name
         ORDER BY week_km DESC"
    );
    $stmt->execute([$weekStart, $clubId]);
    $rows = $stmt->fetchAll();
    return array_map(function ($r) {
        return ['id' => (int) $r['id'], 'name' => $r['name'], 'weekKm' => (float) $r['week_km']];
    }, $rows);
}
function build_feed(PDO $pdo, int $userId, int $limit = 30): array {
    $stmt = $pdo->prepare(
        "SELECT a.id, a.date, a.type, a.title, a.photo_path, a.distance_km, a.duration_sec, a.elevation_m,
                u.id AS author_id, u.name AS author_name,
                (SELECT COUNT(*) FROM activity_likes WHERE activity_id = a.id) AS like_count,
                (SELECT COUNT(*) FROM activity_likes WHERE activity_id = a.id AND user_id = ?) AS liked_by_me
         FROM activities a
         JOIN users u ON u.id = a.user_id
         WHERE a.user_id = ?
            OR a.user_id IN (SELECT followed_user_id FROM following WHERE user_id = ?)
         ORDER BY a.date DESC
         LIMIT ?"
    );
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $userId, PDO::PARAM_INT);
    $stmt->bindValue(3, $userId, PDO::PARAM_INT);
    $stmt->bindValue(4, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    return array_map(function ($r) {
        return [
            'id' => (int) $r['id'],
            'date' => date('c', strtotime($r['date'])),
            'type' => $r['type'] ?: 'Corrida',
            'title' => $r['title'],
            'photoUrl' => $r['photo_path'] ?: null,
            'distanceKm' => (float) $r['distance_km'],
            'durationSec' => (int) $r['duration_sec'],
            'elevationM' => $r['elevation_m'] !== null ? (int) $r['elevation_m'] : null,
            'authorId' => (int) $r['author_id'],
            'authorName' => $r['author_name'],
            'likeCount' => (int) $r['like_count'],
            'likedByMe' => (int) $r['liked_by_me'] > 0,
        ];
    }, $rows);
}

// ---- NOVO: Rotas (página Explorar) ----
function build_route(array $r): array {
    return [
        'id' => (int) $r['id'],
        'name' => $r['name'],
        'type' => $r['type'],
        'difficulty' => $r['difficulty'],
        'terrain' => $r['terrain'],
        'distanceKm' => (float) $r['distance_km'],
        'elevationM' => (int) $r['elevation_m'],
        'ratingAvg' => $r['rating_avg'] !== null ? (float) $r['rating_avg'] : null,
        'ratingCount' => (int) $r['rating_count'],
        'startLat' => (float) $r['start_lat'],
        'startLng' => (float) $r['start_lng'],
        'path' => json_decode($r['path_json'], true) ?: [],
    ];
}
function build_active_today(PDO $pdo, int $userId): array {
    $stmt = $pdo->prepare(
        "SELECT u.id, u.name, a.type, a.distance_km, a.date
         FROM following f
         JOIN users u ON u.id = f.followed_user_id
         JOIN activities a ON a.user_id = u.id
         WHERE f.user_id = ? AND DATE(a.date) = CURDATE()
         ORDER BY a.date DESC"
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    // Fica só com a atividade mais recente de cada amigo
    $seen = [];
    $result = [];
    foreach ($rows as $r) {
        if (isset($seen[$r['id']])) continue;
        $seen[$r['id']] = true;
        $result[] = [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'type' => $r['type'] ?: 'Corrida',
            'distanceKm' => (float) $r['distance_km'],
        ];
    }
    return $result;
}