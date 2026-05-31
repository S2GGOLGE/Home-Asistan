# Jarvis Plugin Architecture

## Goal

Jarvis Core does not generate AI responses. The AI layer only converts natural language into intent JSON. Jarvis Core validates the intent, routes it to the correct plugin, executes the plugin, and returns the result from the backend system controller.

Example AI output:

```json
{
  "intent": "light.turn_on",
  "confidence": 0.92,
  "entities": {
    "room": "salon"
  }
}
```

## Architecture Diagram

```mermaid
flowchart LR
    U["User"] --> S["Speech / Text Input"]
    S --> AI["AI Layer<br/>Gemini Intent Extractor"]
    AI --> IJ["Intent JSON"]
    IJ --> CORE["Jarvis Core<br/>Python Orchestrator"]

    subgraph CORE_DETAIL["Jarvis Core"]
        IR["Intent Router"]
        PM["Plugin Manager"]
        EB["Event Bus"]
        CE["Command Executor"]
        AC["API Client"]
    end

    CORE --> IR
    IR --> PM
    PM --> P["Matched Plugin"]
    P --> CE
    CE --> AC

    subgraph PLUGINS["Runtime Plugins"]
        L["LightPlugin"]
        C["CurtainPlugin"]
        SEC["SecurityPlugin"]
        LOCK["LockPlugin"]
        M["MediaPlugin"]
        W["WeatherPlugin"]
    end

    PM --> PLUGINS
    AC --> API["C# Backend API<br/>System Controller"]

    subgraph BACKEND["C# Backend"]
        DEV["Device Management"]
        AUTH["Authentication"]
        STATE["State Storage"]
        CMD["Command Execution"]
        SIGNALR["SignalR Updates"]
    end

    API --> BACKEND
    BACKEND --> DB["SQL Server 2022"]
    CMD --> DEVICE["Physical / Virtual Devices"]
    DEVICE --> SIGNALR
    SIGNALR --> EB
```

## Event Flow

```text
User -> Speech -> AI -> Intent JSON -> Jarvis Core -> Plugin Router -> Plugin Execute -> C# API -> Device -> Response
```

## Plugin Contract

Every plugin must expose:

- `name`
- `supported_intents`
- `validate()`
- `execute(intent, context)`

Jarvis Core only depends on this contract. New features are added by creating a new plugin directory and manifest.

## Lifecycle

```text
discover -> load -> validate -> register -> execute -> log -> unload/reload
```

## Hot Reload

The plugin directory is watched at runtime. When a `.py` or `.json` file changes:

```text
file changed -> debounce -> unload plugin -> remove intent mappings -> reload manifest -> validate -> register
```

If a new version fails validation, the plugin is not registered. In production, keeping the last stable version in memory is recommended.

## Plugin Isolation

Minimum isolation:

- execution timeout
- exception boundary
- structured logs
- intent conflict detection
- plugin validation

Stronger isolation:

- plugin subprocess
- IPC or gRPC between core and plugin host
- permission-based API client
- per-plugin rate limit
- per-plugin config and secrets boundary

