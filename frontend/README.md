# StaffVerify Frontend

Welcome to the StaffVerify Frontend project. It is a modern single-page application (SPA) built to deliver a fast and responsive user experience.

## 🛠 Tech Stack

The application is built using a modern React ecosystem:

- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router](https://reactrouter.com/) (v6)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with `tailwindcss-animate`
- **UI Components**: [Radix UI](https://www.radix-ui.com/) Primitives, [Sonner](https://sonner.emilkowal.ski/) (Toasts)
- **State & Data Fetching**: [TanStack React Query](https://tanstack.com/query/latest)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts & Utilities**: Recharts, date-fns, Framer Motion, html2canvas, jsPDF
- **Payments**: Stripe React JS

## 📁 Project Structure

```
staffverify/frontend/
├── public/                 # Static assets
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── lib/                # Utility functions, APIs, custom hooks
│   ├── pages/              # Route-level components / Pages
│   ├── utils/              # Helper utilities
│   ├── pages.config.js     # Page/Route configuration mappings
│   ├── App.jsx             # Main application component
│   ├── Layout.jsx          # Application layout wrapper
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles and Tailwind directives
├── .env.example            # Example environment variables file
├── .CLAUDE.md              # AI/Developer coding conventions
├── components.json         # UI component generator configuration
├── eslint.config.js        # ESLint configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── vite.config.js          # Vite bundler configuration
```

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your local machine.

### Installation

1. Clone the repository and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   Copy `.env.example` to `.env.local` and configure your API URLs and credentials.
   ```bash
   cp .env.example .env.local
   ```
   _Note: At a minimum, set `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL`._

### Development

Start the Vite development server (runs on `http://localhost:3010` by default):

```bash
npm run dev
```

## 📜 Available Scripts

- `npm run dev` - Starts the development server.
- `npm run build` - Builds the app for production.
- `npm run preview` - Locally preview the production build.
- `npm run lint` - Runs ESLint to check for code issues.
- `npm run lint:fix` - Runs ESLint and automatically fixes fixable issues.
- `npm run typecheck` - Compiles TypeScript via `tsc` to type-check files.

## 🤝 Coding Conventions

Please review the `.CLAUDE.md` file in the project root for our frontend coding conventions, including guidelines on file organization, SOLID principles, and import sorting.
