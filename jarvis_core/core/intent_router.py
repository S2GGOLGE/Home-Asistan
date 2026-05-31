from typing import Any


class IntentRouter:
    def __init__(self, plugin_manager, event_bus, logger, min_confidence: float = 0.75) -> None:
        self.plugin_manager = plugin_manager
        self.event_bus = event_bus
        self.logger = logger
        self.min_confidence = min_confidence

    async def route(self, intent_json: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        intent_name = intent_json.get("intent")
        confidence = intent_json.get("confidence", 0)

        if not intent_name:
            return self._fail("Intent is missing")

        if confidence < self.min_confidence:
            return self._fail("Intent confidence is too low")

        plugin = self.plugin_manager.find_plugin_by_intent(intent_name)

        if not plugin:
            return self._fail(f"No plugin found for intent: {intent_name}")

        await self.event_bus.publish(
            "intent.routed",
            {
                "intent": intent_name,
                "plugin": plugin.name,
                "correlationId": context.get("correlation_id"),
            },
        )

        try:
            return await plugin.execute(intent_json, context)
        except Exception as exc:
            self.logger.exception("Plugin execution failed")
            await self.event_bus.publish(
                "plugin.execution.failed",
                {
                    "intent": intent_name,
                    "plugin": plugin.name,
                    "error": str(exc),
                    "correlationId": context.get("correlation_id"),
                },
            )
            return self._fail(str(exc))

    def _fail(self, message: str) -> dict[str, Any]:
        return {
            "success": False,
            "error": message,
        }

