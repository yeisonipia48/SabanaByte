FROM php:8.3-apache

WORKDIR /var/www/html

# Instalamos nano, ping y las librerías de desarrollo necesarias para PostgreSQL (libpq-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nano \
    iputils-ping \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalamos y habilitamos las extensiones de PHP para PostgreSQL
RUN docker-php-ext-install pdo pdo_pgsql pgsql && docker-php-ext-enable pdo_pgsql pgsql

COPY . /var/www/html