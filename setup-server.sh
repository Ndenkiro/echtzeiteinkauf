#!/bin/bash
# setup-server.sh — Run once on fresh Hetzner Ubuntu 24.04
# Usage: ssh root@YOUR_IP 'bash -s' < setup-server.sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Echtzeiteinkauf — Server Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── System update ─────────────────────────────────────────────────
apt-get update -qq && apt-get upgrade -y -qq

# ── Docker ────────────────────────────────────────────────────────
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# ── Docker Compose v2 ─────────────────────────────────────────────
apt-get install -y docker-compose-plugin

# ── Create deploy user ────────────────────────────────────────────
useradd -m -s /bin/bash deploy || true
usermod -aG docker deploy

# Add root's authorized_keys to deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true

# ── App directory ─────────────────────────────────────────────────
mkdir -p /opt/echtzeiteinkauf
chown deploy:deploy /opt/echtzeiteinkauf

# ── Firewall (UFW) ────────────────────────────────────────────────
apt-get install -y ufw -qq
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp   # HTTP/3
ufw --force enable

# ── Fail2ban ──────────────────────────────────────────────────────
apt-get install -y fail2ban -qq
systemctl enable fail2ban
systemctl start fail2ban

# ── Unattended upgrades (security patches) ────────────────────────
apt-get install -y unattended-upgrades -qq
dpkg-reconfigure -f noninteractive unattended-upgrades

# ── Log rotation ──────────────────────────────────────────────────
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  missingok
  delaycompress
  copytruncate
}
EOF

echo ""
echo "✓ Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.production to /opt/echtzeiteinkauf/.env"
echo "  2. Copy Caddyfile to /opt/echtzeiteinkauf/Caddyfile"
echo "  3. Add GitHub Actions secrets (see README)"
echo "  4. git push → auto-deploy triggers"
echo ""
echo "  SSH as deploy user: ssh deploy@$(curl -s ifconfig.me)"
