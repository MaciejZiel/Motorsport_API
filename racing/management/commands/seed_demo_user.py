import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Create or reset a read-only (non-staff) demo account. "
        "The password is taken from DEMO_USER_PASSWORD; nothing happens when it is unset."
    )

    def add_arguments(self, parser):
        parser.add_argument("--username", default=os.getenv("DEMO_USER_USERNAME", "demo"))

    def handle(self, *args, **options):
        password = os.getenv("DEMO_USER_PASSWORD", "")
        if not password:
            self.stdout.write("DEMO_USER_PASSWORD is not set; skipping demo user.")
            return

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(username=options["username"])
        # Always demote: the demo account must never be able to write data,
        # even if someone promoted it by hand earlier.
        user.is_staff = False
        user.is_superuser = False
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "Created" if created else "Reset"
        self.stdout.write(self.style.SUCCESS(f"{action} read-only demo user '{user.username}'."))
