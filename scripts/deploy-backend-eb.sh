#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ENV_FILE="${1:-$ROOT_DIR/.env.aws.backend}"
ENV_NAME="${EB_ENV_NAME:-faq-backend-prod}"

if ! command -v eb >/dev/null 2>&1; then
  echo "error: EB CLI non trovato. Installa con: brew install awsebcli" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: file env non trovato: $ENV_FILE" >&2
  echo "hint: copia $ROOT_DIR/.env.aws.backend.example in $ROOT_DIR/.env.aws.backend" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

required_vars=(
  APP_DB_PROVIDER
  APP_DB_RDS_URL
  APP_DB_RDS_USERNAME
  APP_DB_RDS_PASSWORD
  APP_MAIL_ENABLED
  APP_MAIL_PROVIDER
  APP_MAIL_FROM
  APP_MAIL_SES_REGION
  APP_CORS_ALLOWED_ORIGINS
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "error: variabile obbligatoria mancante: $var_name" >&2
    exit 1
  fi
done

cd "$BACKEND_DIR"

echo "[1/3] Applico env su Elastic Beanstalk ($ENV_NAME)"
eb setenv \
  "APP_DB_PROVIDER=$APP_DB_PROVIDER" \
  "APP_DB_RDS_URL=$APP_DB_RDS_URL" \
  "APP_DB_RDS_USERNAME=$APP_DB_RDS_USERNAME" \
  "APP_DB_RDS_PASSWORD=$APP_DB_RDS_PASSWORD" \
  "APP_MAIL_ENABLED=$APP_MAIL_ENABLED" \
  "APP_MAIL_PROVIDER=$APP_MAIL_PROVIDER" \
  "APP_MAIL_FROM=$APP_MAIL_FROM" \
  "APP_MAIL_SES_REGION=$APP_MAIL_SES_REGION" \
  "APP_MAIL_SES_ACCESS_KEY=${APP_MAIL_SES_ACCESS_KEY:-}" \
  "APP_MAIL_SES_SECRET_KEY=${APP_MAIL_SES_SECRET_KEY:-}" \
  "APP_CORS_ALLOWED_ORIGINS=$APP_CORS_ALLOWED_ORIGINS" \
  "$ENV_NAME"

echo "[2/3] Deploy backend"
eb deploy "$ENV_NAME"

echo "[3/3] Stato e URL"
eb status "$ENV_NAME"
eb open "$ENV_NAME"

