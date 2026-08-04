#!/usr/bin/env bash
#
# Push PetWell (frontend + backend + docs) to GitHub.
#
#   bash scripts/push-to-github.sh
#
# Safe to re-run. Stops on the first error rather than pushing a half-baked tree.

set -euo pipefail

REMOTE_URL="https://github.com/zernpany-fs/PetWell.git"
BRANCH="main"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Project root: $ROOT"
echo

# ── 1. Clear stale lock files ─────────────────────────────────────────────
# Left behind by an interrupted git process. Git refuses to touch the index
# while one exists, with a misleading "another git process is running".
for lock in .git/index.lock frontend/.git/index.lock backend/.git/index.lock; do
  if [ -f "$lock" ]; then
    rm -f "$lock"
    echo "removed stale $lock"
  fi
done

# ── 2. Remove the nested repo inside frontend/ ────────────────────────────
# create-next-app runs `git init` in the folder it scaffolds. A .git directory
# inside a repo makes git treat that folder as a separate project and skip its
# files entirely — which is why `git status` currently shows zero frontend
# files. Deleting it does NOT touch your code, only the throwaway history
# ("Initial commit from Create Next App").
if [ -d frontend/.git ]; then
  rm -rf frontend/.git
  echo "removed nested frontend/.git"
fi

# ── 2b. Drop stale gitlink entries from the index ─────────────────────────
# Deleting the nested .git is not enough on its own. Git had already recorded
# `frontend` in the index as a gitlink (mode 160000 — a pointer to a commit in
# another repo) and will refuse to descend into a path staged that way, so its
# files stay invisible. Removing the entry lets the next `git add` see them.
GITLINKS="$(git ls-files -s | awk '$1=="160000" {print $4}')"
if [ -n "$GITLINKS" ]; then
  while IFS= read -r link; do
    [ -n "$link" ] || continue
    # -f is required: git guards against dropping an index entry that matches
    # neither the working tree nor HEAD, which is exactly what a gitlink to a
    # deleted repo looks like. --cached keeps this an index-only edit, so no
    # file on disk is touched either way.
    git rm -f --cached --quiet "$link"
    echo "removed stale gitlink entry: $link"
  done <<< "$GITLINKS"
fi

# ── 3. Identity ───────────────────────────────────────────────────────────
git config user.name  >/dev/null 2>&1 || git config user.name  "zern"
git config user.email >/dev/null 2>&1 || git config user.email "zern.pany@gmail.com"

# ── 4. Stage everything ───────────────────────────────────────────────────
git add -A

# ── 5. Refuse to push real secrets ────────────────────────────────────────
# .gitignore already covers these, but a file that was staged before the rule
# existed stays tracked. Cheaper to check than to rotate leaked keys.
LEAKS="$(git diff --cached --name-only | grep -E '(^|/)\.env($|\.)' | grep -v '\.example$' || true)"
if [ -n "$LEAKS" ]; then
  echo
  echo "STOPPED — these env files would be committed:"
  echo "$LEAKS"
  echo
  echo "Remove them from the index first:"
  echo "  git rm --cached <file>"
  exit 1
fi

# ── 6. Report ─────────────────────────────────────────────────────────────
echo
echo "Staged files: $(git diff --cached --name-only | wc -l | tr -d ' ')"
echo "  frontend/   $(git diff --cached --name-only | grep -c '^frontend/' || true)"
echo "  backend/    $(git diff --cached --name-only | grep -c '^backend/' || true)"
echo "  docs/       $(git diff --cached --name-only | grep -c '^docs/' || true)"
echo

if [ "$(git diff --cached --name-only | grep -c '^frontend/' || true)" -eq 0 ]; then
  echo "STOPPED — no frontend files staged. The nested .git removal did not work."
  exit 1
fi

# ── 7. Commit ─────────────────────────────────────────────────────────────
if git rev-parse HEAD >/dev/null 2>&1; then
  git commit -m "Update PetWell" || echo "nothing new to commit"
else
  git commit -m "PetWell — pet health passport and appointment management

Next.js 16 frontend, NestJS 11 API, PostgreSQL via Prisma 7.
Cross-clinic pet health records, JWT auth with owner and clinic-staff
roles, and appointment booking with per-hour capacity limits."
fi

# ── 8. Branch + remote ────────────────────────────────────────────────────
git branch -M "$BRANCH"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi
echo "origin -> $(git remote get-url origin)"

# ── 9. Push ───────────────────────────────────────────────────────────────
echo
echo "Pushing to $BRANCH..."
git push -u origin "$BRANCH"

echo
echo "Done. https://github.com/zernpany-fs/PetWell"
