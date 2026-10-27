<?php
// Implementação mínima de JWT (HS256) sem bibliotecas externas.
// Suficiente para autenticação simples com token Bearer.

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode(array $payload, string $secret, int $expiresInSeconds = 30 * 24 * 3600): string {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload['exp'] = time() + $expiresInSeconds;

    $headerEnc = base64url_encode(json_encode($header));
    $payloadEnc = base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$headerEnc.$payloadEnc", $secret, true);
    $signatureEnc = base64url_encode($signature);

    return "$headerEnc.$payloadEnc.$signatureEnc";
}

// Retorna o payload (array) se o token for válido, ou null caso contrário.
function jwt_decode(string $token, string $secret): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$headerEnc, $payloadEnc, $signatureEnc] = $parts;

    $expectedSig = base64url_encode(hash_hmac('sha256', "$headerEnc.$payloadEnc", $secret, true));
    if (!hash_equals($expectedSig, $signatureEnc)) return null;

    $payload = json_decode(base64url_decode($payloadEnc), true);
    if (!$payload) return null;
    if (isset($payload['exp']) && time() > $payload['exp']) return null; // expirado

    return $payload;
}
