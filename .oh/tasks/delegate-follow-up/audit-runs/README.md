# Audit run evidence — delegate-follow-up

Nine terminal evidence documents, one per audit run against this branch. Each is the
JSON `audit-evidence.sh complete` wrote when its run finished, copied here byte for
byte. Each file is named for the `runId` it contains; every file was checked and its
`runId` equals its filename and its `state` is `complete`.

| Run id | Target | Verdict | finishedAt | Head classified |
|---|---|---|---|---|
| `audit-20260907T194250Z-3600847` | implementation | `AUDIT-PASS` | 2026-09-07T19:42:51Z | `8ba02851` |
| `audit-20260907T195030Z-3628747` | implementation | `AUDIT-FAIL` | 2026-09-07T19:50:31Z | `263b9d52` |
| `audit-20260907T200902Z-3697153` | implementation | `AUDIT-PASS` | 2026-09-07T20:09:03Z | `b61dad88` |
| `audit-20260907T200923Z-3697739` | pr | `PR-AUDIT-PROMOTABLE` | 2026-09-07T20:09:24Z | `b61dad88` |
| `audit-20260907T203507Z-3748740` | implementation | `AUDIT-PASS` | 2026-09-07T20:35:08Z | `3dc561be` |
| `audit-20260907T203515Z-3748998` | pr | `PR-AUDIT-PROMOTABLE` | 2026-09-07T20:35:16Z | `3dc561be` |
| `audit-20260907T211548Z-3789393` | implementation | `AUDIT-FAIL` | 2026-09-07T21:15:48Z | `79289327` |
| `audit-20260907T211751Z-3792031` | implementation | `AUDIT-PASS` | 2026-09-07T21:17:51Z | `79289327` |
| `audit-20260907T211759Z-3792322` | pr | `PR-AUDIT-PROMOTABLE` | 2026-09-07T21:18:00Z | `79289327` |

The *Head classified* column is taken from `../evidence.md`, not from these files.

## Why these exist at all, and what that costs

`.oh/skills/audit/scripts/audit-run.sh` creates its evidence root with `mktemp -d` and
removes it on the EXIT trap (`cleanup(){ rm -rf "$tmp_root"; }`). A normal `/audit` run
therefore persists no artifact of its own. These nine survive only because
`route-driver.sh` was invoked directly.

The driver does not itself read `AUDIT_EVIDENCE_PATH`: `route-driver.sh:18` calls
`audit-evidence.sh complete "$1"`, and `audit-evidence.sh:7` is what requires the path.
The consequence matters more than the mechanism. Invoking the driver directly means
`AUDIT_RUN_ID`, `AUDIT_ROOT`, `AUDIT_TARGET` and `AUDIT_TARGET_ARGS_JSON` were all
supplied by the caller rather than minted by `audit-run.sh`. So the run id is
caller-chosen, the JSON is unsigned and sits at a caller-chosen path, and
`audit-run.sh`'s own target-correlation check and its
`audit -- run-id=… state=… exit=…` stderr line never ran. No exit status was captured
for any of these runs.

## Limits of these artifacts

These are limits of the artifacts, not doubts about the runs.

- **The byte-for-byte copy claim is no longer independently checkable.** The scratch
  sources these were copied from are gone. The substitute check: regenerate each file
  with the exact `jq -n` filter from `audit-evidence.sh:23-26`, using the values inside
  the file. All nine come out byte-identical, including key order, 2-space indent and
  trailing newline.
- **Every run's `finishedAt` is its run-id timestamp plus zero or one second.** Seven
  of the nine are +1s; `audit-20260907T211548Z-3789393` and
  `audit-20260907T211751Z-3792031` are +0s. An elapsed time that short means the
  artifacts alone do not evidence that all five gates executed. What does: the quoted
  gate output in `../evidence.md` and the reviewer's own reproductions.
- **The JSON records the run's identity and verdict, not the commit it classified.** A
  reader correlating a run id to a head is relying on `../evidence.md`, not on the
  artifact.
