"""Django settings for Motorsport_API project."""

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int = 0) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def database_from_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("Only PostgreSQL DATABASE_URL is supported")
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or "5432"),
    }


def get_database_config() -> dict:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_from_url(database_url)

    engine = os.getenv("DJANGO_DB_ENGINE", "sqlite").lower()
    if engine in {"postgres", "postgresql"}:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "motorsport_api"),
            "USER": os.getenv("POSTGRES_USER", "postgres"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("POSTGRES_CONN_MAX_AGE", "60")),
        }

    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }


DJANGO_ENV = os.getenv("DJANGO_ENV", "development").lower()
IS_PRODUCTION = DJANGO_ENV in {"production", "prod"}
DEV_FALLBACK_SECRET_KEY = "django-insecure-dev-only-key-change-me"


def is_weak_secret_key(secret_key: str) -> bool:
    return (
        len(secret_key) < 50
        or len(set(secret_key)) < 5
        or secret_key.startswith("django-insecure-")
    )


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_ENV=production.")
    SECRET_KEY = DEV_FALLBACK_SECRET_KEY
elif IS_PRODUCTION and is_weak_secret_key(SECRET_KEY):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY is too weak for production.")

DEBUG = env_bool("DJANGO_DEBUG", not IS_PRODUCTION)
if IS_PRODUCTION and DEBUG:
    raise ImproperlyConfigured("DJANGO_DEBUG must be False when DJANGO_ENV=production.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", False)
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:4200,http://127.0.0.1:4200,"
        "http://localhost:5173,http://127.0.0.1:5173"
    ),
)
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", False)
CORS_URLS_REGEX = r"^/api/.*$"
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "")

SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", IS_PRODUCTION)
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", IS_PRODUCTION)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", IS_PRODUCTION)
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 31536000 if IS_PRODUCTION else 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", IS_PRODUCTION)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", IS_PRODUCTION)
SECURE_CONTENT_TYPE_NOSNIFF = env_bool("DJANGO_SECURE_CONTENT_TYPE_NOSNIFF", True)
SECURE_REFERRER_POLICY = os.getenv("DJANGO_SECURE_REFERRER_POLICY", "same-origin")
X_FRAME_OPTIONS = os.getenv("DJANGO_X_FRAME_OPTIONS", "DENY")
CONTENT_SECURITY_POLICY = os.getenv(
    "DJANGO_CONTENT_SECURITY_POLICY",
    (
        "default-src 'self'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self'"
    ),
)
USE_X_FORWARDED_HOST = env_bool("DJANGO_USE_X_FORWARDED_HOST", False)
if env_bool("DJANGO_USE_X_FORWARDED_PROTO", IS_PRODUCTION):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "racing.apps.RacingConfig",
]

API_THROTTLE_ANON_RATE = os.getenv("API_THROTTLE_ANON_RATE", "120/minute")
API_THROTTLE_USER_RATE = os.getenv("API_THROTTLE_USER_RATE", "300/minute")
AUTH_LOGIN_THROTTLE_RATE = os.getenv("AUTH_LOGIN_THROTTLE_RATE", "20/minute")
AUTH_REFRESH_THROTTLE_RATE = os.getenv("AUTH_REFRESH_THROTTLE_RATE", "30/minute")
AUTH_REGISTER_THROTTLE_RATE = os.getenv("AUTH_REGISTER_THROTTLE_RATE", "10/minute")
AUTH_LOGOUT_THROTTLE_RATE = os.getenv("AUTH_LOGOUT_THROTTLE_RATE", "30/minute")
AUTH_CSRF_THROTTLE_RATE = os.getenv("AUTH_CSRF_THROTTLE_RATE", "120/minute")

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "racing.authentication.CookieJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": API_THROTTLE_ANON_RATE,
        "user": API_THROTTLE_USER_RATE,
        "auth_login": AUTH_LOGIN_THROTTLE_RATE,
        "auth_refresh": AUTH_REFRESH_THROTTLE_RATE,
        "auth_register": AUTH_REGISTER_THROTTLE_RATE,
        "auth_logout": AUTH_LOGOUT_THROTTLE_RATE,
        "auth_csrf": AUTH_CSRF_THROTTLE_RATE,
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "EXCEPTION_HANDLER": "racing.exceptions.api_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_TOKEN_MINUTES", 10)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_TOKEN_DAYS", 7)),
    "ROTATE_REFRESH_TOKENS": env_bool("JWT_ROTATE_REFRESH_TOKENS", True),
    "BLACKLIST_AFTER_ROTATION": env_bool("JWT_BLACKLIST_AFTER_ROTATION", True),
    "UPDATE_LAST_LOGIN": env_bool("JWT_UPDATE_LAST_LOGIN", False),
}

JWT_AUTH_COOKIE_ACCESS = os.getenv("JWT_AUTH_COOKIE_ACCESS", "motorsport_access")
JWT_AUTH_COOKIE_REFRESH = os.getenv("JWT_AUTH_COOKIE_REFRESH", "motorsport_refresh")
JWT_AUTH_COOKIE_SECURE = env_bool("JWT_AUTH_COOKIE_SECURE", IS_PRODUCTION)
JWT_AUTH_COOKIE_SAMESITE = os.getenv("JWT_AUTH_COOKIE_SAMESITE", "Lax")
if JWT_AUTH_COOKIE_SAMESITE not in {"Lax", "Strict", "None"}:
    JWT_AUTH_COOKIE_SAMESITE = "Lax"
JWT_AUTH_COOKIE_DOMAIN = os.getenv("JWT_AUTH_COOKIE_DOMAIN", "")
JWT_AUTH_COOKIE_PATH = os.getenv("JWT_AUTH_COOKIE_PATH", "/")
JWT_AUTH_COOKIE_REFRESH_PATH = os.getenv("JWT_AUTH_COOKIE_REFRESH_PATH", "/api/v1/auth/")

SPECTACULAR_SETTINGS = {
    "TITLE": "Motorsport API",
    "DESCRIPTION": "Django REST API for motorsport data (F1-style).",
    "VERSION": "2.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "racing.middleware.RequestIdMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "racing.middleware.ContentSecurityPolicyMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "Motorsport_API.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "Motorsport_API.wsgi.application"

DATABASES = {"default": get_database_config()}

CACHE_URL = os.getenv("DJANGO_CACHE_URL", "").strip()
if CACHE_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": CACHE_URL,
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
            "KEY_PREFIX": os.getenv("DJANGO_CACHE_KEY_PREFIX", "motorsport_api"),
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "motorsport-api-cache",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"

LOG_LEVEL = os.getenv("DJANGO_LOG_LEVEL", "INFO").upper()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {
            "()": "racing.request_context.RequestIdFilter",
        },
    },
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s [%(name)s] [request_id=%(request_id)s] %(message)s",
        },
        "simple": {
            "format": "%(levelname)s [%(name)s] [request_id=%(request_id)s] %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "filters": ["request_id"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "racing": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
