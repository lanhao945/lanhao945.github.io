import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

from scripts.fetch_github_activity import (
    build_collection_ranges,
    build_payload,
    complete_days,
    normalize_graphql_calendar,
    parse_public_contribution_years,
    parse_public_contributions_html,
    write_payload_if_changed,
)


PUBLIC_CALENDAR_HTML = """
<div class="ContributionCalendar">
  <td data-date="2025-01-01" id="day-1" data-level="1"></td>
  <tool-tip for="day-1">3 contributions on January 1st.</tool-tip>
  <td data-date="2025-01-02" id="day-2" data-level="0"></td>
  <tool-tip for="day-2">No contributions on January 2nd.</tool-tip>
  <td data-date="2025-01-03" id="day-3" data-level="2"></td>
  <tool-tip for="day-3">12 contributions on January 3rd.</tool-tip>
</div>
"""


class CompleteDaysTests(unittest.TestCase):
    def test_fills_missing_dates_with_zero_and_sorts(self):
        days = complete_days(
            [
                {"date": "2024-01-03", "count": 2},
                {"date": "2024-01-01", "count": 1},
            ],
            date(2024, 1, 1),
            date(2024, 1, 4),
        )

        self.assertEqual(
            days,
            [
                {"date": "2024-01-01", "count": 1},
                {"date": "2024-01-02", "count": 0},
                {"date": "2024-01-03", "count": 2},
                {"date": "2024-01-04", "count": 0},
            ],
        )


class PublicCalendarTests(unittest.TestCase):
    def test_parses_counts_from_tooltips(self):
        self.assertEqual(
            parse_public_contributions_html(PUBLIC_CALENDAR_HTML),
            {
                "2025-01-01": 3,
                "2025-01-02": 0,
                "2025-01-03": 12,
            },
        )

    def test_filters_days_outside_requested_range(self):
        self.assertEqual(
            parse_public_contributions_html(
                PUBLIC_CALENDAR_HTML,
                date(2025, 1, 2),
                date(2025, 1, 3),
            ),
            {
                "2025-01-02": 0,
                "2025-01-03": 12,
            },
        )

    def test_parses_profile_year_links_once(self):
        profile_html = """
        <a href="?tab=overview&from=2025-12-01&to=2025-12-31">2025</a>
        <a href="?tab=overview&from=2026-09-01&to=2026-09-26">2026</a>
        <a href="?tab=overview&from=2025-11-01&to=2025-11-30">2025</a>
        """

        self.assertEqual(
            parse_public_contribution_years(profile_html),
            [2026, 2025],
        )


class GraphqlCalendarTests(unittest.TestCase):
    def test_flattens_contribution_weeks(self):
        payload = {
            "data": {
                "user": {
                    "contributionsCollection": {
                        "contributionCalendar": {
                            "weeks": [
                                {
                                    "contributionDays": [
                                        {"date": "2025-01-02", "contributionCount": 4},
                                        {"date": "2025-01-01", "contributionCount": 1},
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        }

        self.assertEqual(
            normalize_graphql_calendar(payload),
            {
                "2025-01-01": 1,
                "2025-01-02": 4,
            },
        )


class CollectionRangesTests(unittest.TestCase):
    def test_builds_complete_and_partial_year_ranges(self):
        self.assertEqual(
            build_collection_ranges([2024, 2025], date(2025, 3, 15)),
            [
                (2024, date(2024, 1, 1), date(2024, 12, 31)),
                (2025, date(2025, 1, 1), date(2025, 3, 15)),
            ],
        )


class PayloadTests(unittest.TestCase):
    def test_builds_stable_payload_without_timestamp(self):
        payload = build_payload(
            "lanhao945",
            "github-public-profile",
            {
                "2024-12-31": 0,
                "2025-01-01": 3,
                "2025-01-02": 5,
            },
        )

        self.assertEqual(payload["username"], "lanhao945")
        self.assertEqual(payload["source"], "github-public-profile")
        self.assertEqual(payload["maxDaily"], 5)
        self.assertEqual(
            payload["years"],
            [{"year": 2024, "total": 0}, {"year": 2025, "total": 8}],
        )
        self.assertNotIn("generatedAt", payload)

    def test_write_payload_only_changes_file_when_content_changes(self):
        payload = build_payload(
            "lanhao945",
            "github-public-profile",
            {"2025-01-01": 3},
        )

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "activity.json"
            self.assertTrue(write_payload_if_changed(output, payload))
            first_content = output.read_text(encoding="utf-8")
            self.assertFalse(write_payload_if_changed(output, payload))
            self.assertEqual(output.read_text(encoding="utf-8"), first_content)
            self.assertEqual(json.loads(first_content)["maxDaily"], 3)


if __name__ == "__main__":
    unittest.main()
import unittest
from datetime import date

from scripts.fetch_github_activity import fetch_public_years_parallel


class PublicCalendarFailureTests(unittest.TestCase):
    def test_parallel_fetch_does_not_accept_a_missing_year(self):
        ranges = [
            (2024, date(2024, 1, 1), date(2024, 12, 31)),
            (2025, date(2025, 1, 1), date(2025, 12, 31)),
        ]

        def fake_fetch(username, start, end, timeout):
            if start.year == 2024:
                raise RuntimeError("temporary GitHub failure")
            return {"2025-01-01": 2}

        with self.assertRaises(RuntimeError):
            fetch_public_years_parallel(
                "lanhao945",
                ranges,
                timeout=10,
                jobs=2,
                fetch_one=fake_fetch,
            )


if __name__ == "__main__":
    unittest.main()
