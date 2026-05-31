from typing import Any

from jarvis_core.contracts.base_plugin import BasePlugin


class LightPlugin(BasePlugin):
    name = "LightPlugin"
    supported_intents = [
        "light.turn_on",
        "light.turn_off",
        "light.set_brightness",
        "light.set_color",
    ]

    def __init__(self, api_client, event_bus, logger) -> None:
        self.api_client = api_client
        self.event_bus = event_bus
        self.logger = logger

    def validate(self) -> bool:
        return bool(self.name and self.supported_intents)

    async def execute(self, intent: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        intent_name = intent["intent"]
        entities = intent.get("entities", {})
        room = entities.get("room")

        if not room:
            return {
                "success": False,
                "plugin": self.name,
                "error": "room entity is required",
            }

        command_payload = {
            "intent": intent_name,
            "deviceType": "light",
            "room": room,
            "parameters": {
                "brightness": entities.get("brightness"),
                "color": entities.get("color"),
            },
            "correlationId": context.get("correlation_id"),
            "userId": context.get("user_id"),
        }

        await self.event_bus.publish("plugin.execution.started", command_payload)
        response = await self.api_client.post("/api/commands/execute", json=command_payload)

        await self.event_bus.publish(
            "plugin.execution.completed",
            {
                "plugin": self.name,
                "intent": intent_name,
                "response": response,
                "correlationId": context.get("correlation_id"),
            },
        )

        return {
            "success": True,
            "plugin": self.name,
            "intent": intent_name,
            "backendResponse": response,
        }

