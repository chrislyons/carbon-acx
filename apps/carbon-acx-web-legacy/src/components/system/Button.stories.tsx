/**
 * Button Component Stories
 *
 * Demonstrates all Button variants, sizes, and states in Storybook.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { ArrowRight, Download, Plus, Settings } from 'lucide-react';

const meta = {
  title: 'System/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'ghost',
        'outline',
        'success',
        'warning',
        'danger',
        'goal',
        'insight',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'icon', 'icon-sm', 'icon-lg'],
    },
    rounded: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'full'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic Variants
// ============================================================================

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

// ============================================================================
// Semantic Variants
// ============================================================================

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

// ============================================================================
// Story-Specific Variants
// ============================================================================

export const Goal: Story = {
  args: {
    children: 'Set Goal',
    variant: 'goal',
    rightIcon: <ArrowRight className="h-4 w-4" />,
  },
};

export const Insight: Story = {
  args: {
    children: 'View Insights',
    variant: 'insight',
    leftIcon: <Settings className="h-4 w-4" />,
  },
};

// ============================================================================
// Sizes
// ============================================================================

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

// ============================================================================
// With Icons
// ============================================================================

export const WithLeftIcon: Story = {
  args: {
    children: 'Download',
    leftIcon: <Download className="h-4 w-4" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Continue',
    rightIcon: <ArrowRight className="h-4 w-4" />,
  },
};

export const WithBothIcons: Story = {
  args: {
    children: 'Add Activity',
    leftIcon: <Plus className="h-4 w-4" />,
    rightIcon: <ArrowRight className="h-4 w-4" />,
  },
};

// ============================================================================
// Icon Buttons
// ============================================================================

export const IconButton: Story = {
  args: {
    size: 'icon',
    'aria-label': 'Settings',
    children: <Settings className="h-4 w-4" />,
  },
};

export const IconButtonSmall: Story = {
  args: {
    size: 'icon-sm',
    variant: 'ghost',
    'aria-label': 'Add',
    children: <Plus className="h-3.5 w-3.5" />,
  },
};

export const IconButtonLarge: Story = {
  args: {
    size: 'icon-lg',
    'aria-label': 'Download',
    children: <Download className="h-5 w-5" />,
  },
};

// ============================================================================
// States
// ============================================================================

export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

// ============================================================================
// Roundness Variants
// ============================================================================

export const Roundness: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button rounded="sm">Small Radius</Button>
      <Button rounded="default">Default Radius</Button>
      <Button rounded="lg">Large Radius</Button>
      <Button rounded="xl">Extra Large Radius</Button>
      <Button rounded="full">Full Radius</Button>
    </div>
  ),
};

// ============================================================================
// All Variants Showcase
// ============================================================================

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-8">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="goal">Goal</Button>
      <Button variant="insight">Insight</Button>
    </div>
  ),
};

// ============================================================================
// Real-World Examples
// ============================================================================

export const CallToAction: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-md p-8 bg-[var(--surface-bg)] rounded-lg">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">
        Ready to reduce your carbon footprint?
      </h2>
      <p className="text-[var(--text-secondary)]">
        Start tracking your emissions and discover opportunities for improvement.
      </p>
      <div className="flex gap-3">
        <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
          Get Started
        </Button>
        <Button size="lg" variant="outline">
          Learn More
        </Button>
      </div>
    </div>
  ),
};

export const ActionBar: Story = {
  render: () => (
    <div className="flex items-center justify-between p-4 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
      <div className="flex gap-2">
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          Save Draft
        </Button>
        <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
          Continue
        </Button>
      </div>
    </div>
  ),
};
