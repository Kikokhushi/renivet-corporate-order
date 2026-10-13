# Renivet — Corporate Orders Prototype

Interactive HTML prototype of the Renivet corporate order flow (custom merchandise: apparel & non-apparel), built as a UI/UX case-study deliverable. Design-only — there is no real backend, and all payments are **simulated**.

## The flow (mobile v2 — source of truth)

7 steps: Product → Customise → Artwork → Quantity → Quote → Details → Review.

Conversion model is **request-first**: Review ends in "Submit Order Request" (no amounts shown, status *Awaiting quotation*), then a separate Final Quotation screen handles a clearly-labelled simulated 50% advance payment, ending in Order Confirmed. MOQ is 50 units.

## Run it

```
node server.js        # serves on http://localhost:8123
```

Open `http://localhost:8123/mobile.html` (narrow window or device toolbar at 390px).

Deep-link to any screen with `?screen=` — the sample Studio Arc order (₹43,400) auto-fills:

`mobile.html?screen=landing|product|customise|artwork|quantity|quote|details|review|requested|payment|confirmed`

## Structure

| Path | What |
|---|---|
| `mobile.html/css/js` | Mobile v2 prototype (11 screens, state machine) |
| `index.html`, `styles.css`, `app.js` | Desktop v1 prototype (older flow) |
| `renders-mobile/` | All 12 screens as 2x PNGs at 390px |
| `capture.js` | Puppeteer script that re-renders the PNGs from the live prototype |
| `figma-plugin/` | "Renivet Auto-Prototype" Figma plugin — auto-detects imported screens by heading text and wires 25 prototype links |
| `assets/` | Generated product imagery |

## Design system

"Quiet Mode" palette: Canvas `#EEF1CA`, Action lime `#C7CF3A` (CTA fill only, plum label for contrast), Ink `#323B61`, lilac `#B3B9E5`/`#DDD6FF` for read-states, Deep Plum `#0A1B4F` overlays.
