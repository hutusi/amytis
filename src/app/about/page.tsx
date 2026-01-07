export const metadata = {
  title: 'About | Amytis',
  description: 'About the Amytis digital garden.',
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
      <header className="mb-16">
        <h1 className="text-4xl font-serif font-bold text-heading mb-4">About</h1>
        <p className="text-lg text-muted font-serif italic">
          Tending to ideas.
        </p>
      </header>

      <div className="prose prose-lg max-w-none 
          prose-headings:font-serif prose-headings:text-heading 
          prose-p:text-foreground prose-p:leading-loose
          prose-a:text-accent prose-a:no-underline hover:prose-a:underline
          prose-strong:text-heading prose-strong:font-semibold
          dark:prose-invert">
        <p>
          Welcome to <strong>Amytis</strong>, a digital garden designed for cultivating thoughts, 
          snippets, and full-blown articles. Unlike a traditional blog which is linear and 
          chronological, a digital garden is a network of evolving notes.
        </p>
        
        <h2>The Name</h2>
        <p>
          Named after <em>Amytis of Media</em>, the queen for whom the Hanging Gardens of Babylon 
          were reportedly built. This space aims to be a sanctuary for knowledge and creativity.
        </p>

        <h2>Philosophy</h2>
        <p>
          We believe in:
        </p>
        <ul>
          <li><strong>Growth over perfection:</strong> It's okay to publish rough notes.</li>
          <li><strong>Interconnectedness:</strong> Ideas should link to one another.</li>
          <li><strong>Simplicity:</strong> The reading experience should be calm and focused.</li>
        </ul>
      </div>
    </div>
  );
}
