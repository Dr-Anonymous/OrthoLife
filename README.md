# OrthoLife: Integrated Clinical Workspace

OrthoLife is a premium, high-fidelity clinical and practice management system built specifically for orthopedic specialists. It provides high-performance modules for outpatient consultations, inpatient stays, local inventory management, patient communication portals, and more.

## Tech Stack

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State Management & Caching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Backend**: [Supabase](https://supabase.com/) (Database, Auth, Storage, Edge Functions)
- **Internationalization**: Translation-ready for multilingual clinics (English, Telugu)

## Core Features

- **Outpatient Workspace (`/op`)**:
  - Full electronic medical record (EMR) interface with quick-entry shortcuts, automated autofill from history, and dynamic timers.
  - Multi-location awareness for customized branding.
- **Inpatient Management (`/ip`)**:
  - Real-time patient status tracking (Admitted/Discharged), complete consent digitization, and surgical planning.
  - Automatic background SMS / WhatsApp notifications via Supabase Edge Functions.
- **Dynamic Document Generation**:
  - Direct print-to-PDF engine for prescriptions, medical certificates, discharge summaries, and payment receipts.
  - Pixel-perfect geometry including dynamic space normalization for customized physical letterheads.
- **Offline Mode**:
  - Fully decoupled storage layer fallback. When connection drops, records are queued locally and synchronized immediately upon reconnection.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dr-Anonymous/OrthoLife.git
   cd OrthoLife
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the local development server:
   ```bash
   npm run dev
   ```

## Development and Architecture

For technical details, please refer to the complete [ARCHITECTURE.md](./ARCHITECTURE.md) document.
