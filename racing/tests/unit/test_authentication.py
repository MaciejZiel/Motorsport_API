from unittest.mock import patch

from django.conf import settings
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from racing.authentication import CookieJWTAuthentication


class CookieJWTAuthenticationTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.authentication = CookieJWTAuthentication()

    def test_returns_none_when_no_header_and_no_cookie(self):
        request = self.factory.get("/api/v1/drivers/")
        request.COOKIES.clear()

        with patch.object(self.authentication, "get_header", return_value=None):
            self.assertIsNone(self.authentication.authenticate(request))

    def test_uses_authorization_header_before_cookie(self):
        request = self.factory.get("/api/v1/drivers/")
        request.COOKIES[settings.JWT_AUTH_COOKIE_ACCESS] = "cookie-token"

        user = object()
        with (
            patch.object(self.authentication, "get_header", return_value=b"Bearer header-token"),
            patch.object(self.authentication, "get_raw_token", return_value=b"header-token"),
            patch.object(self.authentication, "get_validated_token", return_value="validated-header"),
            patch.object(self.authentication, "get_user", return_value=user),
        ):
            result = self.authentication.authenticate(request)

        self.assertEqual(result, (user, "validated-header"))

    def test_enforces_csrf_for_unsafe_cookie_authenticated_requests(self):
        request = self.factory.post("/api/v1/auth/logout/", {}, format="json")
        request.COOKIES[settings.JWT_AUTH_COOKIE_ACCESS] = "cookie-token"
        user = object()

        with (
            patch.object(self.authentication, "get_header", return_value=None),
            patch.object(self.authentication, "enforce_csrf") as csrf_mock,
            patch.object(self.authentication, "get_validated_token", return_value="validated-cookie"),
            patch.object(self.authentication, "get_user", return_value=user),
        ):
            result = self.authentication.authenticate(request)

        csrf_mock.assert_called_once_with(request)
        self.assertEqual(result, (user, "validated-cookie"))

    def test_does_not_enforce_csrf_for_safe_cookie_authenticated_requests(self):
        request = self.factory.get("/api/v1/auth/me/")
        request.COOKIES[settings.JWT_AUTH_COOKIE_ACCESS] = "cookie-token"
        user = object()

        with (
            patch.object(self.authentication, "get_header", return_value=None),
            patch.object(self.authentication, "enforce_csrf") as csrf_mock,
            patch.object(self.authentication, "get_validated_token", return_value="validated-cookie"),
            patch.object(self.authentication, "get_user", return_value=user),
        ):
            result = self.authentication.authenticate(request)

        csrf_mock.assert_not_called()
        self.assertEqual(result, (user, "validated-cookie"))
