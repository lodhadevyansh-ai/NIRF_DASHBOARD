"""NIRF Analytics Dashboard — Multi-Provider External LLM Client & Orchestrator.

Implements a multi-layer external AI architecture supporting:
- Layer 2: First External AI API (Primary External Intelligence)
- Layer 3: Second External AI API (Supplementary & Failover Intelligence)

Features:
- Provider-agnostic HTTP inference (Google Gemini, OpenAI, Anthropic, OpenRouter, Ollama)
- Automatic failover if primary provider encounters rate limits (429), quota exhaustion, or timeouts
- Security-first API key redaction (never logged or exposed to clients)
- Independent provider health metrics, latency tracking, and quota monitoring
- Robust JSON response extraction and numerical claim validation
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def redact_key(key: Optional[str]) -> str:
    """Safely mask API key for logging and health checks."""
    if not key:
        return "[NOT SET]"
    s = key.strip()
    if len(s) <= 8:
        return "[SET]"
    return f"{s[:6]}...{s[-4:]}"


class LLMClient:
    """Resilient, provider-agnostic HTTP client for an individual external LLM provider."""

    def __init__(
        self,
        name: str = "External LLM",
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        max_tokens: Optional[int] = None,
        enabled: Optional[bool] = None,
        temperature: Optional[float] = None,
    ) -> None:
        self.name = name
        self.provider = (provider or settings.LLM_PROVIDER or "gemini").lower()
        self.model = model or settings.LLM_MODEL or "gemini-3.5-flash"
        self.api_key = api_key if api_key is not None else settings.LLM_API_KEY
        self.temperature = temperature if temperature is not None else settings.LLM_TEMPERATURE
        self.timeout = timeout if timeout is not None else settings.LLM_TIMEOUT
        self.max_retries = max_retries if max_retries is not None else settings.LLM_MAX_RETRIES
        self.max_tokens = max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS
        self.enabled = enabled if enabled is not None else settings.LLM_ENABLED

        # Base URL resolution
        if base_url:
            self.base_url = base_url.rstrip("/")
        elif settings.LLM_BASE_URL and self.name == "First AI API":
            self.base_url = settings.LLM_BASE_URL.rstrip("/")
        else:
            if self.provider == "anthropic":
                self.base_url = "https://api.anthropic.com/v1"
            elif self.provider == "gemini":
                self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
            elif self.provider == "openrouter":
                self.base_url = "https://openrouter.ai/api/v1"
            elif self.provider == "ollama":
                self.base_url = "http://localhost:11434/v1"
            else:
                self.base_url = "https://api.openai.com/v1"

        # Runtime telemetry & health metrics
        self.total_calls = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.total_tokens_estimated = 0
        self.last_latency_seconds: Optional[float] = None
        self.last_status_code: Optional[int] = None
        self.last_error_message: Optional[str] = None
        self.consecutive_errors = 0
        self.cooldown_until: float = 0.0
        self.quota_exhausted: bool = False

    def is_configured(self) -> bool:
        """Check whether external LLM provider credentials are configured and active."""
        if not self.enabled:
            return False
        if self.provider == "ollama" or "localhost" in self.base_url or "127.0.0.1" in self.base_url:
            return True
        return bool(self.api_key and self.api_key.strip() and self.api_key != "your_api_key_here")

    def is_available(self) -> bool:
        """Check if provider is configured and not in cooldown due to quota exhaustion."""
        if not self.is_configured():
            return False
        if time.time() < self.cooldown_until:
            return False
        return True

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """Execute chat completion request with exponential backoff retries and quota tracking."""
        if not self.is_configured():
            raise RuntimeError(f"{self.name} is not configured (provider={self.provider}, key={redact_key(self.api_key)}).")

        if time.time() < self.cooldown_until:
            rem = int(self.cooldown_until - time.time())
            raise RuntimeError(f"{self.name} is in rate-limit cooldown for another {rem}s.")

        self.total_calls += 1
        effective_max_tokens = max_tokens or self.max_tokens
        effective_temp = self.temperature if temperature is None else temperature

        headers, payload, endpoint = self._prepare_request(messages, json_mode, effective_max_tokens, effective_temp)

        start_t = time.time()
        last_error = None

        for attempt in range(self.max_retries + 1):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(endpoint, json=payload, headers=headers)

                self.last_status_code = response.status_code
                self.last_latency_seconds = round(time.time() - start_t, 3)

                if response.status_code == 200:
                    self.successful_calls += 1
                    self.consecutive_errors = 0
                    self.quota_exhausted = False
                    data = response.json()
                    content = self._extract_response_content(data)
                    self.total_tokens_estimated += len(content.split()) * 2
                    return content

                # Check specifically for 429 quota exhaustion vs transient rate limit
                if response.status_code == 429:
                    err_txt = response.text.lower()
                    if "exceeded your current quota" in err_txt or "billing" in err_txt or "resource_exhausted" in err_txt:
                        self.quota_exhausted = True
                        self.cooldown_until = time.time() + 90.0  # Put on 90s cooldown
                        self.failed_calls += 1
                        self.consecutive_errors += 1
                        self.last_error_message = "Quota exceeded (HTTP 429)"
                        logger.warning("%s quota exhausted. Triggering cooldown and failover.", self.name)
                        raise RuntimeError(f"{self.name} quota exceeded (HTTP 429).")

                    # Transient 429 (RPM limit): apply backoff
                    if attempt < self.max_retries:
                        backoff = max(3.0, (2 ** attempt) * 2.5)
                        logger.warning("%s transient 429 rate limit. Retrying in %.1fs...", self.name, backoff)
                        time.sleep(backoff)
                        continue

                if response.status_code in (500, 502, 503, 504) and attempt < self.max_retries:
                    backoff = (2 ** attempt) * 1.5
                    logger.warning("%s transient server error %d. Retrying in %.1fs...", self.name, response.status_code, backoff)
                    time.sleep(backoff)
                    continue

                # Unrecoverable error
                error_body = response.text[:250]
                self.failed_calls += 1
                self.consecutive_errors += 1
                self.last_error_message = f"HTTP {response.status_code}: {error_body}"
                raise RuntimeError(f"{self.name} returned HTTP {response.status_code}: {error_body}")

            except httpx.TimeoutException as exc:
                last_error = exc
                if attempt < self.max_retries:
                    backoff = (2 ** attempt) * 1.0
                    time.sleep(backoff)
                    continue
                self.failed_calls += 1
                self.consecutive_errors += 1
                self.last_error_message = f"Timeout after {self.timeout}s"
                raise RuntimeError(f"{self.name} request timed out after {self.timeout}s.") from exc

            except Exception as exc:
                last_error = exc
                if isinstance(exc, RuntimeError):
                    raise
                if attempt < self.max_retries:
                    time.sleep((2 ** attempt) * 1.0)
                    continue
                self.failed_calls += 1
                self.consecutive_errors += 1
                self.last_error_message = str(exc)[:200]
                raise

        self.failed_calls += 1
        self.consecutive_errors += 1
        raise RuntimeError(f"{self.name} failed after {self.max_retries + 1} attempts: {last_error}")

    def _prepare_request(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> Tuple[Dict[str, str], Dict[str, Any], str]:
        """Format request headers, payload, and endpoint URL according to provider dialect."""
        if self.provider == "anthropic":
            endpoint = f"{self.base_url}/messages"
            headers = {
                "x-api-key": self.api_key or "",
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            system_msg = ""
            user_assistant_msgs = []
            for m in messages:
                if m.get("role") == "system":
                    system_msg += m.get("content", "") + "\n"
                else:
                    user_assistant_msgs.append({"role": m.get("role", "user"), "content": m.get("content", "")})

            payload = {
                "model": self.model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": user_assistant_msgs,
            }
            if system_msg.strip():
                payload["system"] = system_msg.strip()
            return headers, payload, endpoint

        # Default: OpenAI-compatible standard (Google Gemini, OpenAI, OpenRouter, Groq, Ollama)
        endpoint = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key or ''}",
        }
        if self.provider == "gemini":
            headers["x-goog-api-key"] = self.api_key or ""
        elif self.provider == "openrouter":
            headers["HTTP-Referer"] = "https://nirf-analytics.internal"
            headers["X-Title"] = "NIRF Analytics Dashboard"

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        return headers, payload, endpoint

    def _extract_response_content(self, data: Dict[str, Any]) -> str:
        """Extract text content from provider response JSON."""
        if "content" in data and isinstance(data["content"], list):
            texts = [c.get("text", "") for c in data["content"] if c.get("type") == "text"]
            return "".join(texts).strip()

        choices = data.get("choices", [])
        if choices and isinstance(choices, list):
            msg = choices[0].get("message", {})
            return (msg.get("content") or "").strip()

        if "text" in data:
            return str(data["text"]).strip()

        return ""

    def check_health(self) -> Dict[str, Any]:
        """Perform non-destructive health and connectivity audit of the client."""
        is_conf = self.is_configured()
        is_avail = self.is_available()

        if not is_conf:
            status_label = "unconfigured"
        elif self.quota_exhausted:
            status_label = "quota_exhausted"
        elif not is_avail:
            status_label = "rate_limit_cooldown"
        else:
            status_label = "ready"

        return {
            "name": self.name,
            "provider": self.provider,
            "model": self.model,
            "configured": is_conf,
            "available": is_avail,
            "status": status_label,
            "base_url": self.base_url,
            "key_masked": redact_key(self.api_key),
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "last_latency_seconds": self.last_latency_seconds,
            "last_status_code": self.last_status_code,
            "last_error": self.last_error_message,
        }


class MultiAIOrchestrator:
    """Centralized multi-layer AI orchestrator coordinating First and Second AI APIs with automatic failover."""

    def __init__(self) -> None:
        # Resolve Layer 2: First AI API
        first_key = settings.FIRST_AI_API_KEY or settings.LLM_API_KEY
        first_provider = settings.FIRST_AI_PROVIDER or settings.LLM_PROVIDER or "gemini"
        first_model = settings.FIRST_AI_MODEL or settings.LLM_MODEL or "gemini-3.5-flash"
        first_url = settings.FIRST_AI_BASE_URL or settings.LLM_BASE_URL
        first_enabled = settings.FIRST_AI_ENABLED if settings.FIRST_AI_ENABLED is not None else settings.LLM_ENABLED

        self.first_client = LLMClient(
            name="First AI API",
            provider=first_provider,
            model=first_model,
            api_key=first_key,
            base_url=first_url,
            timeout=settings.LLM_TIMEOUT,
            max_retries=settings.LLM_MAX_RETRIES,
            max_tokens=settings.LLM_MAX_TOKENS,
            enabled=first_enabled,
            temperature=settings.LLM_TEMPERATURE,
        )

        # Resolve Layer 3: Second AI API
        second_key = settings.SECOND_AI_API_KEY
        second_provider = settings.SECOND_AI_PROVIDER or "gemini"
        second_model = settings.SECOND_AI_MODEL or "gemini-3.5-flash"
        second_url = settings.SECOND_AI_BASE_URL
        second_enabled = settings.SECOND_AI_ENABLED

        self.second_client = LLMClient(
            name="Second AI API",
            provider=second_provider,
            model=second_model,
            api_key=second_key,
            base_url=second_url,
            timeout=settings.LLM_TIMEOUT,
            max_retries=settings.LLM_MAX_RETRIES,
            max_tokens=settings.LLM_MAX_TOKENS,
            enabled=second_enabled,
            temperature=settings.LLM_TEMPERATURE,
        )

        # Telemetry
        self.last_provider_used: Optional[str] = None
        self.total_failovers = 0

    def is_configured(self) -> bool:
        """Check whether at least one external AI provider is configured."""
        return self.first_client.is_configured() or self.second_client.is_configured()

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        preferred_provider: str = "auto",
    ) -> str:
        """Execute chat completion with intelligent multi-layer failover."""
        content, _ = self.chat_completion_with_provider(
            messages=messages,
            json_mode=json_mode,
            max_tokens=max_tokens,
            temperature=temperature,
            preferred_provider=preferred_provider,
        )
        return content

    def chat_completion_with_provider(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        preferred_provider: str = "auto",
    ) -> Tuple[str, str]:
        """Execute chat completion and return both the content and the active provider identity."""
        first_avail = self.first_client.is_available()
        second_avail = self.second_client.is_available()

        if not first_avail and not second_avail:
            # If both are in cooldown or unconfigured, check if either is at least configured
            if self.first_client.is_configured():
                target_primary = self.first_client
                target_secondary = self.second_client if self.second_client.is_configured() else None
            elif self.second_client.is_configured():
                target_primary = self.second_client
                target_secondary = None
            else:
                raise RuntimeError("No external AI API is configured or available.")
        elif preferred_provider == "second":
            target_primary = self.second_client if second_avail else self.first_client
            target_secondary = self.first_client if (second_avail and first_avail) else None
        else:
            # Default auto routing: prefer First AI if available, else Second AI
            if first_avail:
                target_primary = self.first_client
                target_secondary = self.second_client if self.second_client.is_configured() else None
            else:
                target_primary = self.second_client
                target_secondary = self.first_client if self.first_client.is_configured() else None

        # 1. Attempt primary target
        try:
            logger.info("Executing chat completion using %s (model=%s)...", target_primary.name, target_primary.model)
            res = target_primary.chat_completion(
                messages=messages,
                json_mode=json_mode,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            self.last_provider_used = target_primary.name
            return res, target_primary.name

        except Exception as primary_exc:
            logger.warning(
                "%s call failed: %s. Checking secondary failover provider...",
                target_primary.name, primary_exc
            )

            # 2. Seamless failover to secondary provider if available
            if target_secondary and target_secondary.is_configured() and target_secondary != target_primary:
                self.total_failovers += 1
                logger.info(
                    "Failing over to %s (model=%s)...",
                    target_secondary.name, target_secondary.model
                )
                try:
                    res = target_secondary.chat_completion(
                        messages=messages,
                        json_mode=json_mode,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )
                    self.last_provider_used = target_secondary.name
                    return res, target_secondary.name
                except Exception as secondary_exc:
                    logger.error("Failover provider %s also failed: %s", target_secondary.name, secondary_exc)
                    raise RuntimeError(
                        f"Both external AI APIs failed. (Primary {target_primary.name}: {primary_exc} | "
                        f"Secondary {target_secondary.name}: {secondary_exc})"
                    ) from secondary_exc

            raise primary_exc

    @staticmethod
    def extract_json(raw_text: str) -> Dict[str, Any]:
        """Robustly parse JSON object from LLM response even if surrounded by markdown code fences."""
        if not raw_text:
            return {}
        cleaned = raw_text.strip()
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if json_match:
            cleaned = json_match.group(1).strip()
        elif cleaned.startswith("{") and cleaned.endswith("}"):
            pass
        else:
            bracket_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
            if bracket_match:
                cleaned = bracket_match.group(1).strip()

        try:
            return json.loads(cleaned)
        except Exception as exc:
            logger.warning("Failed to parse JSON from LLM output: %s (Raw: %s)", exc, raw_text[:200])
            return {}

    def check_health(self) -> Dict[str, Any]:
        """Audit health, configuration, and connectivity of all integrated AI layers."""
        first_h = self.first_client.check_health()
        second_h = self.second_client.check_health()

        active_count = sum(1 for h in [first_h, second_h] if h["status"] in ("ready", "rate_limit_cooldown"))

        if active_count >= 2:
            overall_status = "healthy_multi_provider"
        elif active_count == 1:
            overall_status = "operational_single_provider"
        else:
            overall_status = "offline_or_unconfigured"

        return {
            "orchestrator_status": overall_status,
            "architecture": "3-Layer Multi-Intelligence System",
            "layer_1_primary": "Custom NIRF Deterministic NLQ Engine",
            "layer_2_first_ai": first_h,
            "layer_3_second_ai": second_h,
            "failover_ready": bool(self.first_client.is_configured() and self.second_client.is_configured()),
            "total_failovers": self.total_failovers,
            "last_provider_used": self.last_provider_used,
        }


# Global multi-provider orchestrator instance
multi_ai_orchestrator = MultiAIOrchestrator()

# Default alias for backwards compatibility
llm_client = multi_ai_orchestrator
first_ai_client = multi_ai_orchestrator.first_client
second_ai_client = multi_ai_orchestrator.second_client
