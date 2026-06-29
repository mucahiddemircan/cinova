"""Central API router.

Aggregates all endpoint modules under a single router.
"""

from fastapi import APIRouter
from .endpoints import auth, movies, series, users, people, follows, comments, recommendations, certifications, library, notifications, account, custom_lists, metadata, support

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(movies.router)
api_router.include_router(series.router)
api_router.include_router(users.router)
api_router.include_router(people.router)
api_router.include_router(follows.router)
api_router.include_router(comments.router)
api_router.include_router(recommendations.router)
api_router.include_router(certifications.router)
api_router.include_router(library.router)
api_router.include_router(notifications.router)
api_router.include_router(account.router)
api_router.include_router(custom_lists.router)
api_router.include_router(metadata.router, prefix="/metadata", tags=["metadata"])
api_router.include_router(support.router)
