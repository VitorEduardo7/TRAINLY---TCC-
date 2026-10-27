<?php
require_once __DIR__ . '/env.php';

function get_pdo(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $port = $_ENV['DB_PORT'] ?? '3306';
        $db   = $_ENV['DB_NAME'] ?? 'trainly';
        $user = $_ENV['DB_USER'] ?? '';
        $pass = $_ENV['DB_PASSWORD'] ?? '';

        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
        try {
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Não foi possível conectar ao banco de dados']));
        }
    }
    return $pdo;
}
