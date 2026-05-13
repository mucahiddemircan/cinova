from datetime import datetime, timezone

def utc_now():
    """Returns a naive UTC datetime for Postgres compatibility.
    Postgres's TIMESTAMP WITHOUT TIME ZONE doesn't like timezone-aware datetimes from asyncpg.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
