from django.conf import settings


class ContentSecurityPolicyMiddleware:
    """Attach a baseline CSP header when not set by upstream proxy."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if "Content-Security-Policy" not in response and settings.CONTENT_SECURITY_POLICY:
            response["Content-Security-Policy"] = settings.CONTENT_SECURITY_POLICY
        return response

