# Publishing to the Chrome Web Store

Notes for maintainers only. Regular users can ignore this file.

## Package

From the repo root:

```bash
./scripts/package-for-webstore.sh
```

Upload `asu-prereq-helper.zip` in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Bump `version` in `manifest.json` before each new upload.

## Privacy policy URL

The listing needs a public HTTPS URL to your policy. This repo includes `privacy.html`. With GitHub Pages (branch `main`, root folder), the URL is usually:

`https://<your-username>.github.io/<repo-name>/privacy.html`

Open that link in a private window before you submit. A 404 is a common rejection reason.

## Store questionnaire (short answers)

- **Single purpose:** Display prerequisite and duplicate-credit text next to results on ASU Class Search.
- **Storage:** Save the optional manual term code and the last detected term code locally.
- **Host permissions:** Show the prereq summary on ASU class search pages and call ASU’s public course API.
- **Data collection:** None. **Remote code:** No.

Match the longer wording in `PRIVACY.md` if Google asks for detail.

## Screenshots

Include at least one image of Class Search with the prereq card visible (store has size requirements in their docs).
