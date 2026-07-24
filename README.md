# Expo Ledger App

A personal finance and expense tracking mobile application built with React Native and Expo. Track your expenses, manage budgets, scan receipts, and gain insights into your spending habits.

## Features

- **Expense Tracking**: Add, edit, and delete expenses with categories, descriptions, dates, and payment methods
- **Receipt Scanning**: Capture receipt photos with automatic compression and file-based storage
- **Voice Entry**: Add expenses using voice commands
- **Income Tracking**: Log and manage your income sources
- **Budget Management**: Set monthly budgets per category with threshold alerts
- **Categories**: Customizable expense categories with icons and colors
- **Goals**: Create and track savings goals with target amounts and dates
- **Recurring Expenses**: Set up automatic recurring expenses (daily, weekly, monthly)
- **Analytics**: Visual charts and insights into spending patterns
- **Search**: Full-text search across expenses
- **Gallery**: View all receipt photos in a grid
- **Data Export**: Export data as CSV or JSON
- **Dark Mode**: Toggle between light and dark themes
- **PIN Lock**: Optional PIN protection for app access
- **Local Storage**: All data stored locally using SQLite

## Tech Stack

- **React Native**: Mobile app framework
- **Expo**: Development and build platform
- **SQLite**: Local database storage
- **expo-image-picker**: Camera and gallery access
- **expo-image-manipulator**: Image compression and resizing
- **expo-file-system**: File-based photo storage
- **expo-speech-recognition**: Voice input
- **React Navigation**: Screen navigation
- **react-native-chart-kit**: Data visualization

## Installation

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo Go app (for development preview) OR
- Android Studio/Xcode (for local development builds)

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd expo-ledger-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Running the App

### Development with Expo Go (Recommended)

1. Install the **Expo Go** app on your mobile device (iOS App Store / Google Play Store)
2. Run `npm start` in your project directory
3. Scan the QR code displayed in the terminal using Expo Go
4. The app will load on your device

**Note**: Your phone and computer must be on the same Wi-Fi network. If not, use `npm start --tunnel`.

### Development with Emulator/Simulator

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

### Web Preview

```bash
npm run web
```

## Building for Production

### Using EAS Build (Recommended)

EAS Build is Expo's cloud build service that compiles your app without requiring local build tools.

1. Create an account at [expo.dev](https://expo.dev)
2. Install EAS CLI:
```bash
npm install -g eas-cli
eas login
```

3. Initialize the project (first time only):
```bash
eas init
```

4. Build for Android:
```bash
# Preview APK (for testing)
eas build --platform android --profile preview

# Production build (for Play Store)
eas build --platform android --profile production
```

5. Build for iOS:
```bash
# Preview build (for TestFlight)
eas build --platform ios --profile preview

# Production build (for App Store)
eas build --platform ios --profile production
```

### Local Build

For local builds, you'll need Android Studio or Xcode installed.

```bash
# Android
eas build --platform android --local

# iOS
eas build --platform ios --local
```

## Project Structure

```
expo-ledger-app/
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/          # React Context for state management
│   ├── db/              # Database configuration and operations
│   ├── logic/           # Business logic and utilities
│   ├── navigation/      # App navigation setup
│   ├── notifications/   # Push notification handling
│   ├── screens/         # Screen components
│   └── theme/           # Color themes and styling
├── assets/              # Static assets
├── App.js               # Main app entry point
├── app.json             # Expo app configuration
├── eas.json             # EAS build configuration
└── package.json         # Dependencies and scripts
```

## Key Implementation Details

### Photo Storage Optimization

Photos are automatically compressed and stored as files rather than base64 blobs in the database:

- **Compression**: Photos resized to 1000px width at 70% JPEG quality
- **Storage**: Saved as `.jpg` files in the app's document directory
- **Database**: Only file paths stored in SQLite (not actual image data)
- **Benefits**: 10x+ size reduction, smaller database, faster queries
- **Migration**: Existing base64 photos automatically converted on first launch

### Database Schema

The app uses SQLite with the following main tables:
- `expenses` - Transaction records with photo references
- `income` - Income records
- `categories` - Customizable categories
- `goals` - Savings目标是
- `recurring` - Recurring expense templates
- `merchant_map` - Merchant-to-category mappings
- `settings` - App settings and preferences

## Screens

- **Dashboard**: Overview of recent expenses and budget status
- **Add Expense**: Manual expense entry with photo attachment
- **Scan Receipt**: Camera-based receipt capture
- **Voice Entry**: Voice-controlled expense addition
- **History**: List of all expenses with search and filters
- **Analytics**: Spending charts and insights
- **Budget**: Budget management and alerts
- **Categories**: Category customization
- **Goals**: Savings goal tracking
- **Recurring**: Recurring expense management
- **Gallery**: Receipt photo gallery
- **Settings**: App configuration and preferences

## Scripts

- `npm start` - Start development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device
- `npm run web` - Run in web browser

## Permissions

The app requires the following permissions:
- **Camera**: For receipt scanning
- **Photo Library**: For selecting existing photos
- **Microphone**: For voice entry
- **Storage**: For saving receipt photos

## License

Private project

## Support

For issues or questions, please refer to the project documentation or contact the development team.
