from typing import List, Optional, Any
from sqlmodel import select, func, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.models import User, LibraryItem, LibraryItemCreate, Follow, CustomList
from app.core.constants import MediaType, LibraryAction
from app.core.datetime_utils import utc_now
from app.services import tmdb_client
from app.utils.image_utils import build_image_url

class LibraryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def toggle_action(self, user_id: int, payload: LibraryItemCreate) -> dict:
        """Kütüphane aksiyonunu (watchlist, watched, like, dislike) işler."""
        m_type = MediaType.standardize(payload.media_type)
        
        query = await self.session.exec(
            select(LibraryItem).where(
                LibraryItem.user_id == user_id,
                LibraryItem.tmdb_id == payload.tmdb_id,
                LibraryItem.media_type == m_type,
            )
        )
        item = query.first()

        # Genre ids format handle
        genre_ids_str = payload.genre_ids
        if isinstance(payload.genre_ids, list):
            genre_ids_str = ",".join(map(str, payload.genre_ids))

        if not item:
            item = LibraryItem(
                user_id=user_id,
                tmdb_id=payload.tmdb_id,
                media_type=m_type,
                vote_average=payload.vote_average,
                release_date=payload.release_date,
                genre_ids=genre_ids_str,
            )
        else:
            if genre_ids_str:
                item.genre_ids = genre_ids_str
        
        # Set the action and handle mutual exclusivity
        if payload.action == LibraryAction.WATCHLIST:
            item.is_watchlist = payload.value
        elif payload.action == LibraryAction.WATCHED:
            item.is_watched = payload.value
            if payload.value:
                item.is_watchlist = False
        elif payload.action == LibraryAction.LIKE:
            item.is_liked = payload.value
            if payload.value:
                item.is_disliked = False
        elif payload.action == LibraryAction.DISLIKE:
            item.is_disliked = payload.value
            if payload.value:
                item.is_liked = False
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

        item.updated_at = utc_now()
        
        # Check if all flags are false, if so delete the item
        if not (item.is_watchlist or item.is_watched or item.is_liked or item.is_disliked):
            if item.id:
                await self.session.delete(item)
        else:
            self.session.add(item)
        
        await self.session.commit()
        return {"status": "success", "action": payload.action, "value": payload.value}

    async def get_summary(self, username: str, current_user: User | None = None, lang_config: dict | None = None) -> dict:
        """Kullanıcının kütüphane özetini döner."""
        if username == "me":
            if not current_user:
                raise HTTPException(status_code=401, detail="Unauthorized")
            user = current_user
        else:
            user_query = await self.session.exec(select(User).where(User.username == username))
            user = user_query.one_or_none()
            
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        query = await self.session.exec(
            select(LibraryItem).where(LibraryItem.user_id == user.id)
        )
        items = query.all()
        
        summary = {
            "watchlist": {"movie": {"count": 0, "posters": []}, "series": {"count": 0, "posters": []}},
            "watched": {"movie": {"count": 0, "posters": []}, "series": {"count": 0, "posters": []}},
            "like": {"movie": {"count": 0, "posters": []}, "series": {"count": 0, "posters": []}},
            "dislike": {"movie": {"count": 0, "posters": []}, "series": {"count": 0, "posters": []}},
        }
        
        for it in items:
            m_type = it.media_type
            m_key = "series" if m_type == MediaType.SERIES else "movie"
            
            flags = [
                ("watchlist", it.is_watchlist),
                ("watched", it.is_watched),
                ("like", it.is_liked),
                ("dislike", it.is_disliked)
            ]
            
            for key, active in flags:
                if active:
                    summary[key][m_key]["count"] += 1
                        
        # Populate posters dynamically (Top 5 for each category)
        poster_tasks = []
        for key in summary:
            for m_key in summary[key]:
                m_type = MediaType.SERIES if m_key == "series" else MediaType.MOVIE
                # Find top 5 items for this category
                top_items = [it for it in items if it.media_type == m_type and getattr(it, f"is_{key}", False)][:5]
                for it in top_items:
                    poster_tasks.append((key, m_key, it.media_type, it.tmdb_id))

        if poster_tasks:
            ids = [(t[2], t[3]) for t in poster_tasks]
            details = await tmdb_client.get_batch_details(ids, lang_config=lang_config)
            for (key, m_key, _, _), detail in zip(poster_tasks, details):
                poster = detail.get("poster_path")
                if poster:
                    summary[key][m_key]["posters"].append(build_image_url(poster))

        return summary

    async def get_content_status(self, user_id: int, media_type: str, tmdb_id: int) -> dict:
        """Bir içeriğin kullanıcının kütüphanesindeki durumunu döner."""
        m_type = MediaType.standardize(media_type)
        
        query = await self.session.exec(
            select(LibraryItem).where(
                LibraryItem.user_id == user_id,
                LibraryItem.tmdb_id == tmdb_id,
                LibraryItem.media_type == m_type
            )
        )
        it = query.first()
        if it:
            return {
                "watchlist": it.is_watchlist,
                "watched": it.is_watched,
                "liked": it.is_liked,
                "disliked": it.is_disliked
            }
        return {
            "watchlist": False,
            "watched": False,
            "liked": False,
            "disliked": False
        }

    async def get_library_list(
        self, 
        username: str, 
        action: str, 
        media_type: Optional[str] = None, 
        current_user: User | None = None,
        lang_config: dict | None = None
    ) -> List[dict]:
        """Kullanıcının kütüphane listesini getirir."""
        if username == "me":
            if not current_user:
                raise HTTPException(status_code=401, detail="Unauthorized")
            user = current_user
        else:
            user_query = await self.session.exec(select(User).where(User.username == username))
            user = user_query.one_or_none()
            
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        stmt = select(LibraryItem).where(LibraryItem.user_id == user.id)
        
        if action in [LibraryAction.WATCHLIST, LibraryAction.WATCHED]:
            field = LibraryItem.is_watchlist if action == LibraryAction.WATCHLIST else LibraryItem.is_watched
            stmt = stmt.where(field == True)
        elif action in ["likes", LibraryAction.LIKE]:
            stmt = stmt.where(LibraryItem.is_liked == True)
        elif action in ["dislikes", LibraryAction.DISLIKE]:
            stmt = stmt.where(LibraryItem.is_disliked == True)
        else:
            raise HTTPException(status_code=400, detail="Invalid list type")
            
        if media_type:
            m_type = MediaType.standardize(media_type)
            stmt = stmt.where(LibraryItem.media_type == m_type)
            
        stmt = stmt.order_by(LibraryItem.updated_at.desc())
        query = await self.session.exec(stmt)
        db_items = query.all()
        
        # Hydrate with TMDB data
        if not db_items:
            return []
            
        ids = [(it.media_type, it.tmdb_id) for it in db_items]
        details = await tmdb_client.get_batch_details(ids, lang_config=lang_config)
        
        hydrated = []
        for it, detail in zip(db_items, details):
            item_data = it.model_dump()
            item_data["title"] = detail.get("title") or detail.get("name") or "Unknown"
            item_data["poster_path"] = build_image_url(detail.get("poster_path"))
            
            # Genre hydration (if missing in DB or to ensure latest)
            if not item_data.get("genre_ids") or item_data["genre_ids"] == "":
                genres = detail.get("genres") or []
                if genres:
                    item_data["genre_ids"] = ",".join([str(g.get("id")) for g in genres])
                elif detail.get("genre_ids"):
                    item_data["genre_ids"] = ",".join([str(gid) for gid in detail["genre_ids"]])
            
            hydrated.append(item_data)
            
        return hydrated

    async def get_full_me_summary(self, current_user: User, lang_config: dict | None = None) -> dict:
        """Giriş yapmış kullanıcının tüm kütüphane verilerini döner."""
        # Library Items Status Map
        query = await self.session.exec(
            select(LibraryItem).where(LibraryItem.user_id == current_user.id)
        )
        items = query.all()
        status_map = {
            it.tmdb_id: {
                "watchlist": it.is_watchlist,
                "watched": it.is_watched,
                "liked": it.is_liked,
                "disliked": it.is_disliked
            } for it in items
        }
        
        stats = await self.get_summary(current_user.username, current_user, lang_config=lang_config)
        
        # Followed Users
        followed_users_query = await self.session.exec(
            select(User).join(Follow, Follow.followed_user_id == User.id)
            .where(Follow.follower_id == current_user.id)
            .order_by(Follow.id.desc())
        )
        followed_users = followed_users_query.all()
        followed_users_data = [{"id": u.id, "username": u.username, "avatar_url": u.avatar_url} for u in followed_users]
        
        # Followed People
        followed_people_query = await self.session.exec(
            select(Follow).where(
                Follow.follower_id == current_user.id,
                Follow.followed_person_id.is_not(None)
            ).order_by(Follow.id.desc())
        )
        followed_people = followed_people_query.all()
        
        # Hydrate followed people
        people_ids = [f.followed_person_id for f in followed_people]
        people_details = await tmdb_client.get_batch_people(people_ids, lang_config=lang_config)
        
        followed_people_data = []
        for f, detail in zip(followed_people, people_details):
            followed_people_data.append({
                "id": f.followed_person_id,
                "tmdb_id": f.followed_person_id,
                "name": detail.get("name") or "Unknown",
                "profile_path": build_image_url(detail.get("profile_path"))
            })
        
        # Custom Lists
        custom_lists_query = await self.session.exec(
            select(CustomList).where(CustomList.user_id == current_user.id)
        )
        custom_lists = custom_lists_query.all()
        custom_lists_data = [{
            "id": l.id, 
            "title": l.title, 
            "slug": l.slug, 
            "media_type": l.media_type
        } for l in custom_lists]
        
        return {
            "status_map": status_map,
            "stats": stats,
            "follows": {
                "users": followed_users_data,
                "people": followed_people_data
            },
            "custom_lists": custom_lists_data
        }
