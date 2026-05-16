# Commandes Cloud Scheduler — Playbooks

## Prérequis
- Déployer l'app avec `.\deploy-cloudrun.ps1`
- Enregistrer le webhook Telegram : `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/telegram/webhook"`

## Jobs Cloud Scheduler

```bash
# A2 Cessions — Lundi 8h
gcloud scheduler jobs create http playbook-a2-cessions \
  --schedule="0 8 * * 1" \
  --uri="https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/a2-cessions/run" \
  --message-body='{}' \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --location=europe-west1 \
  --project=integration-make-365608

# A1 Créations — Mardi 8h
gcloud scheduler jobs create http playbook-a1-creations \
  --schedule="0 8 * * 2" \
  --uri="https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/a1-creations/run" \
  --message-body='{}' --http-method=POST \
  --headers="Content-Type=application/json" \
  --location=europe-west1 --project=integration-make-365608

# A3 Holdings — 1er du mois, mercredi 8h
gcloud scheduler jobs create http playbook-a3-holdings \
  --schedule="0 8 1-7 * 3" \
  --uri="https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/a3-holdings/run" \
  --message-body='{}' --http-method=POST \
  --headers="Content-Type=application/json" \
  --location=europe-west1 --project=integration-make-365608

# A4 Dividendes — 1er du mois, jeudi 8h
gcloud scheduler jobs create http playbook-a4-dividendes \
  --schedule="0 8 1-7 * 4" \
  --uri="https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/a4-dividendes/run" \
  --message-body='{}' --http-method=POST \
  --headers="Content-Type=application/json" \
  --location=europe-west1 --project=integration-make-365608

# A5 Dirigeants 55+ — 1er du mois, vendredi 8h
gcloud scheduler jobs create http playbook-a5-dirigeants \
  --schedule="0 8 1-7 * 5" \
  --uri="https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/a5-dirigeants/run" \
  --message-body='{}' --http-method=POST \
  --headers="Content-Type=application/json" \
  --location=europe-west1 --project=integration-make-365608

# B1 Surveillance — Lundi 9h
gcloud scheduler jobs create http playbook-b1-surveillance \
  --schedule="0 9 * * 1" \
  --uri="https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/b1-surveillance/run" \
  --message-body='{}' --http-method=POST \
  --headers="Content-Type=application/json" \
  --location=europe-west1 --project=integration-make-365608

# B3 Liquidité — 1er du mois, mardi 8h
gcloud scheduler jobs create http playbook-b3-liquidite \
  --schedule="0 8 1-7 * 2" \
  --uri="https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/b3-liquidite/run" \
  --message-body='{}' --http-method=POST \
  --headers="Content-Type=application/json" \
  --location=europe-west1 --project=integration-make-365608
```

## Test manuel d'un run
```bash
curl -X POST https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/a2-cessions/run \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `{"runId":"...","status":"running"}`
