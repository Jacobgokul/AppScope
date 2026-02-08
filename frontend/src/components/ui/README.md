# UI Components Documentation

This directory contains reusable UI components built with React, TypeScript, and Tailwind CSS.

## Components

### Button

A flexible button component with multiple variants and states.

```tsx
import { Button } from '@/components/ui';

// Primary button
<Button variant="primary" size="md">
  Click me
</Button>

// With loading state
<Button variant="primary" isLoading>
  Loading...
</Button>

// Ghost button
<Button variant="ghost" size="sm">
  Cancel
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `isLoading`: boolean (shows spinner when true)
- All standard button HTML attributes

### Input

A styled input component with label, error states, and icon support.

```tsx
import { Input } from '@/components/ui';
import { Mail } from 'lucide-react';

// Basic input
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
/>

// With icon
<Input
  label="Email"
  icon={<Mail size={20} />}
  placeholder="Enter your email"
/>

// With error
<Input
  label="Password"
  type="password"
  error="Password is required"
/>

// With helper text
<Input
  label="Username"
  helperText="Choose a unique username"
/>
```

**Props:**
- `label`: string (optional)
- `error`: string (shows error message)
- `helperText`: string (shows help text)
- `icon`: React.ReactNode (shows icon on left)
- All standard input HTML attributes

### Card

A container component with glassmorphism effects and hover animations.

```tsx
import { Card } from '@/components/ui';

// Default card
<Card>
  <h3>Title</h3>
  <p>Content goes here</p>
</Card>

// Glass effect
<Card variant="glass">
  <p>Glassmorphism card</p>
</Card>

// With hover effect
<Card variant="gradient" hover>
  <p>Hover over me!</p>
</Card>
```

**Props:**
- `variant`: 'default' | 'glass' | 'gradient' (default: 'default')
- `hover`: boolean (adds hover animation when true)
- All standard div HTML attributes

### Modal

A modal dialog with smooth animations and backdrop blur.

```tsx
import { Modal } from '@/components/ui';
import { useState } from 'react';

function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Modal
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Modal Title"
        size="md"
      >
        <p>Modal content goes here</p>
      </Modal>
    </>
  );
}
```

**Props:**
- `isOpen`: boolean (controls visibility)
- `onClose`: () => void (callback when closing)
- `title`: string (optional modal title)
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `closeOnOverlayClick`: boolean (default: true)

## Styling

All components use Tailwind CSS utility classes and support:
- Dark mode (default theme)
- Custom colors from the design system
- Responsive breakpoints
- Smooth animations
- Accessibility features

## Customization

You can extend any component with additional Tailwind classes:

```tsx
<Button className="mt-4 w-full">
  Full width button
</Button>

<Card className="max-w-md mx-auto">
  Centered card
</Card>
```

## Theme

Components use these color tokens:
- `primary-*`: Purple gradient colors
- `pink-*`: Pink accent colors
- `cyan-*`: Cyan accent colors
- `dark-*`: Dark theme background and text colors

See `tailwind.config.js` for the complete color palette.
