import { request } from "./client";
import type { FollowStats, PersonFollowStats, PublicProfile, Person } from "@/types";

export interface FollowingPayload {
  users: PublicProfile[];
  people: Person[];
}

export const followsApi = {
  followUser: (username: string) =>
    request<{ success: boolean }>(`/follows/profile/${username}`, {
      method: "POST",
    }),

  unfollowUser: (username: string) =>
    request<{ success: boolean }>(`/follows/profile/${username}`, {
      method: "DELETE",
    }),

  followPerson: (personId: number) =>
    request<{ success: boolean }>(`/follows/person/${personId}`, {
      method: "POST",
    }),

  unfollowPerson: (personId: number) =>
    request<{ success: boolean }>(`/follows/person/${personId}`, {
      method: "DELETE",
    }),

  getStats: (username: string) =>
    request<FollowStats>(`/follows/profile/${username}/stats`),

  getPersonStats: (personId: number) =>
    request<PersonFollowStats>(`/follows/person/${personId}/stats`),

  getFollowers: (username: string) =>
    request<PublicProfile[]>(`/follows/profile/${username}/followers`),

  getFollowing: (username: string) =>
    request<FollowingPayload>(`/follows/profile/${username}/following`),

  getFollowedUsers: () =>
    request<PublicProfile[]>("/follows/following/profiles"),

  getFollowedPeople: () =>
    request<Person[]>("/follows/following/people"),
};
