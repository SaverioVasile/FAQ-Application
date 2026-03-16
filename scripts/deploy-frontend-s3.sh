#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
ENV_FILE="${1:-$ROOT_DIR/.env.aws.frontend}"

if ! command -v aws >/dev/null 2>&1; then
  echo "error: AWS CLI non trovata. Installa e configura prima di continuare." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: file env non trovato: $ENV_FILE" >&2
  echo "hint: copia $ROOT_DIR/.env.aws.frontend.example in $ROOT_DIR/.env.aws.frontend" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
  echo "error: VITE_API_BASE_URL mancante" >&2
  exit 1
fi

if [[ -z "${S3_BUCKET:-}" ]]; then
  echo "error: S3_BUCKET mancante" >&2
  exit 1
fi

cd "$FRONTEND_DIR"

echo "[1/4] Install dipendenze frontend"
npm install --no-audit --no-fund

echo "[2/4] Build frontend con API URL: $VITE_API_BASE_URL"
VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build

echo "[3/4] Upload su S3 bucket: $S3_BUCKET"
aws s3 sync dist/ "s3://$S3_BUCKET" --delete

if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  echo "[4/4] Invalidation CloudFront: $CLOUDFRONT_DISTRIBUTION_ID"
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths '/*' >/dev/null
else
  echo "[4/4] Invalidation CloudFront saltata (CLOUDFRONT_DISTRIBUTION_ID vuoto)"
fi

echo "Deploy frontend completato."

