from enum import Enum

class MediaType(str, Enum):
    MOVIE = "movie"
    SERIES = "series"
    TV = "tv"  # API compatibility

    @classmethod
    def standardize(cls, value: str) -> "MediaType":
        if value in [cls.TV, cls.SERIES, "tv", "series"]:
            return cls.SERIES
        return cls.MOVIE

class LibraryAction(str, Enum):
    WATCHLIST = "watchlist"
    WATCHED = "watched"
    LIKE = "like"
    DISLIKE = "dislike"

class NotificationType(str, Enum):
    FOLLOW = "follow"
    COMMENT_REPLY = "comment_reply"
    COMMENT_LIKE = "comment_like"
