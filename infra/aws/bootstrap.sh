#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker installation failed" >&2
  exit 1
fi

sudo usermod -aG docker "$USER" || true
docker --version

echo "Bootstrap complete. Re-login if docker group permissions are not active."
