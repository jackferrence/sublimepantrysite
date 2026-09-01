#!/usr/bin/env bash
# Pings IndexNow (Bing's instant-index endpoint, also consumed by other engines)
# with every URL in the site's sitemap. Run this after every deploy.
#
# Usage: ./scripts/indexnow-ping.sh
set -euo pipefail

HOST="sublimepantry.netlify.app"
KEY="a7366f75afb9a795378933d753c283a6"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
SITEMAP_URL="https://${HOST}/sitemap-0.xml"

echo "Fetching sitemap from ${SITEMAP_URL}..."
urls=$(curl -s "$SITEMAP_URL" | grep -o '<loc>[^<]*</loc>' | sed -e 's/<loc>//' -e 's/<\/loc>//')

if [ -z "$urls" ]; then
  echo "No URLs found in sitemap. Aborting." >&2
  exit 1
fi

url_list=$(echo "$urls" | awk 'BEGIN{ORS=","} {print}' | sed 's/,$//')
url_json=$(echo "$urls" | awk '{printf "\"%s\",", $0}' | sed 's/,$//')

echo "Pinging IndexNow for $(echo "$urls" | wc -l | tr -d ' ') URLs..."

curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"host\":\"${HOST}\",\"key\":\"${KEY}\",\"keyLocation\":\"${KEY_LOCATION}\",\"urlList\":[${url_json}]}" \
  -w "\nIndexNow response: %{http_code}\n"

echo "Done. A 200 or 202 response means IndexNow accepted the submission."
