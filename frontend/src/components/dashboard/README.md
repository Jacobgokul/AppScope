# Dashboard Components

This directory contains the main dashboard components for the AppScope frontend.

## Components

### ProjectCard.tsx
Displays a project in card format with:
- Project name and environment badge
- Overall health status indicator
- List of services with status dots
- Quick stats (uptime, latency, errors)
- Mini activity chart
- Action buttons for metrics and settings
- Hover animations and click navigation to project detail

**Props:**
- `project: Project` - Project object with services and stats

**Features:**
- Responsive design with glassmorphism effect
- Color-coded service status indicators
- Animated hover effects (lift and glow)
- Click navigation to `/projects/:id`

### StatsOverview.tsx
Displays overview statistics in a grid of metric cards:
- Total active projects
- Total services across all projects
- Overall uptime percentage
- Active alerts count

**Props:**
- `totalProjects: number`
- `totalServices: number`
- `overallUptime: number`
- `activeAlerts: number`

**Features:**
- Color-coded icons for each metric type
- Trend indicators (e.g., "+2 this week")
- Staggered entrance animations
- Hover lift effect

### CreateProjectModal.tsx
Modal for creating a new project with two steps:
1. Form step - collect project details
2. API key display - show generated API key with copy button

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed
- `onSuccess: (projectId: string) => void` - Callback after successful creation

**Features:**
- Two-step flow (form → API key display)
- Form validation
- Loading states
- Error handling
- API key copy to clipboard
- Quick start installation command
- Smooth animations with framer-motion

## Usage Example

```tsx
import { useState } from 'react'
import StatsOverview from '../components/dashboard/StatsOverview'
import ProjectCard from '../components/dashboard/ProjectCard'
import CreateProjectModal from '../components/dashboard/CreateProjectModal'

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState([])

  const stats = {
    totalProjects: projects.length,
    totalServices: projects.reduce((acc, p) => acc + p.services.length, 0),
    overallUptime: 99.2,
    activeAlerts: 7,
  }

  return (
    <div>
      <StatsOverview {...stats} />

      <div className="grid grid-cols-3 gap-6">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          loadProjects()
        }}
      />
    </div>
  )
}
```

## Styling

All components use:
- Tailwind CSS for styling
- Dark theme with glassmorphism effects
- Framer Motion for animations
- Custom color palette from `tailwind.config.js`

### Color Classes
- Primary: `bg-primary-500`, `text-primary-400`
- Success: `bg-green-500`, `text-green-400`
- Warning: `bg-yellow-500`, `text-yellow-400`
- Error: `bg-red-500`, `text-red-400`
- Dark backgrounds: `bg-dark-800`, `bg-dark-700`

## Dependencies

- React Router (navigation)
- Framer Motion (animations)
- Lucide React (icons)
- date-fns (date formatting)
- Zustand (state management)

## Type Definitions

See `src/types/index.ts` and `src/types/project.ts` for:
- Project
- Service
- ServiceType
- ServiceStatus
- ProjectStats

## Notes

- Mock data is currently used for services and stats
- Real data will be integrated when backend APIs are ready
- All components are fully typed with TypeScript
- Animations can be disabled by removing framer-motion props
