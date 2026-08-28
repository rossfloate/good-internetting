import { XMLParser } from "fast-xml-parser";
import members from "../../members.json" with { type: "json" };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  processEntities: false
});

const UA = "GoodInternetting/0.1 (+https://goodinternetting.com)";
const COMMON_FEEDS = ["feed/", "rss/", "rss", "feed.xml", "atom.xml"];

function arr(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, "\u00a0");
}

function text(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return decodeEntities(value);
  if (typeof value === "object") return decodeEntities(value["#text"] || value["@_href"] || "");
  return "";
}

function absolute(url, base) {
  try { return new URL(url, base).href; } catch { return null; }
}

async function get(url, timeout = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      headers: {
        "user-agent": UA,
        "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5"
      },
      redirect: "follow",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function discoverFeed(home) {
  try {
    const res = await get(home);
    if (res.ok) {
      const html = await res.text();
      const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
      for (const tag of links) {
        const rel = (tag.match(/\brel=["']([^"']+)["']/i) || [])[1] || "";
        const type = (tag.match(/\btype=["']([^"']+)["']/i) || [])[1] || "";
        const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1] || "";
        if (/alternate/i.test(rel) && /(rss|atom|xml)/i.test(type) && href) {
          const candidate = absolute(href, home);
          if (candidate) return candidate;
        }
      }
    }
  } catch {}

  for (const suffix of COMMON_FEEDS) {
    const candidate = absolute(suffix, home.endsWith("/") ? home : home + "/");
    if (!candidate) continue;
    try {
      const res = await get(candidate, 4000);
      if (res.ok && /(xml|rss|atom)/i.test(res.headers.get("content-type") || "")) return candidate;
    } catch {}
  }
  return null;
}

function parseFeed(xml, member, feedUrl) {
  const doc = parser.parse(xml);
  const rss = doc.rss?.channel;
  const atom = doc.feed;

  let items = [];
  if (rss) {
    items = arr(rss.item).map(item => ({
      title: text(item.title),
      url: text(item.link) || text(item.guid),
      date: text(item.pubDate) || text(item["dc:date"]) || text(item.date),
    }));
  } else if (atom) {
    items = arr(atom.entry).map(entry => {
      const links = arr(entry.link);
      const preferred = links.find(l => !l["@_rel"] || l["@_rel"] === "alternate") || links[0];
      return {
        title: text(entry.title),
        url: typeof preferred === "string" ? preferred : preferred?.["@_href"] || "",
        date: text(entry.published) || text(entry.updated),
      };
    });
  }

  return items
    .filter(p => p.title && p.url)
    .map(p => ({
      ...p,
      url: absolute(p.url, member.home) || p.url,
      date: p.date ? new Date(p.date).toISOString() : null,
      member: member.name,
      publication: member.publication,
      memberUrl: member.home,
      feedUrl
    }))
    .sort((a,b) => (b.date || "").localeCompare(a.date || ""));
}

async function fetchMember(member) {
  const feedUrl = member.feed || await discoverFeed(member.home);
  if (!feedUrl) return { member, status: "no-feed", posts: [] };

  try {
    const res = await get(feedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const posts = parseFeed(xml, member, feedUrl);
    return { member, status: posts.length ? "ok" : "empty", feedUrl, posts: posts.slice(0, 10) };
  } catch (error) {
    return { member, status: "error", feedUrl, error: String(error.message || error), posts: [] };
  }
}

export default async (req) => {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  const settled = await Promise.all(members.map(fetchMember));
  const posts = settled
    .flatMap(x => x.posts.slice(0, 1))
    .sort((a,b) => (b.date || "").localeCompare(a.date || ""));

  const randomPool = settled
    .flatMap(x => x.posts.slice(0, 10))
    .filter(p => p.url);

  const body = {
    name: "Good Internetting",
    strapline: "Things worth checking out. Click a link, or takes yer chances with the mystery button. As long as you leave this page, everyone wins.",
    generatedAt: new Date().toISOString(),
    posts,
    randomPool,
    members: members.map(({name, publication, home}) => ({name, publication, home})),
    ...(debug ? { sources: settled.map(x => ({
      name: x.member.name,
      publication: x.member.publication,
      status: x.status,
      feedUrl: x.feedUrl || null,
      error: x.error || null
    })) } : {})
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=300, s-maxage=900"
    }
  });
};
