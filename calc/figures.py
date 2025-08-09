from __future__ import annotations

import pandas as pd


def stacked(df: pd.DataFrame) -> pd.DataFrame:
    return df.groupby("activity_id", as_index=False)["annual_emission_g"].sum()


def bubble(df: pd.DataFrame) -> pd.DataFrame:
    return df[["activity_id", "annual_emission_g"]]


def sankey(df: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "source": ["activities" for _ in df.index],
            "target": df["activity_id"],
            "value": df["annual_emission_g"],
        }
    )
