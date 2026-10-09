import importlib
import os
from unittest import mock

from django.test import SimpleTestCase

import Motorsport_API.settings as project_settings


def load_settings(**env):
    """Re-import the settings module with a patched environment."""
    with mock.patch.dict(os.environ, env, clear=False):
        return importlib.reload(project_settings)


class RenderSettingsTests(SimpleTestCase):
    def tearDown(self):
        # Restore the module to the state derived from the real environment.
        importlib.reload(project_settings)

    def test_render_hostname_is_allowed_and_trusted_for_csrf(self):
        settings = load_settings(RENDER_EXTERNAL_HOSTNAME="motorsport-api.onrender.com")

        self.assertIn("motorsport-api.onrender.com", settings.ALLOWED_HOSTS)
        self.assertIn("https://motorsport-api.onrender.com", settings.CSRF_TRUSTED_ORIGINS)

    def test_render_hostname_is_not_duplicated(self):
        settings = load_settings(
            RENDER_EXTERNAL_HOSTNAME="api.onrender.com",
            DJANGO_ALLOWED_HOSTS="api.onrender.com",
            CSRF_TRUSTED_ORIGINS="https://api.onrender.com",
        )

        self.assertEqual(settings.ALLOWED_HOSTS.count("api.onrender.com"), 1)
        self.assertEqual(settings.CSRF_TRUSTED_ORIGINS.count("https://api.onrender.com"), 1)

    def test_no_render_hostname_keeps_defaults(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("RENDER_EXTERNAL_HOSTNAME", None)
            os.environ.pop("DJANGO_ALLOWED_HOSTS", None)
            settings = importlib.reload(project_settings)

        self.assertEqual(settings.ALLOWED_HOSTS, ["localhost", "127.0.0.1"])

    def test_secure_redirect_exempt_is_read_from_env(self):
        settings = load_settings(DJANGO_SECURE_REDIRECT_EXEMPT=r"^api/health/$")

        self.assertEqual(settings.SECURE_REDIRECT_EXEMPT, [r"^api/health/$"])

    def test_database_url_takes_precedence(self):
        settings = load_settings(DATABASE_URL="postgresql://u:p%40ss@db.internal:5433/motorsport")

        self.assertEqual(settings.DATABASES["default"]["HOST"], "db.internal")
        self.assertEqual(settings.DATABASES["default"]["PORT"], "5433")
        self.assertEqual(settings.DATABASES["default"]["PASSWORD"], "p@ss")
