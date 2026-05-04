# Privacy policy: ASU Prereq Helper

**Last updated:** May 3, 2026

This policy describes the Chrome extension **ASU Prereq Helper** (“the Extension”).

## What the Extension does

The Extension runs on Arizona State University (`asu.edu`) websites. It reads public class search pages you already have open, finds course codes (for example `CSE 230`), and requests **public course requirement text** from ASU’s My ASU platform API (`api.myasuplat-dpl.asu.edu`) so prerequisites and duplicate-credit rules can be shown next to search results.

## Data collection and storage

- The Extension **does not** collect personal information, analytics, or browsing history for the developer.
- The Extension **does not** sell or share data with third parties.
- The Extension may store **only** the following on your device using Chrome’s extension storage APIs:
  - The **last session (term) code** detected from a Class Search URL or link on the page, so requirement lookups can keep working when the address bar does not include a term code.
  - An **optional manual session code** if you choose to set one in the extension options.

These values stay on your device and are used only to choose the correct term when querying the public API.

## Permissions

- **`storage`:** Save the optional manual term and the last detected term as described above.
- **Host access to `*.asu.edu` and `api.myasuplat-dpl.asu.edu`:** Inject the prerequisite summary on ASU pages and fetch course requirement descriptions from ASU’s API.

## Third-party services

Course text is retrieved from **Arizona State University** systems only, as you would load in a normal browser session. The Extension does not send that content to any other servers.

## Contact

For privacy questions about this Extension, contact the developer using the contact information on the Chrome Web Store listing (if provided) or the project’s source repository.

## Changes

If this policy changes, the “Last updated” date at the top will be revised. For material changes, the Chrome Web Store listing may also be updated.
