from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuthMeView,
    CsrfTokenView,
    DriverViewSet,
    LoginView,
    LogoutView,
    RegisterView,
    RaceResultViewSet,
    RaceViewSet,
    SeasonViewSet,
    TeamViewSet,
    TokenRefreshScopedView,
    api_stats,
    constructor_season_standings,
    driver_season_standings,
)

router = DefaultRouter()
router.register("drivers", DriverViewSet, basename="driver")
router.register("teams", TeamViewSet, basename="team")
router.register("seasons", SeasonViewSet, basename="season")
router.register("races", RaceViewSet, basename="race")
router.register("results", RaceResultViewSet, basename="result")

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="csrf_token"),
    path("auth/me/", AuthMeView.as_view(), name="auth_me"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/token/", LoginView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshScopedView.as_view(), name="token_refresh"),
    path("stats/", api_stats, name="api-stats"),
    path("standings/drivers/", driver_season_standings, name="driver-season-standings"),
    path("standings/constructors/", constructor_season_standings, name="constructor-season-standings"),
    path("", include(router.urls)),
]
