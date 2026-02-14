from django.conf import settings
from django.test import SimpleTestCase


class CacheSettingsTests(SimpleTestCase):
    def test_default_cache_backend_is_configured(self):
        self.assertIn("default", settings.CACHES)
        self.assertIn("BACKEND", settings.CACHES["default"])

    def test_request_id_middleware_is_enabled(self):
        self.assertIn("racing.middleware.RequestIdMiddleware", settings.MIDDLEWARE)
