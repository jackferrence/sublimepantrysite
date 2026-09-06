#!/usr/bin/env bash
# Submit the site's URLs to IndexNow (Bing's instant-index endpoint, also read
# by Yandex, Seznam and Naver). Wired into the Netlify build as an onSuccess
# plugin — see plugins/indexnow/ — so it runs after every production publish.
#
#   ./scripts/indexnow-ping.sh              # read dist/, submit
#   ./scripts/indexnow-ping.sh --dry-run    # show the payload, submit nothing
#   SITEMAP_DIR=other/dir ./scripts/indexnow-ping.sh
#
# Three things this script is careful about, each because the first version got
# it wrong:
#
#  1. HOST IS DERIVED, NEVER TYPED. IndexNow rejects a submission whose urlList
#     does not belong to `host`. The original hardcoded sublimepantry.netlify.app
#     while the sitemap has always contained www.sublimepantry.com, so every
#     submission it could have made would have been refused. Reading the host
#     out of the URLs themselves makes that class of mismatch impossible.
#  2. IT READS THE BUILT SITEMAP, not the live one. Post-deploy, the CDN may not
#     have the new sitemap yet; dist/ is what was just published, by definition.
#  3. IT FAILS SOFT. A search-engine ping is not worth failing a deploy over.
#     Every exit path is 0, and the network call is explicitly exempt from -e.

set -uo pipefail   # deliberately NOT -e: see point 3.

KEY="a7366f75afb9a795378933d753c283a6"
SITEMAP_DIR="${SITEMAP_DIR:-dist}"
ENDPOINT="${INDEXNOW_ENDPOINT:-https://api.indexnow.org/indexnow}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

say() { echo "[indexnow] $*"; }

# The sitemap index lists the sitemaps; the numbered files hold the URLs. Glob
# for all of them rather than assuming sitemap-0.xml is the only one — that
# assumption silently drops URLs the day the site outgrows a single file.
shopt -s nullglob
maps=("$SITEMAP_DIR"/sitemap-[0-9]*.xml)
if [ ${#maps[@]} -eq 0 ]; then
  say "no sitemap in ${SITEMAP_DIR}/ — nothing to submit. Skipping."
  exit 0
fi

urls=$(grep -ho '<loc>[^<]*</loc>' "${maps[@]}" | sed -e 's|<loc>||' -e 's|</loc>||' | sort -u)
count=$(printf '%s\n' "$urls" | grep -c . || true)
if [ "$count" -eq 0 ]; then
  say "sitemap contained no <loc> entries. Skipping."
  exit 0
fi

# Host comes from the URLs, so `host` and `urlList` cannot disagree.
hosts=$(printf '%s\n' "$urls" | sed -E 's|^https?://([^/]+).*|\1|' | sort -u)
if [ "$(printf '%s\n' "$hosts" | grep -c .)" -ne 1 ]; then
  say "sitemap spans multiple hosts, which IndexNow cannot accept in one call:"
  printf '%s\n' "$hosts" | sed 's/^/[indexnow]   /'
  say "skipping rather than guessing which one is canonical."
  exit 0
fi
HOST="$hosts"
KEY_LOCATION="https://${HOST}/${KEY}.txt"

payload=$(HOST="$HOST" KEY="$KEY" KEY_LOCATION="$KEY_LOCATION" python3 -c '
import json, os, sys
urls = [u for u in sys.stdin.read().split("\n") if u.strip()]
json.dump({"host": os.environ["HOST"], "key": os.environ["KEY"],
           "keyLocation": os.environ["KEY_LOCATION"], "urlList": urls},
          sys.stdout)
' <<<"$urls")

say "host ${HOST} · ${count} URLs · key ${KEY:0:8}…"

if [ "$DRY_RUN" -eq 1 ]; then
  say "dry run — not submitting. Payload:"
  printf '%s\n' "$payload" | python3 -m json.tool
  exit 0
fi

# The key file has to be fetchable or IndexNow refuses the key. Checked here so
# a 403 comes back as a readable line rather than an opaque rejection.
key_status=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 10 "$KEY_LOCATION" 2>/dev/null || echo 000)
if [ "$key_status" != "200" ]; then
  say "key file ${KEY_LOCATION} returned ${key_status}; submitting anyway, but expect a rejection."
fi

response=$(curl -sS -X POST "$ENDPOINT" \
  -H 'Content-Type: application/json; charset=utf-8' \
  --max-time 30 \
  --data-binary "$payload" \
  -w '\n%{http_code}' 2>&1) || {
    say "request failed (network). Deploy is unaffected."
    exit 0
  }

code=$(printf '%s' "$response" | tail -n1)
body=$(printf '%s' "$response" | sed '$d')

case "$code" in
  200|202) say "accepted (HTTP ${code}) — ${count} URLs submitted." ;;
  400) say "HTTP 400: bad request. Payload was malformed." ;;
  403) say "HTTP 403: key not valid for ${HOST}. Check ${KEY_LOCATION}." ;;
  422) say "HTTP 422: URLs do not belong to ${HOST}, or key mismatch." ;;
  429) say "HTTP 429: rate limited. Nothing to do; the next deploy retries." ;;
  *)   say "HTTP ${code}: unexpected." ;;
esac
# Truncated: a proxy or WAF in front of the endpoint can answer with a full HTML
# error page, and dumping that into a deploy log buries everything around it.
[ -n "$body" ] && say "body: $(printf '%s' "$body" | tr -d '\n' | cut -c1-300)"

# Always succeed. A search-engine ping must never fail a deploy.
exit 0
