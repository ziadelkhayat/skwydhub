import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, useFonts } from "@expo-google-fonts/outfit";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { StoreProvider } from "../lib/store";
import { C } from "../lib/theme";

export default function Layout() {
  const [ok] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  if (!ok) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <StoreProvider>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: C.bg } }} />
    </StoreProvider>
  );
}
