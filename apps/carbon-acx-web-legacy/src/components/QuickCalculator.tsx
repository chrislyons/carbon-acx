import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Car, Home, ShoppingBag, Utensils, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';

import { useAppStore } from '../hooks/useAppStore';
import type { CalculatorResult } from '../store/appStore';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

// Transport mode emission factors (kg CO₂e per km)
// Source: data/emission_factors.csv
const TRANSPORT_MODES = {
  car: {
    label: 'Car',
    factor: 0.18, // TRAN.SCHOOLRUN.CAR.KM
    activityId: 'TRAN.SCHOOLRUN.CAR.KM',
  },
  bus: {
    label: 'Bus',
    factor: 0.08662, // TRAN.TTC.BUS.KM
    activityId: 'TRAN.TTC.BUS.KM',
  },
  subway: {
    label: 'Subway/Train',
    factor: 0.00476, // TRAN.TTC.SUBWAY.KM (grid-indexed)
    activityId: 'TRAN.TTC.SUBWAY.KM',
  },
  bike: {
    label: 'Bike/Walk',
    factor: 0.0, // TRAN.SCHOOLRUN.BIKE.KM
    activityId: 'TRAN.SCHOOLRUN.BIKE.KM',
  },
} as const;

type TransportMode = keyof typeof TRANSPORT_MODES;

export default function QuickCalculator() {
  const navigate = useNavigate();
  const saveCalculatorResults = useAppStore((state) => state.saveCalculatorResults);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({
    transportMode: 'car' as TransportMode,
    commute: 10, // km per day
    diet: 'mixed',
    energy: 'average',
    shopping: 'moderate',
  });

  const calculateFootprint = (): { total: number; breakdown: Omit<CalculatorResult, 'calculatedAt'>[] } => {
    // Simplified carbon calculation (kg CO₂ per year)
    const breakdown: Omit<CalculatorResult, 'calculatedAt'>[] = [];

    // Transport: Use transport-specific emission factor
    const transportMode = values.transportMode;
    const transportFactor = TRANSPORT_MODES[transportMode].factor;
    const commuteEmissions = values.commute * transportFactor * 365 * 2; // Round trip
    breakdown.push({
      category: 'commute',
      label: `${values.commute}km daily commute (${TRANSPORT_MODES[transportMode].label})`,
      annualEmissions: commuteEmissions,
    });

    // Diet: vegan ~1500, vegetarian ~2500, mixed ~3300 kg/year
    const dietImpact = {
      vegan: 1500,
      vegetarian: 2500,
      mixed: 3300,
    };
    const dietEmissions = dietImpact[values.diet as keyof typeof dietImpact] || 2500;
    const dietLabels = {
      vegan: 'Vegan diet',
      vegetarian: 'Vegetarian diet',
      mixed: 'Mixed diet',
    };
    breakdown.push({
      category: 'diet',
      label: dietLabels[values.diet as keyof typeof dietLabels] || 'Diet',
      annualEmissions: dietEmissions,
    });

    // Energy: low ~1500, average ~2500, high ~4000 kg/year
    const energyImpact = {
      low: 1500,
      average: 2500,
      high: 4000,
    };
    const energyEmissions = energyImpact[values.energy as keyof typeof energyImpact] || 2500;
    const energyLabels = {
      low: 'Low energy use',
      average: 'Average energy use',
      high: 'High energy use',
    };
    breakdown.push({
      category: 'energy',
      label: energyLabels[values.energy as keyof typeof energyLabels] || 'Energy',
      annualEmissions: energyEmissions,
    });

    // Shopping: minimal ~500, moderate ~1000, high ~2000 kg/year
    const shoppingImpact = {
      minimal: 500,
      moderate: 1000,
      high: 2000,
    };
    const shoppingEmissions = shoppingImpact[values.shopping as keyof typeof shoppingImpact] || 1000;
    const shoppingLabels = {
      minimal: 'Minimal shopping',
      moderate: 'Moderate shopping',
      high: 'Frequent shopping',
    };
    breakdown.push({
      category: 'shopping',
      label: shoppingLabels[values.shopping as keyof typeof shoppingLabels] || 'Shopping',
      annualEmissions: shoppingEmissions,
    });

    const total = breakdown.reduce((sum, item) => sum + item.annualEmissions, 0);

    return { total, breakdown };
  };

  const { total: footprintKg, breakdown } = calculateFootprint();
  const footprint = (footprintKg / 1000).toFixed(1);
  const globalAverage = 4.5; // tonnes CO₂ per person per year (approximate)

  const handleSaveToProfile = () => {
    saveCalculatorResults(breakdown);
    setIsOpen(false);
    navigate('/dashboard');
  };

  const handleExplore = () => {
    setIsOpen(false);
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Calculator className="h-5 w-5" />
          Estimate emissions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Calculator className="h-6 w-6 text-accent-500" />
            Quick Carbon Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {step < 6 ? (
            <QuestionFlow
              step={step}
              values={values}
              onValueChange={(key, value) => setValues({ ...values, [key]: value })}
              onNext={() => setStep(step + 1)}
              onBack={() => setStep(Math.max(1, step - 1))}
            />
          ) : (
            <ResultsView
              footprint={parseFloat(footprint)}
              globalAverage={globalAverage}
              onReset={() => {
                setStep(1);
                setValues({
                  transportMode: 'car' as TransportMode,
                  commute: 10,
                  diet: 'mixed',
                  energy: 'average',
                  shopping: 'moderate',
                });
              }}
              onSave={handleSaveToProfile}
              onClose={() => setIsOpen(false)}
              onExplore={handleExplore}
            />
          )}
        </div>

        {/* Progress indicator */}
        {step < 6 && (
          <div className="flex gap-2 mt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-accent-500' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface QuestionFlowProps {
  step: number;
  values: Record<string, string | number>;
  onValueChange: (key: string, value: string | number) => void;
  onNext: () => void;
  onBack: () => void;
}

function QuestionFlow({ step, values, onValueChange, onNext, onBack }: QuestionFlowProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {step === 1 && (
          <Question
            icon={<Car className="h-8 w-8" />}
            title="How do you commute?"
            description="Select your primary mode of transportation"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(TRANSPORT_MODES).map(([value, { label, factor }]) => (
                <button
                  key={value}
                  onClick={() => onValueChange('transportMode', value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    values.transportMode === value
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                      : 'border-border hover:border-accent-300'
                  }`}
                >
                  <div className="font-semibold text-foreground">{label}</div>
                  <div className="text-sm text-text-muted">
                    ~{(factor * 1000).toFixed(0)}g CO₂/km
                  </div>
                </button>
              ))}
            </div>

            <DetailSection title="How we calculate transport emissions">
              <p className="text-sm text-text-secondary mb-3">
                Emission factors are sourced from our curated dataset, which includes verified activity-based calculations:
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 mt-0.5">•</span>
                  <span><strong>Car:</strong> 180g CO₂/km based on average gasoline vehicle (TRAN.SCHOOLRUN.CAR.KM)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 mt-0.5">•</span>
                  <span><strong>Bus:</strong> 86.6g CO₂/km accounting for passenger load (TRAN.TTC.BUS.KM)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 mt-0.5">•</span>
                  <span><strong>Subway/Train:</strong> 4.76g CO₂/km with grid-indexed electricity (TRAN.TTC.SUBWAY.KM)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-500 mt-0.5">•</span>
                  <span><strong>Bike/Walk:</strong> 0g CO₂ - zero direct emissions</span>
                </li>
              </ul>
              <p className="text-xs text-text-muted mt-3">
                Annual emissions = daily distance × 2 (round trip) × 365 days × emission factor
              </p>
            </DetailSection>
          </Question>
        )}

        {step === 2 && (
          <Question
            icon={<Car className="h-8 w-8" />}
            title="How far do you commute daily?"
            description="One-way distance"
          >
            <div className="space-y-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={values.commute as number}
                onChange={(e) => onValueChange('commute', parseInt(e.target.value))}
                className="w-full accent-accent-500"
              />
              <div className="text-center">
                <span className="text-4xl font-bold text-foreground">{values.commute}</span>
                <span className="text-xl text-text-secondary ml-2">km</span>
              </div>
              <div className="flex justify-between text-sm text-text-muted">
                <span>Work from home</span>
                <span>Long commute</span>
              </div>
            </div>
          </Question>
        )}

        {step === 3 && (
          <Question
            icon={<Utensils className="h-8 w-8" />}
            title="What's your diet like?"
            description="Your typical eating habits"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { value: 'vegan', label: 'Vegan', description: 'Plant-based diet' },
                { value: 'vegetarian', label: 'Vegetarian', description: 'No meat, some dairy/eggs' },
                { value: 'mixed', label: 'Mixed', description: 'Balanced meat and plants' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onValueChange('diet', option.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    values.diet === option.value
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                      : 'border-border hover:border-accent-300'
                  }`}
                >
                  <div className="font-semibold text-foreground">{option.label}</div>
                  <div className="text-sm text-text-muted">{option.description}</div>
                </button>
              ))}
            </div>

            <DetailSection title="Food category impact breakdown">
              <div className="space-y-3 text-sm text-text-secondary">
                <p className="mb-3">
                  Food production accounts for ~25% of global emissions. Here's how different categories compare:
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Beef & Lamb</span>
                    <span className="text-accent-danger">Very High (50-100 kg CO₂/kg)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Pork & Poultry</span>
                    <span className="text-accent-warning">High (5-12 kg CO₂/kg)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Dairy & Eggs</span>
                    <span className="text-neutral-500">Moderate (2-5 kg CO₂/kg)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Plant-based Foods</span>
                    <span className="text-accent-success">Low (0.3-2 kg CO₂/kg)</span>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-3">
                  Annual diet emissions: Vegan ~1.5t CO₂, Vegetarian ~2.5t CO₂, Mixed ~3.3t CO₂
                </p>
              </div>
            </DetailSection>
          </Question>
        )}

        {step === 4 && (
          <Question
            icon={<Home className="h-8 w-8" />}
            title="How much energy do you use?"
            description="Heating, cooling, electricity usage"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { value: 'low', label: 'Low', description: 'Energy-efficient home, minimal use' },
                { value: 'average', label: 'Average', description: 'Typical household consumption' },
                { value: 'high', label: 'High', description: 'Large home, high usage' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onValueChange('energy', option.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    values.energy === option.value
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                      : 'border-border hover:border-accent-300'
                  }`}
                >
                  <div className="font-semibold text-foreground">{option.label}</div>
                  <div className="text-sm text-text-muted">{option.description}</div>
                </button>
              ))}
            </div>

            <DetailSection title="Appliance & energy breakdown">
              <div className="space-y-3 text-sm text-text-secondary">
                <p className="mb-3">
                  Home energy usage varies widely by appliances, insulation, and grid intensity. Typical annual emissions by appliance:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/30">
                    <span>Heating/Cooling</span>
                    <span className="font-medium">~800 kg CO₂</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/30">
                    <span>Water Heater</span>
                    <span className="font-medium">~450 kg CO₂</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/30">
                    <span>Lighting</span>
                    <span className="font-medium">~200 kg CO₂</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/30">
                    <span>Appliances</span>
                    <span className="font-medium">~300 kg CO₂</span>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-3">
                  Total annual home energy: Low ~1.5t CO₂, Average ~2.5t CO₂, High ~4t CO₂
                </p>
                <p className="text-xs text-text-muted">
                  Note: Emissions depend on your local grid's fuel mix (coal vs. renewables)
                </p>
              </div>
            </DetailSection>
          </Question>
        )}

        {step === 5 && (
          <Question
            icon={<ShoppingBag className="h-8 w-8" />}
            title="How much do you shop?"
            description="Clothing, electronics, household goods"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { value: 'minimal', label: 'Minimal', description: 'Buy only essentials' },
                { value: 'moderate', label: 'Moderate', description: 'Regular shopping habits' },
                { value: 'high', label: 'Frequent', description: 'Shop often for new items' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onValueChange('shopping', option.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    values.shopping === option.value
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                      : 'border-border hover:border-accent-300'
                  }`}
                >
                  <div className="font-semibold text-foreground">{option.label}</div>
                  <div className="text-sm text-text-muted">{option.description}</div>
                </button>
              ))}
            </div>

            <DetailSection title="Shopping category emissions">
              <div className="space-y-3 text-sm text-text-secondary">
                <p className="mb-3">
                  Consumer goods have embedded emissions from manufacturing, shipping, and packaging. Typical emissions by category:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-medium">Electronics (laptop, phone)</span>
                    <span className="text-accent-warning">~200-400 kg CO₂ each</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-medium">Clothing (fast fashion)</span>
                    <span className="text-neutral-500">~5-20 kg CO₂ per item</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-medium">Furniture (sofa, table)</span>
                    <span className="text-accent-danger">~100-300 kg CO₂ each</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-medium">Books & small goods</span>
                    <span className="text-accent-success">~1-5 kg CO₂ each</span>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-3">
                  Annual shopping emissions: Minimal ~500 kg CO₂, Moderate ~1t CO₂, Frequent ~2t CO₂
                </p>
                <p className="text-xs text-text-muted">
                  Tip: Buying used, repairing items, and choosing durable goods reduces impact significantly
                </p>
              </div>
            </DetailSection>
          </Question>
        )}

        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
          )}
          <Button onClick={onNext} className="flex-1">
            {step === 5 ? 'Calculate' : 'Next'}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface QuestionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Question({ icon, title, description, children }: QuestionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-accent-50 dark:bg-accent-900/30 text-accent-500 dark:text-accent-400">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-text-muted mt-1">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

function DetailSection({ title, children }: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <Collapsible.Trigger asChild>
        <button
          className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-border hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
          aria-label={isOpen ? `Hide ${title}` : `Show ${title}`}
        >
          <span className="text-sm font-medium text-text-secondary">{title}</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-text-muted transition-transform" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted transition-transform" />
          )}
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
        <div className="px-4 py-3 mt-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-border">
          {children}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

interface ResultsViewProps {
  footprint: number;
  globalAverage: number;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
  onExplore: () => void;
}

function ResultsView({ footprint, globalAverage, onReset, onSave, onClose, onExplore }: ResultsViewProps) {
  const percentOfAverage = ((footprint / globalAverage) * 100).toFixed(0);
  const diff = footprint - globalAverage;
  const isAboveAverage = diff > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center py-6"
    >
      <div className="p-6 rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100/50 dark:from-accent-900/30 dark:to-accent-800/20">
        <p className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
          Estimated Annual Emissions
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-6xl font-bold text-accent-600 dark:text-accent-400">{footprint}</span>
          <span className="text-2xl text-text-secondary">tonnes CO₂</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-left">
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-text-muted mb-1">Global average</p>
          <p className="text-2xl font-semibold text-foreground">{globalAverage}t</p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-text-muted mb-1">vs Global Average</p>
          <p className={`text-2xl font-semibold ${isAboveAverage ? 'text-accent-danger' : 'text-accent-success'}`}>
            {isAboveAverage ? '+' : ''}{diff.toFixed(1)}t ({percentOfAverage}%)
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 text-left">
        <p className="text-sm font-medium text-foreground mb-2">💡 Context</p>
        <p className="text-sm text-text-secondary">
          {isAboveAverage
            ? `This estimate is ${Math.abs(diff).toFixed(1)}t above the global average of ${globalAverage}t/year. The global average combines varying emission levels across different regions and lifestyles.`
            : diff === 0
            ? `This estimate matches the global average of ${globalAverage}t/year.`
            : `This estimate is ${Math.abs(diff).toFixed(1)}t below the global average of ${globalAverage}t/year.`}
        </p>
      </div>

      <div className="space-y-2">
        <Button onClick={onSave} className="w-full gap-2" size="lg">
          <Save className="h-5 w-5" />
          Save to Profile & View Dashboard
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset} className="flex-1">
            Recalculate
          </Button>
          <Button variant="outline" onClick={onExplore} className="flex-1">
            Explore data
          </Button>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        This is a simplified estimate. Save to your profile to track over time, or explore sector data for detailed analysis.
      </p>
    </motion.div>
  );
}
