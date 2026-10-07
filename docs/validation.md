# GradeDock validation — 7 October 2026

This records executed checks, not Google Play approval. Version 1.0.0 / version code 1; package `com.zaleshsultan.gradedock`.

## Completed

- TypeScript strict checking and the production Vite build passed.
- **26 unit tests passed** locally and in final CI: 20 numerical/input/backup cases and 6 storage/error/export cases. They cover blank versus zero, invalid weights, secured/impossible/complete targets, date validation, duplicate IDs, malformed/untrusted backups, the maximum supported Unicode backup, sequential asynchronous saves, failed-save recovery and native export paths.
- **6 Playwright UI scenarios passed in final CI**. The original five also passed locally in Chrome: actual course/assessment editing, persistence, plan navigation, validation, backup import confirmation, damaged-save preservation, RU/EN and 320/390/768-pixel layouts without remote requests.
- A sixth targeted UI scenario passed after fixing document navigation: bundled privacy policy and component notices open in a closable dialog, keep the main page URL and preserve the forecast. The domain/storage code did not change after its successful unit run.
- Final source CI run: [successful checks](https://github.com/ZaleshSultan/gradedock/actions/runs/37661826859), source commit `2af1f2e212e064270dcbbbc94ca52a86cd0e9183`. The initial run [also passed](https://github.com/ZaleshSultan/gradedock/actions/runs/37658448031). Documentation-only pushes skip those expensive checks.
- Android debug APK and release AAB were built with JDK 21, compile/target SDK **36**, minimum SDK **24**. Android lint reported **0 errors, 7 warnings** about template cleanup/dependency updates; no critical rule was disabled.
- The APK installed and cold-launched in an isolated Android 16 / API 36.1 emulator. Preferences survived application restart. The real WebView showed the expected **82.5%** forecast (47 earned course points, 80% target, 40% pending).
- Native JSON export produced a valid version-1 file in app cache and opened the Android system share chooser. Returning to the app preserved the forecast; captured page-error list was empty. See `native-qa.json` for that synthetic-data check.
- After the final incremental build, native policy and license dialogs loaded their bundled documents, closed back to the main app and retained **82.5%**. No page errors were captured; see `native-document-qa.json`. The emulator itself was kept running throughout.
- Eight store screenshots were captured from the running Android application with explicitly marked demo courses. They are not rendered mockups. PNG dimensions and asset requirements were checked.
- The final APK manifest has **no Internet permission** and disables automatic backup; explicit extraction rules exclude cloud and device transfer. Both APK and AAB contain **zero native `.so` libraries**, and all 10 current production web assets match their packaged bytes. APK debug signature and AAB unsigned status were verified. Final artifact metadata and SHA-256 hashes are in `artifacts.json`.

## Reproduction on a 16 GB PC

Use incremental builds. After grouping application changes, run `pnpm test`, `pnpm build`, appropriate UI scenarios, `pnpm exec cap sync android`, then `./gradlew assembleDebug bundleRelease :app:lintDebug` inside `android/`. The default Gradle heap is 1536 MB, workers are limited to 2 and parallel projects are disabled. Do not sync Capacitor while Gradle is building. A signing-only release needs `bundleRelease`, not another web build or a clean build.

CPU tools such as TypeScript, Vitest, Vite and Gradle do not support general NVIDIA offloading. Use hardware graphics where the tool actually supports it. For a future emulator session, prefer `-gpu host -accel on -memory 2048 -cores 2` after checking `emulator -accel-check`. Reuse an existing emulator; do not start a second instance just for screenshots. This validation reused one emulator with working WHPX virtualization; it had been started with software graphics before the owner's GPU preference arrived and was not restarted merely to change that flag. No NVIDIA rendering result is claimed for that session.

Once testing is finished, stop the owned emulator and run `./gradlew --stop` to release idle memory. Avoid running Android builds, browser tests and extra emulators simultaneously.

## Remaining owner/Play checks

- Test the debug APK on a real phone, including its keyboard/file picker, small screen and current Android System WebView. Android 7+ with WebView 107+ is the declared baseline; old-device coverage is not yet demonstrated by a physical-device matrix.
- The debug APK is signed with an Android debug key. It is for testing, not Play publication. The AAB is deliberately **unsigned** until the owner creates and secures an upload keystore.
- Review developer/contact and legal text, host the privacy policy at a public URL, create/verify the Play account and payments profile, complete content/Data safety declarations, sign the AAB, and use Play's pre-launch report.
- For affected new personal accounts, recruit 12 genuine closed testers for 14 continuous opted-in days and apply for production access. A passing build does not replace that requirement.
- Google Play installation, payment/refund behavior, production approval and actual revenue have not been tested or obtained.

See `google-play-checklist.md` and `monetization-plan.md` for current primary sources and the exact owner steps.
