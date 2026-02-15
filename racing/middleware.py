import logging
import time
import uuid

from django.conf import settings

from .metrics import decrement_inflight_requests, increment_inflight_requests, observe_request
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
        increment_inflight_requests()

        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = int((time.perf_counter() - started_at) * 1000)
            observe_request(request.method, request.path, 500, duration_ms)
            request_logger.exception(
                "request_failed method=%s path=%s duration_ms=%s",
                request.method,
                request.get_full_path(),
                duration_ms,
            )
            raise
        else:
            duration_ms = int((time.perf_counter() - started_at) * 1000)
            response["X-Request-ID"] = request_id
            observe_request(request.method, request.path, response.status_code, duration_ms)
            request_logger.info(
                "request_completed method=%s path=%s status=%s duration_ms=%s",
                request.method,
                request.get_full_path(),
                response.status_code,
                duration_ms,
            )
            return response
        finally:
            decrement_inflight_requests()
            reset_request_id(token)


class ContentSecurityPolicyMiddleware:
    """Attach a baseline CSP header when not set by upstream proxy."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if "Content-Security-Policy" not in response and settings.CONTENT_SECURITY_POLICY:
            response["Content-Security-Policy"] = settings.CONTENT_SECURITY_POLICY
        return response
