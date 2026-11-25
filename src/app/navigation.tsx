import type { RootStack } from '@common/navigation';
import { DetailScreen } from '@features/detail';
import { HomeScreen } from '@features/home';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStack>();

/**
 * Home, and the selected friend as a native form sheet over it. The largest detent stays undimmed,
 * so the map behind is visible and touchable; enableFreeze() is never called, so it keeps drawing.
 */
export function AppNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Friend"
        component={DetailScreen}
        options={{
          headerShown: false,
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetLargestUndimmedDetentIndex: 'last',
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      />
    </Stack.Navigator>
  );
}
