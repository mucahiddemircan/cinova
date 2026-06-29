import { create } from "zustand";
import type { LibraryStatus, LibrarySummary, FollowedUser, FollowedPerson } from "@/types";
import { libraryApi } from "@/lib/api";

interface LibraryState {
  statusMap: Record<number, LibraryStatus>;
  follows: { users: FollowedUser[]; people: FollowedPerson[] };
  customLists: LibrarySummary["custom_lists"];
  loading: boolean;

  // Query helpers
  getItemStatus: (tmdbId: number) => LibraryStatus;
  getWatchlistStatus: (tmdbId: number) => string | null;
  getInteractionStatus: (tmdbId: number) => string | null;
  isFollowingUser: (username: string) => boolean;
  isFollowingPerson: (tmdbId: number) => boolean;

  // Actions
  fetchLibrary: (hasUser: boolean) => Promise<void>;
  updateLocalStatus: (
    action: string,
    id: string | number,
    value: boolean | string | null,
    extraData?: Record<string, unknown>
  ) => void;
}

const DEFAULT_STATUS: LibraryStatus = {
  watchlist: false,
  watched: false,
  liked: false,
  disliked: false,
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  statusMap: {},
  follows: { users: [], people: [] },
  customLists: [],
  loading: false,

  getItemStatus: (tmdbId) => {
    const map = get().statusMap;
    return map[tmdbId] || map[String(tmdbId) as unknown as number] || DEFAULT_STATUS;
  },

  getWatchlistStatus: (tmdbId) => {
    const item = get().getItemStatus(tmdbId);
    if (item.watchlist) return "watchlist";
    if (item.watched) return "watched";
    return null;
  },

  getInteractionStatus: (tmdbId) => {
    const item = get().getItemStatus(tmdbId);
    if (item.liked) return "like";
    if (item.disliked) return "dislike";
    return null;
  },

  isFollowingUser: (username) =>
    get().follows.users.some((u) => u.username === username),

  isFollowingPerson: (tmdbId) => {
    const numId = Number(tmdbId);
    return get().follows.people.some(
      (p) => (p.tmdb_id || p.id) === numId
    );
  },

  fetchLibrary: async (hasUser) => {
    if (!hasUser) {
      set({
        statusMap: {},
        follows: { users: [], people: [] },
        customLists: [],
      });
      return;
    }

    const state = get();
    const hasData =
      Object.keys(state.statusMap).length > 0 ||
      state.follows.users.length > 0;
    if (!hasData) set({ loading: true });

    try {
      const data = await libraryApi.getSummary();
      set({
        statusMap: data.status_map,
        follows: data.follows,
        customLists: data.custom_lists,
      });
    } catch (err) {
      console.error("Kütüphane verisi yüklenemedi:", err);
    } finally {
      set({ loading: false });
    }
  },

  updateLocalStatus: (action, id, value, extraData = {}) => {
    set((state) => {
      const numId = Number(id);

      if (
        ["watchlist", "watched", "like", "dislike", "interaction"].includes(
          action
        )
      ) {
        const newMap = { ...state.statusMap };
        if (!newMap[numId]) {
          newMap[numId] = { ...DEFAULT_STATUS };
        }

        const item = { ...newMap[numId] };

        if (action === "watchlist") {
          if (typeof value === "string") {
            if (value === "watchlist") {
              item.watchlist = true;
            } else if (value === "watched") {
              item.watched = true;
              item.watchlist = false;
            }
          } else {
            item.watchlist = !!value;
          }
        } else if (action === "watched") {
          item.watched = !!value;
          if (value) item.watchlist = false;
        } else if (action === "like") {
          item.liked = !!value;
          if (value) item.disliked = false;
        } else if (action === "dislike") {
          item.disliked = !!value;
          if (value) item.liked = false;
        } else if (action === "interaction") {
          item.liked = value === "like";
          item.disliked = value === "dislike";
        }

        newMap[numId] = item;
        return { statusMap: newMap };
      }

      if (action === "follow-user") {
        const strId = String(id);
        if (value) {
          if (!state.follows.users.some((u) => u.username === strId)) {
            return {
              follows: {
                ...state.follows,
                users: [
                  { username: strId, ...extraData } as FollowedUser,
                  ...state.follows.users,
                ],
              },
            };
          }
        } else {
          return {
            follows: {
              ...state.follows,
              users: state.follows.users.filter((u) => u.username !== strId),
            },
          };
        }
      }

      if (action === "follow-person") {
        const personNumId = Number(id);
        if (value) {
          if (
            !state.follows.people.some(
              (p) => (p.tmdb_id || p.id) === personNumId
            )
          ) {
            return {
              follows: {
                ...state.follows,
                people: [
                  {
                    id: personNumId,
                    tmdb_id: personNumId,
                    ...extraData,
                  } as FollowedPerson,
                  ...state.follows.people,
                ],
              },
            };
          }
        } else {
          return {
            follows: {
              ...state.follows,
              people: state.follows.people.filter(
                (p) => (p.tmdb_id || p.id) !== personNumId
              ),
            },
          };
        }
      }

      return state;
    });
  },
}));
