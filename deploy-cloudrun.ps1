# deploy-cloudrun.ps1
# Deploiement automatique sur Google Cloud Run
# Usage: .\deploy-cloudrun.ps1

param(
  [string]$ProjectId = $env:GCP_PROJECT_ID,
  [string]$Region    = "europe-west1",
  [string]$Service   = "ted-scale-with-ouss"
)

if (-not $ProjectId) {
  Write-Error "GCP_PROJECT_ID non defini. Passe -ProjectId 'ton-project-id'"
  exit 1
}

$ImageName = "gcr.io/$ProjectId/$Service"

Write-Host "=== Deploy Ted Scale With Ouss sur Cloud Run ===" -ForegroundColor Cyan
Write-Host "Project : $ProjectId"
Write-Host "Region  : $Region"
Write-Host "Image   : $ImageName"
Write-Host ""

# 1. Lire les secrets depuis .env.local
$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.local introuvable. Copie .env.local a la racine du projet."
  exit 1
}

$envVars = @{}
Get-Content $envFile | Where-Object { $_ -match "^[A-Z]" -and $_ -notmatch "^#" } | ForEach-Object {
  $parts = $_ -split "=", 2
  if ($parts.Count -eq 2 -and $parts[1].Trim() -ne "") {
    $envVars[$parts[0].Trim()] = $parts[1].Trim()
  }
}

$supabaseUrl  = $envVars["NEXT_PUBLIC_SUPABASE_URL"]
$supabaseAnon = $envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

if (-not $supabaseUrl -or -not $supabaseAnon) {
  Write-Error "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant dans .env.local"
  exit 1
}

# 2. Build Docker avec les variables publiques
Write-Host ">>> Build image Docker..." -ForegroundColor Yellow
docker build `
  --platform linux/amd64 `
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl `
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnon `
  -t $ImageName .

if ($LASTEXITCODE -ne 0) { Write-Error "Build Docker echoue"; exit 1 }
Write-Host "[OK] Image buildee" -ForegroundColor Green

# 3. Push vers Google Container Registry
Write-Host ">>> Push image vers GCR..." -ForegroundColor Yellow
docker push $ImageName

if ($LASTEXITCODE -ne 0) { Write-Error "Push echoue"; exit 1 }
Write-Host "[OK] Image poussee" -ForegroundColor Green

# 4. Construire la liste des secrets Cloud Run
$secretsArg = (
  "SUPABASE_SERVICE_ROLE_KEY",
  "BREVO_API_KEY",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
  "CRON_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "PAPPERS_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "ANTHROPIC_API_KEY",
  "LINKEDIN_WEBHOOK_SECRET",
  "MAKECOM_LINKEDIN_SEND_WEBHOOK",
  "GOJIBERRY_API_KEY",
  "NEXT_PUBLIC_APP_URL"
) | Where-Object { $envVars.ContainsKey($_) } | ForEach-Object {
  "$_=$($envVars[$_])"
}

$envArg = ($secretsArg + @(
  "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnon",
  "NODE_ENV=production"
)) -join ","

# 5. Deploy sur Cloud Run
Write-Host ">>> Deploy sur Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $Service `
  --image $ImageName `
  --platform managed `
  --region $Region `
  --project $ProjectId `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 2 `
  --set-env-vars $envArg

if ($LASTEXITCODE -ne 0) { Write-Error "Deploy Cloud Run echoue"; exit 1 }

Write-Host ""
Write-Host "=== DEPLOY TERMINE ===" -ForegroundColor Green
Write-Host "URL : https://$Service-*.run.app" -ForegroundColor Cyan
Write-Host "Verifier : gcloud run services describe $Service --region $Region --project $ProjectId --format='value(status.url)'"
