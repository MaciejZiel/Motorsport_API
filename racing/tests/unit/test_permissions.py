from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import SimpleTestCase
from rest_framework.permissions import SAFE_METHODS
from rest_framework.test import APIRequestFactory

from racing.permissions import IsAdminOrReadOnly


class IsAdminOrReadOnlyTests(SimpleTestCase):
    def setUp(self):
        self.permission = IsAdminOrReadOnly()
        self.factory = APIRequestFactory()

    def test_safe_methods_are_allowed_for_anonymous_user(self):
        request = self.factory.get("/api/v1/drivers/")
        request.user = AnonymousUser()
        self.assertIn(request.method, SAFE_METHODS)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_write_method_is_blocked_for_anonymous_user(self):
        request = self.factory.post("/api/v1/drivers/", {"name": "Test Driver"}, format="json")
        request.user = AnonymousUser()
        self.assertFalse(self.permission.has_permission(request, None))

    def test_write_method_is_allowed_for_staff_user(self):
        request = self.factory.post("/api/v1/drivers/", {"name": "Test Driver"}, format="json")
        User = get_user_model()
        request.user = User(username="staff", is_staff=True)
        self.assertTrue(self.permission.has_permission(request, None))
