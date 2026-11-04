<?php

declare(strict_types=1);

return [
    'api_base' => rtrim(getenv('API_BASE_URL') ?: 'http://api:8000', '/'),
    'timeout' => (int) (getenv('API_TIMEOUT') ?: 20),
];
