# Slide Decks

Share a talk's slides inside a post, a flow entry or a book chapter: export
each slide as an image from Keynote, PowerPoint or Google Slides, put the
images next to the content, and list them in a `:::slides` block. Readers get
a carousel — one slide at a time, keyboard and swipe navigation, a fullscreen
presenter, and links to individual slides.

## Markdown / MDX

```markdown
:::slides[Building a Digital Garden — XConf 2026]{pdf="./talk.pdf" video="https://youtu.be/…"}
![Title slide](./slides/slide-01.png)
![Why gardens, not streams](./slides/slide-02.png)
![Architecture overview](./slides/slide-03.png)
:::
```

Each slide is an ordinary Markdown image, so the file stays portable:
GitHub, Obsidian and other tools show a plain list of images. Write real alt
text — it is what screen readers announce for each slide, and it is indexed
for search.

- **Title** — the bracketed label. It captions the deck and names it for
  screen readers. Optional.
- **`pdf`** — a link to the full deck as a PDF ("Download PDF" under the
  deck). A path next to the content (`./talk.pdf`) or an `https://` URL.
- **`video`** — a link to the recording ("Watch the talk"). An `https://`
  URL or a path next to the content.
- **`{#id}`** — the deck's id stem for slide links (see below). Optional.

Slides may sit on one line, on consecutive lines or in separate paragraphs.
Comment a slide out with `<!-- ![…](…) -->`. Anything else inside the block —
text, headings, lists, linked images — fails the build with the line number:
put captions in the alt text and prose before or after the deck.

## Importing slides

`new-slides` copies an export next to the content and prints the block:

```bash
# Keynote / PowerPoint / Google Slides image export
bun run new-slides ~/Desktop/XConf-Export --into content/posts/xconf-2026/ \
  --title "Building a Digital Garden" --video https://youtu.be/…

# A PDF export: pages become PNG slides, and the PDF becomes the download link
bun run new-slides ~/Desktop/xconf.pdf --into content/flows/2026/11/15/
```

- `--into` is the content's folder (a folder post or folder flow). Slides go
  in its `slides/` subfolder (`--dir` to change), renamed `slide-01.png`, …
  in deck order: `Slide2.PNG` comes before `Slide10.PNG`.
- With a PDF, pages render about 1920px wide (`--width`), the PDF is copied
  next to the content, and its document title becomes the deck title unless
  `--title` is given. pdf.js renders fonts and effects slightly less
  faithfully than the app's own image export; export images when that matters.
- `--pdf talk.pdf` adds a download link to an image export.
- Existing slides are never replaced without `--force`, and an import that
  fails part-way leaves them as they were.
- Replace each "Slide N" alt text with what the slide shows.

## Reading a deck

| Action | Inline deck (focused) | Fullscreen presenter |
|---|---|---|
| Next / previous slide | → / ←, the side buttons, swipe | → / ←, PageDown / PageUp (presentation clickers), Space / Shift+Space, swipe, a click on the slide |
| First / last slide | Home / End | Home / End |
| Open the presenter | Click a slide, the corner button, or F | — |
| Fullscreen on / off | — | F or the corner button |
| Close | — | Escape (once, even in fullscreen) or ✕ |

The counter shows where you are ("3 / 40"), and screen readers hear the new
position after each move. Clicking a slide opens the presenter without
fullscreen; the corner button and F also go fullscreen where the browser
allows it. iPhone Safari has no element fullscreen, so there the presenter
fills the screen as an overlay instead. Closing the presenter leaves the
deck on the slide you ended on.

## Links to a slide

Every slide has an id: `slides-1`, `slides-2`, … for the first deck on a
page, `slides2-1`, … for the second. `/posts/my-talk/#slides-12` opens the
deck at slide 12 — even without JavaScript — and the address updates as a
reader flips through, so they can share the slide they are on.

Give a deck its own id stem with `{#id}`: `:::slides[Keynote]{#keynote}`
makes `#keynote-1`, `#keynote-2`, …. A deck's slide id that collides with a
heading id on the page (`## Slides 2` is `slides-2`) or an id written in raw
HTML (`<h2 id="slides-2">`) fails the build; an explicit `{#id}` fixes it.

## Where the images go

The slide images must be copied to the site, which depends on where the
content lives:

| Content | Works | Layout |
|---|---|---|
| Folder post | Yes | `content/posts/my-talk/index.mdx` + `content/posts/my-talk/slides/*.png` |
| Single-file post | Yes | The build copies each file the post references |
| Series post (folder or file) | Yes | As for posts |
| Flow entry | Folder flows only | `content/flows/2026/11/15/index.md` + `content/flows/2026/11/15/slides/*.png` |
| Book chapter | Yes | Next to the chapter, like any chapter image |
| Note | No | Notes are single files and nothing copies their images |

`bun dev` does not copy content assets: run `bun scripts/copy-assets.ts`
once after adding slides to see them in development.

Export PNG or JPEG. The build makes responsive WebP variants of both;
AVIF and WebP slides are served as-is with no smaller variants (see
`docs/TROUBLESHOOTING.md`).

## Feeds

RSS and Atom readers run no JavaScript, and forty stacked slides would bury
the post, so a feed item shows the deck's first slide, linked to the deck
on the page, with the title, a "View all N slides" link and the PDF and
video links underneath.

## Gotchas

- **Attributes need a bracketed title.** `:::slides My Talk {pdf=…}` fails
  the build; write `:::slides[My Talk]{pdf=…}`.
- **Slide ids can collide with headings.** `## Slides 2` and a first deck's
  second slide are both `slides-2`, and so is a raw `<h2 id="slides-2">`;
  the build fails and `{#id}` fixes it.
- **Printing loads every slide only with JavaScript.** Slides are lazy;
  the runtime switches them all to eager before printing. Without
  JavaScript, slides that never scrolled into view may print blank.
- **No true fullscreen on iPhone.** The presenter fills the screen as an
  overlay instead.
- **AVIF / WebP slides** are served full size, with no smaller variants.
- **Notes and single-file flows** don't copy assets, so a deck there shows
  broken images (the post-build link check reports them).
- **Left to right only.** The track scrolls left to right in every locale.
- **rST** has no slide-deck directive.

## How it works

- `src/lib/remark-slide-deck.ts` turns the block into a `<slide-deck>`
  element, wraps each image in a `div#<stem>-<n>` and tags it `data-slide`.
  It resolves `pdf` / `video` paths against the content's asset base, like
  images, and holds the strict-build checks. Id helpers shared with the
  client live in `src/lib/slide-deck.ts`.
- `MarkdownRenderer` maps `slide-deck` to `src/components/SlideDeck.tsx`, a
  Server Component: a focusable horizontal scroll-snap track with one
  full-width slide per snap point, and a caption. Its `img` override renders
  slides lazily and without the blur placeholder, which is a separate eager
  request per image. `rehype-zoomable-images` skips deck images.
- Without JavaScript the deck is a swipeable, scrollable strip, and print
  stacks every slide.
- The controls are a client island loaded on demand. `SlideDeckControls`
  (the only static client code, a few hundred bytes) mounts after hydration
  and lazily imports `SlideDeckRuntime`: buttons, counter, keys, hash sync,
  preloading and the presenter. Client components imported by
  `MarkdownRenderer` share one chunk per route, so a static import would put
  the runtime on every article page. `tests/tooling/client-bundle-guard.test.ts`
  keeps it that way.
- The runtime reads the slide from the track's scroll position and updates
  the address with `history.replaceState` only once a scroll settles
  (`scrollend`, or 120 ms of quiet). It switches the current slide and its
  neighbours to eager loading once the deck nears the viewport, and every
  slide before printing.
- The presenter is a modal `<dialog>` (the top layer: above the immersive
  reader, outside transformed flow cards) whose inner stage is what goes
  fullscreen — browsers refuse fullscreen on a `<dialog>` itself. Leaving
  fullscreen closes the presenter, so one Escape exits both. Its keys stop at
  the dialog, so Escape doesn't also exit the immersive reader.
