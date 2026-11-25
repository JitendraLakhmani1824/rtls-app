import type { RootStack } from '@common/navigation';
import { HomeScreen } from '@features/home';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStack>();

/** M1: Home only. The Friend detail sheet (native form sheet) arrives in M5. */
export function AppNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
