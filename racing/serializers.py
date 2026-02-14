from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Driver, Race, RaceResult, Season, Team

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("Username already exists.")
        return normalized

    def validate(self, attrs):
        password = attrs["password"]
        password_confirm = attrs["password_confirm"]

        if password != password_confirm:
            raise serializers.ValidationError({"password_confirm": ["Passwords do not match."]})

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc

        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )


class RegisterUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()


class RegisterResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = RegisterUserSerializer()


class AuthMeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class DriverSeasonStandingSerializer(serializers.Serializer):
    driver_id = serializers.IntegerField()
    driver_name = serializers.CharField()
    team_name = serializers.CharField()
    total_points = serializers.IntegerField()
    wins = serializers.IntegerField()
    podiums = serializers.IntegerField()


class DriverSeasonStandingsResponseSerializer(serializers.Serializer):
    season = serializers.IntegerField()
    results = DriverSeasonStandingSerializer(many=True)


class ConstructorSeasonStandingSerializer(serializers.Serializer):
    team_id = serializers.IntegerField()
    team_name = serializers.CharField()
    total_points = serializers.IntegerField()
    wins = serializers.IntegerField()


class ConstructorSeasonStandingsResponseSerializer(serializers.Serializer):
    season = serializers.IntegerField()
    results = ConstructorSeasonStandingSerializer(many=True)


class ApiStatsSerializer(serializers.Serializer):
    total_teams = serializers.IntegerField()
    total_drivers = serializers.IntegerField()
    total_seasons = serializers.IntegerField()
    total_races = serializers.IntegerField()
    total_results = serializers.IntegerField()
    top_points = serializers.IntegerField()


class HealthCheckSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["ok", "degraded"])
    service = serializers.CharField()
    database = serializers.BooleanField()


class DetailMessageSerializer(serializers.Serializer):
    detail = serializers.CharField()


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

    def validate(self, attrs):
        validated = super().validate(attrs)

        race = validated.get("race", getattr(self.instance, "race", None))
        fastest_lap = validated.get("fastest_lap", getattr(self.instance, "fastest_lap", False))

        if race and fastest_lap:
            queryset = RaceResult.objects.filter(race=race, fastest_lap=True)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {"fastest_lap": ["Only one fastest lap per race is allowed."]}
                )

        return validated
