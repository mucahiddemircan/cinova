import { request } from "./client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  response: string;
}

export const supportApi = {
  getChatResponse: (message: string, history: ChatMessage[] = []) =>
    request<ChatResponse>("/support/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};
