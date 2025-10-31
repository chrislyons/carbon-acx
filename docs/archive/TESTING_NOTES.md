# Testing Notes

- Snapshot tests focus on the chart SVG (or chart subtree) elements to avoid spurious failures from layout container changes such as accessibility attributes.
- Accessibility semantics like `role="region"`, `aria-labelledby`, and focus targets (`tabindex="-1"`) are asserted explicitly in the tests so intentional a11y hooks remain covered.
