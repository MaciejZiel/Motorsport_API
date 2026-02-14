from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Read JWT from Authorization header first, then from HttpOnly cookie."""

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token

        cookie_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE_ACCESS)
        if not cookie_token:
            return None

        validated_token = self.get_validated_token(cookie_token)
        return self.get_user(validated_token), validated_token

