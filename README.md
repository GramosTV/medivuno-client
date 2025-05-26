# Healthcare App Client (Angular)

[Server Repository](https://github.com/GramosTV/medivuno-server)

This is the frontend client for the Healthcare App, built with Angular. It provides a user interface for patients, doctors, and administrators to interact with the healthcare platform.

## Features

- User-friendly interface for registration, login, and profile management.
- Dashboard views tailored for Patients, Doctors, and Admins.
- Appointment booking, viewing, and management.
- Access to medical records, including viewing details and attachments.
- Ability for doctors to create and update medical records, and upload attachments.
- Secure messaging system.
- Responsive design for use on various devices.

## Prerequisites

- Node.js (version 18.x or 20.x recommended)
- Angular CLI (latest version recommended)
- Git

## Setup

1.  **Clone the repository (if not already done for the server):**

    ```bash
    git clone <repository-url>
    cd healthcare-gemini/healthcare-app
    ```

    If you've already cloned the main project, navigate to the `healthcare-app` directory.

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Configuration:**

    - The client uses Angular's environment files (`src/environments/`).
    - `src/environments/environment.ts` (for development)
    - `src/environments/environment.prod.ts` (for production)
    - Ensure the `apiUrl` in these files points to your running backend server. For local development, this is typically:
      ```typescript
      // src/environments/environment.ts
      export const environment = {
        production: false,
        apiUrl: "http://localhost:3001", // Or whatever port your Go server is running on
      };
      ```

4.  **Run the Development Server:**
    ```bash
    ng serve
    ```
    Navigate to `http://localhost:4200/` (or the port specified in your Angular CLI configuration). The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--configuration production` flag for a production build.

## Running Unit Tests

Run `ng test` to execute the unit tests via Karma.

## Running End-to-End Tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Project Structure

- `src/`: Main application source code.
  - `app/`: Core application modules, components, services.
    - `auth/`: Authentication-related components (login, register).
    - `core/`: Core services, guards, interceptors (e.g., `AuthService`, `AuthGuard`, `AuthInterceptor`).
    - `doctor/`: Doctor-specific features and components.
    - `patient/`: Patient-specific features and components.
    - `shared/`: Shared components, directives, pipes, interfaces, and services used across the application.
      - `interfaces/`: TypeScript interfaces for data models.
      - `services/`: Shared application services (e.g., `MedicalRecordService`).
  - `assets/`: Static assets like images, fonts.
  - `environments/`: Environment-specific configuration.
  - `index.html`: Main HTML page.
  - `main.ts`: Main entry point of the application.
  - `styles.scss`: Global styles.
- `angular.json`: Angular CLI configuration.
- `package.json`: NPM dependencies and scripts.
- `tailwind.config.js`: Tailwind CSS configuration.
- `README.md`: This file.

## Further Help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Contributing

Please refer to the main project's contributing guidelines.
