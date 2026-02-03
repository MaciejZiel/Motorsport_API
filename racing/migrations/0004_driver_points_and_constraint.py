# Generated manually for portfolio extension

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("racing", "0003_alter_driver_team"),
    ]

    operations = [
        migrations.AlterField(
            model_name="driver",
            name="points",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddConstraint(
            model_name="driver",
            constraint=models.UniqueConstraint(fields=("name", "team"), name="unique_driver_name_per_team"),
        ),
    ]
