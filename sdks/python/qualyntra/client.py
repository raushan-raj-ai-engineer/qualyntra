"""
File: sdks/python/qualyntra/client.py
Purpose: Provides a standard-library HTTP client for control-plane health and capability discovery without framework lock-in.
Author: Raushan Raj
"""
import json
from urllib import request
from urllib.error import URLError


class QualyntraClient:
    def __init__(self, base_url: str, timeout_seconds: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def _get_json(self, path: str) -> dict:
        req = request.Request(
            f"{self.base_url}{path}",
            headers={"accept": "application/json"},
        )
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except URLError as exc:
            raise RuntimeError(f"Qualyntra control plane unavailable: {exc}") from exc

    def health(self) -> dict:
        return self._get_json("/health")

    def capabilities(self) -> dict:
        return self._get_json("/capabilities")
