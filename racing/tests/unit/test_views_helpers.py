from django.test import TestCase
from rest_framework.exceptions import ValidationError

from racing.models import Season
from racing.views import resolve_season


class ResolveSeasonTests(TestCase):
    def setUp(self):
        self.season_2025 = Season.objects.create(year=2025, name="World Championship 2025")
        self.season_2026 = Season.objects.create(year=2026, name="World Championship 2026")

    def test_resolve_by_year(self):
        season = resolve_season("2025")
        self.assertEqual(season.id, self.season_2025.id)

    def test_resolve_by_id(self):
        season = resolve_season(str(self.season_2026.id))
        self.assertEqual(season.id, self.season_2026.id)

    def test_resolve_without_param_returns_latest(self):
        season = resolve_season(None)
        self.assertEqual(season.id, self.season_2026.id)

    def test_missing_explicit_year_returns_none(self):
        season = resolve_season("2035")
        self.assertIsNone(season)

    def test_invalid_non_numeric_query_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            resolve_season("latest")
