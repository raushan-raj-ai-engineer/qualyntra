"""
File: sdks/python/qualyntra/client.py
Purpose: Provides a standard-library HTTP client for submitting data to the Qualyntra control plane without framework lock-in.
Author: Raushan Raj
"""
import json
from urllib import request
from urllib.error import URLError

class QualyntraClient:
    def __init__(self, base_url: str, timeout_seconds: float = 10.0):
        self.base_url=base_url.rstrip("/")
        self.timeout_seconds=timeout_seconds

    def health(self) -> dict:
        req=request.Request(f"{self.base_url}/health", headers={"accept":"application/json"})
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except URLError as exc:
            raise RuntimeError(f"Qualyntra control plane unavailable: {exc}") from exc

