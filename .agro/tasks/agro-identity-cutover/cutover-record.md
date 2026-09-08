# Cutover record — agro-identity-cutover (#943)

Operator authorization: "Authorize me for the gh steps" (session answer, 2026-09-08). The
advisor performed the GitHub-side runbook steps; Cloudflare and the dispatch token
stay with the operator.

## Steps

| Step | Status | Evidence |
|---|---|---|
| 1 record IDs and endpoints | done | below |
| merge openharness-web #46 | done | merge commit 4f26a55 |
| 2 rename core → `mifunedev/agro` | done | `R_kgDORyBFdg mifunedev/agro` |
| 3 rename web → `mifunedev/agro-web` | done | `R_kgDOTHLFeQ mifunedev/agro-web` |
| 4 description, homepage, topics | done | both `homepageUrl` = `https://agro.mifune.dev`; topics added, existing kept |
| 5 Pages domain + merge #47 | SKIPPED, operator | switching the Pages domain before the Cloudflare catch-all exists breaks `oh.mifune.dev`; run 5 and 6 back-to-back |
| 6 Cloudflare rules | SKIPPED, operator | zone credentials not in the sandbox |
| 7a `gh secret set AGRO_WEB_DISPATCH_TOKEN` | SKIPPED, operator | token must be issued by the operator |
| 7b `gh variable set AGRO_WEB_REPO` | done | `AGRO_WEB_REPO mifunedev/agro-web` |
| 8 origin update | done | root → `git@github.com:mifunedev/agro.git`; web clone → `https://github.com/mifunedev/agro-web.git` |
| #47 retargeted to `main` | done | `#47 base=main draft=true MERGEABLE` |

## Recorded outputs

# before 2026-09-08T03:30:46Z
{"description":"🏗️ Run coding agents in a sandbox, not on your machine.","homepageUrl":"https://oh.mifune.dev","id":"R_kgDORyBFdg","name":"openharness","topics":["claude-code","codex","deepagents","docker","langchain","nvidia","openclaw","openshell","sandbox","gemini-cli","pi-mono","claude","openai","opencode"],"url":"https://github.com/mifunedev/openharness"}
{"description":"Open Harness documentation site","homepageUrl":"https://oh.mifune.dev","id":"R_kgDOTHLFeQ","name":"openharness-web","topics":[],"url":"https://github.com/mifunedev/openharness-web"}
oh.mifune.dev/install.sh (eval):1: command not found: curl
oh.mifune.dev/get-oh.sh (eval):1: command not found: curl
oh.mifune.dev/oh.js (eval):1: command not found: curl
oh.mifune.dev/get-agro.sh (eval):1: command not found: curl
oh.mifune.dev/agro.js (eval):1: command not found: curl
agro.mifune.dev/install.sh (eval):1: command not found: curl
agro.mifune.dev/get-oh.sh (eval):1: command not found: curl
agro.mifune.dev/oh.js (eval):1: command not found: curl
agro.mifune.dev/get-agro.sh (eval):1: command not found: curl
agro.mifune.dev/agro.js (eval):1: command not found: curl
# pages
(eval):1: command not found: gh
# merge methods
(eval):1: command not found: gh
# pr46
(eval):1: command not found: gh
# vars/secrets
(eval):1: command not found: head
(eval):1: command not found: awk
(eval):1: command not found: head
# endpoints before 2026-09-08T03:30:56Z
oh.mifune.dev/install.sh 302 https://raw.githubusercontent.com/mifunedev/openharness/refs/heads/main/.oh/scripts/install.sh
oh.mifune.dev/get-oh.sh 200 
oh.mifune.dev/oh.js 200 
oh.mifune.dev/get-agro.sh 404 
oh.mifune.dev/agro.js 404 
agro.mifune.dev/install.sh 421 
agro.mifune.dev/get-oh.sh 421 
agro.mifune.dev/oh.js 421 
agro.mifune.dev/get-agro.sh 421 
agro.mifune.dev/agro.js 421 
# pages
{"build_type":"workflow","cname":"oh.mifune.dev","https_enforced":false,"state":null}
# merge methods
{"allow_merge_commit":true,"allow_rebase_merge":true,"allow_squash_merge":true}
# pr46
OPEN MERGEABLE CLEAN 05e81c7
# vars
# secret names
NPM_TOKEN

# actions 2026-09-08T03:31:11Z
## merge #46
#46 MERGED 4f26a55
## rename core
R_kgDORyBFdg mifunedev/agro https://github.com/mifunedev/agro
## rename web
R_kgDOTHLFeQ mifunedev/agro-web https://github.com/mifunedev/agro-web
## old names resolve
mifunedev/agro
mifunedev/agro-web
## step 4 repo edit
{"description":"AGRO — Agent Governance Runtime Orchestrator. A portable home for autonomous coding agents.","homepageUrl":"https://agro.mifune.dev","topics":["claude-code","codex","deepagents","docker","langchain","nvidia","openclaw","openshell","sandbox","gemini-cli","pi-mono","claude","openai","opencode","agro","coding-agents","devcontainer"]}
{"description":"Documentation site for AGRO (agro.mifune.dev)","homepageUrl":"https://agro.mifune.dev","topics":["agro","docusaurus"]}
## step 7 variable
AGRO_WEB_REPO	mifunedev/agro-web	2026-09-08T03:31:41Z
## step 8 origin
/home/sandbox/harness -> git@github.com:mifunedev/agro.git
/home/sandbox/harness/projects/mifunedev/openharness-web -> https://github.com/mifunedev/agro-web.git
## retarget #47
https://github.com/mifunedev/agro-web/pull/47
#47 base=main draft=true MERGEABLE
## verify old URLs
823aabbd7324
4f26a5595ac6
## pages.yml on main after #46
in_progress  https://github.com/mifunedev/agro-web/actions/runs/34183795746
## ghcr agro package
{"name":"agro","visibility":"public"}

## Post-cutover verification (advisor, 2026-09-08)

| Check | Result |
|---|---|
| `git ls-remote https://github.com/mifunedev/openharness.git HEAD` | works (823aabbd) |
| `git ls-remote https://github.com/mifunedev/openharness-web.git HEAD` | works (4f26a559) |
| `gh repo view mifunedev/openharness --json nameWithOwner` | `mifunedev/agro` |
| `gh repo view mifunedev/openharness-web --json nameWithOwner` | `mifunedev/agro-web` |
| GHCR package `mifunedev/agro` | public |
| `pages.yml` on `main` after the #46 merge | completed success, run 34183795746 |
| `pages.yml` `workflow_dispatch` stand-in (`ref=main`) | completed success, run 34184320927 |
| `oh.mifune.dev/get-oh.sh` | 200, body starts `#!` |
| `oh.mifune.dev/oh.js` | 200 |
| `oh.mifune.dev/get-agro.sh` | 200, body starts `#!` (new, mirrored after #46) |
| `oh.mifune.dev/agro.js` | 200 uncached; a stale Cloudflare 404 (age 158 s) still served on the plain URL at check time |
| `oh.mifune.dev/install.sh` | 302 to raw `mifunedev/openharness` `main` `.oh/scripts/install.sh` (unchanged; retargeted in operator step 6) |
| `agro.mifune.dev/*` | 421 (no origin until the operator performs step 5) |
| Clean `node:22-slim`: `curl -fsSL https://oh.mifune.dev/get-oh.sh \| bash` | installed `oh 0.9.0` from the prebuilt `oh.js` |
| Clean `node:22-slim`: `curl -fsSL https://oh.mifune.dev/get-agro.sh \| bash` | installed `agro 0.9.0` from the GitHub release asset |
| `sandbox-boot-guard.yml` `LEGACY_IMAGE` | still `ghcr.io/mifunedev/openharness:0.9.0` on purpose; `sandbox-boot-guard-ci` probe exit 0 |

Not verified, because they wait on the operator: `agro.mifune.dev` serving the
site, the five `oh.mifune.dev` executable paths after the Cloudflare rules, the
`README` one-liner against `agro.mifune.dev/get-agro.sh`, the real release
dispatch (needs `AGRO_WEB_DISPATCH_TOKEN`), and the merge of web PR #47.
