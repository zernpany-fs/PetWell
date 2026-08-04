#!/usr/bin/env bash
#
# One-time git setup for PetWell.
#
# Run once from the repo root:
#     bash scripts/init-git.sh
#
# What it does:
#   1. Clears a stale index.lock if one is present
#   2. Absorbs frontend/.git (create-next-app leaves its own repo behind, which
#      would otherwise be committed as an unusable embedded repo)
#   3. Initialises the repo and makes the initial commit
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "Repo root: $ROOT"

# ── 1. Clear any half-initialised repo ─────────────────────────────────────
# A repo with no commits yet holds nothing worth preserving, and its index may
# have been staged before .gitignore was finalised. Start clean.
if [ -d .git ] && ! git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  echo "→ found a repo with no commits; resetting it so .gitignore applies cleanly"
  rm -rf .git
fi

# ── 2. Embedded frontend repo ──────────────────────────────────────────────
# create-next-app git-inits the app it scaffolds. Its history is a single
# "Initial commit from Create Next App", so there is nothing worth keeping;
# leaving it in place makes the outer repo record `frontend` as a gitlink and
# silently drop every file inside it.
if [ -d frontend/.git ]; then
  echo "→ found frontend/.git (create-next-app leftover)"
  read -r -p "  Remove it so the root repo tracks frontend/ properly? [y/N] " reply
  case "$reply" in
    [yY]*)
      rm -rf frontend/.git
      echo "  removed."
      ;;
    *)
      echo "  left in place — frontend/ will NOT be tracked by the root repo."
      echo "  Re-run this script later, or 'git submodule add' it deliberately."
      ;;
  esac
fi

# ── 3. Init + first commit ─────────────────────────────────────────────────
if [ ! -d .git ]; then
  echo "→ git init"
  git init -q
fi

git symbolic-ref HEAD refs/heads/main 2>/dev/null || true

echo "→ staging"
git add -A

echo
echo "── Secret check ───────────────────────────────────────────────────────"
if git diff --cached --name-only | grep -Eq '(^|/)\.env(\.local)?$'; then
  echo "  ✗ A real .env file is staged. Aborting."
  echo "    Run: git rm --cached <path> and check your .gitignore."
  exit 1
fi
echo "  ✓ no .env files staged"

echo
echo "── Staged summary ─────────────────────────────────────────────────────"
git diff --cached --stat | tail -1
echo

git -c user.useConfigOnly=false commit -q -m "PetWell: pet health passport & appointment management

Full-stack app: NestJS API (30 endpoints, Prisma 7, JWT, Cloudinary) and a
Next.js 16 App Router frontend with role-scoped owner and clinic-staff areas.

Core: portable clinic-agnostic health records, pet CRUD with photo upload,
clinic directory with search, appointment request/confirm flow with a full
AppointmentStatusLog audit trail, and clinic-staff patient lookup."

echo "✓ initial commit created"
git --no-pager log --stat --oneline -1 | head -5
echo
echo "Next: create an empty repo on GitHub, then:"
echo "  git remote add origin git@github.com:<you>/petwell.git"
echo "  git push -u origin main"
