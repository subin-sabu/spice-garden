# Spice Garden Restaurant QR Menu

A React and Vite menu for Spice Garden by Aadisaktthi, Kovalam. Guests can browse categories, search, and filter by dietary preference. A table URL such as `/?table=07` displays the table number. The app does not submit orders or collect customer data.

## Run locally

Use Node.js 22.12+ or a supported newer release.

```bash
npm ci
npm run dev
npm run build
npm run preview
```

## Choose where the menu lives

- **Static mode** works without credentials. Edit `previewMenu` in `src/menu.js` and redeploy. The client demo includes 32 items, sample prices, two demo specials, and six illustrated dishes. Replace the sample prices, descriptions and photos with approved restaurant data before a guest rollout.
- **Supabase mode** lets staff with dashboard access edit published dishes without rebuilding. Create a project in the restaurant's account, run `supabase/schema.sql` once in SQL Editor, and enter approved dishes in Table Editor. Set `published` to true on items ready to show guests. Enter prices in paise (₹349 = `34900`). Set `special_on` to a date in Kerala time and `featured` for house signatures. The public database role can only read published rows. Use a Supabase publishable key in the browser and keep the service-role key out of this project.
- Copy `.env.example` to `.env.local`, fill in both values, and restart Vite. Add the same two variables to Netlify's build environment for live deployment. Live mode shows a retry prompt if Supabase is unavailable.

## Deploy to Netlify

1. Unzip the project and open the folder containing `package.json`. Install Node.js 22.12 or later. Run `npm ci` and `npm run dev` to test it locally. Append `?table=07` to the local URL to simulate a scan.
2. Create an empty GitHub repository in the restaurant's account. Leave the options to add a README, licence, and gitignore unchecked. Run these commands from the extracted folder, replacing the example GitHub URL.

   ```bash
   git init -b main
   git add .
   git commit -m "Add Spice Garden QR menu"
   git remote add origin https://github.com/YOUR-ACCOUNT/spice-garden-menu.git
   git push -u origin main
   ```

3. In Netlify, choose **Add new project → Import an existing project → GitHub**, select the repository, and use the `main` branch. The included `netlify.toml` builds with `npm run build` and publishes `dist`. Publish and open the assigned `.netlify.app` URL in an incognito window. If Netlify made it private by default, make the project public for guest access.
4. For the demo, leave the Supabase settings empty. To connect a live menu, create a Supabase project with the Data API enabled. Run `supabase/schema.sql` in **SQL Editor** for a new database. For an existing menu database, apply any missing migrations in `supabase/migrations/` instead.
5. In Supabase **Table Editor → menu_items**, add the approved dishes. Enter prices in paise, set `published = true` to show a dish, and set `is_available = false` to leave it visible at the end of its list with Add disabled. Use `sort_order` to control the order within each availability group. Populate the table before connecting it, since the live site reads the database menu.
6. Copy the project URL and publishable key from Supabase's **Connect** dialog. In Netlify **Project configuration → Environment variables**, add:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   ```

   These values are included in the browser build. Keep Supabase secret and service-role keys server-side. Trigger a new Netlify deploy after adding or changing the variables. Menu row updates take effect when guests reopen or refresh the page.
7. For the restaurant domain, add `menu.aadisaktthiresorts.com` in Netlify under **Domain management → Production domains**. Ask the resort DNS administrator to add the `menu` CNAME using the exact target Netlify provides. Wait for HTTPS to work and verify the site from a phone before printing the QRs.
8. Make one QR per table using the final URL and the relevant table number.

   ```bash
   npx --yes --package=qrcode@1.5.4 qrcode -t svg -o table-07.svg "https://menu.aadisaktthiresorts.com/?table=07"
   ```

   Test the printed QR on iOS and Android using cellular data before placing it on tables.

Hosting references: [GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github), [Netlify Git deployments](https://docs.netlify.com/start/quickstarts/deploy-from-repository/), [Netlify environment variables](https://docs.netlify.com/build/environment-variables/overview/), [Netlify subdomains](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/), and [Supabase API setup](https://supabase.com/docs/guides/api/creating-routes).

## Branding and menu source

The [official dining page](https://aadisaktthiresorts.com/restaurant.html) supplied the venue name and dish selection. The preview uses a custom leaf mark, system sans-serif and Georgia, and an illustrative Kerala seafood hero. Replace the mark and photo with resort-approved assets before public launch.

## Free-tier limits

- [Netlify pricing](https://www.netlify.com/pricing/) and [credit usage](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/) describe the 300-credit monthly limit. Production deployments, bandwidth, and requests draw from the same allowance. Free projects can be paused when the team exceeds the cap.
- [Supabase pricing](https://supabase.com/pricing) and [project pausing](https://supabase.com/docs/guides/platform/free-project-pausing) describe the 500 MB database allowance and low-activity pauses. Use a static deployment if menu updates are infrequent and the menu should work without a database.

## Dish details and My Plate

- Each dish has a detail view. In Supabase Table Editor, enter its `description`, set `image_urls` to an ordered array of public HTTPS image URLs, and optionally set `video_url` to a direct public HTTPS MP4 or WebM URL. The first image is the thumbnail and video poster. The legacy `image_url` field still works. Video loads on demand, with playback controlled by the guest.
- Existing Supabase projects can apply `supabase/migrations/20261110_dish_media.sql` in SQL Editor. For a new database, run `supabase/schema.sql`, which already includes the media columns. The app also reads older schemas before migration.
- For static menus, set `image_urls` and `video_url` in `src/menu.js`. Put locally hosted media under `public/images/` and reference it as `/images/filename`. Six dishes include illustrative photos. Fish Pollichathu has a two-photo gallery. Replace the demo assets with approved restaurant photography for the guest menu.
- My Plate saves dish IDs and quantities in the guest's browser, separately for each table QR on that device. Guests can add or remove dishes directly from the menu and show the list and subtotal to their server. The feature uses no database writes, order submission, or payments.

## Client walkthrough

Open the guest menu with `?table=07` to simulate a table scan. Add a dish, use its minus button to remove it, open another dish with **View details**, then open **View My Plate** to review the subtotal.

The production design assumes menu and media changes come from a separate authenticated staff admin panel with role-based write permissions. This demo contains the guest menu only. Its existing Supabase connection reads published rows with a public client key and expects writes to be governed by server-side policies.

For existing Supabase projects, apply the media migration before `supabase/migrations/20261110000100_dish_availability.sql`. Keep a dish published and set `is_available` to false to display it in the menu while disabling additions to My Plate. Guests can still remove a previously saved quantity. The demo marks Paneer Tikka, Kerala Fish Fry and Rice Kheer unavailable.
