# Page Preview

A browser Web Component that loads an HTML page and displays a compact preview card with a link, the document title, and the first `h1` heading.

## Installation

```bash
npm install @shifrina_a/page-preview
```

## Usage

Import the package from JavaScript in an environment that supports npm package resolution, such as a bundler:

```javascript
import '@shifrina_a/page-preview';
```

Then use the custom element in HTML:

```html
<page-preview src="/pages/example.html"></page-preview>
```

The `src` attribute accepts a URL to an HTML document. Relative URLs are resolved against the page containing the component.

## Features

- Automatically registers the `page-preview` custom element.
- Uses an open Shadow DOM and an HTML template.
- Fetches and parses HTML using `fetch()` and `DOMParser`.
- Displays the trimmed document title and the first `h1` heading.
- Shows fallback text when the title or heading is missing.
- Reports loading, ready, and error states using `data-status`.
- Handles HTTP errors, missing URLs, source changes, and disconnected elements.
- Uses `textContent` to display extracted text safely.

## Status values

- `loading` — the page is being loaded.
- `ready` — the page was loaded and its preview was displayed.
- `error` — the source is missing or the request failed.

## Browser requirements

Use a modern browser with support for Custom Elements, Shadow DOM, Fetch, and DOMParser.

The target page must be readable by browser `fetch()`. Cross-origin pages may reject requests because of CORS restrictions.

## License

MIT
