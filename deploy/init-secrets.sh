#!/bin/bash
set -euo pipefail
umask 077
if [ -e /srv/ficct/app.env ]; then
    exit 0
fi
cat > /srv/ficct/app.env <<EOF
DB_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
BOOTSTRAP_ADMIN_EMAIL=admin@bshadow.xyz
BOOTSTRAP_ADMIN_PASSWORD=$(openssl rand -hex 20)
LOCAL_AI_URL=
LOCAL_AI_MODEL=qwen2.5:3b
GROQ_API_KEY=
EOF
chmod 600 /srv/ficct/app.env
