#!/usr/bin/env bash
# ============================================================================
# Telemedicine — Demo Deploy (SQLite)
# Builds backend + frontend, uploads to S3, deploys to EC2 via SSM.
# Run after demo_provision.sh has been run once.
#
# Usage:
#   bash deployment/demo_deploy.sh              # build + deploy both
#   bash deployment/demo_deploy.sh --backend-only
#   bash deployment/demo_deploy.sh --frontend-only
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
VENV_BUILD="${REPO_ROOT}/.venv-build"
EC2_WEB_ROOT="/var/www/telemedicine"
SERVICE_NAME="telemedicine"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

command -v jq >/dev/null || fail "'jq' is required (brew install jq)"

DO_BACKEND=true
DO_FRONTEND=true
[[ "${1:-}" == "--backend-only" ]]  && DO_FRONTEND=false
[[ "${1:-}" == "--frontend-only" ]] && DO_BACKEND=false

# ── Build backend wheel ───────────────────────────────────────────────────────
WHEEL_NAME=""
if $DO_BACKEND; then
    log "Building Python wheel..."
    if [[ ! -f "${VENV_BUILD}/bin/python" ]]; then
        python3.12 -m venv "$VENV_BUILD"
    fi
    "${VENV_BUILD}/bin/pip" install --quiet build
    cd "$BACKEND_DIR"
    rm -rf dist/
    "${VENV_BUILD}/bin/python" -m build --wheel --outdir dist/ .
    WHEEL_FILE=$(ls dist/*.whl | head -1)
    WHEEL_NAME=$(basename "$WHEEL_FILE")
    ok "Built: ${WHEEL_NAME}"

    aws s3 cp "$WHEEL_FILE" \
        "s3://${S3_BUCKET}/${S3_PREFIX}/backend/${WHEEL_NAME}" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION"
    ok "Uploaded wheel to S3"
fi

# ── Build & upload frontend ───────────────────────────────────────────────────
if $DO_FRONTEND; then
    log "Building frontend (Vite)..."
    cd "$FRONTEND_DIR"
    npm run build 2>&1 | tail -5
    ok "Frontend built"

    aws s3 sync dist/ "s3://${S3_BUCKET}/${S3_PREFIX}/frontend/" \
        --delete --exclude ".DS_Store" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION"
    ok "Uploaded frontend to S3"
fi

# ── Deploy on EC2 via SSM ─────────────────────────────────────────────────────
log "Deploying to EC2 via SSM..."

DEPLOY_PARTS=""

if $DO_BACKEND && [[ -n "$WHEEL_NAME" ]]; then
    DEPLOY_PARTS+="
echo '[DEPLOY] Installing backend wheel...'
aws s3 cp s3://${S3_BUCKET}/${S3_PREFIX}/backend/${WHEEL_NAME} /tmp/${WHEEL_NAME} --region ${AWS_REGION}
/opt/telemedicine/.venv/bin/pip install --quiet --force-reinstall /tmp/${WHEEL_NAME}
rm -f /tmp/${WHEEL_NAME}
echo '[DEPLOY] Backend installed'"
fi

if $DO_FRONTEND; then
    DEPLOY_PARTS+="
echo '[DEPLOY] Syncing frontend...'
aws s3 sync s3://${S3_BUCKET}/${S3_PREFIX}/frontend/ ${EC2_WEB_ROOT}/ --delete --region ${AWS_REGION}
aws s3 cp s3://${S3_BUCKET}/${S3_PREFIX}/frontend/index.html ${EC2_WEB_ROOT}/index.html --region ${AWS_REGION}
echo '[DEPLOY] Frontend synced'"
fi

EC2_SCRIPT=$(cat <<SCRIPT
set -e
${DEPLOY_PARTS}

echo '[DEPLOY] Restarting service...'
systemctl restart ${SERVICE_NAME}
sleep 3
STATUS=\$(systemctl is-active ${SERVICE_NAME})
echo "[DEPLOY] Service status: \$STATUS"
if [[ "\$STATUS" == "active" ]]; then
    echo '[DEPLOY] Service is running'
    journalctl -u ${SERVICE_NAME} -n 10 --no-pager
else
    journalctl -u ${SERVICE_NAME} -n 30 --no-pager
    exit 1
fi
SCRIPT
)

SSM_PARAMS=$(jq -n --arg script "$EC2_SCRIPT" '{"commands": [$script]}')

CMD_ID=$(aws ssm send-command \
    --instance-ids "$EC2_INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "$SSM_PARAMS" \
    --comment "telemedicine demo deploy" \
    --profile "$AWS_PROFILE" --region "$AWS_REGION" \
    --query "Command.CommandId" --output text)

ok "SSM command sent: $CMD_ID"
log "Waiting for deploy (up to 2 min)..."

for i in $(seq 1 12); do
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
        ok "Deploy complete! 🚀"
        echo ""
        echo "  Demo login (tenant: demo-clinic)"
        echo "    Admin:   admin@demo.com   / admin123"
        echo "    Doctor:  sarah@demo.com   / doctor123"
        echo "    Patient: alice@demo.com   / patient123"
        exit 0
    fi
    [[ "$STATUS" == "Failed" ]] && {
        aws ssm get-command-invocation \
            --command-id "$CMD_ID" --instance-id "$EC2_INSTANCE_ID" \
            --profile "$AWS_PROFILE" --region "$AWS_REGION" \
            --query "[StandardOutputContent,StandardErrorContent]" --output text
        fail "Deploy failed"
    }
    log "Status: $STATUS (${i}/12)..."
done
fail "Timed out waiting for deploy"
