# Demo

## ESM (bundler-style)

```bash
pnpm build:lib
pnpm dev
```

Open `http://localhost:5173/demo/`.

## Standalone (plain HTML)

```bash
pnpm build:standalone
python -m http.server 8000
```

Open `http://localhost:8000/demo/standalone.html`.
