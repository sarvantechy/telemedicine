#!/bin/bash
# ============================================================================
# Telemedicine — Build & Deploy to EC2
# ============================================================================
# What this does:
#   1. Builds the Python wheel from backend/
#   2. Builds the Vite frontend (npm run build)
#   3. Uploads both to S3
#   4. SSM-commands EC2 to install + sync + restart
#
# Usage:
#   bash deployment/deploy.sh
#   bash deployment/deploy.sh --backend-only
#   bash deployment/deploy.sh --frontend-only
# ============================================================================
set -euo pipefail
export AWS_PAGER=""

AWS_PROFILE="dev"
AWS_REGION="ap-south-2"
EC2_INSTANCE_ID="i-0baf4f73e58afd63d"
S3_BUCKET="scoringbasket"
S3_PREFIX="telemedicine"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/frontend"
VENV_LOCAL="${REPO_ROOT}/.venv-build"
EC2_APP_ROOT="/opt/telemedicine"
EC2_WEB_ROOT="/var/www/telemedicine"
SERVICE_NAME="telemedicine"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

DO_BACKEND=true
DO_FRONTEND=true
[[ "${1:-}" == "--backend-only" ]]  && DO_FRONTEND=false
[[ "${1:-}" == "--frontend-only" ]] && DO_BACKEND=false

# ── Build backend wheel ───────────────────────────────────────────────────────
if $DO_BACKEND; then
    log "Building Python wheel..."
    if [[ ! -f "${VENV_LOCAL}/bin/python" ]]; then
        python3.12 -m venv "$VENV_LOCAL"
    fi
    "${VENV_LOCAL}/bin/pip" install --quiet build
    cd "$BACKEND_DIR"
    rm -rf dist/
    "${VENV_LOCAL}/bin/python" -m build --wheel --outdir dist/ .
    WHEEL_FILE=$(ls dist/*.whl | head -1)
    WHEEL_NAME=$(basename "$WHEEL_FILE")
    ok "Built: ${WHEEL_NAME}"

    log "Uploading wheel to S3..."
    aws s3 cp "$WHEEL_FILE" \
        "s3://${S3_BUCKET}/${S3_PREFIX}/backend/${WHEEL_NAME}" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION"
    ok "Uploaded wheel"
fi

# ── Build & upload frontend ───────────────────────────────────────────────────
if $DO_FRONTEND; then
    log "Building frontend..."
    cd "$FRONTEND_DIR"
    npm run build
    ok "Frontend built"

    log "Uploading frontend to S3..."
    aws s3 sync dist/ "s3://${S3_BUCKET}/${S3_PREFIX}/frontend/" \
        --delete --exclude ".DS_Store" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION"
    ok "Uploaded frontend"
fi

# ── Deploy on EC2 via SSM ─────────────────────────────────────────────────────
log "Sending deploy command to EC2 via SSM..."

EC2_COMMANDS=$(cat <<EOF
export PATH=/usr/local/bin:/usr/bin:/bin:/opt/telemedicine/.venv/bin
set -e

$(if $DO_BACKEND; then cat <<BACKEND
echo "[DEPLOY] Installing backend wheel..."
aws s3 cp s3://${S3_BUCKET}/${S3_PREFIX}/backend/${WHEEL_NAME:-SKIP} /tmp/${WHEEL_NAME:-SKIP} --region ${AWS_REGION}
/opt/telemedicine/.venv/bin/pip install --quiet --force-reinstall /tmp/${WHEEL_NAME:-SKIP}
rm -f /tmp/${WHEEL_NAME:-SKIP}
echo "[DEPLOY] Backend installed"
BACKEND
fi)

$(if $DO_FRONTEND; then cat <<FRONTEND
echo "[DEPLOY] Syncing frontend from S3..."
aws s3 sync s3://${S3_BUCKET}/${S3_PREFIX}/frontend/ ${EC2_WEB_ROOT}/ --delete --region ${AWS_REGION}
aws s3 cp s3://${S3_BUCKET}/${S3_PREFIX}/frontend/index.html ${EC2_WEB_ROOT}/index.html --region ${AWS_REGION}
echo "[DEPLOY] Frontend synced"
FRONTEND
fi)

echo "[DEPLOY] Restarting service..."
systemctl restart ${SERVICE_NAME}
sleep 4
STATUS=\$(systemctl is-active ${SERVICE_NAME})
if [ "\$STATUS" = "active" ]; then
    echo "[DEPLOY] ✅ ${SERVICE_NAME} is running"
else
    echo "[DEPLOY] ❌ ${SERVICE_NAME} failed (status: \$STATUS)"
    journalctl -u ${SERVICE_NAME} -n 30 --no-pager
    exit 1
fi
nginx -t && systemctl reload nginx
echo "[DEPLOY] ✅ Deploy complete"
EOF
)

SSM_PARAMS=$(jq -n --arg script "$EC2_COMMANDS" '{"commands": [$script]}')

COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$EC2_INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "$SSM_PARAMS" \
    --comment "telemedicine deploy" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query "Command.CommandId" \
    --output text)

log "SSM Command ID: ${COMMAND_ID}"
log "Waiting for EC2 to finish..."

for i in $(seq 1 24); do
    sleep 5
    RESULT=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$EC2_INSTANCE_ID" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query "[StatusDetails, StandardOutputContent]" \
        --output text 2>/dev/null || echo "Pending")

    STATUS=$(echo "$RESULT" | head -1)
    [[ "$STATUS" == "Success" ]] && { ok "Deploy successful!"; break; }
    [[ "$STATUS" == "Failed" ]] && { fail "Deploy failed. Check SSM output."; }
    log "Status: ${STATUS} (${i}/24)..."
done
