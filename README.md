This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase free keep-alive

Supabase free projects can pause after long inactivity. This project includes:

- a keep-alive endpoint: `/api/cron/supabase-keep-alive`
- a GitHub Actions schedule in `.github/workflows/supabase-keep-alive.yml` (every 12 hours)
- retry logic (`3` attempts) for cold-start wake-up latency

### Required env vars

```env
CRON_SECRET=...
SUPABASE_KEEP_ALIVE_TOKEN=...
```

- `CRON_SECRET`: required for scheduled pings via `Authorization: Bearer <CRON_SECRET>`.
- `SUPABASE_KEEP_ALIVE_TOKEN`: optional fallback for providers calling `...?token=...`.

### GitHub repository secrets

Create these repository secrets:

- `KEEP_ALIVE_URL`: full endpoint URL, e.g. `https://<your-domain>/api/cron/supabase-keep-alive`
- `CRON_SECRET`: same value as app environment variable `CRON_SECRET`

Then enable the workflow in `.github/workflows/supabase-keep-alive.yml`.

### Manual check

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-domain>/api/cron/supabase-keep-alive
```
