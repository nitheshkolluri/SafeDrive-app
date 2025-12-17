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
-   **Backend:** Firebase (Auth, Firestore, Storage)
-   **AI:** Google Gemini AI
-   **Deployment:** Docker, Nginx
-   **Mobile:** Capacitor (iOS & Android)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   npm (v9 or later)
-   Docker (v20.10 or later) - for containerized deployment
-   A modern web browser with location services enabled
-   Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Environment Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/safedrive.git
    cd safedrive
    ```

2.  **Set up environment variables:**
    ```bash
    cp .env.example .env.local
    ```
    
    Edit `.env.local` and add your API keys:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    PORT=8080
    ```

### Running Locally (Development)

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm run dev
    ```

3.  **Access the app:**
    Open your browser and navigate to `http://localhost:3000`. Allow location permissions when prompted.

### Building for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` directory.

## 🐳 Docker Deployment

SafeDrive is fully containerized and ready for production deployment using Docker.

### Quick Start with Docker

1.  **Build the Docker image:**
    ```bash
    npm run docker:build
    # or
    docker build -t safedrive-app .
    ```

2.  **Run the container:**
    ```bash
    npm run docker:run
    # or
    docker run -p 8080:8080 -e PORT=8080 -e GEMINI_API_KEY=your_key safedrive-app
    ```

3.  **Access the application:**
    Open `http://localhost:8080` in your browser.

### Using Docker Compose

**Development:**
```bash
npm run docker:compose
# or
docker-compose up
```

**Production:**
```bash
npm run docker:compose:prod
# or
docker-compose -f docker-compose.prod.yml up -d
```

### Deploying to Cloud Platforms

#### Google Cloud Run

```bash
# Build and push to Google Container Registry
docker tag safedrive-app gcr.io/YOUR_PROJECT_ID/safedrive-app:latest
docker push gcr.io/YOUR_PROJECT_ID/safedrive-app:latest

# Deploy to Cloud Run
gcloud run deploy safedrive \
  --image gcr.io/YOUR_PROJECT_ID/safedrive-app:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key
```

#### AWS ECS, Azure, and More

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guides for:
- AWS Elastic Container Service (ECS)
- Azure Container Instances
- Docker Hub
- SSL/TLS configuration
- Monitoring and logging
- Troubleshooting

## 📱 Mobile Deployment

SafeDrive uses Capacitor for native mobile apps.

### Android

```bash
npm run cap:sync
npm run cap:android
```

### iOS

```bash
npm run cap:sync
npm run cap:ios
```

## 🔒 Security & Compliance

Security is a top priority for SafeDrive. We adhere to industry best practices to protect user data and ensure a trustworthy experience.

-   **Data in Transit:** All communication with backend services over HTTPS
-   **Security Headers:** CSP, X-Frame-Options, X-Content-Type-Options, etc.
-   **User Privacy:** Location data used only for trip analysis, never shared without consent
-   **Container Security:** Read-only filesystem, non-root user, minimal attack surface
-   **Input Sanitization:** All user input validated and sanitized

For a detailed breakdown of our security policies and practices, please refer to [SECURITY.md](SECURITY.md).

## 📈 Business Model

SafeDrive operates on a B2B2C (Business-to-Business-to-Consumer) model that creates value for both our users and our partners. For a comprehensive overview of our monetization strategy, revenue streams, and partnership opportunities, please see [BUSINESS_MODEL.md](BUSINESS_MODEL.md).

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide for all platforms
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and technical design
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to the project
- **[SECURITY.md](SECURITY.md)** - Security policies and practices
- **[PRIVACY.md](PRIVACY.md)** - Privacy policy and data handling
- **[BUSINESS_MODEL.md](BUSINESS_MODEL.md)** - Business model and monetization

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:
- Code of conduct
- Development setup
- Coding standards
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenStreetMap contributors for map data
- Leaflet.js for the mapping library
- Google Gemini for AI capabilities
- Firebase for backend services

## 📞 Support

- **Documentation:** Check our comprehensive docs above
- **Issues:** [GitHub Issues](https://github.com/yourusername/safedrive/issues)
- **In-App Support:** Use the support chat feature in the application

---

**Made with ❤️ by the SafeDrive Team**