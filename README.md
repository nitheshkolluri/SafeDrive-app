# SafeDrive PWA 🚗💨

SafeDrive is a premium, mobile-first Progressive Web App (PWA) designed to gamify safe driving. It uses advanced telematics to monitor driving behavior, award points for safety, and provide real-time navigation.

## 🌟 Features

### 🛡️ Advanced Telematics
- **Real-time G-Force Monitoring**: Detects harsh braking, acceleration, and cornering.
- **Pothole Detection**: Distinguishes between crashes and road hazards using vertical accelerometer data.
- **Safe Streak**: Earn multipliers (x2) for continuous safe driving.

### 🎮 Gamification
- **Tier System**: Bronze, Silver, Gold, and Diamond tiers based on lifetime points.
- **Mystery Crates**: Daily rewards for consistent users.
- **Partner Marketplace**: Redeem points for real-world offers.
- **Challenges**: Weekly goals for extra XP.

### 🗺️ Navigation & HUD
- **Turn-by-Turn Navigation**: Powered by Google Maps Platform.
- **Smart HUD**: Displays speed, speed limits, and safety alerts without distraction.
- **Voice Guidance**: Text-to-Speech alerts for safety events.

### 🔒 Security & Auth
- **Guest Mode**: Try before you sign up.
- **Seamless Upgrade**: Transfer guest progress to a secure account.
- **Driver Verification**: Spirit-level calibration to ensure phone stability.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Google Maps API Key (configured in `utils/mapLoader.ts`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/safedrive.git
    cd safedrive
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open in Browser:**
    Navigate to `http://localhost:3000` (or the port shown in terminal).
    *Tip: Use Chrome DevTools Device Toolbar to simulate a mobile device.*

## 📂 Project Structure

```
/src
  /components      # Reusable UI components (HUD, Modals, Icons)
  /hooks           # Custom React hooks (Telematics, Geolocation)
  /screens         # Main application screens (Home, Profile, Rewards)
  /utils           # Helper functions and Mock Auth
  /data            # Static data (Rewards, Challenges)
  App.tsx          # Main Router and Layout
  index.css        # Global Styles & Tailwind Directives
```

## 📱 PWA Support
This app is installable!
- **iOS**: Open in Safari -> Share -> Add to Home Screen.
- **Android**: Open in Chrome -> Install App.

## 🛠️ Tech Stack
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Maps**: Google Maps JavaScript API
- **Icons**: Custom SVG Icons
- **State**: LocalStorage (Persisted)

## 🚀 Deployment

For production deployment to Google Cloud Run, see [DEPLOYMENT.md](./DEPLOYMENT.md) for a comprehensive step-by-step guide.

Quick deploy:
```bash
gcloud run deploy safedrive --source . --allow-unauthenticated
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

### Third-Party Licenses

This project uses the following third-party services and libraries:

- **Google Maps Platform**: Subject to [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms)
- **Google Generative AI (Gemini)**: Subject to [Google AI Terms of Service](https://ai.google.dev/terms)
- **React**: MIT License
- **Tailwind CSS**: MIT License
- **Vite**: MIT License

## 🙏 Acknowledgments

- Google Maps Platform for navigation and routing
- Google Generative AI for the AI support agent
- The React and Vite communities for excellent tooling

---

**⚠️ Disclaimer**: SafeDrive is a demonstration app for educational purposes. Always follow local traffic laws and drive safely. This app should not replace proper attention to the road.

---

*Built with ❤️ by Antigravity Agent*