"""Filtering, deleting and clearing recorded requests."""

import pytest


@pytest.fixture
def seeded(client, endpoint):
    """An endpoint with a few recorded calls of different shapes."""
    base = f"/hook/{endpoint['id']}"
    client.get(f"{base}/orders/1")
    client.post(f"{base}/orders", json={"event": "Order.Created", "id": 42})
    client.post(f"{base}/payments", content="amount=100%", headers={"content-type": "text/plain"})
    client.delete(f"{base}/orders/1")
    return endpoint


def _ids(page):
    return [r["id"] for r in page["items"]]


def _list(client, endpoint_id, **params):
    resp = client.get(f"/api/endpoints/{endpoint_id}/requests", params=params)
    assert resp.status_code == 200
    return resp.json()


def test_unfiltered_list_newest_first(client, seeded):
    page = _list(client, seeded["id"])
    assert [r["method"] for r in page["items"]] == ["DELETE", "POST", "POST", "GET"]
    assert page["has_more"] is False


def test_filter_by_method_is_case_insensitive(client, seeded):
    assert [r["method"] for r in _list(client, seeded["id"], method="post")["items"]] == ["POST", "POST"]
    assert _list(client, seeded["id"], method="PUT")["items"] == []


def test_search_matches_path_and_body_case_insensitively(client, seeded):
    by_path = _list(client, seeded["id"], q="ORDERS")
    assert [r["path"] for r in by_path["items"]] == ["/orders/1", "/orders", "/orders/1"]

    by_body = _list(client, seeded["id"], q="order.created")
    assert [r["path"] for r in by_body["items"]] == ["/orders"]


def test_search_treats_like_wildcards_literally(client, seeded):
    assert [r["path"] for r in _list(client, seeded["id"], q="100%")["items"]] == ["/payments"]
    assert _list(client, seeded["id"], q="1__%")["items"] == []


def test_filters_combine(client, seeded):
    page = _list(client, seeded["id"], method="GET", q="orders")
    assert [r["method"] for r in page["items"]] == ["GET"]


def test_delete_single_request(client, seeded):
    target = _ids(_list(client, seeded["id"]))[0]
    resp = client.delete(f"/api/endpoints/{seeded['id']}/requests/{target}")
    assert resp.status_code == 204
    assert target not in _ids(_list(client, seeded["id"]))
    assert client.get(f"/api/endpoints/{seeded['id']}/requests/{target}").status_code == 404
    assert client.get(f"/api/endpoints/{seeded['id']}").json()["request_count"] == 3


def test_delete_request_on_someone_elses_endpoint_is_404(client, other_client, seeded):
    target = _ids(_list(client, seeded["id"]))[0]
    assert other_client.delete(f"/api/endpoints/{seeded['id']}/requests/{target}").status_code == 404
    assert target in _ids(_list(client, seeded["id"]))


def test_clear_requests(client, seeded):
    resp = client.delete(f"/api/endpoints/{seeded['id']}/requests")
    assert resp.status_code == 200
    assert resp.json() == {"deleted": 4}
    assert _list(client, seeded["id"])["items"] == []
    assert client.get(f"/api/endpoints/{seeded['id']}").json()["request_count"] == 0
    # The endpoint itself survives and keeps recording.
    assert client.post(f"/hook/{seeded['id']}").status_code == 200
    assert len(_list(client, seeded["id"])["items"]) == 1


def test_clear_requests_on_someone_elses_endpoint_is_404(other_client, client, seeded):
    assert other_client.delete(f"/api/endpoints/{seeded['id']}/requests").status_code == 404
    assert len(_list(client, seeded["id"])["items"]) == 4


def test_shared_link_supports_filters_but_not_deletion(client, seeded):
    token = client.post(f"/api/endpoints/{seeded['id']}/share").json()["token"]
    page = client.get(f"/api/shared/{token}/requests", params={"method": "POST", "q": "orders"}).json()
    assert [r["path"] for r in page["items"]] == ["/orders"]

    target = page["items"][0]["id"]
    assert client.delete(f"/api/shared/{token}/requests/{target}").status_code == 405
    assert client.delete(f"/api/shared/{token}/requests").status_code == 405
