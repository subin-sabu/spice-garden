# Spice Garden digital menu

React/Vite guest menu with a Supabase admin panel, optional dish pairings, and a device-local My Plate. Guests show their selection to the waiter. The app does not submit orders or take payments.

## Local preview

Use Node.js 22.12+.

```bash
npm ci
npm run dev
```

Open the printed URL with `?table=07` to try the guest flow. Configure Supabase to load the menu. Without a connection, the app shows a setup or service notice.

## Connect Supabase

1. In Supabase **SQL Editor**, apply any missing files from the sequence below. If the earlier migrations are already applied, run only `20261117040000_unique_taxonomy_titles.sql`. If it reports duplicate category or collection titles, rename or consolidate those entries before retrying. On a new project, run these files in this order:
   - `supabase/schema.sql`
   - `supabase/migrations/20261115000000_menu_admin.sql`
   - `supabase/migrations/20261116000000_email_otp_photos.sql` (installs the photo triggers and cleanup)
   - `supabase/migrations/20261117010000_password_admin.sql`
   - `supabase/migrations/20261117020000_default_banner.sql`
   - `supabase/migrations/20261117030000_protect_collection_memberships.sql`
   - `supabase/migrations/20261117040000_unique_taxonomy_titles.sql`
2. Optional for a fresh test database: run `supabase/seed-demo.sql` once to load demo dishes into Supabase. Add their photos through the admin. Old demo records using bundled photo paths require replacements through the admin. Use **Remove imported gallery photos** in the dish editor to clear those references and free photo slots.
3. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase **Connect** dialog. Add those same variables in Netlify and trigger a new build. Keep service-role keys out of the frontend.
4. In **Authentication**, enable the **Email** provider and disable **Allow new users to sign up**. If the project is dedicated to this menu, disable the previously configured Google provider.
5. In **Authentication → Users**, create an email/password user and auto-confirm the email. If the email already exists, assign a password to that account using the Supabase Auth Admin API from a trusted server, or create a separate confirmed staff account. Copy the UUID of the account that will manage the menu.
6. In SQL Editor, run the following with the staff user's real UUID. This replaces any previous admin allowlist entry.

   ```sql
   begin;
   delete from private.menu_admin where user_id <> 'REPLACE-WITH-STAFF-USER-UUID'::uuid;
   insert into private.menu_admin (user_id)
   values ('REPLACE-WITH-STAFF-USER-UUID'::uuid)
   on conflict (user_id) do nothing;
   commit;
   ```

7. Open `/admin` and sign in. Save a test dish, add a photo, and open the public menu in a private window to verify the thumbnail and gallery. Also verify that a user outside the allowlist cannot enter the dashboard.
8. The app signs the browser out after two hours. Database and Storage rules independently deny admin access after that deadline.

## Password recovery

In the Supabase **Reset password** email template, replace the confirmation link with the code variable. For example:

```html
<p>Your Spice Garden password reset code is <strong>{{ .Token }}</strong>.</p>
<p>Enter this code in the admin password reset form.</p>
```

Configure custom SMTP if recovery emails must go to staff outside the Supabase project team. Test delivery from **Forgot password?** at `/admin`, then enter the code and the new password twice. Test sign-in with the replacement password.

## Manage the menu

- **Dishes** supports editing names and descriptions, setting dietary type, prices, visibility and availability, selecting an existing partner, and permanently deleting a dish after confirmation. Normalized duplicate names are blocked by a database unique index and the form flags some common spelling variants.
- **Availability** lists all dishes and lets staff switch each dish between available and unavailable without opening its editor. Choose category, alphabetical, or unavailable-first view. Drafts are labelled.
- **Categories** supports renaming, ordering, hiding, moving dishes to another category, and deleting empty categories. Hiding a category also hides its dishes from the guest menu and collections.
- **Collections** supports adding existing dishes, ordering them, and changing the collection name and visibility. Remove every member before deleting a collection. Chef’s Picks works with or without a pairing. A link appears when the partner is visible on the guest menu. Each visible collection with available dishes appears as a separate homepage section. The full menu keeps its regular categories, and search looks across categories while applying the selected dietary filter.
- **Homepage** selects one banner dish and optional text overrides that also apply to the default banner. Upload a separate default restaurant banner, crop it to 16:9, and keep Show this banner on the homepage now selected to display it immediately. Clear that option to save it as a fallback and keep your featured dish. It also serves as the image fallback when a featured dish is hidden, unavailable, or has no photo. Set a featured dish and its text overrides separately.
- **Photos** accepts JPEG, PNG, WebP, or AVIF up to 15 MB. Frame the thumbnail with the zoom slider and drag to pan, including on touch screens. Position sliders also work with a keyboard. The exported thumbnail is 32:21, up to 640 × 420. The main file preserves the composition and is scaled to at most 1,400 px on the long edge. The browser encodes cropped and larger images as quality-targeted WebP. A WebP main photo already within the size and dimension targets is reused unchanged. Targets are 90 KiB for thumbnails, 250 KiB for main photos, and 350 KiB for banners; unusually detailed images may exceed these targets up to the 1 MiB storage limit. Each dish supports up to four photos, including imported photos. The first ordered photo becomes the cover. Dish suggestions use the locally loaded menu after a brief typing pause; duplicate names are rejected by the editor and the database. Replacement switches the database references only after uploading both files. Use **Photo cleanup → Scan storage → Delete eligible files** to remove unreferenced uploaded files over 24 hours old. Cleanup rechecks references and deletes through the Storage API. Replaced and removed images, including default banners, enter the same cleanup flow. Existing galleries with more than four photos can be reduced in place. Additional photos are blocked until the gallery has room.

## Deploy to Netlify

Push this source to your repository and import it into Netlify, or use the existing linked project. The bundled `netlify.toml` builds with `npm run build` and publishes `dist`. The bundled `public/_redirects` serves direct visits to `/admin`. Add the same two Supabase variables to the production build environment and redeploy. Test the guest menu and `/admin` before switching table QR codes. Use `?table=07` for Table 07.

[Supabase email and password](https://supabase.com/docs/guides/auth/passwords) · [Netlify Git deploys](https://docs.netlify.com/start/quickstarts/deploy-from-repository/)
