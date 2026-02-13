from django.db.models import Count, Max, Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Driver, Race, RaceResult, Season, Team
from .permissions import IsAdminOrReadOnly
from .serializers import (
    DriverSerializer,
    RaceResultSerializer,
    RaceSerializer,
    RegisterSerializer,
    SeasonSerializer,
    TeamDetailSerializer,
    TeamSerializer,
)


def resolve_season(query_value: str | None):
    if query_value:
        if query_value.isdigit() and len(query_value) == 4:
            return Season.objects.filter(year=int(query_value)).first()
        if query_value.isdigit():
            return Season.objects.filter(id=int(query_value)).first()
    return Season.objects.order_by("-year").first()


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Team.objects.annotate(driver_count=Count("drivers")).order_by("name")
        country = self.request.query_params.get("country")
        name = self.request.query_params.get("name")
        if country:
            queryset = queryset.filter(country__icontains=country)
        if name:
            queryset = queryset.filter(name__icontains=name)
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TeamDetailSerializer
        return TeamSerializer


class DriverViewSet(viewsets.ModelViewSet):
    serializer_class = DriverSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Driver.objects.select_related("team").all()

        team_id = self.request.query_params.get("team")
        country = self.request.query_params.get("country")
        min_points = self.request.query_params.get("min_points")

        if team_id:
            queryset = queryset.filter(team_id=team_id)
        if country:
            queryset = queryset.filter(team__country__icontains=country)
        if min_points and min_points.isdigit():
            queryset = queryset.filter(points__gte=int(min_points))

        return queryset.order_by("-points", "name")

    @action(detail=False, methods=["get"], url_path="standings")
    def standings(self, request):
        queryset = self.get_queryset().order_by("-points", "name")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"by-team/(?P<team_id>[^/.]+)")
    def by_team(self, request, team_id=None):
        queryset = self.get_queryset().filter(team_id=team_id)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class SeasonViewSet(viewsets.ModelViewSet):
    serializer_class = SeasonSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Season.objects.annotate(race_count=Count("races"))
        year = self.request.query_params.get("year")
        if year and year.isdigit():
            queryset = queryset.filter(year=int(year))
        return queryset


class RaceViewSet(viewsets.ModelViewSet):
    serializer_class = RaceSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Race.objects.select_related("season").all().order_by("season__year", "round_number")
        season = self.request.query_params.get("season")
        country = self.request.query_params.get("country")
        if season and season.isdigit():
            if len(season) == 4:
                queryset = queryset.filter(season__year=int(season))
            else:
                queryset = queryset.filter(season_id=int(season))
        if country:
            queryset = queryset.filter(country__icontains=country)
        return queryset


class RaceResultViewSet(viewsets.ModelViewSet):
    serializer_class = RaceResultSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = RaceResult.objects.select_related("race", "race__season", "driver", "driver__team")
        race_id = self.request.query_params.get("race")
        season = self.request.query_params.get("season")
        driver_id = self.request.query_params.get("driver")

        if race_id and race_id.isdigit():
            queryset = queryset.filter(race_id=int(race_id))
        if season and season.isdigit():
            if len(season) == 4:
                queryset = queryset.filter(race__season__year=int(season))
            else:
                queryset = queryset.filter(race__season_id=int(season))
        if driver_id and driver_id.isdigit():
            queryset = queryset.filter(driver_id=int(driver_id))

        return queryset.order_by("race__race_date", "position")


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.get_username(),
                    "is_staff": user.is_staff,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"


class TokenRefreshScopedView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_refresh"


class AuthMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.get_username(),
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_logout"

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not isinstance(refresh_token, str) or not refresh_token.strip():
            raise ValidationError({"refresh": ["This field is required."]})

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            raise ValidationError({"refresh": ["Invalid or expired refresh token."]}) from exc

        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([AllowAny])
def driver_season_standings(request):
    season = resolve_season(request.query_params.get("season"))
    if not season:
        return Response({"detail": "No seasons available."}, status=status.HTTP_404_NOT_FOUND)

    standings = (
        RaceResult.objects.filter(race__season=season)
        .values("driver_id", "driver__name", "driver__team__name")
        .annotate(
            total_points=Sum("points_earned"),
            wins=Count("id", filter=Q(position=1)),
            podiums=Count("id", filter=Q(position__lte=3)),
        )
        .order_by("-total_points", "-wins", "driver__name")
    )

    payload = [
        {
            "driver_id": row["driver_id"],
            "driver_name": row["driver__name"],
            "team_name": row["driver__team__name"],
            "total_points": row["total_points"] or 0,
            "wins": row["wins"],
            "podiums": row["podiums"],
        }
        for row in standings
    ]
    return Response({"season": season.year, "results": payload}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def constructor_season_standings(request):
    season = resolve_season(request.query_params.get("season"))
    if not season:
        return Response({"detail": "No seasons available."}, status=status.HTTP_404_NOT_FOUND)

    standings = (
        RaceResult.objects.filter(race__season=season)
        .values("driver__team_id", "driver__team__name")
        .annotate(total_points=Sum("points_earned"), wins=Count("id", filter=Q(position=1)))
        .order_by("-total_points", "-wins", "driver__team__name")
    )

    payload = [
        {
            "team_id": row["driver__team_id"],
            "team_name": row["driver__team__name"],
            "total_points": row["total_points"] or 0,
            "wins": row["wins"],
        }
        for row in standings
    ]
    return Response({"season": season.year, "results": payload}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def api_stats(request):
    stats = {
        "total_teams": Team.objects.count(),
        "total_drivers": Driver.objects.count(),
        "total_seasons": Season.objects.count(),
        "total_races": Race.objects.count(),
        "total_results": RaceResult.objects.count(),
        "top_points": Driver.objects.aggregate(max_points=Max("points"))["max_points"] or 0,
    }
    return Response(stats, status=status.HTTP_200_OK)
