<?php
// Lê o arquivo .env (formato CHAVE=valor, uma por linha) e coloca em $_ENV.
// Não usa nenhuma dependência externa, então funciona em qualquer
// hospedagem PHP padrão.

function load_env(string $path): void {
    if (!file_exists($path)) {
        http_response_code(500);
        die(json_encode(['error' => 'Arquivo .env não encontrado. Copie .env.example para .env e preencha.']));
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $_ENV[trim($key)] = trim($value);
    }
}

load_env(__DIR__ . '/.env');
