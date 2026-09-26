#!/usr/bin/env python3
"""Fetch a compact daily GitHub contribution snapshot.

The GraphQL API is preferred when GH_ACTIVITY_TOKEN is available. The public
contribution calendar endpoint is used as a fallback for local previews and
for scheduled runs that do not configure a personal token.
"""

from __future__ import annotations

import argparse
import html as html_module
import http.client
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple


GRAPHQL_URL = "https://api.github.com/graphql"
PROFILE_URL = "https://github.com/{username}?tab=overview"
PUBLIC_CALENDAR_URL = "https://github.com/users/{username}/contributions"
USER_AGENT = "lanhao945.github.io-github-activity-fetcher"
DEFAULT_START_YEAR = 2017

GRAPHQL_YEARS_QUERY = """
query ContributionYears($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionYears
    }
  }
}
""".strip()

GRAPHQL_CALENDAR_QUERY = """
query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
""".strip()


def _iter_dates(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def complete_days(
    days: Iterable[Dict[str, object]], start: date, end: date
) -> List[Dict[str, object]]:
    """Return one sorted entry per date, filling missing dates with zero."""

    counts = {
        str(day["date"]): int(day["count"])  # type: ignore[arg-type]
        for day in days
    }
    return [
        {"date": current.isoformat(), "count": counts.get(current.isoformat(), 0)}
        for current in _iter_dates(start, end)
    ]


def _parse_attributes(source: str) -> Dict[str, str]:
    return {
        key.lower(): value
        for key, value in re.findall(
            r"([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*\"([^\"]*)\"", source
        )
    }


def _strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)


def parse_public_contributions_html(
    source: str, start: Optional[date] = None, end: Optional[date] = None
) -> Dict[str, int]:
    """Parse daily counts from GitHub's public contribution calendar HTML."""

    cells: Dict[str, str] = {}
    for attributes in re.findall(r"<td\b([^>]*)>", source, flags=re.IGNORECASE | re.DOTALL):
        parsed = _parse_attributes(attributes)
        cell_id = parsed.get("id")
        day = parsed.get("data-date")
        if cell_id and day:
            cells[cell_id] = day

    tooltips: Dict[str, str] = {}
    for attributes, body in re.findall(
        r"<tool-tip\b([^>]*)>(.*?)</tool-tip>",
        source,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        parsed = _parse_attributes(attributes)
        target = parsed.get("for")
        if target:
            tooltips[target] = html_module.unescape(_strip_tags(body)).strip()

    days: Dict[str, int] = {}
    for cell_id, day_text in cells.items():
        try:
            day = date.fromisoformat(day_text)
        except ValueError:
            continue
        if start is not None and day < start:
            continue
        if end is not None and day > end:
            continue

        tooltip = tooltips.get(cell_id, "")
        count_match = re.search(r"([\d,]+)\s+contributions?\b", tooltip, re.IGNORECASE)
        if count_match:
            count = int(count_match.group(1).replace(",", ""))
        elif re.search(r"\bno\s+contributions?\b", tooltip, re.IGNORECASE):
            count = 0
        else:
            continue
        days[day_text] = count

    return dict(sorted(days.items()))


def parse_public_contribution_years(source: str) -> List[int]:
    """Extract unique contribution years from profile activity links."""

    years = {
        int(match)
        for match in re.findall(
            r"(?:from|to)=(\d{4})-\d{2}-\d{2}", source, flags=re.IGNORECASE
        )
    }
    return sorted(years, reverse=True)


def normalize_graphql_calendar(payload: Dict[str, object]) -> Dict[str, int]:
    """Flatten GitHub's contribution weeks into a date-to-count mapping."""

    errors = payload.get("errors")
    if errors:
        raise RuntimeError("GitHub GraphQL returned errors: {}".format(errors))

    try:
        weeks = payload["data"]["user"]["contributionsCollection"][  # type: ignore[index]
            "contributionCalendar"
        ]["weeks"]  # type: ignore[index]
    except (KeyError, TypeError) as error:
        raise RuntimeError("Invalid GitHub GraphQL calendar response") from error

    days: Dict[str, int] = {}
    for week in weeks or []:
        for day in week.get("contributionDays", []):
            day_text = day.get("date")
            if day_text:
                days[str(day_text)] = int(day.get("contributionCount", 0))
    return dict(sorted(days.items()))


def build_collection_ranges(
    years: Sequence[int], today: Optional[date] = None
) -> List[Tuple[int, date, date]]:
    """Build inclusive date ranges for each requested calendar year."""

    current_day = today or datetime.now(timezone.utc).date()
    ranges: List[Tuple[int, date, date]] = []
    for year in sorted({int(year) for year in years}):
        start = date(year, 1, 1)
        end = date(year, 12, 31)
        if year == current_day.year:
            end = current_day
        if start > current_day:
            continue
        ranges.append((year, start, min(end, current_day)))
    return ranges


def build_payload(
    username: str, source: str, day_counts: Dict[str, int]
) -> Dict[str, object]:
    """Build the stable JSON payload consumed by the Astro component."""

    days = {
        day: int(count)
        for day, count in sorted(day_counts.items())
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", day)
    }
    yearly_totals: Dict[int, int] = {}
    for day, count in days.items():
        year = int(day[:4])
        yearly_totals[year] = yearly_totals.get(year, 0) + count

    return {
        "username": username,
        "source": source,
        "maxDaily": max(days.values(), default=0),
        "years": [
            {"year": year, "total": yearly_totals[year]}
            for year in sorted(yearly_totals)
        ],
        "days": days,
    }


def write_payload_if_changed(path: Path, payload: Dict[str, object]) -> bool:
    """Write deterministic JSON only when its contents changed."""

    rendered = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == rendered:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(rendered.encode("utf-8"))
    return True


def _request(
    url: str,
    *,
    data: Optional[bytes] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 30,
    attempts: int = 3,
) -> bytes:
    request_headers = {"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"}
    request_headers.update(headers or {})
    last_error: Optional[BaseException] = None

    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(
                url, data=data, headers=request_headers, method="POST" if data else "GET"
            )
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except (
            OSError,
            http.client.HTTPException,
            urllib.error.HTTPError,
            urllib.error.URLError,
            TimeoutError,
        ) as error:
            last_error = error
            if attempt < attempts:
                time.sleep(1.5 * attempt)

    raise RuntimeError("Request failed for {}: {}".format(url, last_error))


def _graphql_request(query: str, variables: Dict[str, object], token: str) -> Dict[str, object]:
    body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    raw = _request(
        GRAPHQL_URL,
        data=body,
        headers={
            "Authorization": "bearer {}".format(token),
            "Content-Type": "application/json",
        },
    )
    payload = json.loads(raw.decode("utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError("GitHub GraphQL returned a non-object response")
    return payload


def fetch_graphql_years(username: str, token: str) -> List[int]:
    payload = _graphql_request(GRAPHQL_YEARS_QUERY, {"login": username}, token)
    try:
        years = payload["data"]["user"]["contributionsCollection"][  # type: ignore[index]
            "contributionYears"
        ]
    except (KeyError, TypeError) as error:
        raise RuntimeError("GitHub GraphQL did not return contribution years") from error
    return sorted({int(year) for year in years})


def fetch_graphql_calendar(
    username: str, token: str, year: int, start: date, end: date
) -> Dict[str, int]:
    payload = _graphql_request(
        GRAPHQL_CALENDAR_QUERY,
        {
            "login": username,
            "from": "{}T00:00:00Z".format(start.isoformat()),
            "to": "{}T23:59:59Z".format(end.isoformat()),
        },
        token,
    )
    return normalize_graphql_calendar(payload)


def fetch_public_years(username: str, timeout: int) -> List[int]:
    raw = _request(PROFILE_URL.format(username=username), timeout=timeout)
    years = parse_public_contribution_years(raw.decode("utf-8", "replace"))
    if years:
        return years
    current_year = datetime.now(timezone.utc).year
    return list(range(current_year, DEFAULT_START_YEAR - 1, -1))


def fetch_public_calendar(
    username: str, start: date, end: date, timeout: int
) -> Dict[str, int]:
    query = urllib.parse.urlencode(
        {"from": start.isoformat(), "to": end.isoformat()}
    )
    url = "{}?{}".format(PUBLIC_CALENDAR_URL.format(username=username), query)
    raw = _request(url, timeout=timeout)
    return parse_public_contributions_html(
        raw.decode("utf-8", "replace"), start=start, end=end
    )


def fetch_public_years_parallel(
    username: str,
    ranges: Sequence[Tuple[int, date, date]],
    timeout: int,
    jobs: int,
    fetch_one: Optional[Callable[[str, date, date, int], Dict[str, int]]] = None,
) -> Dict[str, int]:
    """Fetch every range; a partial snapshot is treated as a failure."""

    fetch_one = fetch_one or fetch_public_calendar
    days: Dict[str, int] = {}
    errors: List[str] = []
    with ThreadPoolExecutor(max_workers=max(1, min(jobs, len(ranges)))) as executor:
        futures = {
            executor.submit(fetch_one, username, start, end, timeout): year
            for year, start, end in ranges
        }
        for future in as_completed(futures):
            year = futures[future]
            try:
                days.update(future.result())
            except Exception as error:  # noqa: BLE001 - report all affected years
                errors.append("{}: {}".format(year, error))
    if errors:
        raise RuntimeError(
            "Failed to fetch public contribution calendars: {}".format("; ".join(sorted(errors)))
        )
    return days


def _fetch_graphql(
    username: str, token: str, ranges: Sequence[Tuple[int, date, date]]
) -> Dict[str, int]:
    days: Dict[str, int] = {}
    for year, start, end in ranges:
        days.update(fetch_graphql_calendar(username, token, year, start, end))
    return days


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--username", required=True, help="GitHub login to fetch")
    parser.add_argument("--output", required=True, type=Path, help="JSON output path")
    parser.add_argument("--token", default=None, help="GraphQL token; defaults to GH_ACTIVITY_TOKEN")
    parser.add_argument("--start-year", type=int, default=None, help="First year for public fallback")
    parser.add_argument("--end-year", type=int, default=None, help="Last year to fetch")
    parser.add_argument("--force-public", action="store_true", help="Skip GraphQL")
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--jobs", type=int, default=2, help="Parallel public calendar requests")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    today = datetime.now(timezone.utc).date()
    token = args.token or os.environ.get("GH_ACTIVITY_TOKEN")
    source = "github-public-profile"
    years: List[int]
    day_counts: Dict[str, int] = {}
    graphql_error: Optional[BaseException] = None

    if token and not args.force_public:
        try:
            years = fetch_graphql_years(args.username, token)
            source = "github-graphql"
        except Exception as error:  # noqa: BLE001 - fallback is intentional
            graphql_error = error
            years = []
    else:
        years = []

    if not years:
        if args.start_year is not None or args.end_year is not None:
            first_year = args.start_year or DEFAULT_START_YEAR
            last_year = args.end_year or today.year
            years = list(range(first_year, last_year + 1))
        else:
            try:
                years = fetch_public_years(args.username, args.timeout)
            except Exception as error:  # noqa: BLE001 - deterministic fallback
                if graphql_error:
                    print("warning: GraphQL failed first: {}".format(graphql_error), file=sys.stderr)
                print("warning: could not read contribution years: {}".format(error), file=sys.stderr)
                years = list(range(DEFAULT_START_YEAR, today.year + 1))

    if args.start_year is not None:
        years = [year for year in years if year >= args.start_year]
    if args.end_year is not None:
        years = [year for year in years if year <= args.end_year]

    ranges = build_collection_ranges(years, today)
    if not ranges:
        raise RuntimeError("No contribution date ranges to fetch")

    if source == "github-graphql" and token:
        try:
            day_counts = _fetch_graphql(args.username, token, ranges)
        except Exception as error:  # noqa: BLE001 - fallback is intentional
            graphql_error = error
            source = "github-public-profile"

    if not day_counts:
        if graphql_error:
            print("warning: GraphQL failed, using public calendar: {}".format(graphql_error), file=sys.stderr)
        day_counts = fetch_public_years_parallel(
            args.username, ranges, args.timeout, args.jobs
        )

    complete: List[Dict[str, object]] = []
    for _year, start, end in ranges:
        complete.extend(
            complete_days(
                [{"date": day, "count": count} for day, count in day_counts.items()],
                start,
                end,
            )
        )

    normalized_days = {
        str(day["date"]): int(day["count"])  # type: ignore[arg-type]
        for day in complete
    }
    payload = build_payload(args.username, source, normalized_days)
    changed = write_payload_if_changed(args.output, payload)
    total = sum(int(day["count"]) for day in complete)
    print(
        "{} activity snapshot ({}, {} days, total {})".format(
            "updated" if changed else "unchanged",
            source,
            len(complete),
            total,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
