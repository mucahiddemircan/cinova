// Barrel export — single point access for all API modules

export { setAccessToken, getAccessToken, request, ApiError } from "./client";
export { authApi } from "./auth";
export { contentApi } from "./content";
export { libraryApi, interactionsApi, watchlistApi } from "./library";
export { commentApi } from "./comments";
export { followsApi } from "./follows";
export { notificationsApi } from "./notifications";
export { accountApi } from "./account";
export { customListApi } from "./custom-lists";
export { recommendationsApi } from "./recommendations";
export { supportApi, type ChatMessage } from "./support";
export {
  metadataApi,
  certificationsApi,
  peopleApi,
  userApi,
} from "./metadata";
