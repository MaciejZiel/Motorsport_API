import logging
import time
import uuid

from django.conf import settings

from .request_context import reset_request_id, set_request_id

request_logger = logging.getLogger("racing.request")


class RequestIdMiddleware:
    """Attach request IDs to logs and responses for easier tracing."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = (request.headers.get("X-Request-ID", "") or "").strip() or uuid.uuid4().hex
        request_id = request_id[:64]
        request.request_id = request_id
        token = set_request_id(request_id)
        started_at = time.perf_counter()

        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = int((time.perf_counter() - started_at) * 1000)
            request_logger.exception(
                "request_failed method=%s path=%s duration_ms=%s",
                request.method,
                request.get_full_path(),
                duration_ms,
            )
            reset_request_id(token)
            raise

        duration_ms = int((time.perf_counter() - started_at) * 1000)
        response["X-Request-ID"] = request_id
        request_logger.info(
            "request_completed method=%s path=%s status=%s duration_ms=%s",
            request.method,
            request.get_full_path(),
            response.status_code,
            duration_ms,
        )
        reset_request_id(token)
        return response


class ContentSecurityPolicyMiddleware:
    """Attach a baseline CSP header when not set by upstream proxy."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if "Content-Security-Policy" not in response and settings.CONTENT_SECURITY_POLICY:
            response["Content-Security-Policy"] = settings.CONTENT_SECURITY_POLICY
        return response
