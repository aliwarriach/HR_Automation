# Backend Audit Report

_Last full audit: 2026-08-03. Scope: `HR_Module_Backend/backend/app/` (FastAPI). `venv/` excluded._
_2026-08-03: All `Validation`-category issues (#10, #11, #14, #16) fixed per user request (scope explicitly limited to Validation only — Security/Performance/Logical Bug/API Contract issues below are intentionally untouched)._

## Summary

- Total Issues: 18
- Critical: 4
- Medium: 9
- Minor: 5
- Fixed (Validation only): 4 (#10 was already correct as-shipped; #11, #14, #16 patched)

---

## Issues

### 1. Public self-registration allows arbitrary role assignment

**Category:** Security (Auth / RBAC)
**Severity:** Critical

**Problem:**
`POST /auth/register` (`app/auth/router.py:16`) requires no authentication and accepts `payload.role` directly from the client. `UserRegister.role` (`app/schemas/user.py:11`) is typed as the full `UserRole` enum (`super_admin`, `hr`, `manager`, `employee`) with no restriction. Any unauthenticated caller can `POST /auth/register` with `"role": "super_admin"` and receive a fully privileged account.

**Impact:**
Complete authentication/authorization bypass — full system takeover by anyone who can reach the API, no credentials or prior access needed.

**Fix Options:**
1. Hardcode `role=UserRole.employee` server-side in the register handler, ignoring/rejecting any client-supplied role.
2. Remove `role` from `UserRegister` entirely; expose a separate super_admin-only endpoint (`require_permission`-gated) for creating privileged accounts.
3. Keep the field but validate server-side that self-registration can only ever produce `employee`, and require an existing super_admin to promote via `PUT /employees/{id}`.

**Recommended Fix:**
Option 1 combined with Option 2's spirit: strip `role` from `UserRegister`, always create new self-registered accounts as `employee`. Privileged roles should only ever be assignable through the already-permission-gated `/employees` endpoints (see Issue 2, which must be fixed in tandem).

---

### 2. `employees:update`/`employees:create` permission allows privilege escalation to super_admin

**Category:** Security (RBAC)
**Severity:** Critical

**Problem:**
`PUT /employees/{id}` (`app/routers/employees.py:112`) mass-assigns any field present in `EmployeeUpdate` (`role`, `role_id`, `employment_type`, `designation`) via `setattr`, gated only by the generic `require_permission("employees", "update")`. The default `hr` role (seeded in `app/main.py`) is granted `employees: ["create","update","delete", ...]`. There is no separate permission (e.g. `employees:assign_role`) distinguishing "edit basic profile fields" from "grant super_admin". The `PERMISSION_TAXONOMY` (`app/core/permission_taxonomy.py`) has no such action. The same applies to `POST /employees/` (`create_employee`), which accepts `payload.role` with no restriction beyond `employees:create`.

**Impact:**
Any HR user (a non-super_admin role that is intentionally scoped to recruiting/employee-admin work) can grant themselves or anyone else `super_admin`, fully escalating privileges — defeats the entire RBAC model documented in `app/core/permissions.py`.

**Fix Options:**
1. Add a dedicated `employees: ["assign_role"]` (or similar) taxonomy action, require it specifically whenever `role`/`role_id` is present in the update/create payload, and only grant it to `super_admin` by default.
2. Hard-block setting `role=super_admin` (or `role_id` pointing at the `super_admin` Role row) from this endpoint entirely; require a separate super_admin-only "Promote to Admin" flow.
3. Compare `updates["role"]` against `current_user.role` and require `current_user.role == UserRole.super_admin` before allowing any role change other than to a strictly lower privilege level.

**Recommended Fix:**
Option 1 — it fits the existing granular-permission pattern already used for `attendance` (`check_in_onsite` vs `check_in_wfh`) and keeps normal profile edits (designation, employment type) usable by HR without also handing them the keys to the whole system.

---

### 3. Hardcoded default secrets committed to source

**Category:** Security (Sensitive Data Exposure)
**Severity:** Critical

**Problem:**
`app/config.py` ships real-looking default values for `jwt_secret` ("dev-secret-change-me") and, more seriously, `password_encryption_key` — a literal Fernet key (`"-IjI-2sTSZ-BAWQHCvz-WH2jpd9gAy_D-GDI8yX6te8="`) checked directly into the repository. There is no startup check that these were overridden via `.env`/environment in a non-dev context.

**Impact:**
`password_encryption_key` decrypts every employee's `recoverable_password` (see Issue 4) — anyone with read access to this repository (now or from git history, even after rotation) can decrypt every employee's real password if the key is never overridden. `jwt_secret` similarly lets anyone forge valid JWTs for any user id/role if left at its default, which is another path to full super_admin takeover.

**Fix Options:**
1. Remove the literal defaults; make `jwt_secret` and `password_encryption_key` required (no default) so the app fails to start without them explicitly set in the environment.
2. Add a startup assertion in `main.py` that raises if either value still equals its known dev default, so it's impossible to accidentally run a real deployment unconfigured.
3. Rotate the committed key immediately regardless of the fix chosen (it's already exposed in git history) and document key-rotation impact (existing `recoverable_password` values become undecryptable).

**Recommended Fix:**
Options 1 + 2 together, plus immediate rotation per Option 3 — defaults are fine for a throwaway local prototype but must be structurally impossible to carry into anything shared or deployed.

---

### 4. Reversible ("recoverable") employee password storage

**Category:** Security (Sensitive Data Exposure)
**Severity:** Critical

**Problem:**
`app/core/security.py` / `app/models/user.py` store every employee's plaintext-equivalent password, Fernet-encrypted (`recoverable_password`), purely so it can be redisplayed later in `_serialize_employee` (`app/routers/employees.py`). This is a symmetric, reversible scheme — anyone holding `password_encryption_key` (see Issue 3) can recover every employee's real password in plaintext, not just an HR/super_admin's own scoped access.

**Impact:**
A single key leak (source leak, backup leak, memory dump, or the default key from Issue 3) compromises every employee's real login password in one shot, and since employees frequently reuse passwords elsewhere, this extends well beyond this application.

**Fix Options:**
1. Drop reversible storage entirely; on creation, only ever email the one-time generated password and never persist it anywhere reversible — force a password reset flow if it's lost.
2. Keep the recoverability feature but scope it to a short-lived, one-time-viewable token stored separately (e.g. deleted after first successful view) instead of a permanently decryptable column.
3. At minimum, restrict decryption capability (i.e. who can call `decrypt_password`) further and add expiry — e.g. only decryptable within 24h of creation, after which the column is nulled out.

**Recommended Fix:**
Option 1. "View password from the detail page" is a convenience feature that directly conflicts with basic password-hygiene principles; a "reset & resend" action achieves the same operational goal (recovering employee access) without a standing decryption capability over every credential in the system.

---

### 5. Wide-open CORS policy

**Category:** Security
**Severity:** Medium

**Problem:**
`app/main.py` sets `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]` unconditionally (not gated by environment), with only a code comment noting "prototype only — tighten before production."

**Impact:**
Any origin can call the API from a browser context. Since auth here is bearer-token (not cookie-based), CSRF risk is lower, but it still allows any malicious site to make arbitrary authenticated requests if it can obtain/steal a token, and provides no defense-in-depth.

**Fix Options:**
1. Read allowed origins from `settings` (env-driven list), defaulting to a same-org set of origins, wildcard only when an explicit `env=dev` flag is set.
2. Keep wildcard methods/headers but restrict `allow_origins` to a configured allow-list.
3. Add a startup warning/log (not just a code comment) when CORS is wildcard-open, so it's visible in production logs if misconfigured.

**Recommended Fix:**
Option 1 — move the CORS origin list into `Settings` (config.py) so each deployment environment controls it explicitly instead of relying on a comment.

---

### 6. Audit logging is a no-op

**Category:** Security / Logical Bug
**Severity:** Medium

**Problem:**
`app/core/audit.py`'s `record_event()` is an empty placeholder (`pass`) and is never called anywhere in the codebase (confirmed via repo-wide search). There is no audit trail for sensitive actions: password-view, role changes, employee deletion, login attempts, role/permission edits.

**Impact:**
No forensic trail exists for privilege changes or data access — especially damaging combined with Issues 1/2/4 above, since there'd be no record of who escalated privileges or viewed a password.

**Fix Options:**
1. Wire `record_event()` to structured logging (`logging` module) as a minimal first step, called from the sensitive call sites (login, role changes, password decrypt, employee delete).
2. Persist audit events to a dedicated `AuditLog` DB table (actor, action, target, timestamp, metadata) for queryability.
3. Integrate with an external audit/SIEM sink if one exists in the broader system.

**Recommended Fix:**
Option 2 for the sensitive actions identified above (role/permission changes, password view, employee/role deletion, login) — a queryable DB table is the minimum needed to actually investigate an incident later; Option 1 alone just recreates today's silence in a different form.

---

### 7. N+1 query loading attendance breaks per day in monthly detail view

**Category:** Performance
**Severity:** Medium

**Problem:**
`get_employee_detail()` (`app/services/attendance_admin_service.py:124-141`) iterates `record.breaks` for every `Attendance` row in the requested month. `Attendance.breaks` (`app/models/attendance.py:43`) is a default lazy (`select`) relationship, so this issues one extra `SELECT` per attendance row (up to ~31 extra queries per request for a full month).

**Impact:**
`GET /attendance/{employee_id}` becomes measurably slower as usage grows (e.g. HR viewing many employees' monthly details in sequence), and this pattern will compound if daily granularity or longer ranges are ever requested.

**Fix Options:**
1. Add `.options(joinedload(Attendance.breaks))` to the query in `get_employee_detail`.
2. Use `selectinload(Attendance.breaks)` (avoids the row-multiplication of a join for a one-to-many).
3. Bulk-fetch all `Break` rows for the involved `attendance_id`s in one query and group them in Python, mirroring the pattern already used in `get_attendance_list`'s `attendance_by_employee` dict.

**Recommended Fix:**
Option 2 (`selectinload`) — cleanest one-line fix, avoids the join-fanout problem of `joinedload` for a one-to-many relationship, and requires no restructuring of the existing loop.

---

### 8. N+1 query resolving announcement author name

**Category:** Performance
**Severity:** Medium

**Problem:**
`_created_by_name()` (`app/services/announcement_service.py:173`) runs a separate `db.query(User)` per announcement. It's called once per row inside `list_announcements_for_employee` → `serialize_for_employee_list` for every visible announcement in the employee feed.

**Impact:**
`GET /employee/announcements/` issues one extra query per announcement returned; scales linearly and unnecessarily with announcement volume.

**Fix Options:**
1. Batch-fetch all distinct `created_by` user ids in one query up front (`db.query(User).filter(User.id.in_(ids))`) and pass a `{id: name}` dict into the serializer.
2. Add a SQLAlchemy relationship (`Announcement.creator`) with `joinedload`/`selectinload` at the initial query.
3. Cache creator names in-process (announcements' authorship rarely changes) with a short TTL.

**Recommended Fix:**
Option 1 — smallest change, no schema/relationship addition needed, and fits the function-based service style already used elsewhere in this file.

---

### 9. Synchronous email-send loop blocks the announcement-creation request

**Category:** Performance
**Severity:** Medium

**Problem:**
`create_announcement()` → `_notify_recipients()` (`app/services/announcement_service.py:70-92`) sends one Gmail API call per recipient synchronously, inline in the `POST /announcements/` request path, before the response is returned. For `target_roles=["all"]` this is one blocking network call per employee in the company.

**Impact:**
API response time for creating an announcement scales linearly with company size/target audience; a large "all-hands" announcement could make the endpoint take tens of seconds or time out, and one slow/failing Gmail call delays the whole batch (mitigated somewhat by per-recipient try/except, but still sequential).

**Fix Options:**
1. Move `_notify_recipients` to a FastAPI `BackgroundTasks` callback so the HTTP response returns immediately after the DB commit.
2. Hand it off to the existing APScheduler background job pattern (`app/core/scheduler.py`) instead of sending inline — treat "publish_at <= now at creation" the same as the periodic sweep case.
3. Parallelize the per-recipient sends (e.g. thread pool / async gather) if inline sending must be kept.

**Recommended Fix:**
Option 2 — the codebase already has `send_due_notifications` polling for exactly this case; removing the inline branch in `create_announcement` and letting the next scheduler tick (every `announcement_notification_poll_interval_minutes`) pick it up unifies both paths through one, already-tested, non-blocking code path.

---

### 10. `create_announcement` doesn't validate `expires_at` vs `publish_at`

**Category:** Validation / Logical Bug
**Severity:** Medium
**Status:** RESOLVED (already fixed as-shipped, verified 2026-08-03) — `AnnouncementCreate` in `app/schemas/announcement.py` already has a `model_validator` (`check_expiry_after_publish`) enforcing `expires_at > publish_at` at the schema boundary, exactly matching this issue's recommended fix. No code change was needed; the original audit read of this file was inaccurate.

**Problem:**
`update_announcement()` (`app/services/announcement_service.py:205`) validates `expires_at > publish_at` and rolls back otherwise, but `create_announcement()` (line 95) performs no such check at creation time.

**Impact:**
An announcement can be created with `expires_at` before (or equal to) `publish_at`. Since `_status()` derives "expired" whenever `now > expires_at`, such an announcement is born already "expired" — yet if `publish_at` was immediate, `_notify_recipients` still fires and emails go out for an announcement that's simultaneously reported as expired to every viewer. Inconsistent state reachable only through the create path, not update.

**Fix Options:**
1. Extract the validation from `update_announcement` into a shared helper and call it from both `create_announcement` and `update_announcement`.
2. Add the same check at the Pydantic schema level (`AnnouncementCreate` model validator) so it's rejected with a 422 before reaching the service layer at all.
3. Skip sending the notification email if the computed status would be "expired" immediately after creation.

**Recommended Fix:**
Option 2 — validating at the schema boundary gives a clean 422 with FastAPI's standard error shape and keeps both create/update consistent for free, since both schemas can share the same model validator.

---

### 11. Shortlist `status` field accepts arbitrary free-text

**Category:** Validation
**Severity:** Medium
**Status:** RESOLVED (2026-08-03) — Added `ShortlistStatus` str enum (`shortlisted`/`interview`/`rejected`/`hired`, matching the frontend's `STATUS_OPTIONS`) in `app/models/shortlist.py`, applied it to the `Shortlist.status` column and `ShortlistStatusUpdate.status`, and updated `interview_service.py`'s literal `"interview"` assignment to use the enum member.

**Problem:**
`ShortlistStatusUpdate.status` (`app/schemas/shortlist.py:11`) is typed as plain `str` with no `Enum`/`Literal` constraint, and `Shortlist.status` (`app/models/shortlist.py:13`) is an unconstrained `String` column. `PATCH /shortlist/{id}` (`app/routers/shortlist.py:135`) writes `payload.status` directly with no whitelist check.

**Impact:**
Any caller with `candidates:update` permission can set a shortlist entry's status to any string (typos, arbitrary values), silently corrupting a field the rest of the system implicitly assumes is one of a known set (e.g. `"shortlisted"`, `"interview"`). No error surfaces until something downstream expects a specific value.

**Fix Options:**
1. Introduce a `ShortlistStatus` `str` enum (mirroring `AttendanceStatus`'s pattern already used elsewhere) and type both the schema field and DB column against it.
2. Add a Pydantic `Literal["shortlisted", "interview", "rejected", "hired"]` (or whatever the real value set is) to `ShortlistStatusUpdate.status` without a full enum/migration.
3. Add a service-layer whitelist check in the router before the `setattr`, raising 400 on an unrecognized value.

**Recommended Fix:**
Option 1 for consistency with `AttendanceStatus`/`WorkMode`/`BreakType`, which already establish this exact pattern elsewhere in the codebase — same fix, same shape, applied to the one model that's currently the odd one out.

---

### 12. Interview scheduling can leave an orphaned Calendar event with no DB record

**Category:** Logical Bug / Edge Case
**Severity:** Medium

**Problem:**
`schedule_interview()` (`app/services/interview_service.py:54-95`) creates the Google Calendar event first, then sends the candidate email, and only commits shortlist/event fields to the DB after both external calls succeed. If the Calendar call succeeds but the email call raises `GmailClientError`, `InterviewSchedulingError("email", ...)` propagates and the function returns without ever recording `google_event_id`/`google_event_link` on the `Shortlist` row.

**Impact:**
A real Calendar event now exists (candidate may already see markers on shared calendars) that the application has no record of. If HR retries via the same endpoint after fixing the email issue, a second, duplicate Calendar event is created for the same interview, and the first is never cleaned up or referenced again.

**Fix Options:**
1. Persist `google_event_id`/`google_event_link` to the DB immediately after the Calendar call succeeds (before attempting the email), so a retry can detect and reuse the existing event instead of creating a duplicate.
2. On email failure, attempt to delete/cancel the just-created Calendar event (compensating action) so retrying is safe and no orphan is left.
3. Make the two steps idempotent by checking `shortlist.google_event_id` at the top of `schedule_interview` and skipping Calendar creation if one already exists, only retrying the email step.

**Recommended Fix:**
Combine Options 1 + 3 — persist the event reference as soon as it's created (so nothing is lost even on later failure), and short-circuit re-creation on retry by checking for an existing `google_event_id` first. This makes the whole flow safely retryable without needing a compensating-delete call to Google's API.

---

### 13. No pagination on list endpoints

**Category:** API Contract / Performance
**Severity:** Medium

**Problem:**
`GET /employees/`, `GET /resumes/`, `GET /announcements/`, `GET /shortlist/`, `GET /job-postings/` all return `.all()` with no `limit`/`offset`/cursor parameters.

**Impact:**
Response size and query cost grow unbounded with data volume; will degrade response times and payload sizes as the company/candidate pool/resume history grows, with no client-side way to request a page.

**Fix Options:**
1. Add standard `limit`/`offset` query parameters (with a sane default and max limit) to each list endpoint.
2. Adopt cursor-based pagination for the higher-write-volume lists (resumes, attendance).
3. At minimum, add a hard server-side cap (e.g. 500 rows) even without full pagination, to prevent unbounded responses.

**Recommended Fix:**
Option 1 — `limit`/`offset` is the lowest-effort, most broadly-applicable fix across all five endpoints and matches typical FastAPI/SQLAlchemy idioms; can be layered with Option 2 later for the highest-volume tables if needed.

---

### 14. Weak/no password policy on self-registration

**Category:** Validation
**Severity:** Minor
**Status:** RESOLVED (2026-08-03) — Added `is_strong_password()` to `app/core/security.py` (min 8 chars, requires a letter and a digit, mirroring `generate_password`'s own guarantee) and a `field_validator` on `UserRegister.password` in `app/schemas/user.py` calling it.

**Problem:**
`UserRegister.password` (`app/schemas/user.py:10`) is a plain `str` with no minimum length or complexity constraint, unlike `EmployeeCreate`'s flow which always uses `generate_password()` (CSPRNG-backed, 8 chars mixing letters/digits). A self-registered user can set `password="a"`.

**Impact:**
Weak/trivial passwords are accepted for self-registered accounts, increasing brute-force/credential-stuffing risk (compounded if Issue 1's role restriction isn't also fixed).

**Fix Options:**
1. Add a `field_validator` enforcing a minimum length (e.g. 8+) and basic complexity on `UserRegister.password`.
2. Reuse a shared password-strength check between `UserRegister` and any future employee self-service password-change endpoint.
3. Delegate to a small utility (`is_strong_password(pw) -> bool`) called from the validator, so the rule is defined once and testable independently.

**Recommended Fix:**
Option 1 with Option 3's structure — a single reusable validator function keeps the rule consistent if a password-change endpoint is added later.

---

### 15. No login rate limiting / brute-force protection

**Category:** Security
**Severity:** Minor

**Problem:**
`POST /auth/login` (`app/auth/router.py:33`) has no attempt throttling, lockout, or delay — an attacker can attempt unlimited password guesses per account (or across accounts) at full request speed.

**Impact:**
Enables credential-stuffing and brute-force attacks against the login endpoint, especially damaging for accounts with weak passwords (see Issue 14).

**Fix Options:**
1. Add IP- and/or account-based rate limiting (e.g. `slowapi` or a simple in-memory/Redis-backed limiter) in front of `/auth/login`.
2. Add exponential backoff / temporary lockout after N consecutive failed attempts per account.
3. Require a CAPTCHA or similar challenge after repeated failures.

**Recommended Fix:**
Option 1 as the baseline (cheap, standard, framework-agnostic), since it protects the endpoint generally regardless of which account is targeted; Option 2 can be layered on per-account afterward if needed.

---

### 16. Job posting title/requirements accept blank/unbounded input

**Category:** Validation
**Severity:** Minor
**Status:** RESOLVED (2026-08-03) — Added a `not_blank` `field_validator` on `JobPostingCreate.title`/`.requirements` in `app/schemas/job_posting.py`, matching the strip-and-check pattern already used in `schemas/role.py` and `schemas/announcement.py`.

**Problem:**
`JobPostingCreate` (`app/schemas/job_posting.py:6-8`) has no `min_length`/non-blank constraint on `title` or `requirements` — an empty string passes validation for both.

**Impact:**
A job posting can be created with a blank title, which then slugifies to an empty string in both `JobPostingOut.set_role` and `resume_ingestion_service._match_role`, meaning it can never legitimately match any inbound resume subject line and clutters the postings list with unusable rows.

**Fix Options:**
1. Add `min_length=1` (or a stricter length range, e.g. 3-200) plus a strip-and-check-non-blank validator to both fields.
2. Reject titles that would slugify to an empty string specifically (covers e.g. titles made entirely of punctuation).
3. Add a uniqueness check on title to prevent duplicate postings competing for the same resume matches.

**Recommended Fix:**
Option 1 — straightforward Pydantic constraint, consistent with the non-blank validation already used in `schemas/role.py`.

---

### 17. Dead/unmounted code: `applications` router and `candidate`/`application` models

**Category:** API Contract / Cleanup
**Severity:** Minor

**Problem:**
`app/routers/applications.py` defines `GET /applications/` returning a hardcoded `[]`, but it is never imported/mounted in `app/main.py` (confirmed — no `applications_router` include). `app/models/candidate.py`, `app/models/application.py`, `app/schemas/candidate.py`, and `app/schemas/application.py` also have no importers anywhere in the codebase (recruiting instead uses `Resume`/`Shortlist`).

**Impact:**
Not a runtime bug (dead code doesn't execute), but it's misleading during onboarding/maintenance — a developer could reasonably assume `/applications` is a live endpoint or that `Candidate`/`Application` are the recruiting data model, when the real implementation is `Resume`/`Shortlist`.

**Fix Options:**
1. Delete the unused router and models/schemas if the recruiting flow has fully migrated to Resume/Shortlist.
2. If `/applications` is intended to go live later, mount it in `main.py` and mark it clearly as "not yet implemented" (e.g. a 501 or a docstring), rather than a silent empty list.
3. Keep the files but add a top-of-file comment flagging them as deprecated/superseded, pending removal.

**Recommended Fix:**
Option 1 — confirmed unused anywhere in the running app; removing reduces confusion with zero behavior change since it isn't reachable today.

---

### 18. `datetime.utcnow()` used throughout instead of timezone-aware `datetime.now(timezone.utc)`

**Category:** Logical Bug (forward-compatibility)
**Severity:** Minor

**Problem:**
`app/routers/attendance.py`, `app/services/announcement_service.py`, and others call `datetime.utcnow()`, which returns a naive datetime and is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`.

**Impact:**
No immediate runtime failure today (the codebase consistently uses naive UTC and SQLite drops tzinfo on read-back, so it's internally consistent per the comment in `attendance_service.py`), but this is a deprecation warning under newer Python versions and a latent source of naive/aware mismatch bugs if any code path introduces an aware datetime without matching the rest.

**Fix Options:**
1. Standardize on `datetime.now(timezone.utc)` everywhere and strip tzinfo at the DB boundary only where SQLite requires it, isolating the naive/aware conversion to one place.
2. Leave as-is for this SQLite-only prototype but document the convention explicitly (it's partially documented already in `attendance_service.py`'s comment) and add it to any contributor-facing coding notes.
3. Add a lint rule / pre-commit hook flagging new `datetime.utcnow()` usage to prevent drift as the codebase grows.

**Recommended Fix:**
Option 2 for now (lowest risk, no behavior change) — the current approach is internally consistent; revisit Option 1 if/when the DB moves to Postgres (which preserves tzinfo) since naive/aware mixing would then start raising `TypeError` at comparison sites.

---

## Optimization Notes

- **RBAC has a structural gap, not just isolated bugs**: the `PERMISSION_TAXONOMY` (`app/core/permission_taxonomy.py`) has no concept of "sensitive field" within a resource — `employees:update` grants blanket field-level access including `role`. Any future field added to `EmployeeUpdate` inherits this same blanket trust. Worth a taxonomy-level rule (e.g. certain fields always require a stricter action than the resource's base CRUD actions) rather than patching this one instance.
- **Repeated pattern — "create the row, then loop-and-setattr from a dict"**: `update_employee`, `update_role`, `update_announcement` all use the same `for field, value in updates.items(): setattr(...)` mass-assignment pattern. It's safe today only because each schema uses `extra="forbid"` and a narrow field allow-list — any future schema added without that same discipline (e.g. a new `*Update` model without `ConfigDict(extra="forbid")`) would silently reopen mass-assignment risk. Worth a shared helper/decorator that enforces the allow-list check once, centrally.
- **Best-effort external side effects (Gmail, Calendar) are called synchronously and inline across three separate call sites** (`employees.py`'s welcome email, `announcement_service.py`'s notifications, `interview_service.py`'s calendar+email): a shared background-task/retry-queue abstraction would fix the blocking issue (#9) and the orphan-record issue (#12) in one pass instead of three separate call-site fixes.
- **No automated tests observed** in the audited scope — none of the above (especially the privilege-escalation issues #1/#2) would need to be found by manual audit if there were RBAC-focused integration tests asserting that `hr`-role tokens are rejected from ever setting `role=super_admin`.
- **No schema migration tool (Alembic)** — `app/main.py`'s `_add_missing_columns` hand-rolls additive column backfills via raw `ALTER TABLE` on every startup. Functionally reasonable for a prototype, but table/column names are hardcoded strings in `main.py` rather than derived from the models, so a renamed column or table would silently stop being backfilled with no error. Worth migrating to Alembic before this pattern accumulates further special cases.
- **Consistent, good patterns worth preserving**: `file_storage._sanitize_filename` correctly strips path components and whitelists characters (no path-traversal risk found in resume upload/download); external API wrappers (`gmail/client.py`, `google_calendar/client.py`, `ats_client.py`) consistently wrap errors in typed exceptions with retry/backoff for transient failures; `EmployeeUpdate`/`RoleUpdate` correctly use `ConfigDict(extra="forbid")` to reject unexpected fields at the schema boundary.
