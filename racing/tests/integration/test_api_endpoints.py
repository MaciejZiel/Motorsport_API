from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from racing.models import Driver, Race, RaceResult, Season, Team
from racing.views import LoginView, LogoutView, RegisterView, TokenRefreshScopedView


class MotorsportApiTests(APITestCase):
    def setUp(self):
        cache.clear()

        self.team_red = Team.objects.create(name="Red Apex", country="Italy")
        self.team_blue = Team.objects.create(name="Blue Arrow", country="UK")

        self.driver_max = Driver.objects.create(name="Max Fast", team=self.team_red, points=410)
        self.driver_luca = Driver.objects.create(name="Luca Stone", team=self.team_red, points=180)
        self.driver_owen = Driver.objects.create(name="Owen Pace", team=self.team_blue, points=250)

        self.season_2026 = Season.objects.create(year=2026, name="World Championship 2026")
        self.race_1 = Race.objects.create(
            season=self.season_2026,
            round_number=1,
            name="Australian Grand Prix",
            country="Australia",
            race_date=date(2026, 3, 15),
        )
        self.race_2 = Race.objects.create(
            season=self.season_2026,
            round_number=2,
            name="Spanish Grand Prix",
            country="Spain",
            race_date=date(2026, 4, 19),
        )

        RaceResult.objects.create(race=self.race_1, driver=self.driver_max, position=1, points_earned=25)
        RaceResult.objects.create(race=self.race_1, driver=self.driver_owen, position=2, points_earned=18)
        RaceResult.objects.create(race=self.race_2, driver=self.driver_owen, position=1, points_earned=25)
        RaceResult.objects.create(race=self.race_2, driver=self.driver_max, position=2, points_earned=18)

        User = get_user_model()
        self.user = User.objects.create_user(username="user", password="testpass123")
        self.admin = User.objects.create_superuser(
            username="admin", email="admin@example.com", password="testpass123"
        )

    def _token_for(self, username, password):
        response = self.client.post(
            reverse("api-v1:token_obtain_pair"),
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["access"]

    def test_public_can_list_drivers(self):
        response = self.client.get(reverse("api-v1:driver-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_swagger_alias_is_available(self):
        response = self.client.get(reverse("schema-swagger-ui"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_root_redirects_to_swagger_docs(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(response["Location"], reverse("swagger-ui"))

    def test_health_endpoint_reports_api_and_database_status(self):
        response = self.client.get(reverse("api-health"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["service"], "motorsport-api")
        self.assertTrue(response.data["database"])

    def test_standings_are_sorted_descending(self):
        response = self.client.get(reverse("api-v1:driver-standings"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        points = [item["points"] for item in response.data["results"]]
        self.assertEqual(points, sorted(points, reverse=True))

    def test_filter_drivers_by_team(self):
        response = self.client.get(reverse("api-v1:driver-list"), {"team": self.team_red.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_teams_list_exposes_driver_count(self):
        response = self.client.get(reverse("api-v1:team-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first_team = response.data["results"][0]
        self.assertIn("driver_count", first_team)

    def test_public_cannot_create_driver(self):
        payload = {"name": "Guest Driver", "points": 10, "team_id": self.team_red.id}
        response = self.client.post(reverse("api-v1:driver-list"), payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_non_admin_cannot_create_driver(self):
        token = self._token_for("user", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        payload = {"name": "Member Driver", "points": 55, "team_id": self.team_red.id}
        response = self.client.post(reverse("api-v1:driver-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_driver(self):
        token = self._token_for("admin", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        payload = {"name": "Admin Driver", "points": 99, "team_id": self.team_red.id}
        response = self.client.post(reverse("api-v1:driver-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_stats_endpoint(self):
        response = self.client.get(reverse("api-v1:api-stats"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_teams"], 2)
        self.assertEqual(response.data["total_drivers"], 3)
        self.assertEqual(response.data["total_seasons"], 1)

    def test_driver_season_standings(self):
        response = self.client.get(reverse("api-v1:driver-season-standings"), {"season": 2026})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["season"], 2026)
        self.assertEqual(response.data["results"][0]["driver_name"], "Max Fast")
        self.assertEqual(response.data["results"][0]["total_points"], 43)

    def test_constructor_standings(self):
        response = self.client.get(reverse("api-v1:constructor-season-standings"), {"season": 2026})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["team_name"], "Blue Arrow")
        self.assertEqual(response.data["results"][0]["total_points"], 43)

    def test_results_filter_by_season(self):
        response = self.client.get(reverse("api-v1:result-list"), {"season": 2026})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 4)

    def test_admin_can_create_race_result(self):
        token = self._token_for("admin", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        new_driver = Driver.objects.create(name="Erik Volt", team=self.team_blue, points=0)
        payload = {
            "race_id": self.race_1.id,
            "driver_id": new_driver.id,
            "position": 3,
            "points_earned": 15,
            "fastest_lap": False,
        }
        response = self.client.post(reverse("api-v1:result-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_token_refresh_flow(self):
        token_response = self.client.post(
            reverse("api-v1:token_obtain_pair"),
            {"username": "admin", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        refresh = token_response.data["refresh"]

        refresh_response = self.client.post(
            reverse("api-v1:token_refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_auth_me_requires_authentication(self):
        response = self.client.get(reverse("api-v1:auth_me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_auth_me_returns_current_user_profile(self):
        token = self._token_for("admin", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get(reverse("api-v1:auth_me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "admin")
        self.assertTrue(response.data["is_staff"])
        self.assertTrue(response.data["is_superuser"])

    def test_logout_blacklists_refresh_token(self):
        token_response = self.client.post(
            reverse("api-v1:token_obtain_pair"),
            {"username": "admin", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        access = token_response.data["access"]
        refresh = token_response.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        logout_response = self.client.post(reverse("api-v1:logout"), {"refresh": refresh}, format="json")
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        refresh_response = self.client.post(
            reverse("api-v1:token_refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(refresh_response.data["error"], "unauthorized")

    def test_logout_requires_refresh_token(self):
        token = self._token_for("admin", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.post(reverse("api-v1:logout"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)
        self.assertIn("refresh", response.data["errors"])

    def test_auth_endpoints_define_throttle_scopes(self):
        self.assertEqual(LoginView.throttle_scope, "auth_login")
        self.assertEqual(TokenRefreshScopedView.throttle_scope, "auth_refresh")
        self.assertEqual(RegisterView.throttle_scope, "auth_register")
        self.assertEqual(LogoutView.throttle_scope, "auth_logout")

    def test_register_creates_user_and_returns_tokens(self):
        payload = {
            "username": "newfan",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = self.client.post(reverse("api-v1:register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "newfan")
        self.assertFalse(response.data["user"]["is_staff"])
        self.assertIn("is_superuser", response.data["user"])
        self.assertFalse(response.data["user"]["is_superuser"])
        User = get_user_model()
        self.assertTrue(User.objects.filter(username="newfan").exists())

    def test_register_rejects_duplicate_username(self):
        payload = {
            "username": "user",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = self.client.post(reverse("api-v1:register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)
        self.assertIn("username", response.data["errors"])

    def test_register_rejects_password_mismatch(self):
        payload = {
            "username": "newuser2",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass124!",
        }
        response = self.client.post(reverse("api-v1:register"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)
        self.assertIn("password_confirm", response.data["errors"])

    def test_public_cannot_create_race(self):
        payload = {
            "name": "Monaco Grand Prix",
            "country": "Monaco",
            "round_number": 3,
            "race_date": "2026-05-10",
            "season_id": self.season_2026.id,
        }
        response = self.client.post(reverse("api-v1:race-list"), payload, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_non_admin_cannot_create_race_result(self):
        token = self._token_for("user", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        payload = {
            "race_id": self.race_1.id,
            "driver_id": self.driver_luca.id,
            "position": 3,
            "points_earned": 15,
            "fastest_lap": False,
        }
        response = self.client.post(reverse("api-v1:result-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_races_filter_by_season_year(self):
        response = self.client.get(reverse("api-v1:race-list"), {"season": 2026})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_results_filter_by_driver(self):
        response = self.client.get(reverse("api-v1:result-list"), {"driver": self.driver_max.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_duplicate_race_position_is_rejected(self):
        token = self._token_for("admin", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        payload = {
            "race_id": self.race_1.id,
            "driver_id": self.driver_luca.id,
            "position": 1,
            "points_earned": 10,
            "fastest_lap": False,
        }
        response = self.client.post(reverse("api-v1:result-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertEqual(response.data["status_code"], status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)

    def test_duplicate_fastest_lap_per_race_is_rejected(self):
        token = self._token_for("admin", "testpass123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        RaceResult.objects.filter(race=self.race_1, driver=self.driver_max).update(fastest_lap=True)
        payload = {
            "race_id": self.race_1.id,
            "driver_id": self.driver_luca.id,
            "position": 3,
            "points_earned": 15,
            "fastest_lap": True,
        }

        response = self.client.post(reverse("api-v1:result-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)

    def test_invalid_driver_min_points_filter_returns_bad_request(self):
        response = self.client.get(reverse("api-v1:driver-list"), {"min_points": "abc"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)
        self.assertIn("min_points", response.data["errors"])

    def test_invalid_race_season_filter_returns_bad_request(self):
        response = self.client.get(reverse("api-v1:race-list"), {"season": "latest"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)
        self.assertIn("season", response.data["errors"])

    def test_invalid_result_driver_filter_returns_bad_request(self):
        response = self.client.get(reverse("api-v1:result-list"), {"driver": "fast"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)
        self.assertIn("driver", response.data["errors"])

    def test_invalid_standings_season_filter_returns_bad_request(self):
        response = self.client.get(reverse("api-v1:driver-season-standings"), {"season": "current"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertIn("errors", response.data)
        self.assertIn("season", response.data["errors"])

    def test_standings_without_season_use_latest(self):
        season_2025 = Season.objects.create(year=2025, name="World Championship 2025")
        race_old = Race.objects.create(
            season=season_2025,
            round_number=1,
            name="Old GP",
            country="Italy",
            race_date=date(2025, 3, 1),
        )
        RaceResult.objects.create(race=race_old, driver=self.driver_luca, position=1, points_earned=99)

        response = self.client.get(reverse("api-v1:driver-season-standings"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["season"], 2026)

    @override_settings(DEBUG=False, ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
    def test_api_404_returns_structured_json(self):
        response = self.client.get("/api/not-existing-endpoint/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["error"], "not_found")
        self.assertEqual(response.json()["status_code"], status.HTTP_404_NOT_FOUND)
