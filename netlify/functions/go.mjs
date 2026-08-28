import { incrementCount } from "./_counter.mjs";
import members from "../../members.json" with { type: "json" };

function hostname(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sameHostFamily(a, b) {
  const left = hostname(a);
  const right = hostname(b);
  if (!left || !right) return false;
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

const allowedBases = members.flatMap(member => [member.home, member.feed].filter(Boolean));

function allowedDestination(destination) {
  try {
    const url = new URL(destination);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return allowedBases.some(base => sameHostFamily(url.href, base));
  } catch {
    return false;
  }
}

export default async (req) => {
  const requestUrl = new URL(req.url);
  const destination = requestUrl.searchParams.get("url");
  const kind = requestUrl.pathname.includes("/random") ? "random" : "link";

  if (!destination || !allowedDestination(destination)) {
    return new Response("Nope.", {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  try {
    await incrementCount(kind);
  } catch (error) {
    console.error("Good Internetting exit counter:", error);
  }

  return new Response(null, {
    status: 302,
    headers: {
      "location": destination,
      "cache-control": "no-store"
    }
  });
};
