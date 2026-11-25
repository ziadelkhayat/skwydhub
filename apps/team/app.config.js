// EXPO_PUBLIC_SKWYD_APP=driver builds the SKWYD Driver app from the same code (team.html + SKWYD_APP="driver").
const base = {
  "name": "SKWYD Team",
  "slug": "skwyd-team",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "userInterfaceStyle": "light",
  "ios": {
    "supportsTablet": true
  },
  "android": {
    "adaptiveIcon": {
      "backgroundColor": "#E6F4FE",
      "foregroundImage": "./assets/android-icon-foreground.png",
      "backgroundImage": "./assets/android-icon-background.png",
      "monochromeImage": "./assets/android-icon-monochrome.png"
    },
    "predictiveBackGestureEnabled": false,
    "package": "com.skwydhub.teamrn"
  },
  "web": {
    "favicon": "./assets/favicon.png",
    "output": "single",
    "bundler": "metro"
  },
  "plugins": [
    "expo-router",
    "expo-font",
    [
      "expo-location",
      {
        "locationWhenInUsePermission": "SKWYD Team checks you are at the store when you clock in or out."
      }
    ],
    [
      "expo-image-picker",
      {
        "cameraPermission": "SKWYD Team takes a picture of the order when a driver leaves the store."
      }
    ]
  ],
  "scheme": "skwydteam",
  "experiments": {
    "typedRoutes": false
  }
};
const app = process.env.EXPO_PUBLIC_SKWYD_APP || process.env.SKWYD_APP || "team";
// one code base, three apps: Team (employees), Driver (+ delivery orders), Insights (the owner's view)
const VAR = { driver: { name: "SKWYD Driver", slug: "skwyd-driver", scheme: "skwyddriver", package: "com.skwydhub.driverrn" }, insights: { name: "SKWYD Insights", slug: "skwyd-insights", scheme: "skwydinsights", package: "com.skwydhub.insightsrn" } }[app];
module.exports = { expo: { ...base, ...(VAR ? { name: VAR.name, slug: VAR.slug, scheme: VAR.scheme, android: { ...base.android, package: VAR.package } } : {}), extra: { ...(base.extra || {}), app } } };
