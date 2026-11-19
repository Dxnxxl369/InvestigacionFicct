#!/bin/bash
set -euo pipefail
token=$(cat /tmp/ficct-ai-token)
if [[ ! "$token" =~ ^[0-9a-f]{64}$ ]]; then
    echo 'Invalid AI token' >&2
    exit 1
fi
sed -i '/^LOCAL_AI_URL=/d; /^LOCAL_AI_TOKEN=/d' /srv/ficct/app.env
printf 'LOCAL_AI_URL=https://ai.bshadow.xyz\nLOCAL_AI_TOKEN=%s\n' "$token" >> /srv/ficct/app.env
chmod 600 /srv/ficct/app.env
rm -f /tmp/ficct-ai-token
