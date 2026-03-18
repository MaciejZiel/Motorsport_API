from django.apps import AppConfig


class RacingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "racing"

    def ready(self):
        # Register drf-spectacular schema extensions.
        from . import schema  # noqa: F401
