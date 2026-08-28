import { getStore } from "@netlify/blobs";

const STORE_NAME = "good-internetting";
const KEY = "exit-counts";

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function readCounts() {
  const s = store();
  const entry = await s.getWithMetadata(KEY, { type: "json", consistency: "strong" });
  if (!entry) return { total: 0, link: 0, random: 0 };
  const data = entry.data || {};
  return {
    total: Number(data.total) || 0,
    link: Number(data.link) || 0,
    random: Number(data.random) || 0
  };
}

export async function incrementCount(kind) {
  const s = store();

  for (let attempt = 0; attempt < 8; attempt++) {
    const entry = await s.getWithMetadata(KEY, { type: "json", consistency: "strong" });

    if (!entry) {
      const fresh = {
        total: 1,
        link: kind === "link" ? 1 : 0,
        random: kind === "random" ? 1 : 0
      };
      const result = await s.setJSON(KEY, fresh, { onlyIfNew: true });
      if (result.modified) return fresh;
      continue;
    }

    const current = entry.data || {};
    const next = {
      total: (Number(current.total) || 0) + 1,
      link: (Number(current.link) || 0) + (kind === "link" ? 1 : 0),
      random: (Number(current.random) || 0) + (kind === "random" ? 1 : 0)
    };

    const result = await s.setJSON(KEY, next, { onlyIfMatch: entry.etag });
    if (result.modified) return next;
  }

  throw new Error("Could not update exit counter");
}
