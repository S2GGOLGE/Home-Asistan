import argparse
import asyncio
import json
import logging
import time
from pathlib import Path


async def run_agent(heartbeat_file: Path, interval_seconds: int, backend_url: str) -> None:
    heartbeat_file.parent.mkdir(parents=True, exist_ok=True)
    logging.info("Jarvis agent started. Heartbeat file: %s", heartbeat_file)

    while True:
        payload = {
            "service": "jarvis-python",
            "status": "Healthy",
            "backendUrl": backend_url,
            "timeUtc": time.time(),
        }
        heartbeat_file.write_text(json.dumps(payload), encoding="utf-8")
        await asyncio.sleep(interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Long-running Jarvis agent heartbeat process")
    parser.add_argument(
        "--heartbeat-file",
        default=str(Path("runtime") / "jarvis_heartbeat.json"),
        help="File touched periodically for watchdog health checks",
    )
    parser.add_argument("--interval", type=int, default=5, help="Heartbeat write interval in seconds")
    parser.add_argument("--backend", default="http://localhost:5235", help="Backend base URL")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    try:
        asyncio.run(run_agent(Path(args.heartbeat_file), args.interval, args.backend))
    except Exception:
        logging.exception("Jarvis agent crashed")
        raise


if __name__ == "__main__":
    main()

