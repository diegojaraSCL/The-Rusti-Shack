@AGENTS.md

# The Rusti Shack — Project Vision

## What this is
A real online storefront for The Rusti Shack, a beach gear shop on Apo Island,
Philippines, owned by Rusti. Most gear is available both for sale (ships
worldwide) and for rent (pickup-only on the island). The site is Rusti's
first real presence off the beach — it should feel like a small, well-run
family shop, not a template.

## Mood and voice
Warm, clear, and a little salty — like someone who has actually run this
shop since it had a leaky roof and three snorkels to its name. No corporate
copywriting, no exclamation-point-per-sentence energy. Short, honest
sentences. When in doubt, write the way Rusti writes in her emails: plain,
appreciative, specific.

## Design language
- Coastal palette: navy (`navy-700/800/900`) for structure and header/footer,
  warm sand (`sand-50/100/200/300`) for backgrounds, teal for primary actions
  and links, coral for the "Add to Cart" call to action.
- Defined in `app/globals.css` via Tailwind v4's `@theme` block — extend
  colors there, not in a `tailwind.config.ts` (this project doesn't have one;
  see the Next.js/Tailwind version note in AGENTS.md).
- Rounded corners, soft shadows, generous whitespace. Nothing cramped.

## Product rules
- Rent vs. sale must always be visually obvious. Every product is sellable;
  some are *also* rentable on-island only (never shippable). Label both
  clearly wherever a price appears.
- Product data is read live from `data/The_Rusti_Shack_Dataset.xlsx` at
  build time (see `lib/products.ts`) — never hardcode product info in
  components. One product card/page per distinct look (grouped by
  `ParentSKU`), not per SKU row.
- No placeholder gibberish, ever. If a real photo, price, or description
  isn't available, say so honestly rather than filling in fake content.

## Standing instructions
- Always check every page on mobile width, not just desktop, before calling
  a feature done.
- Keep the "About Apo Island" page and the rent/sale distinction intact in
  any redesign — both were direct requests from Rusti.
- Update this file whenever the vision, palette, or product rules change
  meaningfully, so future sessions don't have to be re-briefed.
- Never put passwords, API keys, or other secrets in code or on GitHub.
  Secrets go in environment variables.
- Follow every rule in SECURITY.md.
