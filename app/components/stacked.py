from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
from dash import dcc


def stacked_graph(path: Path = Path("calc/outputs/figures/stacked.csv")) -> dcc.Graph:
    if path.exists():
        df = pd.read_csv(path)
    else:
        df = pd.DataFrame({"activity_id": [], "annual_emission_g": []})
    fig = px.bar(df, x="activity_id", y="annual_emission_g")
    return dcc.Graph(figure=fig)
