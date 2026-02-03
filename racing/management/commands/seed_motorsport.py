from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum

from racing.models import Driver, Race, RaceResult, Season, Team

TEAMS = [
    ("Red Apex", "Italy"),
    ("Blue Arrow", "United Kingdom"),
    ("Silver Pulse", "Germany"),
    ("Green Vertex", "Spain"),
]

DRIVERS = [
    ("Max Fast", "Red Apex"),
    ("Luca Stone", "Red Apex"),
    ("Owen Pace", "Blue Arrow"),
    ("Nico Lane", "Blue Arrow"),
    ("Erik Volt", "Silver Pulse"),
    ("Carlos Drift", "Green Vertex"),
]

SEASONS = [
    (2025, "Motorsport World Championship 2025"),
    (2026, "Motorsport World Championship 2026"),
]

RACES = [
    (2025, 1, "Bahrain Grand Prix", "Bahrain", date(2025, 3, 9)),
    (2025, 2, "Italian Grand Prix", "Italy", date(2025, 4, 6)),
    (2026, 1, "Australian Grand Prix", "Australia", date(2026, 3, 15)),
    (2026, 2, "Spanish Grand Prix", "Spain", date(2026, 4, 19)),
]

RESULTS = {
    (2025, 1): [
        ("Max Fast", 1, 25, True),
        ("Owen Pace", 2, 18, False),
        ("Erik Volt", 3, 15, False),
        ("Luca Stone", 4, 12, False),
    ],
    (2025, 2): [
        ("Owen Pace", 1, 25, True),
        ("Max Fast", 2, 18, False),
        ("Nico Lane", 3, 15, False),
        ("Carlos Drift", 4, 12, False),
    ],
    (2026, 1): [
        ("Erik Volt", 1, 25, True),
        ("Max Fast", 2, 18, False),
        ("Owen Pace", 3, 15, False),
        ("Nico Lane", 4, 12, False),
    ],
    (2026, 2): [
        ("Max Fast", 1, 25, True),
        ("Erik Volt", 2, 18, False),
        ("Luca Stone", 3, 15, False),
        ("Carlos Drift", 4, 12, False),
    ],
}


class Command(BaseCommand):
    help = "Populate database with sample motorsport teams, drivers, seasons, races and race results"

    @transaction.atomic
    def handle(self, *args, **options):
        teams = {}
        for name, country in TEAMS:
            team, _ = Team.objects.update_or_create(name=name, defaults={"country": country})
            teams[name] = team

        drivers = {}
        for driver_name, team_name in DRIVERS:
            driver, _ = Driver.objects.update_or_create(
                name=driver_name,
                team=teams[team_name],
                defaults={"points": 0},
            )
            drivers[driver_name] = driver

        seasons = {}
        for year, season_name in SEASONS:
            season, _ = Season.objects.update_or_create(year=year, defaults={"name": season_name})
            seasons[year] = season

        races = {}
        for year, round_number, race_name, country, race_date in RACES:
            race, _ = Race.objects.update_or_create(
                season=seasons[year],
                round_number=round_number,
                defaults={"name": race_name, "country": country, "race_date": race_date},
            )
            races[(year, round_number)] = race

        for race_key, race_results in RESULTS.items():
            race = races[race_key]
            for driver_name, position, points_earned, fastest_lap in race_results:
                RaceResult.objects.update_or_create(
                    race=race,
                    driver=drivers[driver_name],
                    defaults={
                        "position": position,
                        "points_earned": points_earned,
                        "fastest_lap": fastest_lap,
                    },
                )

        for driver in Driver.objects.all():
            total_points = driver.race_results.aggregate(total=Sum("points_earned"))["total"] or 0
            driver.points = total_points
            driver.save(update_fields=["points"])

        self.stdout.write(self.style.SUCCESS("Sample motorsport data seeded successfully."))
