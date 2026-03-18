from django.conf import settings


def _base_cookie_kwargs():
    kwargs = {
        "httponly": True,
        "secure": settings.JWT_AUTH_COOKIE_SECURE,
        "samesite": settings.JWT_AUTH_COOKIE_SAMESITE,
    }
    if settings.JWT_AUTH_COOKIE_DOMAIN:
        kwargs["domain"] = settings.JWT_AUTH_COOKIE_DOMAIN
    return kwargs


def set_auth_cookies(response, access_token: str, refresh_token: str):
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    base_kwargs = _base_cookie_kwargs()

    response.set_cookie(
        settings.JWT_AUTH_COOKIE_ACCESS,
        access_token,
        max_age=access_max_age,
        path=settings.JWT_AUTH_COOKIE_PATH,
        **base_kwargs,
    )
    response.set_cookie(
        settings.JWT_AUTH_COOKIE_REFRESH,
        refresh_token,
        max_age=refresh_max_age,
        path=settings.JWT_AUTH_COOKIE_REFRESH_PATH,
        **base_kwargs,
    )


def clear_auth_cookies(response):
    delete_kwargs = {"samesite": settings.JWT_AUTH_COOKIE_SAMESITE}
    if settings.JWT_AUTH_COOKIE_DOMAIN:
        delete_kwargs["domain"] = settings.JWT_AUTH_COOKIE_DOMAIN

    response.delete_cookie(
        settings.JWT_AUTH_COOKIE_ACCESS,
        path=settings.JWT_AUTH_COOKIE_PATH,
        **delete_kwargs,
    )
    response.delete_cookie(
        settings.JWT_AUTH_COOKIE_REFRESH,
        path=settings.JWT_AUTH_COOKIE_REFRESH_PATH,
        **delete_kwargs,
    )
