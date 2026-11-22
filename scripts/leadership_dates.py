"""Keep incremental leadership reviews separate from historical audit cutoffs."""

from datetime import date
from typing import Any


def calculation_date(role: dict[str, Any], cohort_date: str) -> str:
    cohort = date.fromisoformat(cohort_date)
    reviewed = date.fromisoformat(role.get("verifiedAt", cohort_date))
    if reviewed > date.today():
        raise ValueError("Leadership verification cannot be future-dated.")
    if role.get("verifiedAt") and role.get("roleStartDate", cohort_date) > reviewed.isoformat():
        raise ValueError("A current-role verification cannot precede the role start.")
    return max(cohort, reviewed).isoformat()


def role_at_date(company: dict[str, Any], role_name: str, cutoff: str) -> dict[str, Any] | None:
    candidates = [company["roles"].get(role_name, {})]
    candidates.extend(role for role in company.get("previousRoles", []) if role.get("role") == role_name)
    eligible = [role for role in candidates if role.get("roleStartDate", "9999-12-31") <= cutoff
                and (not role.get("roleEndDate") or cutoff < role["roleEndDate"])]
    return max(eligible, key=lambda role: role["roleStartDate"]) if eligible else None


def succession_active_at(case: dict[str, Any], cutoff: str) -> bool:
    return case["announcedDate"] <= cutoff and (not case.get("completedAt") or case["completedAt"] > cutoff)
