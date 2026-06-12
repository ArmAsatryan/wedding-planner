#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}→${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required. Install it first."
}

require git
require npm
require npx

# ── 1. GitHub ──────────────────────────────────────────────
info "Checking GitHub CLI..."
require gh

if ! gh auth status >/dev/null 2>&1; then
  fail "Run: gh auth login"
fi

if [ ! -d .git ]; then
  info "Initializing git repository..."
  git init
  git branch -M main
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  REPO_NAME="${GITHUB_REPO:-wedding-planner}"
  info "Creating GitHub repo: $REPO_NAME"
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push || {
    gh repo create "$REPO_NAME" --public
    git remote add origin "https://github.com/$(gh api user -q .login)/$REPO_NAME.git"
  }
fi

info "Pushing to GitHub..."
git add -A
git diff --cached --quiet || git commit -m "Prepare wedding planner for production deploy"
git push -u origin main

GITHUB_REPO_URL="$(gh repo view --json url -q .url)"
info "GitHub: $GITHUB_REPO_URL"

# ── 2. Database (Neon) ───────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  warn "DATABASE_URL not set."
  echo ""
  echo "  1. Create free PostgreSQL at https://neon.tech"
  echo "  2. Copy the connection string"
  echo "  3. Re-run: DATABASE_URL='postgresql://...' ./scripts/deploy.sh"
  echo ""
  fail "DATABASE_URL is required for backend deploy"
fi

# ── 3. Backend (Render) ────────────────────────────────────
FRONTEND_URL="${FRONTEND_URL:-https://wedding-planner.pages.dev}"
BACKEND_URL="${BACKEND_URL:-}"

info "Deploy backend to Render..."
warn "Render deploy requires one-time setup:"
echo ""
echo "  1. Open https://dashboard.render.com/select-repo?type=blueprint"
echo "  2. Connect GitHub repo: $GITHUB_REPO_URL"
echo "  3. Render will read render.yaml automatically"
echo "  4. Set env vars when prompted:"
echo "       DATABASE_URL = (your Neon connection string)"
echo "       FRONTEND_URL = $FRONTEND_URL"
echo "  5. Deploy and copy the service URL (e.g. https://wedding-planner-api.onrender.com)"
echo ""

if [ -z "$BACKEND_URL" ]; then
  read -rp "Paste your Render backend URL (or press Enter to skip frontend deploy): " BACKEND_URL
fi

# ── 4. Frontend (Cloudflare Pages) ───────────────────────
if [ -z "$BACKEND_URL" ]; then
  warn "Skipping Cloudflare deploy — set BACKEND_URL and re-run."
  exit 0
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  warn "CLOUDFLARE_API_TOKEN not set."
  echo ""
  echo "  1. Cloudflare Dashboard → My Profile → API Tokens"
  echo "  2. Create token with 'Cloudflare Pages — Edit' permission"
  echo "  3. Re-run: CLOUDFLARE_API_TOKEN=xxx BACKEND_URL=$BACKEND_URL DATABASE_URL='...' ./scripts/deploy.sh"
  echo ""
  fail "CLOUDFLARE_API_TOKEN is required for frontend deploy"
fi

export CLOUDFLARE_API_TOKEN
PROJECT_NAME="${CF_PROJECT_NAME:-wedding-planner}"

info "Building frontend (API → $BACKEND_URL/api)..."
cd "$ROOT/frontend"
npm ci
VITE_API_URL="$BACKEND_URL/api" npm run build

info "Deploying to Cloudflare Pages..."
npx wrangler@latest pages deploy dist \
  --project-name "$PROJECT_NAME" \
  --commit-dirty=true \
  --branch main

info "Done!"
echo ""
echo "  Frontend: https://${PROJECT_NAME}.pages.dev"
echo "  Backend:  $BACKEND_URL"
echo ""
echo "  Update Render FRONTEND_URL to your Cloudflare URL if different."
echo "  Demo login: demo@wedding.am / password123 (after running db:seed on Render shell)"
