# ASU Prereq Helper

A Chrome extension that shows prerequisites and credit equivalencies for ASU classes right on the Class Search page. No more clicking into each course just to see what you need.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://www.google.com/chrome/)

---

![ASU Prereq Helper on Class Search](images/i1.png)

![Prereq card closeup](images/i2.png)

---

## What it shows

Search for any class on [ASU Class Search](https://catalog.apps.asu.edu/) and each result gets a small card with:

- **Prereq:** what you need to take before enrolling
- **Credit for:** which other classes this one counts as (useful for knowing if credits overlap)

All info comes straight from ASU's own API.

---

## Usage

1. Open [ASU Class Search](https://catalog.apps.asu.edu/)
2. Search for any class
3. Prereq info appears automatically under each result

**Cards not showing?** The extension might not know which term you are looking at:

1. Right-click the extension icon and open **Options**
2. Find the four-digit number after `term=` in the URL bar on Class Search
3. Enter it and save
4. Refresh the page

---

## Options

Right-click the extension icon and open **Options**

- **Session code:** enter the four-digit term number from the URL bar if auto-detect is not working
- Leave it blank and the extension will try to pick it up on its own

---

## Privacy

- No data collected, no tracking, no ads
- All course info is pulled directly from ASU
- Only your term code is saved locally so lookups keep working between visits

Full policy: [privacy.html](https://robcaran.github.io/asu-prereq-extension/privacy.html)

---

## Contributing

Open an issue or pull request on [GitHub](https://github.com/robcaran/asu-prereq-extension/issues).

---

## License

MIT -- see [LICENSE](LICENSE).

---

Made for ASU students. If it helps, give it a star.
