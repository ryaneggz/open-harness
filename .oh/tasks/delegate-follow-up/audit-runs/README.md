# Audit run evidence — delegate-follow-up

Six terminal evidence documents, one per audit run against this branch. Each is the
JSON `audit-evidence.sh complete` wrote when its run finished, copied here byte for
byte. Each file is named for the `runId` it contains; every file was checked and its
`runId` equals its filename and its `state` is `complete`.

`.oh/skills/audit/scripts/audit-run.sh` creates its evidence root with `mktemp -d` and
removes it on the EXIT trap (`cleanup(){ rm -rf "$tmp_root"; }`). A normal `/audit` run
therefore persists no artifact of its own. These six exist only because
`.oh/skills/audit/scripts/route-driver.sh` was invoked directly with a durable
`AUDIT_EVIDENCE_PATH`, which the driver honours.

| Run id | Target | Verdict | finishedAt |
|---|---|---|---|
| `audit-20260907T194250Z-3600847` | implementation | `AUDIT-PASS` | 2026-09-07T19:42:51Z |
| `audit-20260907T195030Z-3628747` | implementation | `AUDIT-FAIL` | 2026-09-07T19:50:31Z |
| `audit-20260907T200902Z-3697153` | implementation | `AUDIT-PASS` | 2026-09-07T20:09:03Z |
| `audit-20260907T200923Z-3697739` | pr | `PR-AUDIT-PROMOTABLE` | 2026-09-07T20:09:24Z |
| `audit-20260907T203507Z-3748740` | implementation | `AUDIT-PASS` | 2026-09-07T20:35:08Z |
| `audit-20260907T203515Z-3748998` | pr | `PR-AUDIT-PROMOTABLE` | 2026-09-07T20:35:16Z |

The JSON records the run's identity and verdict. It does **not** record the commit the
run classified. The head each run classified is recorded in `../evidence.md` under
*Audit history*. A reader correlating a run id to a head is relying on that document,
not on the artifact.
