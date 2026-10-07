# Google Play assets

- `icon-512.png`: original 512 × 512 app icon, PNG with alpha, under 1 MB.
- `feature-ru-1024x500.png` / `feature-en-1024x500.png`: original 1024 × 500 feature graphics, RGB PNG.
- `screenshot-{ru,en}-{1,2,3,4}-*-1080x1920.png`: real portrait Android screenshots: forecast, assessments, upcoming work, and local backup/settings. Captured from the debug APK in one isolated Android emulator, without framing, invented ratings or promotion claims. Demo names and sample grades are visible; dates are examples.
- SVG source files preserve editable geometric artwork. No stock imagery or paid image service is required.
- `preview-ru.png` is an additional browser preview; use the native `screenshot-*` files for the Play listing.

Choose the four screenshots matching each listing language. The first view is intentionally scrolled to the forecast so its whole calculation is readable. Regenerate only assets affected by actual UI changes; a documentation or signing-only change does not need new screenshots.

Listing copy and keywords are in `../docs/store-listing.md`; the Play upload checklist is in `../docs/google-play-checklist.md`.
