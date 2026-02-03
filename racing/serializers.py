from rest_framework import serializers

from .models import Driver, Race, RaceResult, Season, Team


class TeamSlimSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "country"]


class DriverSerializer(serializers.ModelSerializer):
    team = TeamSlimSerializer(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(source="team", queryset=Team.objects.all(), write_only=True)

    class Meta:
        model = Driver
        fields = ["id", "name", "points", "team", "team_id"]


class DriverCompactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ["id", "name", "points"]


class TeamSerializer(serializers.ModelSerializer):
    driver_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "country", "driver_count"]


class TeamDetailSerializer(serializers.ModelSerializer):
    drivers = DriverCompactSerializer(many=True, read_only=True)
    driver_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "country", "driver_count", "drivers"]


class SeasonSerializer(serializers.ModelSerializer):
    race_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Season
        fields = ["id", "year", "name", "race_count"]


class RaceSerializer(serializers.ModelSerializer):
    season_year = serializers.IntegerField(source="season.year", read_only=True)
    season_id = serializers.PrimaryKeyRelatedField(source="season", queryset=Season.objects.all(), write_only=True)

    class Meta:
        model = Race
        fields = ["id", "name", "country", "round_number", "race_date", "season_year", "season_id"]


class RaceResultSerializer(serializers.ModelSerializer):
    race = RaceSerializer(read_only=True)
    driver = DriverSerializer(read_only=True)
    race_id = serializers.PrimaryKeyRelatedField(source="race", queryset=Race.objects.all(), write_only=True)
    driver_id = serializers.PrimaryKeyRelatedField(source="driver", queryset=Driver.objects.all(), write_only=True)

    class Meta:
        model = RaceResult
        fields = [
            "id",
            "position",
            "points_earned",
            "fastest_lap",
            "race",
            "driver",
            "race_id",
            "driver_id",
        ]
