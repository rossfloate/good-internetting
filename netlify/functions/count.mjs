import { readCounts } from "./_counter.mjs";

export default async () => {
  try {
    const counts = await readCounts();
    return Response.json(counts, {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=15, s-maxage=15"
      }
    });
  } catch (error) {
    console.error("Good Internetting count:", error);
    return Response.json(
      { total: 0, link: 0, random: 0 },
      {
        status: 500,
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "no-store"
        }
      }
    );
  }
};
