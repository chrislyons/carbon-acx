# Chart Specifications for Carbon Reports

## General Guidelines

All charts in Carbon ACX reports must follow these specifications for consistency, professionalism, and clarity.

### Standard Dimensions

- **Report Charts (embedded):** 800 × 600 pixels
- **Executive/Presentation:** 1200 × 800 pixels
- **Thumbnail/Summary:** 400 × 300 pixels
- **DPI:** Minimum 150 for print, 96 for digital

### File Formats

- **Primary:** PNG (transparency support, good compression)
- **Alternative:** SVG (vector, scales perfectly)
- **Do NOT use:** JPG (lossy compression inappropriate for data viz)

### Save Location

- **Path:** `reports/charts/`
- **Naming:** `{report_type}_{period}_{chart_name}.png`
  - Example: `monthly_2025-03_emissions_by_layer.png`

---

## Color Palette

### Primary Colors (Layers)

```python
LAYER_COLORS = {
    'professional': '#2E86AB',      # Blue (professional services)
    'online': '#06A77D',            # Green (digital infrastructure)
    'industrial_light': '#F18F01',  # Orange (light industry)
    'industrial_heavy': '#C73E1D',  # Red (heavy industry)
    'military': '#6A4C93',          # Purple (defense operations)
    'crosscut': '#FFB600',          # Yellow (scenarios/feedbacks)
}
```

### Sequential Scale (Intensity)

For emission intensity gradients:
```python
INTENSITY_SCALE = ['#E8F4F8', '#B3D9E8', '#7CB8D1', '#4597BB', '#2E86AB']
# Light blue → Dark blue (low → high emissions)
```

### Diverging Scale (Change)

For increase/decrease indicators:
```python
DIVERGING_SCALE = {
    'increase': '#C73E1D',  # Red
    'neutral': '#CCCCCC',   # Gray
    'decrease': '#06A77D',  # Green
}
```

---

## Chart Types & Specifications

### 1. Bar Chart (Emissions by Layer)

**Use Case:** Show total emissions across layers.

**Matplotlib Example:**
```python
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

fig, ax = plt.subplots(figsize=(10, 6))

layers = ['Professional', 'Online', 'Industrial Light', 'Industrial Heavy', 'Military']
emissions = [45.2, 32.8, 28.5, 22.1, 16.7]  # tCO2e
colors = ['#2E86AB', '#06A77D', '#F18F01', '#C73E1D', '#6A4C93']

bars = ax.bar(layers, emissions, color=colors, edgecolor='black', linewidth=0.5)

# Labels and formatting
ax.set_xlabel('Layer', fontsize=12, fontweight='bold')
ax.set_ylabel('Emissions (tCO2e)', fontsize=12, fontweight='bold')
ax.set_title('Total Emissions by Layer — March 2025', fontsize=14, fontweight='bold', pad=20)

# Grid
ax.yaxis.grid(True, linestyle='--', alpha=0.3)
ax.set_axisbelow(True)

# Value labels on bars
for bar in bars:
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{height:.1f}',
            ha='center', va='bottom', fontsize=10, fontweight='bold')

plt.tight_layout()
plt.savefig('reports/charts/monthly_2025-03_emissions_by_layer.png', dpi=150, bbox_inches='tight')
plt.close()
```

**Requirements:**
- ✅ Bars have color from `LAYER_COLORS`
- ✅ Value labels on top of each bar
- ✅ Y-axis includes units (tCO2e)
- ✅ Grid lines for readability
- ✅ Title includes period
- ✅ Black edge on bars for clarity

---

### 2. Horizontal Bar Chart (Top N Activities)

**Use Case:** Show ranked list of highest-emission activities.

**Specifications:**
- Sort descending (highest at top)
- Limit to top 10-20 items
- Include units in axis label
- Use single color or gradient
- Truncate long activity names

**Example:**
```python
fig, ax = plt.subplots(figsize=(10, 8))

activities = [
    'HD video streaming',
    'Cloud server operations',
    'Short-haul flight',
    'Natural gas heating',
    'Electric vehicle charging',
    # ... (truncated)
]
emissions = [55, 48, 42, 38, 32]  # kgCO2e per typical unit

# Horizontal bars
bars = ax.barh(activities, emissions, color='#2E86AB', edgecolor='black', linewidth=0.5)

ax.set_xlabel('Emission Intensity (kgCO2e per typical unit)', fontsize=12, fontweight='bold')
ax.set_title('Top 5 Emission-Intensive Activities — Q1 2025', fontsize=14, fontweight='bold', pad=20)

# Grid
ax.xaxis.grid(True, linestyle='--', alpha=0.3)
ax.set_axisbelow(True)

plt.tight_layout()
plt.savefig('reports/charts/quarterly_2025-Q1_top_activities.png', dpi=150, bbox_inches='tight')
plt.close()
```

---

### 3. Line Chart (Trend Over Time)

**Use Case:** Show emissions trend across months/quarters/years.

**Specifications:**
- Line thickness: 2-3 pt
- Markers at data points
- Shaded confidence interval (if uncertainty data available)
- Annotate significant points
- X-axis: time (formatted appropriately)
- Y-axis: emissions (tCO2e)

**Example:**
```python
import matplotlib.dates as mdates

fig, ax = plt.subplots(figsize=(12, 6))

months = ['2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03']
emissions = [42.3, 45.1, 48.2, 44.8, 43.5, 45.9]  # tCO2e

ax.plot(months, emissions, marker='o', linewidth=2.5, color='#2E86AB', markersize=8)

# Fill area under curve
ax.fill_between(range(len(months)), emissions, alpha=0.2, color='#2E86AB')

ax.set_xlabel('Month', fontsize=12, fontweight='bold')
ax.set_ylabel('Total Emissions (tCO2e)', fontsize=12, fontweight='bold')
ax.set_title('Monthly Emissions Trend — Oct 2024 to Mar 2025', fontsize=14, fontweight='bold', pad=20)

# Grid
ax.grid(True, linestyle='--', alpha=0.3)
ax.set_axisbelow(True)

# Rotate x labels
plt.xticks(rotation=45, ha='right')

plt.tight_layout()
plt.savefig('reports/charts/trend_6month.png', dpi=150, bbox_inches='tight')
plt.close()
```

---

### 4. Pie Chart (Sector Contribution)

**Use Case:** Show percentage contribution of sectors or layers.

**Specifications:**
- Explode largest slice (optional)
- Show percentages on slices
- Include legend if >5 categories
- Use layer colors for consistency
- "Other" category if >8 slices

**Example:**
```python
fig, ax = plt.subplots(figsize=(8, 8))

sectors = ['Professional Services', 'Digital Infrastructure', 'Industrial Light', 'Industrial Heavy', 'Defense']
sizes = [31.2, 22.7, 19.8, 15.4, 10.9]  # Percentages
colors = ['#2E86AB', '#06A77D', '#F18F01', '#C73E1D', '#6A4C93']
explode = (0.05, 0, 0, 0, 0)  # Explode largest slice

wedges, texts, autotexts = ax.pie(sizes, explode=explode, labels=sectors, colors=colors,
                                     autopct='%1.1f%%', startangle=90,
                                     textprops={'fontsize': 11, 'fontweight': 'bold'})

# Make percentage text white
for autotext in autotexts:
    autotext.set_color('white')
    autotext.set_fontsize(12)

ax.set_title('Emissions by Sector — Q1 2025', fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig('reports/charts/quarterly_2025-Q1_sector_pie.png', dpi=150, bbox_inches='tight')
plt.close()
```

**Accessibility Note:** Provide data table alongside pie chart for screen readers.

---

### 5. Stacked Bar Chart (Scope Breakdown)

**Use Case:** Show Scope 1/2/3 emissions over time or by category.

**Specifications:**
- Stack order: Scope 1 (bottom), Scope 2 (middle), Scope 3 (top)
- Distinct colors for each scope
- Legend showing scopes
- Total value labeled on top

**Example:**
```python
import numpy as np

fig, ax = plt.subplots(figsize=(10, 6))

categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
scope_1 = np.array([12.3, 13.1, 12.8, 13.5, 12.9, 13.2])
scope_2 = np.array([18.7, 19.2, 18.9, 19.8, 19.1, 19.5])
scope_3 = np.array([14.2, 13.8, 14.5, 14.1, 14.7, 14.3])

width = 0.6
x = np.arange(len(categories))

p1 = ax.bar(x, scope_1, width, label='Scope 1', color='#C73E1D')
p2 = ax.bar(x, scope_2, width, bottom=scope_1, label='Scope 2', color='#F18F01')
p3 = ax.bar(x, scope_3, width, bottom=scope_1+scope_2, label='Scope 3', color='#2E86AB')

ax.set_ylabel('Emissions (tCO2e)', fontsize=12, fontweight='bold')
ax.set_title('Scope 1/2/3 Emissions by Month — Q1-Q2 2025', fontsize=14, fontweight='bold', pad=20)
ax.set_xticks(x)
ax.set_xticklabels(categories)
ax.legend(loc='upper left', framealpha=0.9)

# Grid
ax.yaxis.grid(True, linestyle='--', alpha=0.3, zorder=0)
ax.set_axisbelow(True)

plt.tight_layout()
plt.savefig('reports/charts/compliance_scope_stacked.png', dpi=150, bbox_inches='tight')
plt.close()
```

---

## Font Specifications

### Font Family

**Primary:** Helvetica, Arial, or DejaVu Sans (widely available, clean sans-serif)

**Fallback:** System default sans-serif

**Do NOT use:** Times New Roman, Comic Sans, decorative fonts

### Font Sizes

| Element | Size | Weight |
|---------|------|--------|
| Chart Title | 14 pt | Bold |
| Axis Labels | 12 pt | Bold |
| Tick Labels | 10 pt | Normal |
| Legend | 10 pt | Normal |
| Annotations | 9-10 pt | Normal |
| Value Labels (on bars) | 10 pt | Bold |

---

## Accessibility

### Color Blindness

- Use patterns/hatching in addition to color when showing >5 categories
- Avoid red/green combinations without additional differentiation
- Test charts with color blindness simulators

### Alt Text

Every chart must have descriptive alt text:

**Example:**
```markdown
![Emissions by Layer](./charts/monthly_2025-03_by_layer.png)

**Alt Text:** Bar chart showing total emissions in tCO2e for five layers: Professional Services (45.2), Online (32.8), Industrial Light (28.5), Industrial Heavy (22.1), and Military (16.7) for March 2025.
```

---

## Quality Checklist

Before including any chart in a report, verify:

- [ ] Chart has descriptive title including period/context
- [ ] Both axes labeled with units
- [ ] Legend included (if multiple series)
- [ ] Data source noted in caption
- [ ] Colors from approved palette
- [ ] Saved at correct resolution (150+ DPI)
- [ ] Filename follows naming convention
- [ ] Chart referenced in report text
- [ ] Alt text provided
- [ ] No overlapping labels or text
- [ ] Grid enhances readability (not distracting)

---

## Python Helper Functions

### Standard Chart Setup

```python
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# Apply global settings
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Helvetica', 'Arial', 'DejaVu Sans']
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['axes.labelweight'] = 'bold'
plt.rcParams['axes.titleweight'] = 'bold'
plt.rcParams['figure.dpi'] = 150
plt.rcParams['savefig.dpi'] = 150
plt.rcParams['savefig.bbox'] = 'tight'

LAYER_COLORS = {
    'professional': '#2E86AB',
    'online': '#06A77D',
    'industrial_light': '#F18F01',
    'industrial_heavy': '#C73E1D',
    'military': '#6A4C93',
    'crosscut': '#FFB600',
}

def save_chart(fig, filename, chart_dir='reports/charts'):
    """Save chart with standard settings"""
    filepath = f"{chart_dir}/{filename}"
    fig.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return filepath
```

---

## References

- Matplotlib documentation: https://matplotlib.org/stable/gallery/index.html
- Color palette tool: https://coolors.co
- Color blindness simulator: https://www.color-blindness.com/coblis-color-blindness-simulator/
- WCAG 2.1 contrast guidelines: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
