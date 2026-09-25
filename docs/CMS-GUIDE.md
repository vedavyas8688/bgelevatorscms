# Using the CMS

1. **Overview:** counts for content, media and new enquiries, with recent activity.
2. **All pages / Blog posts:** search by title or URL, filter type/status, open an editor or duplicate an existing layout.
3. **Page content:** choose the existing section on the left. Filter text, images or links, and search within the section. Toggle visibility or move a section up/down. Layout CSS stays in the source.
4. **Formatted content:** use the basic formatting toolbar or the HTML tab. The server strips executable markup when saved. Image alt text is a separate field beside other attributes.
5. **Media:** select a supplied image or upload JPG, PNG, WebP or PDF (maximum 10 MB). Copy a URL or edit media details. Changing library alt text does not overwrite every page's independent alt field.
6. **SEO & sharing:** edit title, description, canonical, robots, Open Graph, X/Twitter, and a JSON array of JSON-LD objects. Leave the canonical blank to derive it from the site domain and path.
7. **Blog card & page details:** edit the title/excerpt/date/image shown in blog lists. A copied article's body and SEO should also be updated before publishing.
8. **Save draft:** saves edits without changing published content. Preview shows the saved draft. Publish makes it public. A conflicting edit is rejected instead of silently overwriting another editor's work.
9. **Shared sections:** edit the header, footer or floating contact-button variation used by the listed pages. Several variations exist in the original site, so update the relevant variations when making a sitewide change. Publishing a shared section updates every page that uses it.
10. **Enquiries & applications:** review submissions, status and internal notes. Resume downloads require an authenticated staff session. Export enquiries as CSV. Resumes accept PDF or DOCX, maximum 5 MB.
11. **Team access:** administrators can create/disable accounts, change roles and set a replacement password. Editors can prepare drafts and work with enquiries but cannot publish or change team/site settings. Password changes invalidate existing sessions.
12. **Redirects:** add a 301 from an additional old `.html` path to a published local page. Original migrated page paths are protected. Redirect loops/chains are avoided by requiring a final published destination.

The homepage cannot be unpublished. Other unpublished pages return 404. No deletion of existing migrated pages/media is exposed; this protects the original content and links.
