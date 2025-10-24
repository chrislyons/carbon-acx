import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Car, Home, ShoppingBag, Utensils, X, Save } from 'lucide-react';

import { useProfile } from '../contexts/ProfileContext';
import type { CalculatorResult } from '../contexts/ProfileContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export default function QuickCalculator() {
  const navigate = useNavigate();
  const { saveCalculatorResults } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({
    commute: 10, // km per day
    diet: 'mixed',
    energy: 'average',
    shopping: 'moderate',
  });

  const calculateFootprint = (): { total: number; breakdown: Omit<CalculatorResult, 'calculatedAt'>[] } => {
    // Simplified carbon calculation (kg CO₂ per year)
    const breakdown: Omit<CalculatorResult, 'calculatedAt'>[] = [];

    // Transport: ~0.2kg CO₂ per km for average car
    const commuteEmissions = values.commute * 0.2 * 365;
    breakdown.push({
      category: 'commute',
      label: `${values.commute}km daily commute`,
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
          {step < 5 ? (
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
                  commute: 10,
                  diet: 'mixed',
                  energy: 'average',
                  shopping: 'moderate',
                });
              }}
              onSave={handleSaveToProfile}
              onClose={() => setIsOpen(false)}
            />
          )}
        </div>

        {/* Progress indicator */}
        {step < 5 && (
          <div className="flex gap-2 mt-6">
            {[1, 2, 3, 4].map((i) => (
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
            title="How far do you commute daily?"
            description="One-way distance by car, bus, or other motorized transport"
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

        {step === 2 && (
          <Question
            icon={<Utensils className="h-8 w-8" />}
            title="What's your diet like?"
            description="Your typical eating habits"
          >
            <div className="grid gap-3">
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
          </Question>
        )}

        {step === 3 && (
          <Question
            icon={<Home className="h-8 w-8" />}
            title="How much energy do you use?"
            description="Heating, cooling, electricity usage"
          >
            <div className="grid gap-3">
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
          </Question>
        )}

        {step === 4 && (
          <Question
            icon={<ShoppingBag className="h-8 w-8" />}
            title="How much do you shop?"
            description="Clothing, electronics, household goods"
          >
            <div className="grid gap-3">
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
          </Question>
        )}

        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
          )}
          <Button onClick={onNext} className="flex-1">
            {step === 4 ? 'Calculate' : 'Next'}
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

interface ResultsViewProps {
  footprint: number;
  globalAverage: number;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
}

function ResultsView({ footprint, globalAverage, onReset, onSave, onClose }: ResultsViewProps) {
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
          <Button variant="outline" onClick={onClose} className="flex-1">
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
