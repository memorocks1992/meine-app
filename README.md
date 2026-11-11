# Queue Berlin

A responsive web prototype for Berlin's club scene. The map shows the initial club selection. Visitors can read and submit reports without creating an account; only admins sign in. Supabase report submission, public data, and admin authentication become active after the project is configured below. Verify club addresses and map locations before launch.

## Supabase setup

1. Create a Supabase project and run [`supabase/migrations/20261110150000_queue_berlin.sql`](./supabase/migrations/20261110150000_queue_berlin.sql) in its SQL Editor.
2. Copy the project URL and publishable (anon) key from **Project Settings → API** into `supabaseUrl` and `supabaseAnonKey` in [`src/environments/environment.ts`](./src/environments/environment.ts). These are browser-visible project settings; never put a `service_role` key in the app.
3. Create the admin account from the Supabase Dashboard (Authentication → Users → Add user), then grant it the admin role in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

4. Disable public sign-ups in Supabase Auth. Visitors can read and submit reports without an account; only a user explicitly added to `admin_users` can access the admin sign-in.

The report cooldown uses a random browser ID stored in local storage and is enforced by the database per club for 10 minutes. It is not a substitute for stronger abuse prevention (for example, CAPTCHA or server-side IP throttling) before a public launch. The initial club coordinates and addresses still need verification.

The public report flow and admin authentication are wired to these tables. After an admin signs in, the dashboard can add/edit clubs, hide or publish them, schedule events, publish or remove live updates, and remove visitor reports. Hiding a club preserves its historical reports and events. Until the Supabase project is configured, submission and sign-in stay disabled rather than pretending data was saved.

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
