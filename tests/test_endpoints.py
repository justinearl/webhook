import pytest


@pytest.mark.parametrize("status", [0, 99, 600, 1000, -1])
def test_create_rejects_status_outside_http_range(client, status):
    resp = client.post("/api/endpoints", json={"response_status": status})
    assert resp.status_code == 422


@pytest.mark.parametrize("status", [100, 200, 204, 404, 599])
def test_create_accepts_valid_status(client, status):
    resp = client.post("/api/endpoints", json={"response_status": status})
    assert resp.status_code == 201
    assert resp.json()["response_status"] == status


def test_update_rejects_bad_status(client, endpoint):
    resp = client.patch(f"/api/endpoints/{endpoint['id']}", json={"response_status": 99})
    assert resp.status_code == 422
    assert client.get(f"/api/endpoints/{endpoint['id']}").json()["response_status"] == 200


def test_hook_returns_configured_response(client, endpoint):
    client.patch(
        f"/api/endpoints/{endpoint['id']}",
        json={"response_status": 202, "response_body": '{"ok": true}'},
    )
    resp = client.post(f"/hook/{endpoint['id']}", json={"hello": "world"})
    assert resp.status_code == 202
    assert resp.json() == {"ok": True}
    assert client.get(f"/api/endpoints/{endpoint['id']}").json()["request_count"] == 1
