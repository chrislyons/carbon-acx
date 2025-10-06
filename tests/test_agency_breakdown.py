from app.lib.agency import breakdown_for_activity


def test_breakdown_returns_sectors_with_individual_share():
    dependency_map = {
        "ACT.TRANSPORT": [
            {
                "share": 0.72,
                "operation_activity_label": "Gasoline refining",
                "operation_entity_name": "Shell Canada",
                "operation_entity_type": "corporate",
            },
            {
                "share": 0.18,
                "operation_activity_label": "Transit electricity",
                "operation_entity_name": "Toronto Hydro",
                "operation_entity_type": "municipal",
            },
        ]
    }

    sectors = breakdown_for_activity("ACT.TRANSPORT", dependency_map)

    labels = [sector["label"] for sector in sectors]
    assert labels == ["Corporate", "Institutional", "Individual"]
    assert sectors[0]["percent"] == "72%"
    assert sectors[1]["percent"] == "18%"
    assert sectors[2]["percent"] == "10%"
    tooltip_lines = sectors[0]["tooltip_lines"]
    assert tooltip_lines and "Shell Canada" in tooltip_lines[0]


def test_breakdown_handles_unknown_types_as_institutional():
    dependency_map = {
        "ACT.UNKNOWN": [
            {
                "share": 0.5,
                "operation_activity_label": "Service",
                "operation_entity_type": "cooperative",
            }
        ]
    }

    sectors = breakdown_for_activity("ACT.UNKNOWN", dependency_map)

    assert len(sectors) == 2
    assert sectors[0]["label"] == "Institutional"
    assert sectors[0]["percent"] == "50%"
    assert sectors[1]["label"] == "Individual"
    assert sectors[1]["percent"] == "50%"


def test_breakdown_empty_for_missing_activity():
    dependency_map = {}
    assert breakdown_for_activity("ACT.NONE", dependency_map) == []
