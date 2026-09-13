#!/usr/bin/env bash
# 운영 서버 배포 스크립트
# 사용: ./deploy.sh [--no-pull]
#   1) git pull
#   2) backend / frontend 의존성 설치 + 빌드
#   3) pm2 reload (무중단 재시작)

set -euo pipefail

cd "$(dirname "$0")"

PULL=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
  esac
done

if [ "$PULL" = "1" ]; then
  echo "== git pull =="
  git pull --ff-only
fi

echo "== backend build =="
(cd backend && npm ci && npm run build)

echo "== frontend build =="
(cd frontend && npm ci && npm run build)

echo "== pm2 reload =="
pm2 reload ecosystem.config.cjs

echo "== done =="
pm2 status
