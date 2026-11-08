"""Runtime public-site base URL settings."""

from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response
from tests.test_posts_per_page import _login


def test_site_base_url_persistence_and_validation(client: TestClient) -> None:
    endpoint = "/api/v1/admin/site-theme"
    public = "/api/v1/public/site-theme"
    assert unwrap_api_response(client.get(public))["site_base_url"] == ""
    assert client.patch(endpoint, json={"site_base_url": "https://example.com"}).status_code == 401
    _login(client)
    for url, expected in [
        (" http://localhost:10241/ ", "http://localhost:10241"),
        ("https://example.com/site/", "https://example.com/site"),
    ]:
        response = client.patch(endpoint, json={"site_base_url": url})
        assert response.status_code == 200
        assert unwrap_api_response(response)["site_base_url"] == expected
        assert unwrap_api_response(client.get(endpoint))["site_base_url"] == expected
        assert unwrap_api_response(client.get(public))["site_base_url"] == expected
    for invalid in [
        "javascript:alert(1)",
        "//example.com",
        "https://user:pass@example.com",
        "https://example.com?x=1",
        "https://example.com#top",
        "https://",
        "x" * 501,
    ]:
        assert client.patch(endpoint, json={"site_base_url": invalid}).status_code == 422
    assert unwrap_api_response(client.get(endpoint))["site_base_url"] == "https://example.com/site"
    assert client.patch(endpoint, json={"site_base_url": "  "}).status_code == 200
    assert unwrap_api_response(client.get(public))["site_base_url"] == ""
