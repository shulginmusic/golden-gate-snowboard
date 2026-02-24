# Golden Gate Snowboard

Arcade-style snowboard runner set in San Francisco during the February 5, 1976 snowfall.

## Play
- Desktop: `ArrowLeft`/`ArrowRight` or `A`/`D` to steer, `Space` to jump.
- Mobile: touch left/right side to steer, touch the top area to jump.

## Run Locally
Because this project uses ES modules/import maps, run it through a local server (not `file://`):

```bash
cd /Users/efimshulgin/Documents/code/games/golden-gate-snowboard
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy to GitHub Pages
1. Push this repository to GitHub.
2. In GitHub, open `Settings` -> `Pages`.
3. Set:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
4. Wait for deployment, then open:
   - `https://shulginmusic.github.io/golden-gate-snowboard/`

## License
MIT. See `LICENSE`.
