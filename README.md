# SikeNike

A hide-and-seek browser game with an Among Us style. You are the hider while an evil seeker bot hunts everyone down.

## How to Play

- **Hiders**: each hider has **30 seconds** to choose a hiding spot
- **Seeker**: the seeker bot has **3 minutes** to find all locked hiders
- **Controls**: `WASD` or arrow keys (plus on-screen controls on touch devices)
- **Win**: at least one hider survives until time runs out
- **Lose**: the seeker finds every hider

## Run Locally

From the project folder:

```bash
# Option 1: Python (built-in)
python3 -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000
```

Open **http://localhost:8000** in your browser.

## Publish as a Website

This project is static (`index.html` + `css/` + `js/`), so it can be hosted on any static hosting provider.

### Option 1: GitHub Pages

1. Push this folder to a GitHub repository.
2. The included workflow at `.github/workflows/deploy-pages.yml` will publish the site to GitHub Pages on every push to `main`.
3. In your repo settings, ensure **Pages** is set to **GitHub Actions** as the source.
4. Your game URL will be:

```text
https://<your-github-username>.github.io/<your-repo-name>/
```

### Option 2: Netlify

1. Create a new Netlify site from this folder/repository.
2. Netlify will detect `netlify.toml`.
3. Publish directory is set to the project root (`.`), with no build command required.

### Option 3: Vercel

1. Import this folder/repository into Vercel.
2. Vercel will use `vercel.json`.
3. No build command is required; it is served as static files.
