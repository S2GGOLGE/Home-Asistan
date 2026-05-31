import argparse
import asyncio
import json
import logging
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from jarvis_core.core.event_bus import EventBus
from jarvis_core.core.intent_router import IntentRouter
from jarvis_core.core.plugin_manager import PluginManager
from jarvis_core.infrastructure.api_client import ApiClient


class UrlLibResponse:
    def __init__(self, status_code: int, body: bytes) -> None:
        self.status_code = status_code
        self.body = body

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP request failed with status {self.status_code}: {self.body.decode('utf-8')}")

    async def json(self) -> dict[str, Any]:
        return json.loads(self.body.decode("utf-8"))


class UrlLibHttpSession:
    async def post(self, url: str, json: dict[str, Any]) -> UrlLibResponse:
        payload = bytes(__import__("json").dumps(json), "utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return UrlLibResponse(response.status, response.read())
        except urllib.error.HTTPError as exc:
            return UrlLibResponse(exc.code, exc.read())


class ServiceProvider:
    def __init__(self, api_client: ApiClient, event_bus: EventBus, logger: logging.Logger) -> None:
        self.api_client = api_client
        self.event_bus = event_bus
        self.logger = logger


async def log_event(event_name: str, payload: dict[str, Any]) -> None:
    print(f"[event] {event_name}: {json.dumps(payload, ensure_ascii=False)}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Jarvis Core demo runner")
    parser.add_argument("--backend", default="http://localhost:5235", help="C# backend base URL")
    parser.add_argument("--intent", default="light.turn_on", help="Intent name to route")
    parser.add_argument("--room", default="Salon", help="Room entity")
    parser.add_argument("--confidence", type=float, default=0.95, help="Intent confidence")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s - %(message)s")
    logger = logging.getLogger("jarvis-core")

    event_bus = EventBus()
    for event_name in [
        "intent.routed",
        "plugin.execution.started",
        "plugin.execution.completed",
        "plugin.execution.failed",
    ]:
        event_bus.subscribe(event_name, lambda payload, name=event_name: log_event(name, payload))

    api_client = ApiClient(args.backend, UrlLibHttpSession())
    service_provider = ServiceProvider(api_client, event_bus, logger)

    plugins_path = Path(__file__).resolve().parents[1] / "plugins"
    plugin_manager = PluginManager(str(plugins_path), service_provider, logger)
    plugin_manager.discover_plugins()

    router = IntentRouter(plugin_manager, event_bus, logger)
    intent_json = {
        "intent": args.intent,
        "confidence": args.confidence,
        "entities": {
            "room": args.room,
        },
    }
    context = {
        "correlation_id": "demo-command-001",
        "user_id": "demo-user",
    }

    result = await router.route(intent_json, context)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
