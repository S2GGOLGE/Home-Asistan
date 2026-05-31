from typing import Any


class ApiClient:
    def __init__(self, base_url: str, http_session) -> None:
        self.base_url = base_url.rstrip("/")
        self.http_session = http_session

    async def post(self, path: str, json: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/{path.lstrip('/')}"
        response = await self.http_session.post(url, json=json)
        response.raise_for_status()
        return await response.json()

