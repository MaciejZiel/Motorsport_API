import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("racing.api")

ERROR_CODE_BY_STATUS = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "unauthorized",
    status.HTTP_403_FORBIDDEN: "forbidden",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "unsupported_media_type",
    status.HTTP_429_TOO_MANY_REQUESTS: "too_many_requests",
}


def _build_error_payload(status_code: int, response_data):
    payload = {
        "error": ERROR_CODE_BY_STATUS.get(status_code, "api_error"),
        "status_code": status_code,
    }

    if isinstance(response_data, dict):
        detail = response_data.get("detail")
        if detail is not None and len(response_data) == 1:
            payload["detail"] = detail
        else:
            payload["detail"] = "Request failed."
            payload["errors"] = response_data
    else:
        payload["detail"] = response_data

    if status_code >= 500:
        payload["error"] = "internal_server_error"
        payload["detail"] = "Unexpected server error."
        payload.pop("errors", None)

    return payload


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    view = context.get("view")
    view_name = view.__class__.__name__ if view else "unknown"

    if response is None:
        logger.exception("Unhandled API exception in %s", view_name)
        return Response(
            {
                "error": "internal_server_error",
                "detail": "Unexpected server error.",
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response.status_code >= 500:
        logger.error("API server error %s in %s", response.status_code, view_name)
    elif response.status_code >= 400:
        logger.warning("API client error %s in %s", response.status_code, view_name)

    response.data = _build_error_payload(response.status_code, response.data)
    return response
