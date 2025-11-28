# SafeDrive - Smart Navigation & Rewards

![SafeDrive Logo](https://raw.githubusercontent.com/user-attachments/assets/b248443e-d958-466d-8869-7c8a6f3b0e16)

**SafeDrive** is a production-grade, enterprise-level navigation application designed to promote safer driving habits through a sophisticated rewards system. It combines a seamless, Google-Maps-like user experience with an intelligent business model, making it a complete and deployable platform.

---

## ✨ Key Features

-   **Intuitive Turn-by-Turn Navigation:** A clean, full-screen map interface with a floating search bar, saved places (Home/Work), and interactive points of interest (POIs).
-   **Advanced Driving Analytics:** Real-time monitoring of speed, acceleration, braking, and turning to generate a comprehensive safety score for each trip.
-   **Rewards & Gamification:** Earn points for safe driving and redeem them for exclusive rewards from partner businesses.
-   **Multi-Modal Driver Verification:** Sophisticated checks to ensure accurate data collection, whether the phone is mounted, handheld, or connected to CarPlay.
-   **Dedicated Support Hub:** An in-app chatbot for instant answers and a direct line to customer support for critical issues.
-   **Professional & Secure Architecture:** Built with security best practices and containerized with Docker for scalable, production-ready deployment.

## 🛠️ Tech Stack

-   **Frontend:** React, TypeScript, Tailwind CSS
-   **Mapping:** Leaflet.js, OpenStreetMap, Leaflet Routing Machine
--   **Deployment:** Docker, Nginx

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   A modern web browser with location services enabled.
-   Docker (for containerized deployment)

### Running Locally

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd safedrive-app
    ```

2.  **Serve the application:**
    Since this project uses modern ES modules and has no external npm dependencies, you can serve it directly with any simple static server. A common choice is `http-server`:
    ```bash
    # Install the server globally (if you haven't already)
    npm install -g http-server

    # Run the server from the project root
    http-server .
    ```

3.  **Access the app:**
    Open your browser and navigate to `http://localhost:8080`. For the geolocation features to work, you must allow location permissions when prompted.

## 🐳 Deployment

This application is configured for easy, scalable deployment using Docker and is optimized for serverless platforms like Google Cloud Run.

The included `Dockerfile` creates a production-ready Nginx image that serves the application. It's designed to be flexible by listening on the port specified by the `PORT` environment variable, which is standard for cloud platforms.

### Building and Running Locally with Docker

1.  **Build the Docker image:**
    From the root of the project, run:
    ```bash
    docker build -t safedrive-app .
    ```

2.  **Run the Docker container:**
    To simulate a cloud environment, you must provide the `PORT` variable. This command runs the app on port `8080`.
    ```bash
    docker run -p 8080:8080 -e PORT=8080 safedrive-app
    ```
    You can now access the application at `http://localhost:8080`.

### Deploying to Google Cloud Run

This setup is ideal for Google Cloud Run. When you deploy the container, Cloud Run will automatically provide the `PORT` environment variable, and the container will start and listen correctly, resolving the initial deployment failure.

## 🔒 Security & Compliance

Security is a top priority for SafeDrive. We adhere to industry best practices to protect user data and ensure a trustworthy experience.

-   **Data in Transit:** All communication with backend services (even mocked ones) should be over HTTPS. The provided deployment setup assumes a production environment would be configured behind a load balancer with an SSL/TLS certificate.
-   **User Privacy:** We are committed to user privacy. Location data is used only for trip analysis and is never shared with third parties without explicit consent. See our `PRIVACY.md` for full details.
-   **Input Sanitization:** Although this is a frontend application, we operate on the principle of never trusting user input. Any data sent to a backend would be sanitized and validated.
-   **Dependency Management:** In a real-world scenario with npm dependencies, we would use tools like `npm audit` or GitHub's Dependabot to monitor for vulnerabilities.

For a detailed breakdown of our security policies and practices, please refer to the `SECURITY.md` file.

## 📈 Business Model

SafeDrive operates on a B2B2C (Business-to-Business-to-Consumer) model that creates value for both our users and our partners. For a comprehensive overview of our monetization strategy, revenue streams, and partnership opportunities, please see the `BUSINESS_MODEL.md` file.