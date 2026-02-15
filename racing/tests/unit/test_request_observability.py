from unittest.mock import patch

from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase

from racing.metrics import render_metrics, reset_metrics_state
from racing.middleware import RequestIdMiddleware
from racing.request_context import RequestIdFilter, get_request_id, reset_request_id, set_request_id


class RequestContextTests(SimpleTestCase):
    def test_request_id_filter_attaches_current_request_id(self):
        token = set_request_id("req-123")
        try:
            record = type("LogRecord", (), {})()
            self.assertTrue(RequestIdFilter().filter(record))
            self.assertEqual(record.request_id, "req-123")
        finally:
            reset_request_id(token)

    def test_request_id_context_can_be_reset(self):
        token = set_request_id("req-456")
        reset_request_id(token)
        self.assertEqual(get_request_id(), "-")


class RequestIdMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        reset_metrics_state()

    def test_adds_generated_request_id_and_response_header(self):
        middleware = RequestIdMiddleware(lambda _request: HttpResponse("ok"))
        request = self.factory.get("/api/health/")

        with patch("racing.middleware.request_logger.info") as info_mock:
            response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Request-ID", response)
        self.assertEqual(request.request_id, response["X-Request-ID"])
        self.assertLessEqual(len(response["X-Request-ID"]), 64)
        self.assertEqual(get_request_id(), "-")
        info_mock.assert_called_once()
        metrics_payload = render_metrics()
        self.assertIn('motorsport_http_requests_total{method="GET",path="/api/health/",status="200"} 1', metrics_payload)
        self.assertIn('motorsport_http_request_duration_ms_count{method="GET",path="/api/health/"} 1', metrics_payload)

    def test_uses_incoming_request_id_and_truncates_to_64_characters(self):
        middleware = RequestIdMiddleware(lambda _request: HttpResponse("ok"))
        incoming_request_id = "a" * 80
        request = self.factory.get("/api/health/", HTTP_X_REQUEST_ID=incoming_request_id)

        with patch("racing.middleware.request_logger.info"):
            response = middleware(request)

        self.assertEqual(response["X-Request-ID"], "a" * 64)

    def test_logs_exception_and_re_raises(self):
        def raise_error(_request):
            raise RuntimeError("boom")

        middleware = RequestIdMiddleware(raise_error)
        request = self.factory.get("/api/health/")

        with patch("racing.middleware.request_logger.exception") as exception_mock:
            with self.assertRaises(RuntimeError):
                middleware(request)

        exception_mock.assert_called_once()
        self.assertEqual(get_request_id(), "-")
        metrics_payload = render_metrics()
        self.assertIn('motorsport_http_requests_total{method="GET",path="/api/health/",status="500"} 1', metrics_payload)
