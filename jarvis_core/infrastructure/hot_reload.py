class PluginHotReloadHandler:
    def __init__(self, plugin_manager, logger) -> None:
        self.plugin_manager = plugin_manager
        self.logger = logger

    def on_plugin_file_changed(self, path: str) -> None:
        if not path.endswith((".py", ".json")):
            return

        self.logger.info("Plugin file changed, reloading plugins: %s", path)
        self.plugin_manager.reload_all()

