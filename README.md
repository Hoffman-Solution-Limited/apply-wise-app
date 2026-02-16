# ApplyAtlas

ApplyAtlas is a job application tracker built with React + Supabase.

It helps you track every role from first application to outcome, while keeping the exact documents used for each submission.

## Features

- Auth with email/password and OAuth providers (Google, LinkedIn, OIDC support in config).
- Dashboard with table + kanban views.
- Job actions are limited to:
  - `Edit`
  - `Submit application`
  - `Delete`
- Submission flow requires uploading the CV used, with optional cover letter upload.
- Quick links on job cards/rows to open submitted documents (`View CV`, `View CL`).
- Profile page supports resume upload and profile details.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- React Query
- Supabase (Auth, Postgres, Storage)

## Requirements

- Node.js 18+
- npm
- Supabase project (hosted or local)

## Install and Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Environment Variables

Create/update `.env`:

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
VITE_SUPABASE_RESUMES_BUCKET="resumes"
```

`VITE_SUPABASE_RESUMES_BUCKET` defaults to `resumes` if omitted.

## Supabase Migrations

This repo includes migrations for:

- core schema (`profiles`, `jobs`)
- profile fields (`resume_url`, `experience`, `education`)
- storage bucket/policies for resumes
- submitted document columns on `jobs`:
  - `submitted_cv_url`
  - `submitted_cover_letter_url`

### Hosted Supabase

1. Login CLI:

```bash
npx supabase login
```

2. Link project:

```bash
npx supabase link --project-ref jktkavcipauyzvukqwbf
```

3. Push migrations:

```bash
npx supabase db push --include-all
```

### Local Supabase

```bash
npx supabase start
npx supabase db reset
```

Then point `.env` to local Supabase values from:

```bash
npx supabase status
```

## Upload Troubleshooting

If you see `Upload failed: bucket not found`, the storage bucket migration has not been applied.

Apply migrations (hosted or local) so the `resumes` bucket and policies are created.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run preview` - preview build
- `npm run lint` - lint
- `npm run test` - run tests
- `npm run test:watch` - watch tests
