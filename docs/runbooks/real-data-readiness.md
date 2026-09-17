# Freelance Ops — Real Data Readiness

Issue: REL-001 / #11

## Release checkpoint metadata

Fill this section when validating the candidate build.

| Field | Value |
| --- | --- |
| Validation date | PENDING |
| Git commit SHA | PENDING |
| App version | `0.1.0` |
| Android app id | `com.jonathansalgadonieto.freelanceops` |
| Device model | PENDING |
| Android version | PENDING |
| Host OS | Windows 11 |
| Node version | PENDING |
| Java version | PENDING |
| Maestro version | PENDING |
| APK path | `android\app\build\outputs\apk\release\app-release.apk` |
| Tester | PENDING |

Allowed status values in the tables below: `PENDING`, `PASS`, `FAIL`, `N/A`.

`N/A` is not allowed for a mandatory SAFE FOR REAL DATA gate.

## A. Automated and build gates

| ID | Mandatory | Check | Status | Evidence / notes |
| --- | --- | --- | --- | --- |
| A1 | Yes | `npm ci` completes successfully from the candidate commit | PENDING | |
| A2 | Yes | TypeScript typecheck passes | PENDING | |
| A3 | Yes | ESLint passes | PENDING | |
| A4 | Yes | Unit/integration/UI Jest suite passes | PENDING | |
| A5 | Yes | `npx expo run:android --variant release --device` compiles successfully | PENDING | |
| A6 | Yes | Standalone release app installs on the physical Android device | PENDING | |
| A7 | Yes | App launches from Android launcher without Expo Go or Metro | PENDING | |
| A8 | Yes | Maestro `critical-timer-flow.yaml` passes end to end | PENDING | |

## B. Core Slice 1 journey

Use synthetic validation data. Do not enter real Maubank/Nissan information before the final gate is PASS.

| ID | Mandatory | Check | Status | Evidence / notes |
| --- | --- | --- | --- | --- |
| B1 | Yes | Create a client offline and see it after leaving/re-entering Projects | PENDING | |
| B2 | Yes | Create a project for that client offline | PENDING | |
| B3 | Yes | Today lists the trackable project | PENDING | |
| B4 | Yes | Start Work succeeds with Project as the only mandatory dimension | PENDING | |
| B5 | Yes | Pause works | PENDING | |
| B6 | Yes | Resume works | PENDING | |
| B7 | Yes | Stop works | PENDING | |
| B8 | Yes | Stopped session appears in Time history with the correct project | PENDING | |
| B9 | Yes | Manual time entry can be created and remains visible after app reopen | PENDING | |
| B10 | Yes | Basic expense can be created and remains visible after app reopen | PENDING | |
| B11 | Yes | Receipt/document can be attached and remains associated after app reopen | PENDING | |

## C. Timer resilience on physical device

For timer-duration checks, note the wall-clock start/end times in Evidence. A few seconds of UI interaction tolerance is acceptable; a reset, freeze, large jump, negative duration or duplicated active timer is FAIL.

| ID | Mandatory | Check | Status | Evidence / notes |
| --- | --- | --- | --- | --- |
| C1 | Yes | With timer running, lock screen for at least 60 seconds; unlock and elapsed time remains correct | PENDING | |
| C2 | Yes | With timer running, background app for at least 60 seconds; reopen and elapsed time remains correct | PENDING | |
| C3 | Yes | With timer running, remove/terminate app process; reopen and active timer is recovered correctly | PENDING | |
| C4 | Yes | With timer running, restart the Android device; reopen and active timer is recovered correctly | PENDING | |
| C5 | Yes | After each recovery there is still at most one active work interval/session | PENDING | |
| C6 | Yes | Pause state survives app close/reopen without creating elapsed paused time | PENDING | |

## D. Timezone integrity

Before this check, record the phone's original timezone so it can be restored afterwards.

| ID | Mandatory | Check | Status | Evidence / notes |
| --- | --- | --- | --- | --- |
| D1 | Yes | Start a timer in the original timezone and record elapsed time | PENDING | |
| D2 | Yes | Change device timezone while timer is running; elapsed duration does not reset, go negative or jump by timezone offset | PENDING | |
| D3 | Yes | Pause/resume/stop still work after timezone change | PENDING | |
| D4 | Yes | Time history remains coherent after the timezone change | PENDING | |
| D5 | Yes | Restore the original device timezone | PENDING | |

## E. Offline operation

Enable airplane mode or otherwise disable both Wi-Fi and mobile data before running these checks.

| ID | Mandatory | Check | Status | Evidence / notes |
| --- | --- | --- | --- | --- |
| E1 | Yes | App launches and Today loads with network disabled | PENDING | |
| E2 | Yes | Create/edit local client/project data with network disabled | PENDING | |
| E3 | Yes | Start/pause/resume/stop timer with network disabled | PENDING | |
| E4 | Yes | Create/edit manual time and open History with network disabled | PENDING | |
| E5 | Yes | Create a basic expense with network disabled | PENDING | |
| E6 | Yes | Attach a local receipt/document with network disabled | PENDING | |
| E7 | Yes | Data created offline remains present after app close/reopen | PENDING | |

## F. Attachment integrity

| ID | Mandatory | Check | Status | Evidence / notes |
| --- | --- | --- | --- | --- |
| F1 | Yes | Stored attachment metadata includes local file reference and survives reopen | PENDING | |
| F2 | Yes | Removing the app-controlled receipt file externally/test-wise is detected as an integrity warning rather than crashing the app | PENDING | |
| F3 | Yes | Missing-attachment condition is recoverable without deleting the expense record | PENDING | |

## G. Repository and privacy hygiene

| ID | Mandatory | Check | Status | Evidence / notes |
| --- | --- | --- | --- | --- |
| G1 | Yes | No real client/project/time/expense data is committed | PENDING | |
| G2 | Yes | No receipt/document from real work is committed | PENDING | |
| G3 | Yes | No `.sqlite`, `.db`, backup, export or secret file is committed | PENDING | |
| G4 | Yes | Generated `android/` build directory remains ignored and is not committed | PENDING | |

## Failure log

Add one row for each failure discovered during REL-001.

| Failure ID | Check ID | Observed behavior | Expected behavior | Fix issue/PR | Retest status |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — |

## Final decision

Overall status: **NOT SAFE FOR REAL DATA — PENDING VALIDATION**

The candidate may be changed to:

```text
SAFE FOR REAL DATA
```

only when every mandatory check above is `PASS` for the same recorded candidate commit/build, or when a later candidate commit has repeated every check affected by its changes.

Do not use real operational data while any mandatory gate is `PENDING` or `FAIL`.
