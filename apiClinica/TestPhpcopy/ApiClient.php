<?php

declare(strict_types=1);

final class ApiClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly int $timeout = 20,
    ) {
    }

    /**
     * @param array<string, mixed>|null $body
     * @param array<string, mixed> $query
     * @return array{ok: bool, status: int, data: mixed, url: string, error: string|null}
     */
    public function request(string $method, string $path, ?array $body = null, array $query = []): array
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');

        $query = array_filter(
            $query,
            static fn (mixed $value): bool => $value !== null && $value !== ''
        );

        if ($query !== []) {
            $url .= '?' . http_build_query($query);
        }

        $headers = ['Accept: application/json'];
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => min(5, $this->timeout),
            CURLOPT_FOLLOWLOCATION => false,
        ];

        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
            $options[CURLOPT_POSTFIELDS] = json_encode(
                $body,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );
        }

        $options[CURLOPT_HTTPHEADER] = $headers;

        $curl = curl_init($url);
        if ($curl === false) {
            return [
                'ok' => false,
                'status' => 0,
                'data' => null,
                'url' => $url,
                'error' => 'No se pudo inicializar cURL.',
            ];
        }

        curl_setopt_array($curl, $options);
        $raw = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);

        if ($raw === false) {
            return [
                'ok' => false,
                'status' => 0,
                'data' => null,
                'url' => $url,
                'error' => $curlError !== '' ? $curlError : 'No se pudo conectar con la API.',
            ];
        }

        $data = json_decode($raw, true);
        if ($data === null && strtolower(trim($raw)) !== 'null' && trim($raw) !== '') {
            $data = $raw;
        }

        return [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'data' => $data,
            'url' => $url,
            'error' => null,
        ];
    }
}
