import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.dependencies import get_optional_current_user, get_lang_config
from app.models import (
    User, 
    Follow, 
    PersonReadBasic, 
    PaginatedPersonRead,
    PersonDetailRead, 
    PaginatedContentRead
)
from app.services import tmdb_client
from app.utils.i18n_utils import translate_role_name, resolve_person_name
from app.utils.content_converters import (
    transform_content,
    transform_person,
    merge_person_data,
)

router = APIRouter(prefix="/people", tags=["people"])

async def _ensure_bilingual_names(people: list[dict]) -> list[dict]:
    """Fetches English names for people in the list whose names are non-Latin."""
    tasks = []
    indices = []
    for i, p in enumerate(people):
        # is_latin check is removed, hierarchical resolution will be done during transform phase
        p["display_name"] = p.get("name") or p.get("_fallback_name")
        if not p.get("_fallback_name"):
            tasks.append(tmdb_client.get_person_brief(p["id"]))
            indices.append(i)
    
    if not tasks:
        return people
        
    extra_data = await asyncio.gather(*tasks)
    for i, data in zip(indices, extra_data):
        # Merge extra data (especially _fallback_name)
        people[i].update(data)
    
    return people

@router.get("/popular", response_model=PaginatedPersonRead)
async def list_popular_people(
    page: int = 1,
    lang_config: dict = Depends(get_lang_config)
):
    """Lists popular people."""
    data = await tmdb_client.get_popular_people(page=page, lang_config=lang_config)
    results = await _ensure_bilingual_names(data["results"])
    lang = lang_config["lang"]
    return {
        "results": [transform_person(p, lang=lang) for p in results],
        "page": data["page"],
        "total_pages": data["total_pages"],
        "total_results": data["total_results"]
    }

@router.get("/{person_id}", response_model=PersonDetailRead)
async def get_person_details(
    person_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_current_user),
    lang_config: dict = Depends(get_lang_config)
):
    """General person detail page (regardless of whether they are active actor or director)."""
    tr_data, en_data = await tmdb_client.get_person_details(person_id, lang_config=lang_config)

    merged = merge_person_data(tr_data, en_data)
    lang = lang_config["lang"]
    base = transform_person(merged, lang=lang)

    base["biography"] = merged.get("biography") or merged.get("_fallback_biography")
    base["birthday"] = merged.get("birthday")
    base["deathday"] = merged.get("deathday")
    base["place_of_birth"] = merged.get("place_of_birth")
    base["also_known_as"] = merged.get("also_known_as", [])

    followers_count = (await session.exec(
        select(func.count()).where(Follow.followed_person_id == person_id)
    )).first() or 0

    is_following = False
    if current_user:
        is_following_query = await session.exec(
            select(Follow).where(
                Follow.follower_id == current_user.id,
                Follow.followed_person_id == person_id
            )
        )
        is_following = is_following_query.one_or_none() is not None

    base["followers_count"] = followers_count
    base["is_following"] = is_following

    credits_raw = merged.get("combined_credits", {})
    known_for_map = {}

    all_credits = credits_raw.get("cast", []) + credits_raw.get("crew", [])
    
    # Combine all credits and consolidate role info
    known_for_map = {}
    for item in all_credits:
        content = transform_content(item, lang=lang)
        cid = content.get("id")
        mtype = content.get("type")
        if not cid: continue
            
        key = (cid, mtype)
        if key not in known_for_map:
            known_for_map[key] = content
        else:
            existing = known_for_map[key]
            new_role = content.get("role")
            existing_role = existing.get("role")
            if new_role and existing_role:
                roles = [r.strip() for r in existing_role.split(",")]
                if new_role not in roles:
                    existing["role"] = f"{existing_role}, {new_role}"
            elif new_role:
                existing["role"] = new_role

    base["known_for"] = list(known_for_map.values())

    # Smart Ranking - Adjust Known For Department
    def calculate_score(item, dept):
        # Base score: blend of popularity and vote count
        popularity = item.get("popularity") or 0
        vote_count = item.get("vote_count") or 0
        score = popularity + (vote_count / 100.0)
        
        char = (item.get("character") or "").lower()
        job = item.get("job")
        genres = item.get("genre_ids") or []
        
        # Talk Show, Reality, News genres
        is_talk_reality = any(g in [10767, 10764, 10763] for g in genres)
        # Roles played as self
        is_self = any(x in char for x in ["self", "himself", "herself", "guest", "interviewee", "nominee", "winner"])
        
        # Penalty Logic
        if is_self and "host" not in char:
            # If main job is not acting or content is a talk show, heavy penalty
            if dept != "Acting" or is_talk_reality:
                score *= 0.001
            else:
                score *= 0.1
        
        if is_talk_reality and dept not in ["Acting", "Production"] and "host" not in char:
            score *= 0.01
            
        # Expertise Bonus
        if job == dept:
            score *= 2.5
        elif dept == "Acting" and item.get("media_type") == "movie" and not is_self:
            score *= 1.5
            
        return score

    # Score based on raw credits (use map to avoid duplicates)
    top_scores = []
    seen_ids = set()
    
    # Kredileri puanla
    dept = merged.get("known_for_department")
    for item in all_credits:
        cid = item.get("id")
        mtype = item.get("media_type")
        if not cid or (cid, mtype) in seen_ids:
            continue
            
        score = calculate_score(item, dept)
        top_scores.append((score, item))
        seen_ids.add((cid, mtype))
        
    # Sort by score and prepare the list
    top_scores.sort(key=lambda x: x[0], reverse=True)
    base["known_for"] = [transform_content(item, lang=lang) for _, item in top_scores]

    return base
