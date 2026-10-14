# SECURE VAULT — Frontend Web Application

A premium, responsive authentication and private document-sharing web application built with **React**, **Vite**, **React Router DOM**, and **Lucide React**.

---

## 1. Project Overview & Aesthetics

- **Brand:** SECURE VAULT
- **Theme:** Obsidian Black (`#080808`) & Crimson Red (`#E5092A`)
- **Visual Style:** Glassmorphism, ambient lighting, high contrast typography, accessible forms, subtle micro-animations.
- **Security:** Zero-knowledge architecture preparation, no plaintext password storage, secure token cookie handling ready for Node.js + TiDB Cloud.

---

## 2. Project Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Reusable sticky header with mobile drawer & active indicators
│   │   ├── Logo.jsx            # Shield icon + SECURE VAULT branding
│   │   ├── Footer.jsx          # Dynamic copyright, navigation & privacy notice
│   │   ├── GlassCard.jsx       # Reusable translucent glassmorphic card container
│   │   ├── PasswordInput.jsx   # Accessible show/hide toggle + strength meter
│   │   └── FormMessage.jsx     # Accessible alert / live status message box
│   ├── pages/
│   │   ├── Welcome.jsx         # Landing page with hero illustration & feature grid
│   │   ├── Login.jsx           # Centered glass card login with validation & loading states
│   │   ├── Register.jsx        # Registration form with strength indicator & terms checkbox
│   │   ├── VaultDashboard.jsx  # Full document vault upload, code generator & TiDB viewer
│   │   └── NotFound.jsx        # Custom 404 security fallback
│   ├── services/
│   │   └── authService.js      # Backend integration layer with graceful development fallbacks
│   ├── styles/
│   │   ├── global.css          # Design system variables, reset & ambient background
│   │   ├── components.css      # Component-level styling for nav, footer, cards & buttons
│   │   └── auth.css            # Hero illustration, form inputs & responsive breakpoints
│   ├── App.jsx                 # Master React Router DOM configuration
│   └── main.jsx                # Application root entry point
├── .env.example                # Template for environment variables
├── .env                        # Configured environment variables (VITE_API_BASE_URL)
├── package.json
└── README.md
```

---

## 3. Installation & Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Commands

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   *The application will be available at `http://localhost:5173/`.*

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview the production build:**
   ```bash
   npm run preview
   ```

---

## 4. Manual Testing Checklist

- [x] **Navigation:**
  - Click **Home** (`/`) to view the Welcome landing page.
  - Click **Sign In** (`/login`) to view the login card.
  - Click **Create Account** (`/register`) to view the registration card.
  - Click **Document Vault** (`/vault`) to open the document sharing & retrieval dashboard.
  - Verify that the active navigation item displays a crimson highlight underline.
- [x] **Mobile Responsiveness:**
  - Resize the browser to mobile viewport (< 768px).
  - Verify hamburger menu toggles open and closed.
  - Confirm hero layout stacks cleanly and no horizontal scrolling occurs.
- [x] **Login Page Validation:**
  - Submit with empty fields — verify required field warnings appear.
  - Enter invalid email — verify email format validation.
  - Toggle password visibility with the eye icon.
  - Click **Sign In** — observe loading spinner and dev login redirecting to `/vault`.
- [x] **Register Page Validation:**
  - Type in the password field — observe the live strength meter (Weak / Fair / Strong).
  - Enter non-matching passwords — verify match validation error.
  - Submit without checking terms — verify terms agreement requirement.
- [x] **Accessibility:**
  - All form controls contain explicit labels, `aria-invalid`, `aria-describedby`, and visible focus rings.
