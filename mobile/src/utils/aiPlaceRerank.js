import { api } from "../api/client";

/**
 * Rerank suggestions on the backend using an LLM.
 * Falls back to original suggestions if backend is unavailable.
 */
export async function aiRerankPlaces({ query, lang, proximity, suggestions }) {
  try {
    const { data } = await api.post("/ai/places/rerank", {
      query,
      lang,
      proximity,
      suggestions,
    });
    return Array.isArray(data?.suggestions) ? data.suggestions : suggestions;
  } catch {
    return suggestions;
  }
}

