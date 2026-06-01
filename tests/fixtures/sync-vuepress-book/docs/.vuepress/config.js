// Minimal VuePress 2 config used by the sync-vuepress-book integration test.
// Mimics the structural shape of a real dmla-like config: a `theme(...)`
// wrapper around an options object whose `sidebar` property is the literal
// the importer needs to find.

import dmlaTheme from './fake-theme.js'

export default {
  lang: 'zh-CN',
  title: 'Fixture Book',
  description: 'A tiny VuePress book used in tests',

  theme: dmlaTheme({
    sidebar: [
      {
        text: 'Intro',
        collapsible: false,
        link: '/intro/welcome',
      },
      {
        text: 'Maths',
        collapsible: false,
        children: [
          {
            text: 'Linear Algebra',
            collapsible: false,
            children: [
              { text: 'Vectors', link: '/maths/linear/vectors' },
              { text: 'Matrices', link: '/maths/linear/matrices' },
            ],
          },
        ],
      },
      {
        // Empty section — simulates the dmla config's placeholder sections
        // ("alignment", "reasoning") so the importer warns instead of throws.
        text: 'TBD',
        collapsible: false,
        children: [],
      },
    ],
  }),
}
