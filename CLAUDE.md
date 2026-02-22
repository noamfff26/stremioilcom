# CLAUDE.md - Codebase Guide for AI Assistants

## Project Overview

**Project Name**: Stremio IL (הענן שלי - "My Cloud")
**Type**: Progressive Web App (PWA) for video storage and streaming
**Built With**: Vite, React 18, TypeScript, Tailwind CSS, shadcn-ui
**Backend**: Supabase (PostgreSQL + Authentication + Storage)
**Status**: Active development with deployment to GitHub Pages

This is a Hebrew language video platform and cloud storage service allowing users to upload, organize, and stream their own media content.

---

## Technology Stack

### Core Dependencies
- **React 18.3.1** - UI framework
- **Vite 5.4.19** - Build tool with HMR
- **TypeScript 5.8.3** - Type safety
- **React Router 6.30.1** - Client-side routing using HashRouter
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn-ui** - Radix UI + Tailwind component library

### State Management & Data Fetching
- **TanStack React Query 5.83.0** - Server state management
- **React Context API** - Local state management (Auth, etc.)

### Form & Validation
- **React Hook Form 7.61.1** - Efficient form handling
- **Zod 3.25.76** - TypeScript-first schema validation
- **@hookform/resolvers** - Form validation integration

### Backend Integration
- **Supabase JS 2.95.3** - PostgreSQL, Auth, and Storage
- **@lovable.dev/cloud-auth-js 0.0.2** - Custom auth integration

### UI Components
- **Lucide React 0.462.0** - Icon library
- **Sonner 1.7.4** - Toast notifications
- **Recharts 2.15.4** - Charts and data visualization
- **Embla Carousel 8.6.0** - Carousel component
- **React Resizable Panels 2.1.9** - Resizable UI layouts

### PWA & Offline Support
- **vite-plugin-pwa 1.2.0** - PWA support with Workbox caching
- **next-themes 0.3.0** - Theme management

### Development Tools
- **Vitest 3.2.4** - Unit testing framework
- **ESLint 9.32.0** - Linting (loose rules, no unused vars checking)
- **TypeScript ESLint** - Type-aware linting

---

## Directory Structure

```
src/
├── components/           # Reusable UI components
│   └── ui/              # shadcn-ui component library
├── pages/               # Route components (Index, Auth, MyVideos, Profile, NotFound)
├── contexts/            # React Context providers (AuthContext)
├── hooks/               # Custom React hooks (useUploadManager, use-mobile, use-toast)
├── services/            # External service integrations (SharePoint, etc.)
├── integrations/        # Third-party integrations
│   ├── supabase/        # Supabase client and types
│   └── lovable/         # Lovable platform integration
├── lib/                 # Utility functions and helpers
├── test/                # Unit tests and test setup
├── assets/              # Static assets
├── App.tsx              # Main app component with routing
└── main.tsx             # React entry point

supabase/               # Supabase configuration and migrations

public/                 # Static files served at root

.github/
└── workflows/          # GitHub Actions for deployment
```

---

## Key Conventions

### Component Structure

**Naming:**
- Components: PascalCase (e.g., `MyVideos.tsx`)
- UI Components: PascalCase from shadcn-ui library
- Hooks: camelCase with `use` prefix (e.g., `useUploadManager.ts`)
- Utils: camelCase (e.g., `utils.ts`)

**File Organization:**
- Page components in `src/pages/` - each represents a route
- Reusable components in `src/components/`
- shadcn-ui components in `src/components/ui/`
- Custom hooks in `src/hooks/`

**Component Pattern:**
```tsx
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ComponentProps {
  title: string;
  onComplete?: () => void;
}

const MyComponent: React.FC<ComponentProps> = ({ title, onComplete }) => {
  const { user } = useAuth();

  return <div>{title}</div>;
};

export default MyComponent;
```

### Routing

- Uses **HashRouter** for client-side routing (important for GitHub Pages compatibility)
- Routes defined in `src/App.tsx`
- Pattern: `/`, `/auth`, `/my-videos`, `/profile`
- 404 catch-all route at `*`

### State Management

**Auth Context** (`src/contexts/AuthContext.tsx`):
- Manages user session and auth operations
- Provides: `user`, `session`, `loading`, `signIn`, `signUp`, `signOut`
- Hook: `useAuth()` must be used within AuthProvider
- Automatically creates user profile on signup
- **Important**: Auth state listener set up FIRST, then checks for existing session

**Data Fetching**:
- Use TanStack React Query for server state
- Custom hooks for complex state logic (e.g., `useUploadManager`)
- React Context for global app state

**Local State**:
- useState for component-level state
- useCallback for memoized functions to prevent re-renders
- useRef for values that shouldn't trigger re-renders

### Type Safety

**TypeScript Configuration:**
- Target: ES2020
- Strict mode: OFF (intentionally relaxed for faster development)
- No unused vars checking disabled
- JSX: react-jsx (automatic runtime)

**Type Patterns:**
```tsx
// Interface for component props
interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
}

// Interface for context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
}

// Type for union states
type FileType = "video" | "image" | "document" | "other";
```

### Styling

- **Tailwind CSS** for all styling
- **Class variance authority** for component-level style variants
- `clsx` and `tailwind-merge` for conditional classes
- Tailwind config in `tailwind.config.ts` with custom theme colors
- RTL support configured for Hebrew language
- No custom CSS files; all styles use Tailwind utility classes

### Forms & Validation

- **React Hook Form** for form state management
- **Zod** for schema validation
- Example pattern:
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### Supabase Integration

**Client Setup** (`src/integrations/supabase/client.ts`):
- Single Supabase client instance exported as `supabase`
- Uses environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Automatically sets auth session from localStorage

**Database Operations:**
```typescript
// Read
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .eq("column", value)
  .single();

// Create
const { data, error } = await supabase
  .from("table_name")
  .insert({ field: value })
  .select()
  .single();

// Update
const { data, error } = await supabase
  .from("table_name")
  .update({ field: newValue })
  .eq("id", id);

// Delete
const { error } = await supabase
  .from("table_name")
  .delete()
  .eq("id", id);
```

**Storage Operations:**
```typescript
// Upload
const { data, error } = await supabase.storage
  .from("bucket_name")
  .upload(path, file, { upsert: false });

// Get public URL
const { data: urlData } = supabase.storage
  .from("bucket_name")
  .getPublicUrl(path);
```

### Error Handling

- Use try/catch for async operations
- Return error objects: `{ error: Error | null }`
- Show toast notifications for user feedback via `sonner`
- Errors in Hebrew for this Hebrew-language app
- Log to console.error for debugging

### Notifications

- **Toast notifications** via `sonner`
- Success: `toast.success("message")`
- Error: `toast.error("message")`
- Info: `toast.info("message")`
- Messages in Hebrew

### Testing

- Framework: **Vitest** with globals enabled
- Test setup in `src/test/setup.ts`
- JSDOM for DOM simulation
- Testing Library for component testing
- Run tests: `npm run test` (once) or `npm run test:watch` (watch mode)

---

## Development Workflows

### Starting Development

```bash
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev

# Run tests
npm run test

# Watch mode tests
npm run test:watch

# Linting
npm run lint

# Build
npm run build

# Preview build
npm run preview
```

### Building & Deployment

**Build Command**: `npm run build`
- Outputs to `dist/` directory
- Configured with relative base path (`./`) for GitHub Pages

**Deployment**: GitHub Actions workflow
- Automatically builds and deploys to GitHub Pages on push to main
- Uses HashRouter for client-side routing compatibility

### Adding New Features

1. **Create component**: New file in `src/components/` or `src/pages/`
2. **Add route** (if needed): Update `src/App.tsx` routes
3. **Create types**: Define interfaces at component or module level
4. **Style with Tailwind**: Use utility classes, avoid custom CSS
5. **Add tests**: Create `.test.ts(x)` file in `src/test/`
6. **Update context/state**: Modify context if sharing state globally

### Working with Upload Manager

The `useUploadManager` hook handles complex file upload logic:

**Key Features:**
- Chunked XHR uploads with progress tracking
- Video thumbnail generation (extracts frame at 25%)
- Folder hierarchy support
- Pause/resume functionality
- File type detection
- Batch thumbnail processing

**Usage:**
```tsx
const {
  files,
  addFiles,
  removeFile,
  startUpload,
  pauseUpload,
  resumeUpload,
  isPaused,
  isUploading,
  overallProgress
} = useUploadManager(userId);

// Add files with paths
await uploadManager.addFiles([
  { file: fileObj, path: "folder/path" }
]);

// Start upload
await uploadManager.startUpload(
  title,
  description,
  category,
  () => { /* onComplete */ }
);
```

### Internationalization

- **Language**: Hebrew (RTL layout)
- **Direction**: RTL configured in Tailwind and PWA manifest
- **Date Format**: Use `date-fns` for localization
- **All user-facing text**: Must be in Hebrew

### PWA Setup

- Configured via `vite-plugin-pwa`
- Auto-updates using Workbox
- Caches Supabase requests (24-hour expiry)
- App name & manifest in Hebrew
- Offline support with runtime caching strategy

---

## Git Workflow

### Branching

- Feature branches: `claude/add-feature-description`
- Branch names must start with `claude/` and include session ID at end
- Example: `claude/add-video-player-bEEh2`

### Commits

- Descriptive, imperative messages
- Reference the task or feature being implemented
- Include session URL at the end if applicable

### Push & Pull

```bash
# Push to feature branch
git push -u origin branch-name

# Pull latest changes
git pull origin branch-name

# Fetch specific branch
git fetch origin branch-name
```

---

## Common Patterns & Anti-patterns

### ✅ DO

- Use TypeScript interfaces for all component props and data structures
- Memoize callbacks with `useCallback` in hooks
- Use `const` by default, `let` only when reassignment needed
- Extract magic numbers to named constants
- Use Tailwind utility classes for styling
- Handle loading and error states in async operations
- Clean up subscriptions in useEffect cleanup functions
- Use relative imports with `@/` alias for internal modules

### ❌ DON'T

- Create new CSS files (use Tailwind only)
- Use inline styles (use Tailwind classes)
- Add unused variables or imports (cleaned by linter but flagged in CI)
- Ignore error objects from Supabase calls
- Chain multiple setState calls (batch updates)
- Export unnamed/anonymous functions
- Use `any` type (be specific with unions or generics)
- Add console.log in production code (use for debugging only)

---

## Environment Variables

```
VITE_SUPABASE_URL=https://opwjthgdhyzzwfclowtv.supabase.co
VITE_SUPABASE_PROJECT_ID=opwjthgdhyzzwfclowtv
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
```

All Supabase configuration is public-safe (published key, not secret).

---

## Troubleshooting

### TypeScript Errors
- Check tsconfig.app.json settings (strict mode is OFF)
- Ensure interfaces are exported from the correct files
- Use `type` imports for type-only definitions

### Supabase Connection Issues
- Verify .env variables match project settings
- Check Supabase project status dashboard
- Clear browser cache and localStorage if auth fails
- Review network tab for 401/403 errors

### Build Issues
- `npm run build` with dev flag: `npm run build:dev`
- Check for missing asset references
- Verify all imports use correct paths with `@/` alias
- Review vite.config.ts base path setting

### Styling Problems
- Ensure Tailwind classes are used (not custom CSS)
- Check tailwind.config.ts for theme overrides
- Verify class names are static (no dynamic strings in Tailwind)
- Clear node_modules and reinstall if Tailwind generation fails

---

## Performance Considerations

- **Code Splitting**: Vite handles automatically via route code splitting
- **Image Optimization**: Use native HTML image elements with Tailwind sizes
- **Video Thumbnails**: Extracted client-side to avoid server load
- **File Uploads**: Chunked XHR uploads with resume capability
- **Query Caching**: React Query automatically caches API responses
- **PWA Caching**: Workbox handles asset and API caching strategies

---

## Security Notes

- Supabase auth tokens stored in localStorage automatically
- Public API key only; no secrets exposed in frontend code
- CORS configured at Supabase project level
- Row-level security (RLS) policies enforced on Supabase
- All user input validated with Zod before submission
- File uploads to Supabase storage have size limits
- Authentication required for all user operations

---

## Recent Changes & Version History

- **v0.0.0**: Initial project scaffold with Vite, React, TypeScript
- **Recent**: PWA deployment to GitHub Pages with HashRouter routing
- **Latest**: Improved upload manager with pause/resume and better progress tracking

---

## Useful Links & References

- Vite Docs: https://vitejs.dev/
- React Docs: https://react.dev/
- TypeScript Docs: https://www.typescriptlang.org/
- Tailwind CSS: https://tailwindcss.com/
- shadcn-ui: https://ui.shadcn.com/
- Supabase Docs: https://supabase.com/docs
- React Router: https://reactrouter.com/
- React Query: https://tanstack.com/query/
- Sonner Toast: https://sonner.emilkowal.ski/
- Zod Validation: https://zod.dev/

---

## Contributing Guidelines for AI Assistants

When working on this codebase:

1. **Always read related files first** before making changes
2. **Maintain existing patterns** - follow established conventions in the codebase
3. **Test changes locally** - run `npm run test` and `npm run dev`
4. **Update types** - keep TypeScript interfaces up-to-date
5. **Use Tailwind only** - no custom CSS files
6. **Write Hebrew UI text** - all user-facing strings in Hebrew
7. **Handle errors** - never ignore Supabase/async errors
8. **Clean up** - remove unused imports and variables
9. **Commit frequently** - atomic commits with clear messages
10. **Push to feature branch** - never push directly to main

---

**Last Updated**: February 22, 2026
**Project Status**: Active Development
**Contact**: See GitHub repository
