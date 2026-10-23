# Ovcharenko Group Wiki prototype

A modern, static prototype of the Ovcharenko Group Wiki. It is intentionally dependency-free and ready for free hosting on GitHub Pages.

## Preview locally

The site loads its content with `fetch`, so use a local web server rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Content model

All homepage content is stored in `content.json`. The public interface is built by `app.js`, while the visual design lives in `styles.css`.

The links under **Explore resources** temporarily lead to pages on the existing PmWiki. Those pages can be migrated gradually after the design is approved.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.

## Password-protected editor

The `/admin/` page is currently an explanatory placeholder. A secure shared-password editor needs a small server-side component because secrets must never be embedded in GitHub Pages JavaScript.

The proposed free production setup is:

- GitHub Pages for the public site.
- A Cloudflare Worker for authentication and GitHub API writes.
- A hashed shared password and a fine-grained GitHub token stored as encrypted Worker secrets.
- Simple forms in `/admin/` that update `content.json` and individual Markdown resource pages.

That integration should be activated only after the visual prototype is approved and the target GitHub repository is known.
