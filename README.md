# Sentimenter CX - Frontend

Angular frontend application for the Customer Experience Platform. This is a standalone frontend repository.

## Project Approach & implementation status

The app implements the **Offline Customer Experience Measurement & Analytics** flows (no external APIs, CSV-only data, three roles).

| Document requirement | Frontend status |
|----------------------|-----------------|
| Secure login, role-based access | Done: auth guards, Admin / CX (Analyst) / Executive (Viewer) |
| CSV upload, validation feedback | Done: Data Sources → CSV Upload |
| Dashboards (main, executive) | Done: Main Dashboard, Executive Dashboard with KPIs, NPS, competitors, alerts |
| Download summary report | Done: Executive Dashboard “Download” and Reports → Executive Summary “Export to PDF” |
| Configure alert thresholds | Done: Admin → Settings → Alert thresholds (admin/analyst) |
| Sentiment scoring parameters | Done: Admin → Settings → Sentiment parameters (admin) |
| Process enhancement plan | Done: CX Journey → Process Enhancement (generate/refresh plans) |
| Journey heatmap (satisfaction / pain) | Done: CX Journey → Journey Heatmap |
| Journey map, touchpoints, action plans | Done: CX Journey → Journey Map, Touchpoints, Action Plans |
| Sentiment, NPS, root cause, competitor analysis | Done: Analysis and Analytics menus |
| Social media methodology, volume, comparison | Done: Social Media → Social Analysis, Methodology |
| Alerts panel | Done: Alerts → Alert dashboard |
| Reports list, dashboard reports, report builder, export PDF/Excel | Done: Reports section |
| Admin: users, roles, journey stages, datasets, settings | Done: Admin menu (dashboard, users, roles, settings, journey stages, datasets) |
| Responsive Angular UI | Done: Angular Material, responsive layout |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd sentimenter-cx-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (optional):**
   
   No proxy is used. The frontend calls the backend API directly. Create a `.env` file in the frontend root with:
   ```env
   NG_APP_API_URL=http://localhost:5000/api
   ```
   For production build, set `NG_APP_API_URL=/api` (or your API URL) in `.env` before building.
   Ensure the backend is running and has CORS set for your frontend origin (e.g. `FRONTEND_URL=http://localhost:4200` in backend `.env`).

## Development

Start the development server:

```bash
npm start
```

Or using Angular CLI:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Backend Connection

No proxy is used in development or production. The frontend calls the backend at the URL in `environment.apiUrl` (default in dev: `http://localhost:5000/api`).

1. Start the backend first (see `backend/README.md`). The API runs at `http://localhost:5000` and serves routes under `/api`.
2. Start the frontend with `npm start`. Login, register, and all API requests go directly to the backend. Ensure the backend `.env` has `FRONTEND_URL=http://localhost:4200` so CORS allows the frontend origin.

## Building

To build the project for production:

```bash
npm run build
```

Or using Angular CLI:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. The production build optimizes your application for performance and speed.

## Available Scripts

```bash
# Development
npm start            # Start development server (http://localhost:4200)
npm run build        # Build for production
npm run watch        # Build and watch for changes

# Testing
npm test             # Run unit tests with Vitest
npm run e2e          # Run end-to-end tests

# Code Generation
ng generate component component-name    # Generate a new component
ng generate service service-name        # Generate a new service
ng generate module module-name          # Generate a new module
```

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Application source code
│   │   ├── components/   # Angular components
│   │   ├── services/     # Services and business logic
│   │   ├── models/       # Data models
│   │   ├── guards/       # Route guards
│   │   └── ...
│   ├── assets/           # Static assets
│   ├── environments/     # Environment configurations
│   ├── styles.scss       # Global styles
│   └── main.ts           # Application entry point
├── public/               # Public assets
├── dist/                 # Build output (generated)
├── angular.json          # Angular CLI configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Environment Configuration

The application uses a single environment file at `src/environments/environment.ts` for both development and production. It reads from `.env` (via process.env) and uses `NODE_ENV` / `NG_APP_PRODUCTION` to switch defaults.

### Key Configuration Options

You can customize the following in `src/environments/environment.ts` (or via `.env`):

- **API URL:** In development the default is `http://localhost:5000/api` (no proxy; frontend calls backend directly). Override with `NG_APP_API_URL` in `.env`. In production set `NG_APP_API_URL` at build time.
- **API Version:** `apiVersion` - API version (default: `v1`)
- **Feature Flags:** Enable/disable features in `features` object
- **Languages:** Configure supported languages
- **Pagination:** Set default page sizes
- **Upload Settings:** Configure file upload limits

### Environment Variables

Use a `.env` file in the frontend root (same file for development and production). Required:

```env
NG_APP_API_URL=http://localhost:5000/api
```

Use `http://localhost:5000/api` for local dev; use `/api` or your full API URL for production builds.

## Testing

### Unit Tests

Run unit tests with Vitest:

```bash
npm test
```

### End-to-End Tests

For end-to-end (e2e) testing:

```bash
npm run e2e
```

**Note:** Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Code Scaffolding

Angular CLI includes powerful code scaffolding tools:

```bash
# Generate a component
ng generate component component-name

# Generate a service
ng generate service service-name

# Generate a module
ng generate module module-name

# Generate a guard
ng generate guard guard-name

# See all available schematics
ng generate --help
```

## Production Deployment

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **The build output will be in the `dist/` folder**

3. **Deploy the `dist/` folder** to your web server:
   - **Nginx:** Configure to serve static files from `dist/`
   - **Apache:** Point DocumentRoot to `dist/`
   - **Node.js:** Use a static file server like `serve` or `express-static`

4. **API in production**: Set `NG_APP_API_URL` to your production API base (e.g. `https://api.yourdomain.com/api`) when building. Ensure the backend allows your frontend origin via CORS.

### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"

The app received HTML instead of JSON from the API. Common causes:

1. **Backend not running** – Start the backend first: `cd backend && npm run dev`. It should listen on port 5000 (or the port in your backend `.env`).
2. **CORS** – Backend must allow the frontend origin. In backend `.env` set `FRONTEND_URL=http://localhost:4200` (or your frontend URL).
3. **Wrong API URL** – In development the default is `http://localhost:5000/api`. To override, set `NG_APP_API_URL` in frontend `.env` and ensure it matches the backend (protocol, host, port).

### Login / Register API not calling

- Ensure the backend is running. Open DevTools → Network; on Login/Register you should see a request to `http://localhost:5000/api/auth/login` (or your `apiUrl`). If you see a different URL or the response is HTML, the backend is not reachable or CORS is blocking.
- No proxy is used: the frontend calls the backend directly. Check backend CORS (`FRONTEND_URL` in backend `.env`) and that the backend port matches `environment.apiUrl` (default 5000).

### Cannot Connect to Backend

- Verify backend is running on port 5000 (or the port in your API URL).
- In development the default API URL is `http://localhost:5000/api`. Override with `NG_APP_API_URL` in `.env` if needed.
- Verify backend CORS: set `FRONTEND_URL=http://localhost:4200` in backend `.env`.
- In the browser Network tab, API requests should go to the backend URL and return JSON, not HTML.

### Build Errors

- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

- Clear Angular cache:
  ```bash
  rm -rf .angular
  ```

- Check TypeScript errors:
  ```bash
  npx tsc --noEmit
  ```

### Port Already in Use

If port 4200 is already in use:

```bash
ng serve --port 4201
```

Or update `angular.json` to use a different port.

## Features

- ✅ User authentication and authorization
- ✅ Multi-company support
- ✅ Sentiment analysis dashboard
- ✅ AI-powered insights
- ✅ CSV data import
- ✅ Report generation (PDF/Excel)
- ✅ Real-time analytics
- ✅ Multi-language support (Turkish, English, Arabic)
- ✅ Maker-checker workflow
- ✅ Root cause analysis
- ✅ Responsive design
- ✅ Dark mode support

## Technology Stack

- **Framework:** Angular 21
- **Language:** TypeScript
- **Styling:** SCSS
- **Build Tool:** Angular CLI
- **Package Manager:** npm
- **Testing:** Vitest

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Additional Resources

- [Angular Documentation](https://angular.dev/)
- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## License

ISC

## Support

For issues and questions, please contact the development team.
