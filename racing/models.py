from django.db import models

class Driver(models.Model):
    name = models.CharField(max_length=100)
    team = models.CharField(max_length=100)
    points = models.IntegerField()

    def __str__(self):
        return f"{self.name} ({self.team})"
