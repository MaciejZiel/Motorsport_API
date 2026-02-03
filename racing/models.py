from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    country = models.CharField(max_length=100)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Driver(models.Model):
    name = models.CharField(max_length=100)
    team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="drivers")
    points = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-points", "name"]
        constraints = [
            models.UniqueConstraint(fields=["name", "team"], name="unique_driver_name_per_team"),
        ]

    def __str__(self):
        return f"{self.name} ({self.team})"


class Season(models.Model):
    year = models.PositiveIntegerField(unique=True)
    name = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-year"]

    def __str__(self):
        return self.name or str(self.year)


class Race(models.Model):
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="races")
    round_number = models.PositiveIntegerField()
    name = models.CharField(max_length=120)
    country = models.CharField(max_length=100)
    race_date = models.DateField()

    class Meta:
        ordering = ["season__year", "round_number"]
        constraints = [
            models.UniqueConstraint(fields=["season", "round_number"], name="unique_round_per_season"),
        ]

    def __str__(self):
        return f"{self.season.year} R{self.round_number} - {self.name}"


class RaceResult(models.Model):
    race = models.ForeignKey(Race, on_delete=models.CASCADE, related_name="results")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="race_results")
    position = models.PositiveIntegerField()
    points_earned = models.PositiveIntegerField(default=0)
    fastest_lap = models.BooleanField(default=False)

    class Meta:
        ordering = ["race__race_date", "position"]
        constraints = [
            models.UniqueConstraint(fields=["race", "position"], name="unique_position_per_race"),
            models.UniqueConstraint(fields=["race", "driver"], name="unique_driver_result_per_race"),
        ]

    def __str__(self):
        return f"{self.race} - P{self.position}: {self.driver.name}"
