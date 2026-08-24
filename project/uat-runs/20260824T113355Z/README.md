# UAT session record — 24 August 2026

**Environment:** https://24-7-d-igi-health.vercel.app (production)
**Build:** `ad779f1`
**Run started:** 2026-08-24 13:37 SAST
**Result:** 46 checks · **46 pass** · 0 fail

## What's in here

| File | What it is |
|---|---|
| `session.log` | Human-readable transcript of the run, in order |
| `session.jsonl` | Machine-readable record — one line per check and per HTTP exchange (method, path, status, latency, redirect target, response body) |
| `summary.json` | Final tally plus every check with its verdict and evidence |
| `console.out` | Raw stdout of the run |
| `layout-evidence.md` | Browser measurements at 1920×1080 |
| `run-uat.mjs` | The suite. Re-runnable: `node run-uat.mjs` |
| `recorder.mjs` | Session recorder — appends to `session.jsonl` as it goes, so a crashed run still leaves a usable record |
| `retest/` + `retest-auth.mjs` | Isolated re-run of B-01/B-02 (see caveat below) |

## Coverage

- **A** Public marketing — 6 pages, checked for undefined colour tokens and stray AI-triage copy
- **B** Authentication — wrong password, account enumeration, unauthenticated API, bogus reset token
- **C** Plan gate — unpaid patient redirected from every dashboard route; checkout and billing exempt; free-plan bypass stays closed
- **D** Checkout — plan config, billing-address validation, EFT branch-code validation, declined card, successful purchase, gate release
- **E** Receipts — receipt PDF, statement PDF, subscription state, payment history
- **F** Family invites — invite creation on a Family plan, link target, unauthenticated token lookup, by-email lookup, token never disclosed
- **G** Booking — slots for today, elapsed slots marked past in SAST rather than server UTC
- **H** Authorization — Ably token requires a session and is scoped; role boundaries; generic errors with a reference
- **I** Other roles — practitioner and hospital admin are not plan-gated

## Caveats — read before trusting the numbers

**B-01 / B-02 were re-run in isolation.** The main pass recorded them against a
login rate-limit budget its own earlier runs had already spent, so both returned
429. That is the limiter working correctly, not a product failure — but it made
the original entries meaningless. `retest-auth.mjs` re-ran them on a fresh
window (both 401, identical bodies) and merged the corrected results into
`summary.json`. The superseded attempts are still visible in `session.jsonl`.

**The suite spends login budget.** The limiter allows 5 logins per 15 minutes
per IP and is now global. Runs back to back will block themselves. `login()`
waits the window out once on a 429 rather than recording a false negative — the
recorded run includes one such wait.

**No video.** The browser tool returns screenshots to the session rather than
writing image files, so the durable record here is the transcript plus the
layout measurements, not a screen recording.

**Not covered — needs a human or two devices:**
- Registration end to end (requires reading an emailed OTP)
- The receipt email actually arriving (send is fire-and-forget; only the trigger is verified)
- Live call: video aspect ratio, draggable self-view, lobby ring suppression
- The family invite being accepted through the wizard UI

## Test data created

- `thandiwe.mokoena@example.com` — plan cancelled then repurchased (Family, R500). Several subscription transactions now on the account.
- `uat.family.probe@example.com` — a pending family invite.

Both are removable with `node scripts/purge-user-data.mjs <email>`.
