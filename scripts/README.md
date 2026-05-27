# Scripts Folder

The primary AI product workflow now lives in the admin UI:

`Admin > SEO & Công cụ AI > AI Sản Phẩm`

Use that flow for normal product description work because it reads real product data from the catalog and opens the product form for human review before saving.

## Recommended Local Automation

Use the Codex local automations documented in:

`LOCAL-AI-AUTOMATION.md`

Current schedule:

- Daily light report: `URSport Daily AI SEO Report`
- Weekly deep audit: `URSport Weekly SEO Deep Audit`

## Local AI Commands

Run from the project root:

```cmd
cd /d D:\Projects\ursport
npm run local-ai
npm run local-ai:daily
npm run local-ai:weekly
npm run local-ai:all
```

What they do:

- `local-ai`: runs the workspace automation described in `LOCAL-AI-AUTOMATION.md`.
- `local-ai:daily`: daily light report for the whole `D:\Projects\ursport` folder.
- `local-ai:weekly`: deeper weekly workspace audit.
- `local-ai:all`: full workspace audit, not product generation.

Product generation is optional and must be called explicitly:

```cmd
npm run local-ai:report
npm run local-ai:product -- --product-id=at-1 --max-tokens=900
```

- `local-ai:report`: alias for the workspace automation report.
- `local-ai:product`: runs the Python embedding + product description flow and writes `outputs/{product-id}.md`.

## Current Production-Safe Scripts

These scripts are part of the normal project workflow:

- `check-broken-links.ts`
- `generate-sitemap.ts`
- `generate-seo-snapshots.ts`
- `generate-redirects-from-prebuild.ts`
- `fix-markdown-links.ts`
- `apply-blog-fixes.ts`
- `suggest-blog-fixes.ts`

## Experimental Python Scripts

The following Python scripts are experimental and are not the recommended path:

- `ingest_embeddings.py`
- `generate_product_descriptions.py`
- `products_seed.json`
- `requirements.txt`

Reasons:

- They require Python, Chroma, sentence-transformers, and a separate local generation server.
- They use seed data instead of the live product form/catalog.
- Chroma setup can be version-sensitive.
- The admin AI flow is simpler and safer for this project.

Only use the Python path if you deliberately want to test retrieval-augmented generation outside the app.
