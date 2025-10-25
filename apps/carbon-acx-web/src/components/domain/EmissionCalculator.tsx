/**
 * EmissionCalculator v2 - Interactive carbon footprint calculator
 *
 * Immersive wizard-style calculator with:
 * - Real-time feedback as user adjusts sliders
 * - Contextual comparisons (flights, meals, trees)
 * - Memorable result screen with celebration
 * - Design token consistency
 * - Canvas-first layout
 *
 * Phase 2 Week 4 implementation
 */

import * as React from 'react';
import { TransitionWrapper } from '../canvas/TransitionWrapper';
import { GaugeProgress } from '../viz/GaugeProgress';
import { Button } from '../system/Button';
import { Car, Utensils, Home, ShoppingBag, ArrowRight, ArrowLeft, Plane, Trees, Coffee } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface EmissionCalculatorProps {
  onComplete: (results: CalculatorResults) => void;
  onCancel?: () => void;
}

export interface CalculatorResults {
  total: number; // kg CO₂ per year
  breakdown: {
    commute: number;
    diet: number;
    energy: number;
    shopping: number;
  };
  comparisons: {
    flights: number; // equivalent NYC-LA round trips
    trees: number; // trees needed to offset
    meals: number; // equivalent plant-based meals
  };
}

interface Question {
  id: 'commute' | 'diet' | 'energy' | 'shopping';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  inputType: 'slider' | 'choice';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string;
  options?: Array<{
    value: string;
    label: string;
    description: string;
    emissions: number; // kg CO₂/year
  }>;
}

// ============================================================================
// Data
// ============================================================================

const QUESTIONS: Question[] = [
  {
    id: 'commute',
    icon: Car,
    title: 'How far do you commute daily?',
    description: 'One-way distance by car, bus, or other motorized transport',
    inputType: 'slider',
    unit: 'km',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 10,
  },
  {
    id: 'diet',
    icon: Utensils,
    title: "What's your diet like?",
    description: 'Your typical eating habits',
    inputType: 'choice',
    defaultValue: 'mixed',
    options: [
      {
        value: 'vegan',
        label: 'Vegan',
        description: 'Plant-based diet only',
        emissions: 1500,
      },
      {
        value: 'vegetarian',
        label: 'Vegetarian',
        description: 'No meat, some dairy/eggs',
        emissions: 2500,
      },
      {
        value: 'mixed',
        label: 'Mixed',
        description: 'Balanced meat and plants',
        emissions: 3300,
      },
    ],
  },
  {
    id: 'energy',
    icon: Home,
    title: 'How much energy do you use?',
    description: 'Heating, cooling, electricity usage',
    inputType: 'choice',
    defaultValue: 'average',
    options: [
      {
        value: 'low',
        label: 'Low',
        description: 'Energy-efficient home, minimal use',
        emissions: 1500,
      },
      {
        value: 'average',
        label: 'Average',
        description: 'Typical household consumption',
        emissions: 2500,
      },
      {
        value: 'high',
        label: 'High',
        description: 'Large home, high usage',
        emissions: 4000,
      },
    ],
  },
  {
    id: 'shopping',
    icon: ShoppingBag,
    title: 'How much do you shop?',
    description: 'Clothing, electronics, household goods',
    inputType: 'choice',
    defaultValue: 'moderate',
    options: [
      {
        value: 'minimal',
        label: 'Minimal',
        description: 'Buy only essentials',
        emissions: 500,
      },
      {
        value: 'moderate',
        label: 'Moderate',
        description: 'Regular shopping habits',
        emissions: 1000,
      },
      {
        value: 'high',
        label: 'Frequent',
        description: 'Shop often for new items',
        emissions: 2000,
      },
    ],
  },
];

// Constants for comparisons
const EMISSIONS_PER_FLIGHT = 900; // kg CO₂ for NYC-LA round trip
const CO2_ABSORBED_PER_TREE = 22; // kg CO₂ per tree per year
const EMISSIONS_DIFF_MEAL = 2.5; // kg CO₂ difference between meat and plant-based meal

// ============================================================================
// Component
// ============================================================================

export function EmissionCalculator({ onComplete, onCancel }: EmissionCalculatorProps) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number | string>>({
    commute: 10,
    diet: 'mixed',
    energy: 'average',
    shopping: 'moderate',
  });

  const currentQuestion = QUESTIONS[step];
  const isLastQuestion = step === QUESTIONS.length - 1;

  // Calculate emissions in real-time
  const calculateEmissions = React.useCallback(() => {
    // Commute: ~0.2kg CO₂ per km for average car, 365 days/year
    const commuteEmissions = (answers.commute as number) * 0.2 * 365;

    // Diet: from options
    const dietOption = QUESTIONS[1].options?.find((opt) => opt.value === answers.diet);
    const dietEmissions = dietOption?.emissions || 2500;

    // Energy: from options
    const energyOption = QUESTIONS[2].options?.find((opt) => opt.value === answers.energy);
    const energyEmissions = energyOption?.emissions || 2500;

    // Shopping: from options
    const shoppingOption = QUESTIONS[3].options?.find((opt) => opt.value === answers.shopping);
    const shoppingEmissions = shoppingOption?.emissions || 1000;

    const total = commuteEmissions + dietEmissions + energyEmissions + shoppingEmissions;

    // Calculate comparisons
    const flights = total / EMISSIONS_PER_FLIGHT;
    const trees = total / CO2_ABSORBED_PER_TREE;
    const meals = total / EMISSIONS_DIFF_MEAL;

    return {
      total,
      breakdown: {
        commute: commuteEmissions,
        diet: dietEmissions,
        energy: energyEmissions,
        shopping: shoppingEmissions,
      },
      comparisons: {
        flights,
        trees,
        meals,
      },
    };
  }, [answers]);

  const emissions = calculateEmissions();

  const handleAnswer = (value: number | string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onComplete(emissions);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onCancel]);

  return (
    <div className="max-w-4xl mx-auto px-[var(--space-8)]">
      {/* Progress indicator */}
      <div className="flex justify-center gap-[var(--space-2)] mb-[var(--space-12)]">
        {QUESTIONS.map((q, i) => (
          <div
            key={q.id}
            className="h-1 w-20 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: i <= step ? 'var(--interactive-primary)' : 'var(--border-subtle)',
            }}
          />
        ))}
      </div>

      {/* Question */}
      <TransitionWrapper type="slide-up" show={true} delay={100}>
        <QuestionCard
          question={currentQuestion}
          value={answers[currentQuestion.id]}
          onChange={handleAnswer}
          currentEmissions={emissions.total}
        />
      </TransitionWrapper>

      {/* Real-time feedback */}
      <TransitionWrapper type="fade" show={true} delay={300}>
        <div className="mt-[var(--space-8)]">
          <RealTimeFeedback emissions={emissions} />
        </div>
      </TransitionWrapper>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-[var(--space-12)]">
        <Button
          variant="ghost"
          size="md"
          onClick={handleBack}
          disabled={step === 0}
          icon={<ArrowLeft className="w-5 h-5" />}
        >
          Back
        </Button>

        <div
          className="text-center"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-tertiary)',
          }}
        >
          Question {step + 1} of {QUESTIONS.length}
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleNext}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          {isLastQuestion ? 'See Results' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface QuestionCardProps {
  question: Question;
  value: number | string;
  onChange: (value: number | string) => void;
  currentEmissions: number;
}

function QuestionCard({ question, value, onChange, currentEmissions }: QuestionCardProps) {
  const Icon = question.icon;

  return (
    <div
      className="p-[var(--space-8)] rounded-[var(--radius-xl)]"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Question header */}
      <div className="flex items-start gap-[var(--space-4)] mb-[var(--space-6)]">
        <div
          className="p-[var(--space-3)] rounded-[var(--radius-lg)] flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-baseline-bg)',
          }}
        >
          <Icon className="w-8 h-8" style={{ color: 'var(--color-baseline)' }} />
        </div>
        <div className="flex-1">
          <h3
            className="font-bold mb-[var(--space-1)]"
            style={{
              fontSize: 'var(--font-size-xl)',
              color: 'var(--text-primary)',
            }}
          >
            {question.title}
          </h3>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {question.description}
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="mt-[var(--space-6)]">
        {question.inputType === 'slider' ? (
          <SliderInput
            value={value as number}
            onChange={(v) => onChange(v)}
            min={question.min!}
            max={question.max!}
            step={question.step!}
            unit={question.unit!}
          />
        ) : (
          <ChoiceInput
            value={value as string}
            onChange={(v) => onChange(v)}
            options={question.options!}
          />
        )}
      </div>
    </div>
  );
}

interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}

function SliderInput({ value, onChange, min, max, step, unit }: SliderInputProps) {
  return (
    <div className="space-y-[var(--space-4)]">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--interactive-primary) 0%, var(--interactive-primary) ${
            ((value - min) / (max - min)) * 100
          }%, var(--border-subtle) ${((value - min) / (max - min)) * 100}%, var(--border-subtle) 100%)`,
        }}
      />
      <div className="text-center">
        <span
          className="font-bold"
          style={{
            fontSize: 'var(--font-size-4xl)',
            color: 'var(--text-primary)',
          }}
        >
          {value}
        </span>
        <span
          className="ml-[var(--space-2)]"
          style={{
            fontSize: 'var(--font-size-xl)',
            color: 'var(--text-secondary)',
          }}
        >
          {unit}
        </span>
      </div>
      <div
        className="flex justify-between"
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span>None</span>
        <span>Long commute</span>
      </div>
    </div>
  );
}

interface ChoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    description: string;
    emissions: number;
  }>;
}

function ChoiceInput({ value, onChange, options }: ChoiceInputProps) {
  return (
    <div className="grid gap-[var(--space-3)]">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="p-[var(--space-4)] rounded-[var(--radius-lg)] border-2 text-left transition-all hover:scale-[1.01]"
            style={{
              borderColor: isSelected ? 'var(--interactive-primary)' : 'var(--border-default)',
              backgroundColor: isSelected ? 'var(--color-baseline-bg)' : 'var(--surface-bg)',
            }}
          >
            <div
              className="font-semibold mb-[var(--space-1)]"
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-primary)',
              }}
            >
              {option.label}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              {option.description}
            </div>
            <div
              className="mt-[var(--space-2)] font-medium"
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
              }}
            >
              ~{(option.emissions / 1000).toFixed(1)}t CO₂/year
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface RealTimeFeedbackProps {
  emissions: CalculatorResults;
}

function RealTimeFeedback({ emissions }: RealTimeFeedbackProps) {
  const totalTonnes = emissions.total / 1000;
  const globalAverage = 4.5; // tonnes CO₂ per person per year

  return (
    <div
      className="p-[var(--space-6)] rounded-[var(--radius-lg)]"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Running total with gauge */}
      <div className="flex items-center justify-between mb-[var(--space-6)]">
        <div>
          <div
            className="mb-[var(--space-1)]"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            Current Estimate
          </div>
          <div className="flex items-baseline gap-[var(--space-2)]">
            <span
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-3xl)',
                color: 'var(--text-primary)',
              }}
            >
              {totalTonnes.toFixed(1)}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-lg)',
                color: 'var(--text-secondary)',
              }}
            >
              tonnes CO₂/year
            </span>
          </div>
        </div>

        <div className="w-32 h-32">
          <GaugeProgress
            value={totalTonnes}
            max={globalAverage * 2}
            colorScheme="carbon"
            showValue={false}
          />
        </div>
      </div>

      {/* Contextual comparisons */}
      <div className="grid grid-cols-3 gap-[var(--space-4)]">
        <ComparisonCard
          icon={<Plane className="w-5 h-5" />}
          value={emissions.comparisons.flights.toFixed(1)}
          label="round trip flights"
          sublabel="NYC → LA"
        />
        <ComparisonCard
          icon={<Trees className="w-5 h-5" />}
          value={Math.ceil(emissions.comparisons.trees).toString()}
          label="trees needed"
          sublabel="to offset/year"
        />
        <ComparisonCard
          icon={<Coffee className="w-5 h-5" />}
          value={Math.floor(emissions.comparisons.meals).toString()}
          label="plant meals"
          sublabel="vs meat equivalent"
        />
      </div>
    </div>
  );
}

interface ComparisonCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel: string;
}

function ComparisonCard({ icon, value, label, sublabel }: ComparisonCardProps) {
  return (
    <div className="text-center space-y-[var(--space-2)]">
      <div
        className="mx-auto w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-secondary)',
        }}
      >
        {icon}
      </div>
      <div
        className="font-bold"
        style={{
          fontSize: 'var(--font-size-2xl)',
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-tertiary)',
        }}
      >
        {sublabel}
      </div>
    </div>
  );
}
