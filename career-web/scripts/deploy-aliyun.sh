#!/usr/bin/env bash
set -euo pipefail

HOST_NAME="${HOST_NAME:-}"
SSH_USER="${SSH_USER:-root}"
KEY_PATH="${KEY_PATH:-}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/career-web/current}"
REMOTE_DATA_DIR="${REMOTE_DATA_DIR:-/var/lib/career-web/workspace}"
APP_NAME="${APP_NAME:-career-web}"
APP_BASE="${APP_BASE:-/test/}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE="${TMPDIR:-/tmp}/career-web-release.tar.gz"
REMOTE_ARCHIVE="/tmp/career-web-release.tar.gz"
SSH_TARGET="${SSH_USER}@${HOST_NAME}"
SSH_OPTS=(-i "$KEY_PATH" -o StrictHostKeyChecking=accept-new)

if [ -z "$HOST_NAME" ] || [ -z "$KEY_PATH" ]; then
  echo "Missing HOST_NAME or KEY_PATH."
  echo "Example: HOST_NAME=your.server.ip KEY_PATH=\$HOME/.ssh/your_key ./scripts/deploy-aliyun.sh"
  exit 1
fi

cd "$PROJECT_ROOT"
npm install
APP_BASE="$APP_BASE" npm run build

rm -f "$ARCHIVE"
tar \
  --exclude='.env.local' \
  --exclude='workspace' \
  --exclude='node_modules' \
  --exclude='.git' \
  -czf "$ARCHIVE" .

scp "${SSH_OPTS[@]}" "$ARCHIVE" "${SSH_TARGET}:${REMOTE_ARCHIVE}"

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "REMOTE_DIR='$REMOTE_DIR' REMOTE_DATA_DIR='$REMOTE_DATA_DIR' APP_NAME='$APP_NAME' bash -s" <<'REMOTE'
set -euo pipefail

mkdir -p "$REMOTE_DIR" "$REMOTE_DATA_DIR"
rm -rf "$REMOTE_DIR"/*
tar --warning=no-timestamp -xzf /tmp/career-web-release.tar.gz -C "$REMOTE_DIR"
rm -f /tmp/career-web-release.tar.gz

cd "$REMOTE_DIR"
npm install --omit=dev

if [ ! -f .env.local ]; then
  cat > .env.local <<EOF
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
HOST=127.0.0.1
PORT=5174
CAREER_WEB_DATA=$REMOTE_DATA_DIR
EOF
  chmod 600 .env.local
fi

set -a
. ./.env.local
set +a

if command -v pm2 >/dev/null 2>&1; then
  pm2 start ecosystem.config.cjs --name "$APP_NAME" || pm2 restart "$APP_NAME" --update-env
  pm2 save
else
  echo "pm2 is not installed. Install with: npm install -g pm2"
fi

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx || true
fi
REMOTE

echo "Uploaded career-web to ${SSH_TARGET}:${REMOTE_DIR}"
