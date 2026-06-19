# Personal Brand Site

A dark, cinematic, immersive personal-brand site for a founder / product builder.
Hand-built with **zero dependencies and no build step** — just HTML, CSS, and a
little vanilla JavaScript — so it loads fast and deploys anywhere.

## ✦ Design

- **Aesthetic:** near-black canvas, violet → cyan accent glow, film-grain texture, cinematic depth.
- **Type:** Fraunces (editorial serif) for display, Inter for UI/body (loaded from Google Fonts).
- **Motion (tasteful):** mouse-tracking spotlight, parallax light orbs, scroll-reveal fades,
  count-up stats, gradient-border card hovers, a condensing nav, and a marquee.
- **Accessible:** all motion is disabled automatically for visitors who prefer reduced motion,
  and the page is fully readable with JavaScript turned off.

## ✦ How to edit your content

Everything you need to change lives in **`index.html`**. Search the file for
`EDIT:` — each comment marks exactly what to replace:

| What | Where |
|------|-------|
| Name, title, tab title, social preview | top `<head>` `EDIT` blocks |
| Monogram + name in the nav | `.nav__brand` |
| Headline, intro paragraph, buttons | `#hero` section |
| Rotating keywords | `.marquee` |
| About statement + story + quick facts | `#about` section |
| Stat numbers | `.stat` blocks — change `data-count` and `data-suffix` |
| Ventures / roles | `#work` — duplicate an `<article class="card">` to add more |
| Email + social links | `#contact` section |

To change colors, open **`css/styles.css`** and edit the variables at the top
(`--violet`, `--cyan`, `--accent-grad`, etc.).

## ✦ Run locally

No build needed. Just open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(Serving via a local server — rather than opening the file directly — ensures
the fonts and scripts load cleanly.)

## ✦ Deploy (free, anywhere)

It's a static site, so any host works:

- **GitHub Pages:** push this repo, then enable Pages on the branch (Settings → Pages → root).
- **Netlify:** drag-and-drop the folder, or connect the repo (no build command, publish dir = root).
- **Vercel:** `vercel` from the project root, or import the repo (framework preset: *Other*).

## ✦ File structure

```
.
├── index.html        # markup + your content (look for EDIT: comments)
├── css/styles.css    # all styling & design tokens
├── js/main.js        # progressive-enhancement interactions
└── README.md
```
