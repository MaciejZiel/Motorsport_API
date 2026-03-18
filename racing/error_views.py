from django.http import JsonResponse


def custom_404(request, exception):
    if request.path.startswith("/api/"):
        return JsonResponse(
            {
                "error": "not_found",
                "detail": "Resource not found.",
                "status_code": 404,
            },
            status=404,
        )
    return JsonResponse({"detail": "Not found."}, status=404)


def custom_500(request):
    if request.path.startswith("/api/"):
        return JsonResponse(
            {
                "error": "internal_server_error",
                "detail": "Unexpected server error.",
                "status_code": 500,
            },
            status=500,
        )
    return JsonResponse({"detail": "Server error."}, status=500)


def csrf_failure(request, reason=""):
    if request.path.startswith("/api/"):
        return JsonResponse(
            {
                "error": "forbidden",
                "detail": "CSRF verification failed.",
                "status_code": 403,
            },
            status=403,
        )
    return JsonResponse({"detail": "CSRF verification failed."}, status=403)
