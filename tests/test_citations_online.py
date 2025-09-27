import pandas as pd

from calc import citations, schema
from calc.schema import LayerId

ONLINE_ACTIVITY_SOURCES = {
    "MEDIA.STREAM.HD.HOUR.TV": "SRC.DIMPACT.2021",
    "CONF.HD.PARTICIPANT_HOUR": "SRC.NETFLIX.2023",
    "CLOUD.DOWNLOAD.GB": "SRC.SCOPE3.DATA_TRANSFER.2024",
    "SOCIAL.SCROLL.HOUR.MOBILE": "SRC.DIMPACT.2021",
    "AI.LLM.INFER.1K_TOKENS.GENERIC": "SRC.LBNL.DC.2024",
}


def test_online_emission_factors_have_registered_sources():
    activities = {activity.activity_id: activity for activity in schema.load_activities()}
    emission_factors = {ef.activity_id: ef for ef in schema.load_emission_factors()}

    sources_df = pd.read_csv(schema.DATA_DIR / "sources.csv", dtype=str)
    registered_sources = set(sources_df["source_id"].dropna())

    for activity_id, expected_source in ONLINE_ACTIVITY_SOURCES.items():
        assert activity_id in activities
        assert activity_id in emission_factors

        activity = activities[activity_id]
        assert activity.layer_id == LayerId.ONLINE

        ef = emission_factors[activity_id]
        assert ef.source_id == expected_source
        assert expected_source in registered_sources

        refs = citations.references_for([expected_source])
        assert refs and refs[0].key == expected_source
