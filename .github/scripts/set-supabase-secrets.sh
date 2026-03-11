#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required." >&2
  exit 1
fi

GH_TOKEN_VALUE="${GH_TOKEN:-${GITHUB_TOKEN:-}}"

# Fallback: use git credential helper token for github.com.
if [ -z "$GH_TOKEN_VALUE" ] && command -v git >/dev/null 2>&1; then
  if CREDENTIALS="$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null)"; then
    GH_TOKEN_VALUE="$(printf '%s\n' "$CREDENTIALS" | awk -F= '$1=="password"{print $2}')"
  fi
fi

if [ -z "$GH_TOKEN_VALUE" ]; then
  echo "No GitHub token available. Run gh auth login or export GH_TOKEN/GITHUB_TOKEN." >&2
  exit 1
fi

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

updated=()

# Set whichever Supabase vars are provided; this supports partial updates.
if [ -n "${SUPABASE_URL:-}" ]; then
  GH_TOKEN="$GH_TOKEN_VALUE" gh secret set SUPABASE_URL --repo "$REPO" --body "$SUPABASE_URL"
  updated+=("SUPABASE_URL")
fi

if [ -n "${SUPABASE_ANON_KEY:-}" ]; then
  GH_TOKEN="$GH_TOKEN_VALUE" gh secret set SUPABASE_ANON_KEY --repo "$REPO" --body "$SUPABASE_ANON_KEY"
  updated+=("SUPABASE_ANON_KEY")
fi

if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  GH_TOKEN="$GH_TOKEN_VALUE" gh secret set SUPABASE_SERVICE_ROLE_KEY --repo "$REPO" --body "$SUPABASE_SERVICE_ROLE_KEY"
  updated+=("SUPABASE_SERVICE_ROLE_KEY")
fi

if [ "${#updated[@]}" -eq 0 ]; then
  echo "No Supabase env vars provided. Set at least one of SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY." >&2
  exit 1
fi

echo "Updated ${updated[*]} in $REPO"
