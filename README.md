# Good Internetting — v1.6

A deliberately small embeddable widget for lateral movement around the open web.

## What it does

- keeps a hand-curated list in `members.json`
- fetches RSS/Atom server-side in a Netlify Function
- auto-discovers feeds from `<link rel="alternate">` where possible
- shows the newest item from each working source
- sorts them by recency
- provides **Take me somewhere good**
- exposes the same thing as an embeddable Web Component

## Deploy on Netlify

1. Put this folder in a Git repo.
2. `npm install`
3. Create a new Netlify site from the repo.
4. Add `goodinternetting.com` as the custom domain.
5. Point the GoDaddy DNS records at Netlify when prompted.

Netlify should detect `netlify.toml`; there is no build command.

## Embed

```html
<script src="https://goodinternetting.com/ring.js"></script>
<good-internetting count="5"></good-internetting>
```

The component deliberately inherits the host site's typography and foreground colour.

Optional CSS variables:

```css
good-internetting {
  --gi-bg: transparent;
  --gi-fg: currentColor;
  --gi-muted: #777;
  --gi-rule: #ccc;
  --gi-accent: currentColor;
}
```

## Source diagnostics

Once deployed, visit:

`/.netlify/functions/feeds?debug=1`

It will show which member feeds were found, which failed, and the feed URL that was discovered.

This is important for the starter list: some people have obvious RSS, while a few will need their source hand-tuned in `members.json`.

## Product rules baked into v0.1

- link out; don't reproduce people's writing
- publications, not social accounts
- RSS/Atom first
- no accounts
- no database
- no recommendation algorithm
- no tracking
- if a feed stops working, the rest of the ring still works


The “Show me some good internet” button randomly chooses from up to 10 recent posts from every working feed.


v1.0: Added Michele Catalano’s I Have That on Vinyl to the curated neighbourhood. Feed discovery is left to the existing server-side discovery logic.


v1.5: Added Kaijuville and The Space Boat. The Space Boat uses its public Buttondown RSS feed; Kaijuville is left to the existing RSS autodiscovery logic.
