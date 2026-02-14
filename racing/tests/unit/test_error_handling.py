from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError

from racing.error_views import custom_404, custom_500
from racing.exceptions import _build_error_payload, api_exception_handler


class ErrorPayloadTests(SimpleTestCase):
    def test_build_error_payload_uses_detail_for_single_detail_dict(self):
        payload = _build_error_payload(status.HTTP_400_BAD_REQUEST, {"detail": "Bad input."})
        self.assertEqual(payload["error"], "bad_request")
        self.assertEqual(payload["status_code"], status.HTTP_400_BAD_REQUEST)
        self.assertEqual(payload["detail"], "Bad input.")
        self.assertNotIn("errors", payload)

    def test_build_error_payload_keeps_field_errors_for_validation_dict(self):
        payload = _build_error_payload(status.HTTP_400_BAD_REQUEST, {"name": ["This field is required."]})
        self.assertEqual(payload["error"], "bad_request")
        self.assertEqual(payload["detail"], "Request failed.")
        self.assertEqual(payload["errors"], {"name": ["This field is required."]})

    def test_build_error_payload_normalizes_server_error(self):
        payload = _build_error_payload(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            {"detail": "Temporary issue", "code": "service_down"},
        )
        self.assertEqual(payload["error"], "internal_server_error")
        self.assertEqual(payload["detail"], "Unexpected server error.")
        self.assertEqual(payload["status_code"], status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertNotIn("errors", payload)


class ApiExceptionHandlerTests(SimpleTestCase):
    class DummyView:
        pass

    class ServiceUnavailable(APIException):
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        default_detail = "Service unavailable."

    def test_client_error_is_normalized_and_logged_as_warning(self):
        with patch("racing.exceptions.logger.warning") as warning_mock:
            response = api_exception_handler(
                ValidationError({"name": ["This field is required."]}),
                {"view": self.DummyView()},
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")
        self.assertEqual(response.data["detail"], "Request failed.")
        self.assertIn("errors", response.data)
        warning_mock.assert_called_once()

    def test_server_error_response_is_normalized_and_logged_as_error(self):
        with patch("racing.exceptions.logger.error") as error_mock:
            response = api_exception_handler(self.ServiceUnavailable(), {"view": self.DummyView()})

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["error"], "internal_server_error")
        self.assertEqual(response.data["detail"], "Unexpected server error.")
        self.assertEqual(response.data["status_code"], status.HTTP_503_SERVICE_UNAVAILABLE)
        error_mock.assert_called_once()

    def test_unhandled_exception_returns_generic_500_payload(self):
        with patch("racing.exceptions.logger.exception") as exception_mock:
            response = api_exception_handler(RuntimeError("boom"), {})

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["error"], "internal_server_error")
        self.assertEqual(response.data["detail"], "Unexpected server error.")
        self.assertEqual(response.data["status_code"], status.HTTP_500_INTERNAL_SERVER_ERROR)
        exception_mock.assert_called_once()


class ErrorViewsTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_api_404_returns_structured_payload(self):
        request = self.factory.get("/api/v1/unknown/")
        response = custom_404(request, Exception("missing"))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertJSONEqual(
            response.content,
            {
                "error": "not_found",
                "detail": "Resource not found.",
                "status_code": 404,
            },
        )

    def test_non_api_404_returns_simple_payload(self):
        request = self.factory.get("/unknown/")
        response = custom_404(request, Exception("missing"))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertJSONEqual(response.content, {"detail": "Not found."})

    def test_api_500_returns_structured_payload(self):
        request = self.factory.get("/api/v1/boom/")
        response = custom_500(request)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertJSONEqual(
            response.content,
            {
                "error": "internal_server_error",
                "detail": "Unexpected server error.",
                "status_code": 500,
            },
        )

    def test_non_api_500_returns_simple_payload(self):
        request = self.factory.get("/boom/")
        response = custom_500(request)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertJSONEqual(response.content, {"detail": "Server error."})
