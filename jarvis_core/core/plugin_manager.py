import importlib.util
import json
from pathlib import Path
from typing import Any


class PluginManager:
    def __init__(self, plugins_path: str, service_provider, logger) -> None:
        self.plugins_path = Path(plugins_path)
        self.service_provider = service_provider
        self.logger = logger
        self.plugins: dict[str, Any] = {}
        self.intent_map: dict[str, Any] = {}

    def discover_plugins(self) -> None:
        if not self.plugins_path.exists():
            self.logger.warning("Plugin path does not exist: %s", self.plugins_path)
            return

        for plugin_dir in self.plugins_path.iterdir():
            if not plugin_dir.is_dir():
                continue

            manifest_path = plugin_dir / "manifest.json"
            if not manifest_path.exists():
                continue

            with manifest_path.open("r", encoding="utf-8") as file:
                manifest = json.load(file)

            if not manifest.get("enabled", True):
                continue

            plugin = self._load_plugin(plugin_dir, manifest)

            if plugin.validate():
                self.register(plugin)

    def reload_all(self) -> None:
        self.plugins.clear()
        self.intent_map.clear()
        self.discover_plugins()

    def register(self, plugin) -> None:
        self.plugins[plugin.name] = plugin

        for intent in plugin.supported_intents:
            if intent in self.intent_map:
                raise ValueError(f"Intent conflict: {intent}")

            self.intent_map[intent] = plugin

        self.logger.info("Registered plugin: %s", plugin.name)

    def find_plugin_by_intent(self, intent: str):
        return self.intent_map.get(intent)

    def _load_plugin(self, plugin_dir: Path, manifest: dict[str, Any]):
        entrypoint = manifest["entrypoint"]
        module_name, class_name = entrypoint.rsplit(".", 1)
        plugin_file = plugin_dir / f"{module_name}.py"

        spec = importlib.util.spec_from_file_location(
            f"{manifest['name']}.{module_name}",
            plugin_file,
        )
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load plugin spec: {plugin_file}")

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        plugin_class = getattr(module, class_name)

        return plugin_class(
            api_client=self.service_provider.api_client,
            event_bus=self.service_provider.event_bus,
            logger=self.service_provider.logger,
        )

