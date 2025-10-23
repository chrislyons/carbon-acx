import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Calculator, BarChart2, Building2, Zap, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PathChoice = 'quick' | 'detailed' | null;

export default function OnboardingWizard({ open, onOpenChange }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [pathChoice, setPathChoice] = useState<PathChoice>(null);
  const navigate = useNavigate();

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setPathChoice(null);
    }
  }, [open]);

  const handlePathChoice = (path: PathChoice) => {
    setPathChoice(path);
    setStep(1);
  };

  const handleComplete = () => {
    // Mark onboarding as complete
    localStorage.setItem('acx:onboarding-completed', 'true');
    onOpenChange(false);

    // Navigate based on path choice
    if (pathChoice === 'quick') {
      navigate('/dashboard?calculator=true');
    } else if (pathChoice === 'detailed') {
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('acx:onboarding-completed', 'true');
    localStorage.setItem('acx:onboarding-skipped', 'true');
    onOpenChange(false);
  };

  const totalSteps = pathChoice === 'quick' ? 2 : 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>Welcome to Carbon ACX</DialogTitle>
              <Badge variant="secondary" className="text-xs">
                Step {step + 1} of {totalSteps}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="mr-2 focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2"
            >
              Skip
            </Button>
          </div>
          <div className="w-full bg-border rounded-full h-1.5 mt-2">
            <motion.div
              className="bg-accent-600 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 0 && <WelcomeStep onChoosePath={handlePathChoice} />}
          {step === 1 && pathChoice === 'quick' && <QuickPathStep onNext={handleComplete} onBack={() => setStep(0)} />}
          {step === 1 && pathChoice === 'detailed' && <DetailedStep1 onNext={() => setStep(2)} onBack={() => setStep(0)} />}
          {step === 2 && pathChoice === 'detailed' && <DetailedStep2 onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && pathChoice === 'detailed' && <DetailedStep3 onNext={handleComplete} onBack={() => setStep(2)} />}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function WelcomeStep({ onChoosePath }: { onChoosePath: (path: PathChoice) => void }) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-200 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-accent-600 dark:text-accent-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Let's calculate your carbon footprint
        </h2>
        <p className="text-text-secondary text-sm max-w-lg mx-auto">
          Choose your preferred approach. Both methods give you a complete emissions profile with audit-ready reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Calculator Path */}
        <Card
          className="border-2 border-border hover:border-accent-500 transition-all cursor-pointer group"
          onClick={() => onChoosePath('quick')}
        >
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Calculator className="h-6 w-6 text-accent-600" />
              <CardTitle className="text-lg">Quick Calculator</CardTitle>
            </div>
            <Badge variant="secondary" className="w-fit">~2 minutes</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-secondary">
              Answer 4 simple questions for an instant estimate. Perfect for getting started quickly.
            </p>
            <ul className="text-xs text-text-secondary space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Instant results with commute, diet, energy, and shopping</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>No prior knowledge needed</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Can refine later with detailed analysis</span>
              </li>
            </ul>
            <div className="flex items-center gap-2 text-accent-600 text-sm font-medium group-hover:gap-3 transition-all pt-2">
              Start quick calc
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis Path */}
        <Card
          className="border-2 border-accent-500 bg-accent-50/30 dark:bg-accent-900/20 hover:border-accent-600 transition-all cursor-pointer group"
          onClick={() => onChoosePath('detailed')}
        >
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <BarChart2 className="h-6 w-6 text-accent-600 dark:text-accent-400" />
              <CardTitle className="text-lg">Detailed Analysis</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="w-fit">~10 minutes</Badge>
              <Badge className="w-fit bg-accent-600 dark:bg-accent-500">Recommended</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-secondary">
              Build your profile by selecting specific emission sources. Best for accuracy and compliance.
            </p>
            <ul className="text-xs text-text-secondary space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Audit-ready reports with full provenance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Activity-level tracking and scenario comparison</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Most accurate emissions profile</span>
              </li>
            </ul>
            <div className="flex items-center gap-2 text-accent-600 text-sm font-medium group-hover:gap-3 transition-all pt-2">
              Learn how it works
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-text-muted text-center">
        Don't worry - you can always switch between methods later
      </p>
    </motion.div>
  );
}

function QuickPathStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div
      key="quick-path"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Calculator className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Quick Calculator
        </h2>
        <p className="text-text-secondary text-sm max-w-lg mx-auto">
          You'll answer 4 simple questions about your daily activities. The calculator uses scientifically-backed emission factors to estimate your annual carbon footprint.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">What you'll provide:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-accent-600 dark:bg-accent-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-sm font-medium">Commute distance</p>
              <p className="text-xs text-text-muted">Your daily travel to work/school</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-accent-600 dark:bg-accent-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-sm font-medium">Diet type</p>
              <p className="text-xs text-text-muted">Meat-heavy, vegetarian, or vegan</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-accent-600 dark:bg-accent-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-sm font-medium">Home energy use</p>
              <p className="text-xs text-text-muted">Heating, cooling, appliances</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-accent-600 dark:bg-accent-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              4
            </div>
            <div>
              <p className="text-sm font-medium">Shopping habits</p>
              <p className="text-xs text-text-muted">Consumer goods and services</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
        <p className="text-xs text-foreground">
          <strong>💡 Pro tip:</strong> After seeing your quick estimate, you can always switch to Detailed Analysis for a more precise, audit-ready assessment.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Start Calculator
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function DetailedStep1({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div
      key="detailed-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-200 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-accent-600 dark:text-accent-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Understanding Activities
        </h2>
        <p className="text-text-secondary text-sm max-w-lg mx-auto">
          Activities are the building blocks of your carbon footprint
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            What is an activity?
          </p>
          <p className="text-xs text-text-secondary">
            Each activity represents <strong>one emissions source</strong> - like "brewing 12oz coffee" or "driving 1 mile".
            Activities have scientifically-backed emission factors that tell us exactly how much CO₂ they produce.
          </p>
        </div>

        <div className="border-l-4 border-accent-600 dark:border-accent-500 pl-3 space-y-1">
          <p className="text-xs font-medium text-foreground">Example: Coffee Shop Owner</p>
          <p className="text-xs text-text-secondary">
            You might select activities like: "Brewed coffee" + "Espresso" + "Milk steaming" + "Store electricity" + "Employee commute"
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Why this approach?
          </p>
          <ul className="text-xs text-text-secondary space-y-1.5 pl-4">
            <li>✓ <strong>Accuracy:</strong> Real emission factors from peer-reviewed sources</li>
            <li>✓ <strong>Transparency:</strong> See exactly where emissions come from</li>
            <li>✓ <strong>Compliance:</strong> Audit-ready reports with full provenance</li>
            <li>✓ <strong>Actionable:</strong> Identify your highest-impact areas</li>
          </ul>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-xs text-foreground">
          <strong>💡 Don't worry about perfection!</strong> Start with 5-10 activities that match your operations. You can always add more later.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next: Browse activities
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function DetailedStep2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div
      key="detailed-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-200 flex items-center justify-center mb-4">
          <Zap className="h-8 w-8 text-accent-600 dark:text-accent-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          How to Select Activities
        </h2>
        <p className="text-text-secondary text-sm max-w-lg mx-auto">
          We've organized activities by sector to make browsing easier
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-accent-50 to-white dark:from-accent-900/30 dark:to-surface border border-accent-200 dark:border-accent-700/30 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Step 1: Browse by Sector</p>
          <p className="text-xs text-text-secondary">
            Choose a sector that matches your operations (Transportation, Energy, Food & Agriculture, etc.).
            Each sector contains relevant activities organized by impact.
          </p>
          <div className="flex items-center gap-2 text-xs text-accent-600 dark:text-accent-400 bg-neutral-100 dark:bg-neutral-800/50 rounded px-3 py-2">
            <BarChart2 className="h-3.5 w-3.5" />
            <span>You'll see activities sorted by carbon intensity by default</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-50 to-white dark:from-accent-900/30 dark:to-surface border border-accent-200 dark:border-accent-700/30 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Step 2: Click to Add</p>
          <p className="text-xs text-text-secondary">
            Click any activity card to add it to your profile. Added activities show a checkmark.
            Don't worry about quantities yet - you'll specify those in the next step.
          </p>
          <div className="flex items-center gap-2">
            <div className="bg-neutral-100 dark:bg-neutral-800/50 border-2 border-accent-500 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent-600 dark:text-accent-400" />
              <span className="font-medium">Activity Selected</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-50 to-white dark:from-accent-900/30 dark:to-surface border border-accent-200 dark:border-accent-700/30 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Step 3: Use Search & Filters</p>
          <p className="text-xs text-text-secondary">
            Use the search bar to find specific activities quickly. Sort by name, impact, or category.
            The "More options" button reveals additional controls like Quick Add Top 3.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
        <p className="text-xs text-foreground">
          <strong>🎯 Goal:</strong> Select 5-20 activities that represent your main emission sources. Quality over quantity!
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next: What happens next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function DetailedStep3({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div
      key="detailed-3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          You're Ready!
        </h2>
        <p className="text-text-secondary text-sm max-w-lg mx-auto">
          Here's what happens after you select activities
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-gradient-to-r from-accent-50 to-white dark:from-accent-900/30 dark:to-surface border border-accent-200 dark:border-accent-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-600 dark:bg-accent-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">Specify Quantities</p>
              <p className="text-xs text-text-secondary">
                Each activity starts with a default quantity (1 unit/year). You'll be able to update these to match your actual usage.
                For example: "100 coffees/week" or "500 miles/month".
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-50 to-white dark:from-accent-900/30 dark:to-surface border border-accent-200 dark:border-accent-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-600 dark:bg-accent-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">See Your Dashboard</p>
              <p className="text-xs text-text-secondary">
                Your dashboard will show your total carbon footprint, broken down by activity and sector.
                You'll see charts, trends, and comparisons to global averages.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-50 to-white dark:from-accent-900/30 dark:to-surface border border-accent-200 dark:border-accent-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-600 dark:bg-accent-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">Generate Reports</p>
              <p className="text-xs text-text-secondary">
                Export audit-ready reports with full data provenance. Every calculation includes citations to
                peer-reviewed emission factors, making your footprint defensible and transparent.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Ready to start?</p>
        <p className="text-xs text-text-secondary">
          You'll be taken to your dashboard where you can browse sectors and select activities.
          Take your time - your profile is saved automatically as you go.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
        <p className="text-xs text-foreground">
          <strong>💡 Remember:</strong> You can re-open this guide anytime from the Help menu if you need a refresher.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} size="lg" className="gap-2">
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
