# Generated manually for domain consistency

from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("racing", "0006_alter_driver_options_alter_team_options"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="raceresult",
            constraint=models.UniqueConstraint(
                condition=Q(fastest_lap=True),
                fields=("race",),
                name="unique_fastest_lap_per_race",
            ),
        ),
    ]
