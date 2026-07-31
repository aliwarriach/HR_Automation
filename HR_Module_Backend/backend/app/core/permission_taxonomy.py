# app/core/permission_taxonomy.py
"""Single source of truth for valid Role permission entries. Enforced on both
ends: the frontend's Create/Edit Role screens lock their module dropdown and
action checkboxes to this (via GET /roles/permission-options), and the backend
rejects any Role.permissions entry containing a module/action not listed here
(see services/role_service.py's validate_permissions_against_taxonomy).

Actions are deliberately granular where a role needs to grant/deny specific
real behaviors rather than a whole module at once - e.g. "attendance" splits
check-in by work mode (check_in_onsite vs check_in_wfh) and breaks out
start_break/end_break, so a role can permit office check-in while denying
work-from-home, or vice versa.

Not every action here is wired to an enforcement point yet - modules/actions
outside the currently-enforced slice (see routers/attendance.py) are included
so they can be assigned/displayed now and retrofitted with real checks
incrementally, per the phased RBAC rollout.
"""

PERMISSION_TAXONOMY: dict[str, list[str]] = {
    "attendance": [
        "check_in_onsite",
        "check_in_wfh",
        "check_out",
        "start_break",
        "end_break",
        "mark_leave",
        "view_own",
        "view_all",
        "edit_all",
    ],
    # "read"/"create"/"update"/"delete" are the admin management screen
    # (create/list/detail/update/delete an announcement). "view_own" is the
    # separate employee-feed action (GET /employee/announcements) - split out
    # the same way attendance splits view_own/view_all, since seeing your own
    # feed is a materially different capability than managing announcements.
    "announcements": ["create", "read", "update", "delete", "view_own"],
    "employees": ["create", "read", "update", "delete"],
    "resumes": ["create", "read", "update", "delete"],
    "candidates": ["create", "read", "update", "delete"],
    "job_postings": ["create", "read", "update", "delete"],
    "roles": ["create", "read", "update", "delete"],
    "working_hours": ["read", "update"],
    "payroll": ["read", "export"],
}
