from collections.abc import Iterable

from django.db import models
from django.db.models import Q, Sum


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

    @classmethod
    def recalculate_points_for_ids(cls, driver_ids: Iterable[int]) -> dict[int, int]:
        normalized_ids = sorted({int(driver_id) for driver_id in driver_ids if driver_id})
        if not normalized_ids:
            return {}

        totals = {
            row["id"]: row["total_points"] or 0
            for row in cls.objects.filter(id__in=normalized_ids)
            .annotate(total_points=Sum("race_results__points_earned"))
            .values("id", "total_points")
        }

        for driver_id in normalized_ids:
            cls.objects.filter(id=driver_id).update(points=totals.get(driver_id, 0))

        return {driver_id: totals.get(driver_id, 0) for driver_id in normalized_ids}


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
            models.UniqueConstraint(
                fields=["race"],
                condition=Q(fastest_lap=True),
                name="unique_fastest_lap_per_race",
            ),
        ]

    def __str__(self):
        return f"{self.race} - P{self.position}: {self.driver.name}"

    def save(self, *args, **kwargs):
        previous_driver_id = None
        if self.pk:
            previous_driver_id = (
                type(self).objects.filter(pk=self.pk).values_list("driver_id", flat=True).first()
            )

        super().save(*args, **kwargs)

        affected_driver_ids = {self.driver_id}
        if previous_driver_id and previous_driver_id != self.driver_id:
            affected_driver_ids.add(previous_driver_id)

        Driver.recalculate_points_for_ids(affected_driver_ids)

    def delete(self, *args, **kwargs):
        affected_driver_id = self.driver_id
        super().delete(*args, **kwargs)
        Driver.recalculate_points_for_ids([affected_driver_id])
