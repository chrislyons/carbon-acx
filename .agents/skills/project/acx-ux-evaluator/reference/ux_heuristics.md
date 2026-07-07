# UX Heuristics for Carbon ACX

## Nielsen's 10 Usability Heuristics

### 1. Visibility of System Status
**Principle:** Keep users informed about what's happening through timely feedback.

**Application to Carbon ACX:**
- Show loading states during emission calculations
- Display progress indicators for data processing
- Indicate which layer/scenario is currently active
- Show data freshness (last updated timestamp)
- Display calculation status (pending, in-progress, complete, error)

**Examples:**
```tsx
// Good: Clear loading state
{isCalculating && (
  <Spinner text="Calculating emissions for 247 activities..." />
)}

// Bad: Silent processing
<Button onClick={calculate}>Calculate</Button>
```

---

### 2. Match Between System and Real World
**Principle:** Speak users' language with words, phrases, and concepts familiar to them.

**Application to Carbon ACX:**
- Use standard carbon accounting terminology (Scope 1/2/3, kgCO2e, emission factors)
- Present units clearly (kgCO2e, tCO2e, lbs CO2)
- Match analyst mental models, not developer abstractions
- Use domain-appropriate metaphors (layers, activities, scenarios)

**Examples:**
```tsx
// Good: Domain language
<Select label="Emission Scope">
  <Option value="scope1">Scope 1 (Direct emissions)</Option>
  <Option value="scope2">Scope 2 (Purchased energy)</Option>
  <Option value="scope3">Scope 3 (Value chain)</Option>
</Select>

// Bad: Technical abstraction
<Select label="Emission Type">
  <Option value="type_a">Type A</Option>
  <Option value="type_b">Type B</Option>
</Select>
```

---

### 3. User Control and Freedom
**Principle:** Provide "emergency exits" for users to undo unwanted actions.

**Application to Carbon ACX:**
- Allow undo for parameter changes
- Enable scenario comparison without losing work
- Provide clear exit paths from multi-step flows
- Allow cancellation of long-running calculations
- Support draft/autosave for report building

**Examples:**
```tsx
// Good: Undo capability
<Toast>
  Parameters updated.
  <Button onClick={undo}>Undo</Button>
</Toast>

// Good: Exit from flow
<Modal>
  <Button onClick={saveAndClose}>Save & Exit</Button>
  <Button onClick={discardAndClose}>Discard & Exit</Button>
</Modal>
```

---

### 4. Consistency and Standards
**Principle:** Follow platform and industry conventions.

**Application to Carbon ACX:**
- Consistent navigation across Dash/React/Static interfaces
- Standard patterns for filters, exports, visualizations
- Unified design language (Tailwind/Radix UI components)
- Predictable button placement and labeling
- Consistent error message format

**Examples:**
```tsx
// Good: Consistent action placement
<Modal>
  <ModalHeader>Delete Activity</ModalHeader>
  <ModalBody>Are you sure?</ModalBody>
  <ModalFooter>
    <Button variant="ghost">Cancel</Button>
    <Button variant="destructive">Delete</Button>
  </ModalFooter>
</Modal>

// Bad: Inconsistent placement
<Modal>
  <Button>Delete</Button>
  <Button>Cancel</Button>
  {/* Sometimes Cancel is left, sometimes right */}
</Modal>
```

---

### 5. Error Prevention
**Principle:** Prevent problems from occurring in the first place.

**Application to Carbon ACX:**
- Validate inputs before submission
- Warn before destructive actions (delete scenario, clear data)
- Provide sensible defaults
- Disable invalid options
- Show constraints clearly (min/max values)

**Examples:**
```tsx
// Good: Input validation with feedback
<Input
  type="number"
  min={0}
  value={emissionFactor}
  onChange={validate}
  error={emissionFactor < 0 ? "Must be positive" : undefined}
/>

// Good: Destructive action confirmation
<AlertDialog>
  <AlertDialogTitle>Delete scenario "Baseline 2024"?</AlertDialogTitle>
  <AlertDialogDescription>
    This will permanently delete 1,247 calculations. This cannot be undone.
  </AlertDialogDescription>
  <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
</AlertDialog>
```

---

### 6. Recognition Rather Than Recall
**Principle:** Minimize memory load by making objects, actions, and options visible.

**Application to Carbon ACX:**
- Show recently used activities/layers
- Display current filter state visibly
- Use tooltips for complex terms
- Show breadcrumbs in multi-step flows
- Display active scenario clearly

**Examples:**
```tsx
// Good: Show current state
<FilterBar>
  <FilterChip onRemove={clearFilter}>Layer: Professional</FilterChip>
  <FilterChip onRemove={clearFilter}>Scope: 1,2</FilterChip>
  <FilterChip onRemove={clearFilter}>Date: Q3 2024</FilterChip>
</FilterBar>

// Good: Recently used
<Section title="Recently Used Activities">
  <ActivityChips activities={recentActivities} />
</Section>
```

---

### 7. Flexibility and Efficiency of Use
**Principle:** Accelerate interaction for expert users.

**Application to Carbon ACX:**
- Keyboard shortcuts for common actions
- Batch operations (bulk edit activities)
- Customizable dashboards
- Quick filters and saved searches
- Power user features (CLI, API access)

**Examples:**
```tsx
// Good: Keyboard shortcuts
<CommandPalette>
  <Command shortcut="Ctrl+K">Search activities</Command>
  <Command shortcut="Ctrl+E">Export report</Command>
  <Command shortcut="Ctrl+N">New scenario</Command>
</CommandPalette>

// Good: Batch operations
<Table>
  <TableToolbar>
    <Checkbox /> {/* Select all */}
    {selectedCount > 0 && (
      <>
        <Button>Bulk Edit ({selectedCount})</Button>
        <Button>Bulk Delete ({selectedCount})</Button>
      </>
    )}
  </TableToolbar>
</Table>
```

---

### 8. Aesthetic and Minimalist Design
**Principle:** Avoid irrelevant or rarely needed information.

**Application to Carbon ACX:**
- Hide advanced parameters by default
- Progressive disclosure for complexity
- Remove decorative elements that don't aid understanding
- Focus on essential data
- Use whitespace effectively

**Examples:**
```tsx
// Good: Progressive disclosure
<Card>
  <CardHeader>Coffee Brewing (12oz)</CardHeader>
  <CardContent>
    <DataPoint label="Emission Factor" value="0.15 kgCO2e" />
    <DataPoint label="Unit" value="per cup" />

    <Collapsible trigger="Show advanced details">
      <DataPoint label="Activity ID" value="COFFEE.12OZ" />
      <DataPoint label="Source" value="LCA Database 2024" />
      <DataPoint label="Uncertainty" value="±12%" />
      <DataPoint label="Last Updated" value="2024-09-15" />
    </Collapsible>
  </CardContent>
</Card>

// Bad: Everything visible always
<Card>
  <CardContent>
    {/* 15+ fields visible at once */}
  </CardContent>
</Card>
```

---

### 9. Help Users Recognize, Diagnose, and Recover from Errors
**Principle:** Express error messages in plain language, precisely indicate the problem, and suggest a solution.

**Application to Carbon ACX:**
- Clear error messages with actionable guidance
- Validation feedback inline
- Context-aware help
- Suggest corrections for typos
- Link to documentation for complex errors

**Examples:**
```tsx
// Good: Helpful error
<Alert variant="error">
  <AlertTitle>Calculation failed</AlertTitle>
  <AlertDescription>
    Emission factor for "COFFEE.12OZ" is missing.
    <br />
    <Link to="/activities/COFFEE.12OZ/edit">Add emission factor</Link>
    {" or "}
    <Link to="/docs/emission-factors">Learn about emission factors</Link>
  </AlertDescription>
</Alert>

// Bad: Cryptic error
<Alert variant="error">Error code: EF_404</Alert>
```

---

### 10. Help and Documentation
**Principle:** Provide help and documentation that is searchable and focused on user tasks.

**Application to Carbon ACX:**
- Contextual tooltips for emission factors
- Onboarding for first-time users
- Searchable documentation
- Video tutorials for complex workflows
- In-app examples and templates

**Examples:**
```tsx
// Good: Contextual help
<FormField
  label={
    <>
      Emission Factor
      <Tooltip>
        <TooltipTrigger>
          <InfoIcon />
        </TooltipTrigger>
        <TooltipContent>
          Amount of CO2 equivalent emitted per unit of activity.
          <br />
          Example: 0.15 kgCO2e per 12oz coffee cup.
          <br />
          <Link to="/docs/emission-factors">Learn more</Link>
        </TooltipContent>
      </Tooltip>
    </>
  }
  // ...
/>
```

---

## Domain-Specific Heuristics for Carbon ACX

### 11. Data Transparency and Provenance
**Principle:** Make data sources, calculation methods, and assumptions visible and traceable.

**Why Critical for Carbon ACX:**
- Carbon accounting requires auditability
- Stakeholders need to trust calculations
- Compliance often requires source documentation

**Application:**
- Show emission factor sources
- Display calculation methodology
- Link to reference documentation
- Expose manifest hashes for reproducibility
- Show data freshness/version

**Examples:**
```tsx
// Good: Full provenance
<EmissionFactorCard>
  <DataPoint label="Value" value="0.15 kgCO2e/cup" />
  <DataPoint label="Source" value="IPCC 2024 Guidelines" />
  <DataPoint label="Reference" value={<Link>[1]</Link>} />
  <DataPoint label="Last Verified" value="2024-09-15" />
  <DataPoint label="Confidence" value="High (±5%)" />
  <DataPoint label="Manifest Hash" value="a3f7c2..." />
</EmissionFactorCard>

// Bad: No transparency
<EmissionFactorCard>
  <DataPoint label="Value" value="0.15 kgCO2e/cup" />
</EmissionFactorCard>
```

---

### 12. Progressive Disclosure of Complexity
**Principle:** Start simple, reveal advanced options on demand. Layer complexity (basic → intermediate → expert).

**Why Critical for Carbon ACX:**
- Emission calculations are inherently complex
- New users need to get started quickly
- Experts need full control
- Different user roles have different needs

**Application:**
- Default to simplified views
- Collapsible sections for advanced parameters
- "Basic" vs "Advanced" mode toggle
- Smart defaults that work for 80% of cases
- Optional overrides for edge cases

**Examples:**
```tsx
// Good: Layered complexity
<CalculationForm>
  {/* Basic mode (default) */}
  <Input label="Activity" />
  <Input label="Quantity" />
  <Button>Calculate</Button>

  {/* Advanced toggle */}
  <Toggle
    checked={advancedMode}
    onChange={setAdvancedMode}
    label="Advanced options"
  />

  {advancedMode && (
    <>
      <Input label="Custom Emission Factor" />
      <Input label="Uncertainty Range" />
      <Select label="Allocation Method" />
      <Select label="Global Warming Potential (GWP)" />
      <Input label="Temporal Adjustment" />
    </>
  )}
</CalculationForm>

// Bad: All complexity visible always
<CalculationForm>
  {/* 20+ fields visible at once, overwhelming */}
</CalculationForm>
```

**Disclosure Patterns:**
- Collapsible sections
- Tabs (Basic | Advanced | Expert)
- Steppers (wizard flows)
- Tooltips with "Learn more" links
- Conditional fields (show when relevant)

---

### 13. Context-Appropriate Precision
**Principle:** Match numerical precision to user's decision-making needs.

**Why Critical for Carbon ACX:**
- Too much precision implies false accuracy
- Too little precision hides meaningful differences
- Different contexts need different precision

**Application:**
- Summary views: Round to significant figures (1,247 kgCO2e, not 1,246.73492)
- Detailed views: Show full precision when needed
- Comparisons: Show deltas clearly (↑ 15% from last month)
- Uncertainty: Indicate confidence ranges

**Examples:**
```tsx
// Good: Context-appropriate precision
<DashboardCard title="Total Emissions">
  <Metric value="1,247 kg CO2e" />  {/* Rounded for dashboard */}
</DashboardCard>

<DetailedReport>
  <DataPoint label="Coffee brewing" value="124.73 kgCO2e" />  {/* Precise for breakdown */}
  <DataPoint label="Electricity" value="892.67 kgCO2e" />
  <DataPoint label="Natural gas" value="229.87 kgCO2e" />
</DetailedReport>

// Bad: False precision everywhere
<DashboardCard title="Total Emissions">
  <Metric value="1,246.734921847 kg CO2e" />  {/* Overwhelming */}
</DashboardCard>
```

---

### 14. Comparative Context
**Principle:** Help users understand magnitude and trends through comparisons and benchmarks.

**Why Critical for Carbon ACX:**
- Raw numbers (1,247 kgCO2e) are hard to interpret
- Users need to know if they're improving
- Stakeholders ask "compared to what?"

**Application:**
- Show trends over time (↑↓ compared to last period)
- Provide relatable equivalents (= X flights, Y trees)
- Display benchmarks (industry average, targets)
- Highlight changes (new since last view)

**Examples:**
```tsx
// Good: Rich context
<EmissionsSummary>
  <PrimaryMetric value="1,247 kg CO2e" />

  <Comparisons>
    <Comparison
      label="vs. Last Month"
      value="↓ 15%"
      sentiment="positive"
    />
    <Comparison
      label="vs. Target"
      value="23% above"
      sentiment="negative"
    />
  </Comparisons>

  <Equivalents>
    <Equivalent
      icon={<PlaneIcon />}
      label="≈ 3 flights (NYC → London)"
    />
    <Equivalent
      icon={<TreeIcon />}
      label="≈ 62 trees needed to offset (1 year)"
    />
  </Equivalents>
</EmissionsSummary>

// Bad: Just a number
<EmissionsSummary>
  1247 kgCO2e
</EmissionsSummary>
```

---

## Evaluation Checklist

Use this checklist when evaluating Carbon ACX interfaces:

### General Usability (Nielsen 1-10)
- [ ] Are loading states visible during calculations?
- [ ] Is carbon accounting terminology used correctly?
- [ ] Can users undo changes easily?
- [ ] Are UI patterns consistent across interfaces?
- [ ] Are destructive actions confirmed?
- [ ] Are recently used items easily accessible?
- [ ] Are keyboard shortcuts available for power users?
- [ ] Is advanced complexity hidden by default?
- [ ] Are error messages clear and actionable?
- [ ] Is contextual help available?

### Domain-Specific (Carbon ACX 11-14)
- [ ] Are emission factor sources clearly cited?
- [ ] Can users trace calculation provenance?
- [ ] Is complexity progressively disclosed (basic → advanced)?
- [ ] Is numerical precision appropriate for context?
- [ ] Are comparisons and trends shown?
- [ ] Are emissions contextualized (equivalents, benchmarks)?
- [ ] Are assumptions and uncertainties visible?
- [ ] Is data freshness indicated?

---

## Severity Rating Guide

When documenting heuristic violations:

**Critical:**
- Violates multiple heuristics simultaneously
- Blocks task completion entirely
- Causes data integrity issues
- Creates compliance/audit risk

**High:**
- Violates one heuristic significantly
- Causes major user frustration
- Requires awkward workaround
- Affects >50% of users

**Medium:**
- Violates one heuristic moderately
- Noticeable but not blocking
- Has acceptable workaround
- Affects 20-50% of users

**Low:**
- Minor violation
- Aesthetic inconsistency
- Affects <20% of users
- Enhancement opportunity

---

**Last Updated:** 2025-10-22
**Version:** 1.0.0
