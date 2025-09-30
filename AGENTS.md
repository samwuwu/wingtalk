# Repository Guidelines

## Project Structure & Module Organization
- Root contains `broadcast.html`, `broadcast.css`, `broadcast.js` (no build step).
- Audio directories:
  - `00/` 行李广播三语言（WAV）：`中.wav`、`粤.wav`、`英.wav`。
  - `01/` 延误登机（MP3）：`01航前准备工作未结束.mp3`、`01飞机晚到晚点通知.mp3`、`01天气原因导致航班延误.mp3`、`01航空管制导致航班延误.mp3`。
  - `02/` 韩亚广播测试：`en_welcome.mp3`（英文）、`kr_welcome.mp3`（韩语）。
- See `README.md` for feature overview and customization.

## Build, Test, and Development Commands
- Serve locally (required; file:// will fail with CORS):
  - `python3 -m http.server 8000` → open `http://localhost:8000/broadcast.html`.
  - Alt: VS Code “Live Server”.
- Sanity check URLs directly (example):
  - `http://localhost:8000/00/中.wav`, `http://localhost:8000/02/en_welcome.mp3`.

## Coding Style & Naming Conventions
- HTML: 4‑space indent, semantic tags; attributes order `class`, `id`, `data-*`, `src/href`.
- CSS: 4‑space indent; kebab‑case class names; avoid inline styles; keep palette consistent.
- JavaScript: ES6+, class‑based, camelCase, `const/let` (no `var`), avoid globals.
- Filenames: keep lowercase + hyphens for new assets; existing Chinese names remain as is.

## Testing Guidelines
- Panels and media:
  - 行李广播 → 00/三语言 WAV。
  - 延误登机 → 01/四条 MP3。
  - 韩亚广播测试 → 02/en_welcome.mp3、02/kr_welcome.mp3。
- Validate controls: play/pause/stop, progress, volume, keyboard (Space/S/↑/↓).
- Mobile/iOS: ensure playback starts on user gesture; verify file picker.
- Always test via local server; confirm HTTP 200 and proper `Content-Type`.

## Commit & Pull Request Guidelines
- Prefer Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`.
- Subjects ≤ 72 chars; imperative mood; include brief testing notes.
- PRs: focused scope, description, screenshots/clip, and related issues.
- Avoid committing large media; consider Git LFS or ignore personal audio.

## Security & Configuration Tips
- Serve audio from same origin for simplicity; if using CDN, enable CORS.
- Ensure server supports Range requests for faster start (progressive play).
- No secrets/keys in this static repo; autoplay must be user‑initiated.
