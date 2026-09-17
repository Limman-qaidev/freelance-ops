# Freelance Ops — Android First Usable Build Runbook

Date: 2026-09-17
Issue: REL-001 / #11
Target: physical Android device
Host: Windows 11
App id: `com.jonathansalgadonieto.freelanceops`

## Purpose

Produce and install the first local Android release-mode build of Freelance Ops, run the release-blocking automated checks, and provide a repeatable procedure for the physical-device readiness tests.

This runbook is for the Slice 0 + Slice 1 release checkpoint. Expo Go is not sufficient for this gate: use the locally compiled standalone Android application.

## 1. Prerequisites

Required on the Windows host:

- Git.
- Node.js 22.x and npm.
- Android Studio with an Android SDK installed.
- Android SDK Platform Tools (`adb`) available on `PATH`.
- Java/JDK compatible with the installed Android Gradle toolchain; verify before building.
- A physical Android device with Developer options and USB debugging enabled.
- Maestro CLI installed natively on Windows for the automated critical flow.

Verify the toolchain in PowerShell:

```powershell
node --version
npm --version
java -version
adb version
maestro --version
```

If `adb` is not found, add the Android SDK `platform-tools` directory to the Windows user `PATH`. A common Android Studio location is:

```text
%LOCALAPPDATA%\Android\Sdk\platform-tools
```

## 2. Prepare the exact release candidate

REL-001 is validated before its PR is merged, so build and test the candidate branch itself:

```powershell
git fetch origin
git switch codex/rel-001-android-readiness
git pull --ff-only origin codex/rel-001-android-readiness
npm ci
```

Confirm the exact candidate commit being validated and copy it into `real-data-readiness.md`:

```powershell
git rev-parse HEAD
```

After #23 is eventually merged, future reproduction of this checkpoint can instead use the recorded merge commit on `main`.

Do not use a working tree containing real client data, receipts, exported reports, databases, backups, or secrets.

## 3. Run the non-device release gates

Run the complete local quality baseline:

```powershell
npm run verify:release
```

This executes:

```text
TypeScript typecheck
-> ESLint
-> Jest unit/integration/UI tests
```

Every step must pass before continuing.

## 4. Connect the physical Android device

Connect the phone by USB, unlock it, enable USB debugging, and accept the debugging authorization prompt if Android displays one.

Verify that exactly the intended device is available:

```powershell
adb devices
```

Expected shape:

```text
List of devices attached
<serial>    device
```

If the device is shown as `unauthorized`, unlock the phone and approve the USB debugging prompt.

## 5. Compile and install a local release-mode build

The repository uses Expo Continuous Native Generation. The generated `android/` directory is intentionally ignored by Git and is not source of truth.

Compile and install the release variant on the connected phone:

```powershell
npm run android:release -- --device
```

Equivalent Expo command:

```powershell
npx expo run:android --variant release --device
```

On the first run Expo generates the native Android project and Gradle compiles the release variant. Select the connected physical device if Expo asks which target to use.

The expected APK output after a successful build is:

```text
android\app\build\outputs\apk\release\app-release.apk
```

If installation must be repeated without rebuilding:

```powershell
adb install -r .\android\app\build\outputs\apk\release\app-release.apk
```

A release build used for this local readiness checkpoint does not require Metro to remain running.

## 6. Sanity-check the installed standalone app

On the phone:

1. Find **Freelance Ops** in the Android launcher.
2. Launch it directly from the launcher, not from Expo Go.
3. Confirm the Today screen opens without a development menu or Metro dependency.
4. Close it and launch it again from the Android launcher.

Record PASS/FAIL in `docs/runbooks/real-data-readiness.md`.

## 7. Run the automated critical Maestro flow

The release-blocking flow lives at:

```text
e2e/maestro/critical-timer-flow.yaml
```

It clears only this test application's local state at the beginning and creates synthetic `REL001` data. It does not use real client information.

With the release app installed and one intended Android target visible to ADB, run:

```powershell
npm run e2e:android
```

Equivalent command:

```powershell
maestro test e2e/maestro/critical-timer-flow.yaml
```

The automated flow verifies:

```text
Create synthetic client
-> Create synthetic project
-> Today
-> Start Work
-> background/reopen
-> recover active timer
-> Pause
-> Resume
-> Stop
-> verify project appears in Time history
```

A failure is release-blocking. Capture the failing Maestro step and do not mark the E2E gate PASS until the flow completes successfully.

## 8. Physical-device resilience checks

Complete the manual device checks in `real-data-readiness.md`. These checks intentionally cover behavior that should not be accepted solely on the basis of Jest or a short UI automation run:

- screen lock while a timer is running;
- ordinary background/reopen;
- process/app termination and reopen;
- full device restart with a timer active;
- timezone change with a timer active;
- network disabled / airplane-mode normal operation;
- persistence of manual time/history;
- persistence of a basic expense and receipt/document attachment.

Use synthetic validation data until the final SAFE FOR REAL DATA decision is PASS.

## 9. Recording the result without invalidating the tested build

After the physical checks, update `real-data-readiness.md` on the same PR with the recorded candidate SHA and PASS/FAIL evidence.

That documentation-only commit changes the PR head but does not change the application binary that was tested. If any application, configuration, dependency, native-build, database, or E2E-flow file changes after the candidate build, create a new candidate build and repeat every affected mandatory check before merge.

## 10. Failure policy

For any mandatory FAIL:

1. Record the exact failed step and observed behavior in `real-data-readiness.md`.
2. Keep the overall gate as `NOT SAFE FOR REAL DATA`.
3. Fix the defect through the normal issue/branch/PR process.
4. Rebuild the release app when native or application changes require it.
5. Repeat the failed check and any checks whose assumptions were affected by the fix.

Never convert a failure to PASS based only on code inspection.

## 11. Release decision

The app may be declared:

```text
SAFE FOR REAL DATA
```

only when every mandatory row in `real-data-readiness.md` is PASS for the recorded candidate commit and physical Android device.

Play Store publication, EAS/cloud builds and signed store release artifacts are outside REL-001.
