# Generated manually for portfolio expansion

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("racing", "0004_driver_points_and_constraint"),
    ]

    operations = [
        migrations.CreateModel(
            name="Season",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveIntegerField(unique=True)),
                ("name", models.CharField(blank=True, max_length=120)),
            ],
            options={"ordering": ["-year"]},
        ),
        migrations.CreateModel(
            name="Race",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("round_number", models.PositiveIntegerField()),
                ("name", models.CharField(max_length=120)),
                ("country", models.CharField(max_length=100)),
                ("race_date", models.DateField()),
                (
                    "season",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="races", to="racing.season"),
                ),
            ],
            options={"ordering": ["season__year", "round_number"]},
        ),
        migrations.CreateModel(
            name="RaceResult",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("position", models.PositiveIntegerField()),
                ("points_earned", models.PositiveIntegerField(default=0)),
                ("fastest_lap", models.BooleanField(default=False)),
                (
                    "driver",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="race_results", to="racing.driver"),
                ),
                (
                    "race",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="results", to="racing.race"),
                ),
            ],
            options={"ordering": ["race__race_date", "position"]},
        ),
        migrations.AddConstraint(
            model_name="race",
            constraint=models.UniqueConstraint(fields=("season", "round_number"), name="unique_round_per_season"),
        ),
        migrations.AddConstraint(
            model_name="raceresult",
            constraint=models.UniqueConstraint(fields=("race", "position"), name="unique_position_per_race"),
        ),
        migrations.AddConstraint(
            model_name="raceresult",
            constraint=models.UniqueConstraint(fields=("race", "driver"), name="unique_driver_result_per_race"),
        ),
    ]
