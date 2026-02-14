from datetime import date

from django.test import TestCase

from racing.models import Driver, Race, RaceResult, Season, Team


class DriverPointsSyncTests(TestCase):
    def setUp(self):
        team = Team.objects.create(name="Red Apex", country="Italy")
        self.driver_a = Driver.objects.create(name="Max Fast", team=team, points=0)
        self.driver_b = Driver.objects.create(name="Luca Stone", team=team, points=0)
        season = Season.objects.create(year=2026, name="World Championship 2026")
        self.race = Race.objects.create(
            season=season,
            round_number=1,
            name="Australian Grand Prix",
            country="Australia",
            race_date=date(2026, 3, 15),
        )

    def test_create_result_recalculates_driver_points(self):
        RaceResult.objects.create(race=self.race, driver=self.driver_a, position=1, points_earned=25)

        self.driver_a.refresh_from_db()
        self.assertEqual(self.driver_a.points, 25)

    def test_update_result_recalculates_driver_points(self):
        result = RaceResult.objects.create(race=self.race, driver=self.driver_a, position=1, points_earned=25)
        result.points_earned = 18
        result.save()

        self.driver_a.refresh_from_db()
        self.assertEqual(self.driver_a.points, 18)

    def test_reassign_result_recalculates_both_drivers(self):
        result = RaceResult.objects.create(race=self.race, driver=self.driver_a, position=1, points_earned=25)
        result.driver = self.driver_b
        result.points_earned = 18
        result.save()

        self.driver_a.refresh_from_db()
        self.driver_b.refresh_from_db()
        self.assertEqual(self.driver_a.points, 0)
        self.assertEqual(self.driver_b.points, 18)

    def test_delete_result_recalculates_driver_points(self):
        result = RaceResult.objects.create(race=self.race, driver=self.driver_a, position=1, points_earned=25)
        result.delete()

        self.driver_a.refresh_from_db()
        self.assertEqual(self.driver_a.points, 0)
