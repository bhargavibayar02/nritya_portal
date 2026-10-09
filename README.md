# Nritya · Bharatanatyam Class Manager

A single-admin class portal for branches, students, attendance, classes, and fee payments. Supabase stores records centrally; the Vercel API keeps its service-role key and admin password off the browser. Closing a branch preserves its students, classes, attendance, and payments in history.

## Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**. This creates or updates the records table for branches, students, classes, monthly fees, and attendance, and adds Muruva with the 22 September 2025 start date. If you ran an earlier version of the SQL, run this updated script again to add the new record kinds.
3. In the Supabase project settings, copy the **Project URL** and the **service_role secret** key. Keep the service-role key private. The app accesses Supabase only from its server-side API.

## Deploy and sign in

1. Push this project to a private GitHub repository, then import that repository in Vercel.
2. In Vercel, open **Project → Settings → Environment Variables** and add:
   - `ADMIN_USERNAME` — `bhargavi`
   - `ADMIN_PASSWORD` — choose the password you will use on the portal's login screen.
   - `SESSION_SECRET` — generate a private random value with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
   - `SUPABASE_URL` — the Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role secret key.
3. Enable the variables for Production (and Preview if needed), then deploy or redeploy.
4. Open the Vercel deployment URL. Sign in with username `bhargavi` and the password you configured in `ADMIN_PASSWORD`.

The project is configured for `npm run build` with `dist` as the output directory. Never put the service-role key or admin password in frontend code or commit them.

## Run locally

Use Node.js 20 or newer. Put the same environment variables in an untracked `.env.local` file (copy [`.env.example`](./.env.example) and fill it in), then run `npx vercel dev` from the project folder. The Vercel CLI may ask you to sign in or link the folder the first time. This starts both the Vercel API functions and frontend; `npm run dev` starts only the static Vite frontend and cannot perform login or database actions.

## Class records

- Add, edit, and delete students; marking a student as left keeps their record and history.
- Add and edit branches. Closing a branch blocks new students/classes but preserves existing records; it can be reopened later.
- Add dated classes and review past class attendance, former students, daily attendance registers, and fee statuses in **History**.
- Mark each student's fee as paid or pending for any selected month; paid entries record whether payment was by cash or online.
- Student age is calculated from date of birth and updates automatically each year. Student details also include place, parent name, contact number, and WhatsApp-group status.
