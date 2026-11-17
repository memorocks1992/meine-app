# Queue Berlin

A responsive web prototype for Berlin's club scene. The map shows the initial club selection. Visitors can read and submit reports without creating an account; only admins sign in. Supabase report submission, public data, and admin authentication become active after the project is configured below. Verify club addresses and map locations before launch.

## Supabase setup

1. Create a Supabase project and apply the SQL files in [`supabase/migrations`](./supabase/migrations) in filename order using its SQL Editor. The migrations add a primary key to `live_updates`, so existing rows can be edited and deleted in the Table Editor.
   The event seed migration is a snapshot of verified club-calendar listings as of 2026-11-12; review and refresh those dates before reusing it later.
2. Copy the project URL and publishable (anon) key from **Project Settings → API** into `supabaseUrl` and `supabaseAnonKey` in [`src/environments/environment.ts`](./src/environments/environment.ts). These are browser-visible project settings; never put a `service_role` key in the app.
3. Create the admin account from the Supabase Dashboard (Authentication → Users → Add user), then grant it the admin role in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

4. Disable public sign-ups in Supabase Auth. Visitors can read and submit reports without an account; only a user explicitly added to `admin_users` can access the admin sign-in.

The report cooldown uses a random browser ID stored in local storage and is enforced by the database per club for 10 minutes. It is not a substitute for stronger abuse prevention (for example, CAPTCHA or server-side IP throttling) before a public launch. The initial club coordinates and addresses still need verification.

Before a report is submitted, the app checks waiting time and entry-price category against the median of at least three reports for the same event from the past hour. A difference of at least 90 minutes or two price categories prompts the visitor to correct or confirm their entry. This client-side check helps catch mistakes but is not a security or anti-sabotage boundary: a determined visitor can confirm or bypass it. If current comparison reports cannot be loaded, the app asks the visitor to try again instead of submitting unchecked.

Waiting times are selected from 0 to 240 minutes in ten-minute steps. Apply the [wait-time migration](./supabase/migrations/20261117180000_wait_time_scale.sql) before deploying the updated form; it retains the legacy 45-minute value for existing reports and older clients.

Reports are tied to the active club event, and its reports are removed shortly after that event ends. Events starting on 31 December may run for up to 72 hours; other events retain the existing weekend limits. Multiple listings for one club and date share one event interval, which can include gaps between listings. Where a published end time is unavailable, the programme marks the end as estimated; reports can be submitted until that estimate even if the club closes earlier.

The Süß war gestern and OXI programme is a manually researched snapshot as of 17 November 2026, not an automatic import. Sources are listed in the [event migration](./supabase/migrations/20261117150000_suess_oxi_events.sql); listings can change and not all future events may have been published. Review the programme and estimated end times in the admin dashboard.

Club addresses can be displayed and copied from the club details. The [address migration](./supabase/migrations/20261117160000_verified_club_addresses.sql) records the club-site sources checked on 17 November 2026 and updates only unchanged seed addresses; review admin-edited and unverified addresses separately. A club's imprint may list its operator's address rather than its entrance, so confirm locations before travel.

The [address completion migration](./supabase/migrations/20261117190000_complete_club_addresses.sql) adds postcodes to the remaining original addresses and includes sources for clubs whose websites could not be verified. It preserves admin-edited addresses; Berghain's official address does not specify a house number.

The entry-price pilot checks Club OST's official calendar every six hours using the `club-prices.yml` GitHub Actions workflow. It recognizes only explicit “free entry until” offers and only when a single official listing exactly matches the existing event title and date. Such offers are partial: the app shows the source and still allows visitors to report other prices. It does not infer a full-night price or cover other clubs. Prices disappear after 48 hours without a successful check; unmatched or removed offers are cleared on the next successful run. Apply the [event-price migration](./supabase/migrations/20261117170000_event_prices.sql) before deploying the app, then configure the workflow's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` repository secrets and enable Actions. The service role key belongs only in the workflow secret, never in the browser. The workflow runs only for public repositories and reports failures in Actions; it does not create events.

The public report flow and admin authentication are wired to these tables. After an admin signs in, the dashboard can add/edit clubs, hide or publish them, schedule events, publish or remove live updates, and remove visitor reports. Hiding a club preserves its events. Until the Supabase project is configured, submission and sign-in stay disabled rather than pretending data was saved.

## Development server

Install dependencies with `npm install`, then start the local development server:

```bash
npm start
```

Open the URL printed in the terminal (normally `http://localhost:4200/`). The application reloads when source files change. The map uses OpenStreetMap tiles and includes attribution.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Deploying to Render

The app uses Angular server-side rendering and should run as a Node web service, not as a static site.

1. Push the project to a GitHub repository and connect that repository in Render.
2. In Render, choose **New → Blueprint** and select the repository. Render will use [`render.yaml`](./render.yaml) to build and start the service.
3. Wait for the first deployment to finish, then open the service's **Settings → Custom Domains** and add `www.queue-berlin.com` and `queue-berlin.com`.
4. In the United Domains DNS settings for `queue-berlin.com`, add the DNS records Render displays for both hostnames. Remove conflicting records for those hostnames, but leave unrelated email records (such as MX and SPF) unchanged. Wait for DNS propagation and for Render to issue TLS certificates.
5. Test both domain names, forum posting, likes, reports and the admin sign-in.

The free Render plan may spin down an idle service, so the first request after inactivity can take longer. Before launch, apply the required SQL migrations in Supabase, verify the club information, disable public admin sign-ups, and confirm the database's RLS policies and automatic forum-expiry job are active. Never put a Supabase `service_role` key in the browser app.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
