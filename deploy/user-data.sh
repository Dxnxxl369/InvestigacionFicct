#!/bin/bash
set -euo pipefail
dnf -y update
dnf -y install docker git
systemctl enable --now docker
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fL --retry 5 https://github.com/docker/compose/releases/download/v2.39.4/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod 755 /usr/local/lib/docker/cli-plugins/docker-compose
mkdir -p /srv/ficct/data/postgres /srv/ficct/data/uploads /srv/ficct/secrets
chmod 700 /srv/ficct/secrets
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
