from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from dash import dcc


def sankey_graph(path: Path = Path("calc/outputs/figures/sankey.csv")) -> dcc.Graph:
    if path.exists():
        df = pd.read_csv(path)
    else:
        df = pd.DataFrame({"source": [], "target": [], "value": []})
    if df.empty:
        fig = go.Figure()
    else:
        labels = pd.concat([df["source"], df["target"]]).unique().tolist()
        index = {label: i for i, label in enumerate(labels)}
        fig = go.Figure(
            go.Sankey(
                node={"label": labels},
                link={
                    "source": df["source"].map(index),
                    "target": df["target"].map(index),
                    "value": df["value"],
                },
            )
        )
    return dcc.Graph(figure=fig)
