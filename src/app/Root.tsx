import { SpikeScreen, SpikeSheet, type SpikeStack } from '@lab/spike';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// M0: the app opens the map spike. Home and Detail replace it from M1.
const Stack = createNativeStackNavigator<SpikeStack>();

export function Root() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Spike" component={SpikeScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="SpikeSheet"
            component={SpikeSheet}
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.3, 0.6],
              sheetLargestUndimmedDetentIndex: 'last', // map stays undimmed and touchable
              sheetGrabberVisible: true,
              contentStyle: { backgroundColor: '#ffffff' },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
