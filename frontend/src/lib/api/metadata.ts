import { request } from "./client";
import { libraryApi } from "./library";
import type {
  MetadataConfig,
  CertificationMap,
  ProviderInfo,
  ContentItem,
  PersonDetail,
  PublicProfile,
  Person,
} from "@/types";

export const metadataApi = {
  getConfig: () => request<MetadataConfig>("/metadata/config"),

  getProviders: (region = "TR", type = "movie") =>
    request<ProviderInfo[]>(
      `/metadata/providers?region=${region}&type=${type}`
    ),
};

export const certificationsApi = {
  getGlobal: () => request<CertificationMap>("/certifications"),
};

export const peopleApi = {
  getPersonDetails: (id: string | number) =>
    request<PersonDetail>(`/people/${id}`),
};

export const userApi = {
  getByUsername: (username: string) =>
    request<PublicProfile>(`/profiles/${username}`),

  getUserList: (username: string, type: string, status: string) => {
    const action = status === "Plan to Watch" ? "watchlist" : "watched";
    return libraryApi.getUserList(username, action, type);
  },
};
