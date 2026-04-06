# Digital Garden Features

Amytis includes a suite of features designed for non-linear knowledge management, inspired by the "Digital Garden" philosophy. These features allow you to create an interconnected web of thoughts rather than just a linear stream of posts.

## Core Concepts

### 1. Notes (`/notes`)
Notes are atomic units of knowledge. Unlike posts, which are often time-bound articles, notes are evergreen and concept-oriented.

- **Location:** `content/notes/*.mdx`
- **Frontmatter:**
  ```yaml
  ---
  title: "Zettelkasten Method"
  tags: ["pkm", "productivity"]
  aliases: ["zettelkasten", "slip-box"] # Alternative names for wiki-linking
  backlinks: true # Show backlinks at the bottom (default: true)
  ---
  ```

### 2. Wiki-links
You can link between any content (Posts, Notes, Flows) using double-bracket syntax: `[[Slug]]` or `[[Slug|Display Text]]`.

- **Standard Link:** `[[zettelkasten-method]]` → links to `/notes/zettelkasten-method`
- **Aliased Link:** `[[zettelkasten-method|The Slip Box]]` → links to same note but displays "The Slip Box"
- **Cross-Type Linking:**
  - If a slug matches a Note, it links to `/notes/[slug]`
  - If it matches a Post, it links to `/posts/[slug]`
  - If it matches a Flow date slug, it links to `/flows/YYYY/MM/DD`

### 3. Backlinks
At the bottom of every Note, Amytis automatically generates a "Linked References" section. This lists every other page that links *to* the current note, along with a context snippet showing how it was referenced.

### 4. Knowledge Graph
The `/graph` route visualizes your entire digital garden as an interactive network graph.
- **Nodes**: Represent Notes, Posts, and Flows.
- **Edges**: Represent wiki-links connecting them.
- **Interaction**: Click a node to navigate to that page.

### 5. Collections (`/series`)
While a "Series" is typically a linear progression of posts (e.g., Part 1, Part 2), a **Collection** allows you to manually curate an arbitrary list of posts and other series into a single grouped page.

To create a collection, set `type: collection` in a series index file:

- **Location:** `content/series/[collection-slug]/index.mdx`
- **Frontmatter:**
  ```yaml
  ---
  title: "Modern Web Development"
  type: collection
  items:
    - post: posts/asynchronous-javascript  # Namespaced reference to a standalone post
    - post: ai-nexus-weekly/week-11        # Namespaced reference to a post inside another series
    - post: understanding-react-hooks      # Fallback reference (searches all posts by slug)
    - series: nextjs-deep-dive             # Embeds all posts from another series
  ---
  ```
Using a namespace (`folder/slug`) in the `post` definition prevents slug collisions and explicitly targets the exact file location.

### 6. Flows (`/flows`)
Flows are a stream-style collection of daily notes, micro-blogging, or imported chat logs. They are ideal for quick thoughts that don't necessarily warrant a full blog post.

- **Location:** `content/flows/YYYY/MM/DD.mdx`
- **Navigation:** Grouped by date in a timeline view.
- **Importing:** Use `bun run new-flow-from-chat` to bring in external conversations.
- **Optional Title:** Set `title` in frontmatter or use an `# Heading` in the content to display a title alongside the date.

## How to Use

1. **Create a Note**: Run `bun run new-note "My Concept"`.
2. **Create a Flow**: Run `bun run new-flow`.
3. **Link to it**: In a blog post, note, or flow, type `[[my-concept]]` or `[[2026-02-27]]`.
4. **Explore**: Visit `/notes` or `/flows` to see your collection, or `/graph` to see the connections.

## Configuration

Flows are controlled by `site.config.ts`, while notes and the graph are always routed when corresponding content exists:

```typescript
export const siteConfig = {
  // ...
  features: {
    flow: {
      enabled: true,
      name: { en: "Flow", zh: "随笔" },
    },
  }
};
```

Related settings that shape the digital-garden experience live alongside that flag:

- `flows.recentCount`: controls how many flow entries appear on the homepage.
- `pagination.flows` and `pagination.notes`: control listing page sizes.
- `homepage.sections`: lets you enable, disable, or reorder homepage sections such as recent flows.
