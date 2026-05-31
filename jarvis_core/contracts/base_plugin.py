from abc import ABC, abstractmethod
from typing import Any


class BasePlugin(ABC):
    name: str
    supported_intents: list[str]

    @abstractmethod
    def validate(self) -> bool:
        pass

    @abstractmethod
    async def execute(self, intent: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        pass

