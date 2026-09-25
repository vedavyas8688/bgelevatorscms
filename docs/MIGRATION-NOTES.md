# Migration notes

## What was migrated

The uploaded BG archive contained static HTML, CSS, JavaScript and assets; it did not contain a React package. All 139 HTML pages were imported, keeping their original classes, CSS and URL filenames. `/index.html` remains an alias of the homepage. `packages/content/migration-manifest.json` records each original filename, URL, classification and source SHA-256.

The CMS separates retained layout templates from editable data. Visible text, images, link targets and rich-text article blocks are stored in content records; section order and visibility are editable. Original header/footer variations were kept instead of flattening their different links. Design changes still require editing the source template or stylesheet.

The architecture mirrors the Shokki separation: Next.js storefront, React admin, Express API, MongoDB and reusable packages. Ecommerce-only features such as payment, cart, inventory and shipment workers are not included because they are not part of BG Elevators' website.

## Preserved and connected

- All original page routes, including existing spelling, are retained.
- Existing local stylesheets, font, photography, documents and Webflow interaction scripts are retained.
- Original titles, descriptions and social metadata were imported. There were no canonical tags in the original 139 files; canonicals now derive from Site settings and the existing path unless explicitly overridden.
- JSON-LD objects found in the archive are imported and editable. No unverified business claims or ratings are invented.
- Blog listing cards resolve published article card data, including new posts created by duplication. Other original cross-links remain explicitly editable in their page/section fields.
- Missing PHP form targets were replaced with the Express submission workflow. Contact messages and career applications persist in MongoDB; private resume downloads require staff authentication. Optional email notifications use your SMTP settings.
- reCAPTCHA snippets from the source are not activated with old keys. The new forms use server validation, rate limits and a honeypot. Configure additional bot protection at your reverse proxy if required.

## Missing assets in the supplied archive

These six referenced files were absent from the uploaded ZIP. They were not replaced with invented imagery; use the CMS image fields to select your intended replacements:

1. `images/674295aa59a1771b56fbcbf6_benefit-4.webp`
2. `images/6742b078ec44f828a71fee11_job-details-cover.webp`
3. `images/6742a3709ad20d03319b2c90_job-type.webp`
4. `images/674295aa59a1771b56fbcbca_benefit-1.webp`
5. `images/674295a97eb2ae96a2c0ec1c_benefit-2.webp`
6. `images/674295a9281b8f522264dce0_benefit-3.webp`

`docs/content-audit.json` lists the affected page paths. These missing files prevent an unqualified claim of complete image parity. The source also contained template/demo copy on some pages (for example the career detail and generic service detail); it is preserved for your review rather than silently rewritten.

## Deployment boundaries

The source includes an optional private Sites runtime using D1/R2 and ChatGPT sign-in. It shares the renderer and CMS service with the VPS version. Production VPS deployment uses the requested Next.js + React + Express + MongoDB stack and administrator/editor accounts. Their content databases are independent.

Set your actual domain, database, initial administrator, persistent upload directory and optional SMTP/ImageKit credentials before going live. No credentials from the supplied PHP files are carried into the new project.
