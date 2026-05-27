# Local AI Automation

This workspace is connected to a Codex local automation named:

`URSport Daily AI SEO Report`

Schedule:

`FREQ=HOURLY;INTERVAL=24`

Automation id:

`ursport-daily-ai-seo-report`

## What It Does

The automation runs in:

`D:\Projects\ursport`

Daily, it reviews the local SEO plan and repository state, then reports:

- Current SEO/content status.
- Broken-link or sitemap risks when checks are relevant.
- Priority product, blog, and technical SEO tasks.
- Suggested next actions from `10-ai-automation.md`, keyword plans, and roadmap files.
- Files or areas that need human review before publishing.

## Guardrails

The automation must not:

- Publish content automatically.
- Push code.
- Edit files unless a scheduled task explicitly requires it.
- Replace human review for product descriptions, blog drafts, prices, stock, or promotions.

The default output is a short Vietnamese report with clear next steps.

## Optimized Schedule

### Daily Light Report

Automation:

`URSport Daily AI SEO Report`

Purpose:

- Fast local check.
- Finds the 3 highest-priority tasks for today.
- Avoids expensive commands unless needed.
- Does not edit files.

Daily order:

1. Check `git status`.
2. Read `LOCAL-AI-AUTOMATION.md`, `10-ai-automation.md`, `IMPLEMENTATION-CHECKLIST.md`, and `QUICK-START-GUIDE.md`.
3. Verify domain/SEO basics from `.env`, `index.html`, `public/robots.txt`, `public/llms.txt`, and `public/sitemap.xml`.
4. Run a light technical check such as `npx tsc --noEmit` when useful.
5. Report:
   - Status.
   - What was checked.
   - Risks.
   - Top 3 tasks today.
   - Exact files/lines if action is needed.

### Weekly Deep Audit

Automation:

`URSport Weekly SEO Deep Audit`

Purpose:

- Full weekly health check.
- Runs heavier checks such as build/broken-link validation when appropriate.
- Plans the next week of product, blog, schema, and technical SEO work.

Weekly output:

- Health score.
- Blocking issues.
- Warnings.
- Growth opportunities.
- Next-week plan.
- Commands run and failures, if any.

## File Reading Order

Use this order to avoid confusion:

1. `LOCAL-AI-AUTOMATION.md` - current automation rules.
2. `QUICK-START-GUIDE.md` - near-term execution plan.
3. `IMPLEMENTATION-CHECKLIST.md` - progress tracking.
4. `PRODUCT_SKILL.md` - product content rules.
5. `PRODUCT-UPDATE-EXAMPLES.md` - examples/templates.
6. `10-ai-automation.md` - full automation strategy.
7. `SEO-STRATEGY-2026.md` and `AI-CITATIONS-GUIDE.md` - reference docs.

## Recommended Workflow

For product descriptions and SEO content:

1. Use Admin > SEO & Công cụ AI > AI Sản Phẩm.
2. Select a real product from the catalog.
3. Let AI generate content from real product data.
4. Review in the product form.
5. Save manually after checking price, stock, variants, and claims.

Avoid using Python/Chroma/text-generation-webui for normal product work. That path is experimental and heavier than the current admin AI flow.

## Related Local AI Flow

Product content generation now runs inside the admin AI product tab. It can use real product data from the current catalog and opens the product form for review before saving.
