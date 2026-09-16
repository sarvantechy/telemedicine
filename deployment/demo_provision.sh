#!/usr/bin/env bash
# ============================================================================
# Telemedicine — Demo Provision Script (SQLite, no PostgreSQL)
# Run ONCE from your local machine when setting up a new EC2 instance.
# Requires: AWS CLI (profile "dev"), jq
# ============================================================================
set -euo pipefail
export AWS_PAGER=""

AWS_PROFILE="dev"
AWS_REGION="ap-south-2"
EC2_INSTANCE_ID="i-0baf4f73e58afd63d"
S3_BUCKET="scoringbasket"
S3_PREFIX="telemedicine"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

command -v jq >/dev/null || fail "'jq' is required (brew install jq)"

# ── 1. Upload config files to S3 ─────────────────────────────────────────────
log "Uploading service + nginx configs to S3..."
aws s3 cp "${REPO_ROOT}/deployment/telemedicine-demo.service" \
    "s3://${S3_BUCKET}/${S3_PREFIX}/deploy/telemedicine.service" \
    --profile "$AWS_PROFILE" --region "$AWS_REGION"
aws s3 cp "${REPO_ROOT}/deployment/nginx-http.conf" \
    "s3://${S3_BUCKET}/${S3_PREFIX}/deploy/nginx-telemedicine.conf" \
    --profile "$AWS_PROFILE" --region "$AWS_REGION"
ok "Configs uploaded"

# ── 2. Send provision script via SSM ─────────────────────────────────────────
log "Sending provision commands to EC2..."

EC2_SCRIPT=$(cat <<'SCRIPT'
set -e
S3_BUCKET="scoringbasket"
S3_PREFIX="telemedicine"
REGION="ap-south-2"
APP_ROOT="/opt/telemedicine"
WEB_ROOT="/var/www/telemedicine"
ENV_FILE="/etc/telemedicine.env"
DB_FILE="/var/lib/telemedicine/demo.db"
VENV="${APP_ROOT}/.venv"

echo "[PROVISION] Installing system packages..."
dnf install -y python3.12 nginx >/dev/null 2>&1 || true
echo "[PROVISION] System packages ready"

install -d -o root -g root -m 755 "$APP_ROOT"
install -d -o root -g root -m 755 "$WEB_ROOT"
install -d -o root -g root -m 755 /var/lib/telemedicine

if ! id telemedicine >/dev/null 2>&1; then
    useradd --system --home-dir "$APP_ROOT" --shell /sbin/nologin telemedicine
    echo "[PROVISION] Created system user: telemedicine"
fi
chown telemedicine:telemedicine /var/lib/telemedicine

if [[ ! -d "$VENV" ]]; then
    python3.12 -m venv "$VENV"
    echo "[PROVISION] Created venv"
fi
"$VENV/bin/pip" install --quiet --upgrade pip
echo "[PROVISION] venv ready"

if [[ ! -f "$ENV_FILE" ]]; then
    SECRET_KEY=$(openssl rand -hex 32)
    umask 077
    cat > "$ENV_FILE" << ENV
DATABASE_URL=sqlite:////${DB_FILE}
SECRET_KEY=${SECRET_KEY}
CORS_ORIGINS=http://telemedicine.4by4softwares.com,http://16.112.61.10
JWT_EXPIRE_HOURS=8
ENV
    echo "[PROVISION] Created $ENV_FILE (SQLite)"
fi

aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/deploy/telemedicine.service" \
    /etc/systemd/system/telemedicine.service --region "$REGION"
systemctl daemon-reload
systemctl enable telemedicine
echo "[PROVISION] Service installed"

aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/deploy/nginx-telemedicine.conf" \
    /etc/nginx/conf.d/telemedicine.conf --region "$REGION"
nginx -t && systemctl reload nginx
echo "[PROVISION] Nginx configured"

echo "[PROVISION] Done. Run demo_deploy.sh to install the app."
SCRIPT
)

SSM_PARAMS=$(jq -n --arg script "$EC2_SCRIPT" '{"commands": [$script]}')

CMD_ID=$(aws ssm send-command \
    --instance-ids "$EC2_INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "$SSM_PARAMS" \
    --comment "telemedicine demo provision" \
    --profile "$AWS_PROFILE" --region "$AWS_REGION" \
    --query "Command.CommandId" --output text)

ok "SSM command sent: $CMD_ID"
log "Waiting (up to 3 min)..."

for i in $(seq 1 18); do
    sleep 10
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$CMD_ID" --instance-id "$EC2_INSTANCE_ID" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION" \
        --query "Status" --output text 2>/dev/null || echo "Pending")
    if [[ "$STATUS" == "Success" ]]; then
        aws ssm get-command-invocation \
            --command-id "$CMD_ID" --instance-id "$EC2_INSTANCE_ID" \
            --profile "$AWS_PROFILE" --region "$AWS_REGION" \
            --query "StandardOutputContent" --output text
        ok "Provision complete! Now run: bash deployment/demo_deploy.sh"
        exit 0
    fi
    [[ "$STATUS" == "Failed" ]] && {
        aws ssm get-command-invocation \
            --command-id "$CMD_ID" --instance-id "$EC2_INSTANCE_ID" \
            --profile "$AWS_PROFILE" --region "$AWS_REGION" \
            --query "[StandardOutputContent,StandardErrorContent]" --output text
        fail "Provision failed"
    }
    log "Status: $STATUS (${i}/18)..."
done
fail "Timed out waiting for provision"
