from datetime import timedelta

from django.http import HttpResponse
from django.test import SimpleTestCase, override_settings

from racing.auth_cookies import clear_auth_cookies, set_auth_cookies


@override_settings(
    SIMPLE_JWT={
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    },
    JWT_AUTH_COOKIE_ACCESS="motorsport_access",
    JWT_AUTH_COOKIE_REFRESH="motorsport_refresh",
    JWT_AUTH_COOKIE_SECURE=True,
    JWT_AUTH_COOKIE_SAMESITE="Strict",
    JWT_AUTH_COOKIE_DOMAIN="example.com",
    JWT_AUTH_COOKIE_PATH="/",
    JWT_AUTH_COOKIE_REFRESH_PATH="/api/v1/auth/",
)
class AuthCookiesTests(SimpleTestCase):
    def test_set_auth_cookies_sets_cookie_security_and_domain(self):
        response = HttpResponse()

        set_auth_cookies(response, "access-token", "refresh-token")

        access_cookie = response.cookies["motorsport_access"]
        refresh_cookie = response.cookies["motorsport_refresh"]
        self.assertEqual(access_cookie["domain"], "example.com")
        self.assertEqual(refresh_cookie["domain"], "example.com")
        self.assertEqual(access_cookie["path"], "/")
        self.assertEqual(refresh_cookie["path"], "/api/v1/auth/")
        self.assertEqual(access_cookie["samesite"], "Strict")
        self.assertEqual(refresh_cookie["samesite"], "Strict")
        self.assertTrue(access_cookie["secure"])
        self.assertTrue(refresh_cookie["secure"])
        self.assertTrue(access_cookie["httponly"])
        self.assertTrue(refresh_cookie["httponly"])

    def test_clear_auth_cookies_uses_matching_domain_and_paths(self):
        response = HttpResponse()

        clear_auth_cookies(response)

        access_cookie = response.cookies["motorsport_access"]
        refresh_cookie = response.cookies["motorsport_refresh"]
        self.assertEqual(access_cookie["domain"], "example.com")
        self.assertEqual(refresh_cookie["domain"], "example.com")
        self.assertEqual(access_cookie["path"], "/")
        self.assertEqual(refresh_cookie["path"], "/api/v1/auth/")
        self.assertEqual(access_cookie["samesite"], "Strict")
        self.assertEqual(refresh_cookie["samesite"], "Strict")
