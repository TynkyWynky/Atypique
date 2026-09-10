# Specialeke

An independent digital studio website, built with plain HTML, CSS, and JavaScript. The five existing routes and the English, French, and Dutch localization are preserved.

## Local development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. There are no production JavaScript dependencies. Edit the HTML pages directly, shared styles in `css/base.css`, page styles in their corresponding CSS files, and multilingual copy in `js/translations.js`.

## Verification and production output

```sh
npx playwright install chromium
npm run lint
npm run build
npm test
```

`dist/` contains the deployable static site, with minified CSS. The existing source directory also remains directly deployable. TypeScript is not used.

The browser checks run against `dist/` and cover all five pages in all three languages, six viewport widths (320–1920px), WCAG A/AA automated checks at desktop and mobile widths, images, internal links, project fragments, metadata, keyboard navigation, locale persistence, and form validation. Contact success and failure responses are intercepted locally; tests never send messages. Review screenshots are saved in `artifacts/`.

## Logo, fonts, and project imagery

- `images/SpecialekeLogo.png` is the supplied new logo. Its original artwork is retained; CSS crops its surrounding whitespace for the header, hero, and footer. Social metadata also uses this exact, case-sensitive filename.
- The dot favicon is `images/favicon.svg`.
- Bricolage Grotesque, Instrument Sans, and IBM Plex Mono are served locally as WOFF2 subsets. Their OFL licenses are included in `fonts/`. `python scripts/fetch-fonts.py` refreshes these assets from Google Fonts.
- Portfolio images in `images/work/` are screenshots of the actual Eventium, Chiro Negenmanneke, and Au Fil du Sport websites, captured on 10 September 2026. `node scripts/capture-work.mjs` refreshes them. Pass a project name, for example `node scripts/capture-work.mjs au-fil-du-sport`, to refresh only that screenshot. It changes only the local screenshot files.

## Contact delivery configuration

The public email address is **hello@specialeke.com**, including mail links, translated error feedback, and structured data.

The contact form still uses **Netlify Forms**, with the existing `contact` form name, `form-name` field, `_subject` field, `bot-field` honeypot, and URL-encoded POST to `/`. No delivery destination is stored in this repository, and existing Netlify notification settings have not been changed.

To route form notifications to the new mailbox, configure and verify `hello@specialeke.com` with the mail provider, then update the contact form's email notification recipient in the site's Netlify settings. Until then, existing configured recipients remain in use. Real email delivery must be checked on the deployed Netlify site; the local server deliberately does not accept submissions.

## SEO and analytics

Canonical URLs, language alternates, OpenGraph, Twitter metadata, localized JSON-LD, sitemap, and robots configuration are retained. The existing Google Analytics measurement ID `G-JQM5PKTY3B` and Plausible domain `specialeke.com` are preserved. Language changes retain project fragments and URL parameters, and internal navigation carries the selected language even if browser storage is unavailable.
