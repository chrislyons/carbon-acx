from __future__ import annotations

import pandas as pd


def total_by_activity(df: pd.DataFrame) -> pd.DataFrame:
    return df.groupby("activity_id", as_index=False)["annual_emissions_g"].sum()
