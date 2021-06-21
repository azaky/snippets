# Snippets

This is a miniblog containing code snippets for my personal use. This miniblog is powered by [Notion](https://notion.so/) as its CMS, and uses [Jekyll](https://jekyllrb.com/) to render its content.

## Under the hood

Some of the technologies used by this project:

- [Notion API](https://developers.notion.com/) to fetch pages (or posts) from Notion.
- [React-Notion-X](https://github.com/NotionX/react-notion-x) to fetch the content of a page. Official Notion API has not yet provided convenient way to fetch the whole content of a page, so until then I will use this to render HTML of the notion pages.
  - and React-Notion-X's dependencies for rendering code and equations, [KaTeX](https://katex.org/) and [Prism](https://prismjs.com/).
- [JSDOM](https://github.com/jsdom/jsdom) to perform a little manipulation of the rendered HTML.
- [Jekyll](https://jekyllrb.com/) to render static site.
- [GitHub Actions](https://docs.github.com/en/actions) to automate the syncing from Notion.

Most of the work with React-Notion-X can be much, much simplified if the official Notion API releases the API to export pages as markdown.
