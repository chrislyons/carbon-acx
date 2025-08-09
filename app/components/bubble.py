from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
from dash import dcc


def bubble_graph(path: Path = Path("calc/outputs/figures/bubble.csv")) -> dcc.Graph:
    if path.exists():
        df = pd.read_csv(path)
    else:
        df = pd.DataFrame({"activity_id": [], "annual_emission_g": []})
    fig = px.scatter(df, x="activity_id", y="annual_emission_g", size="annual_emission_g")
    return dcc.Graph(figure=fig)
