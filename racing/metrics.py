import time
from collections import defaultdict
from threading import Lock

_metrics_lock = Lock()
_process_start_time = time.time()

_inflight_requests = 0
_requests_total = defaultdict(int)
_request_duration_ms_sum = defaultdict(float)
_request_duration_ms_count = defaultdict(int)


def _escape_label(value: str) -> str:
    return value.replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')


def _request_labels_key(method: str, path: str, status_code: int) -> tuple[str, str, str]:
    return method.upper(), path, str(status_code)


def _duration_labels_key(method: str, path: str) -> tuple[str, str]:
    return method.upper(), path


def increment_inflight_requests() -> None:
    global _inflight_requests
    with _metrics_lock:
        _inflight_requests += 1


def decrement_inflight_requests() -> None:
    global _inflight_requests
    with _metrics_lock:
        _inflight_requests = max(0, _inflight_requests - 1)


def observe_request(method: str, path: str, status_code: int, duration_ms: int) -> None:
    request_key = _request_labels_key(method, path, status_code)
    duration_key = _duration_labels_key(method, path)

    with _metrics_lock:
        _requests_total[request_key] += 1
        _request_duration_ms_sum[duration_key] += float(max(0, duration_ms))
        _request_duration_ms_count[duration_key] += 1


def reset_metrics_state() -> None:
    global _inflight_requests
    with _metrics_lock:
        _inflight_requests = 0
        _requests_total.clear()
        _request_duration_ms_sum.clear()
        _request_duration_ms_count.clear()


def render_metrics() -> str:
    with _metrics_lock:
        inflight = _inflight_requests
        requests_total = sorted(_requests_total.items())
        durations_sum = sorted(_request_duration_ms_sum.items())
        durations_count = sorted(_request_duration_ms_count.items())
        process_start_time = _process_start_time

    lines = [
        "# HELP motorsport_http_requests_total Total HTTP requests served by the API.",
        "# TYPE motorsport_http_requests_total counter",
    ]
    for (method, path, status_code), value in requests_total:
        lines.append(
            'motorsport_http_requests_total{method="%s",path="%s",status="%s"} %s'
            % (_escape_label(method), _escape_label(path), _escape_label(status_code), value)
        )

    lines.extend(
        [
            "# HELP motorsport_http_request_duration_ms_sum Sum of HTTP request duration in milliseconds.",
            "# TYPE motorsport_http_request_duration_ms_sum counter",
        ]
    )
    for (method, path), value in durations_sum:
        lines.append(
            'motorsport_http_request_duration_ms_sum{method="%s",path="%s"} %s'
            % (_escape_label(method), _escape_label(path), value)
        )

    lines.extend(
        [
            "# HELP motorsport_http_request_duration_ms_count Count of observed HTTP requests for duration metric.",
            "# TYPE motorsport_http_request_duration_ms_count counter",
        ]
    )
    for (method, path), value in durations_count:
        lines.append(
            'motorsport_http_request_duration_ms_count{method="%s",path="%s"} %s'
            % (_escape_label(method), _escape_label(path), value)
        )

    lines.extend(
        [
            "# HELP motorsport_http_inflight_requests Number of requests currently being processed.",
            "# TYPE motorsport_http_inflight_requests gauge",
            f"motorsport_http_inflight_requests {inflight}",
            "# HELP motorsport_process_start_time_seconds Unix time when the API process started.",
            "# TYPE motorsport_process_start_time_seconds gauge",
            f"motorsport_process_start_time_seconds {process_start_time}",
        ]
    )

    return "\n".join(lines) + "\n"
