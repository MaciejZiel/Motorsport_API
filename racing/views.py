from django.conf import settings
from django.db import DatabaseError, connection
from django.db.models import Count, Max, Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema

from .auth_cookies import clear_auth_cookies, set_auth_cookies
from .models import Driver, Race, RaceResult, Season, Team
from .permissions import IsAdminOrReadOnly
from .serializers import (
    ApiStatsSerializer,
    AuthMeSerializer,
    ConstructorSeasonStandingsResponseSerializer,
    DetailMessageSerializer,
    DriverSeasonStandingsResponseSerializer,
    DriverSerializer,
    HealthCheckSerializer,
    LogoutSerializer,
    RaceResultSerializer,
    RaceSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
    SeasonSerializer,
    TeamDetailSerializer,
    TeamSerializer,
)


def parse_optional_int_query_param(
    query_value: str | None,
    param_name: str,
    *,
    allow_zero: bool = False,
) -> int | None:
    if query_value is None:
        return None

    normalized = query_value.strip()
    if not normalized:
        return None

    if not normalized.isdigit():
        raise ValidationError({param_name: ["Must be an integer."]})

    parsed = int(normalized)
    if parsed < 0 or (not allow_zero and parsed == 0):
        raise ValidationError({param_name: ["Must be a positive integer."]})

    return parsed


def resolve_season(query_value: str | None):
    season_value = parse_optional_int_query_param(query_value, "season")
    if season_value is not None:
        normalized = query_value.strip() if query_value else ""
        if len(normalized) == 4:
            return Season.objects.filter(year=season_value).first()
        return Season.objects.filter(id=season_value).first()
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

        team_id_value = parse_optional_int_query_param(team_id, "team")
        if team_id_value is not None:
            queryset = queryset.filter(team_id=team_id_value)
        if country:
            queryset = queryset.filter(team__country__icontains=country)
        min_points_value = parse_optional_int_query_param(min_points, "min_points", allow_zero=True)
        if min_points_value is not None:
            queryset = queryset.filter(points__gte=min_points_value)

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
        parsed_team_id = parse_optional_int_query_param(team_id, "team_id")
        if parsed_team_id is None:
            raise ValidationError({"team_id": ["This field is required."]})

        queryset = self.get_queryset().filter(team_id=parsed_team_id)
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
        year_value = parse_optional_int_query_param(year, "year")
        if year_value is not None:
            queryset = queryset.filter(year=year_value)
        return queryset


class RaceViewSet(viewsets.ModelViewSet):
    serializer_class = RaceSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Race.objects.select_related("season").all().order_by("season__year", "round_number")
        season = self.request.query_params.get("season")
        country = self.request.query_params.get("country")
        season_value = parse_optional_int_query_param(season, "season")
        if season_value is not None:
            normalized_season = season.strip() if season else ""
            if len(normalized_season) == 4:
                queryset = queryset.filter(season__year=season_value)
            else:
                queryset = queryset.filter(season_id=season_value)
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

        race_id_value = parse_optional_int_query_param(race_id, "race")
        if race_id_value is not None:
            queryset = queryset.filter(race_id=race_id_value)

        season_value = parse_optional_int_query_param(season, "season")
        if season_value is not None:
            normalized_season = season.strip() if season else ""
            if len(normalized_season) == 4:
                queryset = queryset.filter(race__season__year=season_value)
            else:
                queryset = queryset.filter(race__season_id=season_value)

        driver_id_value = parse_optional_int_query_param(driver_id, "driver")
        if driver_id_value is not None:
            queryset = queryset.filter(driver_id=driver_id_value)

        return queryset.order_by("race__race_date", "position")


class RegisterView(APIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_register"

    @extend_schema(request=RegisterSerializer, responses={201: RegisterResponseSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.get_username(),
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                },
            },
            status=status.HTTP_201_CREATED,
        )
        set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.get("access")
            refresh = response.data.get("refresh")
            if isinstance(access, str) and isinstance(refresh, str):
                set_auth_cookies(response, access, refresh)
        return response


class TokenRefreshScopedView(TokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_refresh"

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")
        if not isinstance(refresh_token, str) or not refresh_token.strip():
            refresh_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE_REFRESH, "")

        serializer = self.get_serializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        access = serializer.validated_data.get("access")
        refresh = serializer.validated_data.get("refresh")
        if isinstance(access, str):
            effective_refresh = refresh if isinstance(refresh, str) else refresh_token
            if isinstance(effective_refresh, str) and effective_refresh.strip():
                set_auth_cookies(response, access, effective_refresh)
        return response


class AuthMeView(APIView):
    serializer_class = AuthMeSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: AuthMeSerializer})
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
    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_logout"

    @extend_schema(
        request=LogoutSerializer,
        responses={204: OpenApiResponse(description="Refresh token blacklisted.")},
    )
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not isinstance(refresh_token, str) or not refresh_token.strip():
            refresh_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE_REFRESH)

        if not isinstance(refresh_token, str) or not refresh_token.strip():
            raise ValidationError({"refresh": ["This field is required."]})

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            raise ValidationError({"refresh": ["Invalid or expired refresh token."]}) from exc

        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


@extend_schema(
    parameters=[
        OpenApiParameter(
            name="season",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Season year (YYYY) or season id. Uses latest season when omitted.",
            required=False,
        )
    ],
    responses={
        200: DriverSeasonStandingsResponseSerializer,
        404: DetailMessageSerializer,
    },
)
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


@extend_schema(
    parameters=[
        OpenApiParameter(
            name="season",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Season year (YYYY) or season id. Uses latest season when omitted.",
            required=False,
        )
    ],
    responses={
        200: ConstructorSeasonStandingsResponseSerializer,
        404: DetailMessageSerializer,
    },
)
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


@extend_schema(responses={200: HealthCheckSerializer, 503: HealthCheckSerializer})
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    database_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        database_ok = False

    payload = {
        "status": "ok" if database_ok else "degraded",
        "service": "motorsport-api",
        "database": database_ok,
    }
    response_status = status.HTTP_200_OK if database_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(payload, status=response_status)


@extend_schema(responses={200: ApiStatsSerializer})
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
