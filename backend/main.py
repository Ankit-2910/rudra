import html
import json
import os

import httpx
import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="RUDRA Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLE_KPIS = {
    "source": "sample",
    "revenue_trend": {
        "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        "values": [420000, 465000, 510000, 545000, 605000, 680000],
    },
    "active_projects": 14,
    "client_health": 92,
}

NOTIFY_EMAIL = "shivanchal.e596@gmail.com"


class Lead(BaseModel):
    name: str
    company: str
    purpose: str
    source: str = "reception"


# GET + HEAD: UptimeRobot keepalive probes use HEAD, which plain @app.get
# rejects with 405 and the monitor reports the service down.
@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "service": "rudra-backend"}


def store_lead(lead: Lead) -> bool:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return False
    try:
        with psycopg.connect(database_url, connect_timeout=10) as conn:
            conn.execute(
                "insert into rudra.leads (name, company, purpose, source) values (%s, %s, %s, %s)",
                (lead.name, lead.company, lead.purpose, lead.source),
            )
        return True
    except Exception:
        return False


def notify_slack(lead: Lead) -> bool:
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return False
    text = f"\U0001f514 New RUDRA lead: {lead.name} ({lead.company}) — {lead.purpose}"
    try:
        resp = httpx.post(webhook_url, json={"text": text}, timeout=5)
        return resp.status_code < 300
    except Exception:
        return False


def notify_email(lead: Lead) -> bool:
    api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("RESEND_FROM_EMAIL")
    if not api_key or not from_email:
        return False
    body = (
        f"<h2>New RUDRA lead</h2>"
        f"<p><b>Name:</b> {html.escape(lead.name)}</p>"
        f"<p><b>Company:</b> {html.escape(lead.company)}</p>"
        f"<p><b>Purpose:</b> {html.escape(lead.purpose)}</p>"
        f"<p><b>Source:</b> {html.escape(lead.source)}</p>"
    )
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "from": from_email,
                "to": [NOTIFY_EMAIL],
                "subject": f"New RUDRA lead: {lead.name}",
                "html": body,
            },
            timeout=10,
        )
        return resp.status_code < 300
    except Exception:
        return False


@app.post("/leads")
def create_lead(lead: Lead):
    return {
        "stored": store_lead(lead),
        "slack": notify_slack(lead),
        "email": notify_email(lead),
    }


@app.get("/kpis")
def kpis():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        try:
            with psycopg.connect(database_url, connect_timeout=10) as conn:
                row = conn.execute(
                    "select payload from rudra.kpi_snapshots order by captured_at desc limit 1"
                ).fetchone()
            if row:
                payload = row[0]
                if isinstance(payload, str):
                    payload = json.loads(payload)
                return {"source": "supabase", **payload}
        except Exception:
            pass
    return SAMPLE_KPIS
