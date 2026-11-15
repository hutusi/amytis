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

## Links to a slide

Every slide has an id: `slides-1`, `slides-2`, … for the first deck on a
page, `slides2-1`, … for the second. `/posts/my-talk/#slides-12` opens the
deck at slide 12 — even without JavaScript — and the address updates as a
reader flips through, so they can share the slide they are on.

Give a deck its own id stem with `{#id}`: `:::slides[Keynote]{#keynote}`
makes `#keynote-1`, `#keynote-2`, …. A deck's slide id that collides with a
heading id on the page (`## Slides 2` is `slides-2`) fails the build; an
explicit `{#id}` fixes it.

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
