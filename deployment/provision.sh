#!/usr/bin/env bash
# ============================================================================
# Telemedicine — First-time provision script
# Run as root on the EC2 instance after copying the repo to /opt/telemedicine
#
# Usage:
#   sudo bash /opt/telemedicine/deployment/provision.sh
# ============================================================================
set -euo pipefail

APP_ROOT=/opt/telemedicine
WEB_ROOT=/var/www/telemedicine
ENV_FILE=/etc/telemedicine.env
DB_NAME=telemedicine
DB_USER=telemedicine_app

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }

# ── 1. System dependencies ────────────────────────────────────────────────────
log "Installing python3.12..."
dnf install -y python3.12 >/dev/null
ok "python3.12 ready"

# ── 2. System user ────────────────────────────────────────────────────────────
if ! id telemedicine >/dev/null 2>&1; then
    useradd --system --home-dir "$APP_ROOT" --shell /sbin/nologin telemedicine
    ok "Created system user: telemedicine"
fi

install -d -o root -g root -m 755 "$WEB_ROOT"

# ── 3. Python venv ────────────────────────────────────────────────────────────
if [[ ! -d "$APP_ROOT/.venv" ]]; then
    python3.12 -m venv "$APP_ROOT/.venv"
fi
"$APP_ROOT/.venv/bin/pip" install --quiet --upgrade pip
"$APP_ROOT/.venv/bin/pip" install --quiet "$APP_ROOT/backend"
ok "Backend installed into venv"

# ── 4. Frontend static files ──────────────────────────────────────────────────
if [[ -d "$APP_ROOT/frontend/dist" ]]; then
    find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a "$APP_ROOT/frontend/dist/." "$WEB_ROOT/"
    ok "Frontend files deployed to $WEB_ROOT"
else
    log "⚠️  frontend/dist not found — build frontend locally first, then re-run"
fi

# ── 5. PostgreSQL database setup ──────────────────────────────────────────────
if command -v psql >/dev/null 2>&1; then
    log "Setting up PostgreSQL database..."

    # Generate a random DB password if env file doesn't exist
    if [[ ! -f "$ENV_FILE" ]]; then
        DB_PASS=$(openssl rand -hex 20)
    else
        # Extract existing password from env file
        DB_PASS=$(grep DATABASE_URL "$ENV_FILE" | sed 's/.*:\(.*\)@.*/\1/')
    fi

    # Create role and database (idempotent)
    sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL

    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
        sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

    # Run migration
    PGPASSWORD="$DB_PASS" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" \
        -f "$APP_ROOT/db_migration/01_schema.sql" 2>/dev/null || true

    # Grant privileges
    sudo -u postgres psql -d "${DB_NAME}" <<SQL
GRANT USAGE ON SCHEMA public TO ${DB_USER};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${DB_USER};
SQL

    ok "PostgreSQL: database '$DB_NAME', user '$DB_USER' ready"
else
    log "⚠️  psql not found — skipping DB setup"
    DB_PASS="CHANGE_ME"
fi

# ── 6. Environment file ───────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
    SECRET_KEY=$(openssl rand -hex 32)
    umask 077
    cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
SECRET_KEY=${SECRET_KEY}
CORS_ORIGINS=https://telemedicine.4by4softwares.com
JWT_EXPIRE_HOURS=8
EOF
    ok "Created $ENV_FILE"
fi

# ── 7. Systemd service ────────────────────────────────────────────────────────
install -o root -g root -m 644 "$APP_ROOT/deployment/telemedicine.service" \
    /etc/systemd/system/telemedicine.service

# ── 8. Nginx config ───────────────────────────────────────────────────────────
if [[ -d /etc/letsencrypt/live/telemedicine.4by4softwares.com ]]; then
    NGINX_CONF="$APP_ROOT/deployment/nginx-https.conf"
    ok "Using HTTPS nginx config"
else
    NGINX_CONF="$APP_ROOT/deployment/nginx-http.conf"
    log "SSL cert not found — using HTTP config. Run certbot after DNS is set up."
fi
install -o root -g root -m 644 "$NGINX_CONF" /etc/nginx/conf.d/telemedicine.conf

# ── 9. Start services ─────────────────────────────────────────────────────────
systemctl daemon-reload
systemctl enable telemedicine
systemctl restart telemedicine
nginx -t && systemctl reload nginx

ok "Telemedicine service started on port 8003"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Next step: create superadmin via API"
echo ""
echo "  curl -s -X POST https://telemedicine.4by4softwares.com/api/auth/setup \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@you.com\",\"full_name\":\"Your Name\",\"password\":\"STRONG_PASS\"}'"
echo ""
echo "  Then login with tenant_slug='_system' to create tenant + users."
echo "═══════════════════════════════════════════════════"
