# 103 Website

Static bilingual portfolio website for **103**, the personal practice of Jure Niedorfer.

The site presents two connected fields of work:

- `103 Film` - selected film work in demanding terrain
- `103 Mountain` - tailored mountain experiences for private guests

The website is intentionally minimal, responsive, and built without a framework so it can be hosted easily as a static site.

## Used Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Static image assets
- Responsive layout with CSS Grid and flexible sizing
- Bilingual static pages:
  - English pages in the root folder
  - Slovenian pages in `/sl`

No package manager, build step, or backend is required.

## Contact Form

The contact forms post to `/api/contact`, which is handled by the Cloudflare Pages `_worker.js` file and sends the enquiry email through Resend.

Required Cloudflare Pages environment variables:

```text
RESEND_API_KEY=your Resend API key
CONTACT_FROM_EMAIL=103 <forms@103.si>
CONTACT_TO_EMAIL=hello@103.si
```

Notes:

- `CONTACT_FROM_EMAIL` must use a domain verified in Resend.
- `CONTACT_TO_EMAIL` is optional in code and defaults to `hello@103.si`, but setting it explicitly is recommended.
- The form includes a basic honeypot field and server-side validation.
- `_worker.js` is the Worker entry file.
- `.assetsignore` prevents `_worker.js` and project metadata from being uploaded as public static assets.

## Project Structure

```text
.
├── index.html
├── about.html
├── film.html
├── mountain.html
├── contact.html
├── sl/
│   ├── index.html
│   ├── about.html
│   ├── film.html
│   ├── mountain.html
│   └── contact.html
├── assets/
│   └── images and logo assets
├── styles.css
├── script.js
└── README.md
```

## Local Preview

Because this is a static site, it can be opened directly in a browser:

```text
index.html
```

For a cleaner local preview, run a small local server from the project folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deployment To Cloudflare Pages

### Option 1: Deploy From Git

1. Push this project to a GitHub or GitLab repository.
2. Open Cloudflare Dashboard.
3. Go to `Workers & Pages`.
4. Choose `Create application`.
5. Select `Pages`.
6. Connect the Git repository.
7. Use these build settings:

```text
Framework preset: None
Build command: leave empty
Build output directory: /
Root directory: /
```

8. Click `Save and Deploy`.

Cloudflare Pages will publish the static files directly.

### Option 2: Direct Upload

1. Open Cloudflare Dashboard.
2. Go to `Workers & Pages`.
3. Choose `Create application`.
4. Select `Pages`.
5. Choose `Upload assets`.
6. Upload the full project folder contents:
   - HTML files
   - `sl/`
   - `assets/`
   - `styles.css`
   - `script.js`

Cloudflare will create a public Pages URL after upload.

## Custom Domain

After deployment:

1. Open the Pages project in Cloudflare.
2. Go to `Custom domains`.
3. Add the desired domain.
4. Follow Cloudflare DNS instructions.

If the domain is already managed by Cloudflare, setup is usually automatic.

## Notes

- The main English homepage is `index.html`.
- The Slovenian homepage is `sl/index.html`.
- The language switch is static and links between matching English and Slovenian pages.
- Contact email placeholders should be replaced before publishing:
  - `hello@example.com`
