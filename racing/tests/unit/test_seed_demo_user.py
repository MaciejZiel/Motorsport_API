from io import StringIO
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

pytestmark = pytest.mark.django_db


def run_command(**env):
    out = StringIO()
    with mock.patch.dict("os.environ", env, clear=False):
        call_command("seed_demo_user", stdout=out)
    return out.getvalue()


def test_skips_when_password_is_not_set():
    output = run_command(DEMO_USER_PASSWORD="")

    assert "skipping" in output
    assert not get_user_model().objects.filter(username="demo").exists()


def test_creates_non_staff_demo_user():
    run_command(DEMO_USER_PASSWORD="demo-password-123")

    user = get_user_model().objects.get(username="demo")
    assert user.check_password("demo-password-123")
    assert not user.is_staff
    assert not user.is_superuser


def test_demotes_and_resets_existing_user():
    get_user_model().objects.create_superuser("demo", password="old-password")

    output = run_command(DEMO_USER_PASSWORD="new-password-456")

    user = get_user_model().objects.get(username="demo")
    assert "Reset" in output
    assert user.check_password("new-password-456")
    assert not user.is_staff
    assert not user.is_superuser


def test_demo_user_cannot_write(client):
    run_command(DEMO_USER_PASSWORD="demo-password-123")
    client.login(username="demo", password="demo-password-123")

    response = client.post("/api/v1/teams/", {"name": "Hackers", "country": "Nowhere"})

    assert response.status_code == 403
    assert "permission" in response.json()["detail"]
