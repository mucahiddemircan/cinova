"""Watchlist API — uygulama giriş noktası.

CORS yapılandırması ve router bağlaması burada yapılır.
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.core.config import settings

app = FastAPI(title="Watchlist API", version="1.0.0")

# İzin verilen kökenler — geliştirme ortamı için
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def health_check():
    """API sağlık kontrolü."""
    return {"mesaj": "Watchlist API çalışıyor"}
