from django.conf import settings
from django.test import SimpleTestCase


class StaticFilesSettingsTests(SimpleTestCase):
    def test_static_root_is_configured(self):
        self.assertTrue(settings.STATIC_ROOT)

    def test_whitenoise_middleware_is_enabled(self):
        self.assertIn("whitenoise.middleware.WhiteNoiseMiddleware", settings.MIDDLEWARE)

