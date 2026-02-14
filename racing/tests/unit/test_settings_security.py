from django.test import SimpleTestCase

from django.conf import settings

from Motorsport_API.settings import is_weak_secret_key


class SettingsSecurityTests(SimpleTestCase):
    def test_short_key_is_weak(self):
        self.assertTrue(is_weak_secret_key("short"))

    def test_django_generated_style_key_is_weak(self):
        key = "django-insecure-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        self.assertTrue(is_weak_secret_key(key))

    def test_long_high_entropy_key_is_not_weak(self):
        key = "x8R%2mQ!vL7#pZ1@dW4&nK9^tU3*eS6(yH0)fJ5+cB8-gP2=rN7"
        self.assertFalse(is_weak_secret_key(key))

    def test_content_security_policy_is_configured(self):
        self.assertTrue(settings.CONTENT_SECURITY_POLICY)

    def test_csp_middleware_is_enabled(self):
        self.assertIn("racing.middleware.ContentSecurityPolicyMiddleware", settings.MIDDLEWARE)
