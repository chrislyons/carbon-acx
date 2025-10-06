from app.components import bubble, na_notice, sankey, stacked
from app.components._helpers import has_na_sectors


def _class_name(child) -> str | None:
    if hasattr(child, "to_plotly_json"):
        child = child.to_plotly_json()
    if isinstance(child, dict):
        return child.get("props", {}).get("className")
    return None


def test_has_na_sectors_detects_category_label() -> None:
    payload = {"data": [{"category": "NA", "values": {"mean": 100}}]}
    assert has_na_sectors(payload)


def test_has_na_sectors_detects_sankey_node() -> None:
    payload = {"data": {"nodes": [{"label": "NA"}], "links": []}}
    assert has_na_sectors(payload)


def test_na_notice_renders_dash_component() -> None:
    component = na_notice.render()
    json_repr = component.to_plotly_json()
    assert json_repr["props"]["className"] == "chart-footnote chart-footnote--na"


def test_stacked_section_appends_na_notice() -> None:
    payload = {"data": [{"category": "NA", "values": {"mean": 10}}]}
    section = stacked.render(payload, {})
    children = section.to_plotly_json()["props"]["children"]
    assert "chart-footnote chart-footnote--na" in {_class_name(child) for child in children}


def test_sankey_section_appends_na_notice() -> None:
    payload = {"data": {"nodes": [{"id": "na", "label": "NA"}], "links": []}}
    section = sankey.render(payload, {})
    children = section.to_plotly_json()["props"]["children"]
    assert "chart-footnote chart-footnote--na" in {_class_name(child) for child in children}


def test_bubble_section_appends_na_notice() -> None:
    payload = {
        "data": [
            {
                "category": "Example",
                "activity_name": "NA",
                "values": {"mean": 5},
            }
        ]
    }
    section = bubble.render(payload, {})
    children = section.to_plotly_json()["props"]["children"]
    assert "chart-footnote chart-footnote--na" in {_class_name(child) for child in children}
