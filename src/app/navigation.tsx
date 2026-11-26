import type { RootStack, TabsParams } from '@common/navigation';
import { PeopleIcon, PinIcon, TabBar } from '@common/ui';
import { DetailScreen } from '@features/detail';
import { FriendsScreen } from '@features/friends';
import { JoinScreen } from '@features/join';
import { NewSessionScreen } from '@features/new-session';
import { PersonScreen } from '@features/person';
import { ProfileScreen } from '@features/profile';
import { SessionMapScreen } from '@features/session-map';
import { SessionsScreen } from '@features/sessions';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStack>();
const Tab = createBottomTabNavigator<TabsParams>();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{ tabBarIcon: ({ color }) => <PinIcon color={color} /> }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ tabBarIcon: ({ color }) => <PeopleIcon color={color} /> }}
      />
    </Tab.Navigator>
  );
}

/**
 * Tabs, then full-screen pages over them: a session's map (no tab bar), a person's page, new
 * session, join. The selected friend is a native form sheet over the map; its largest detent stays
 * undimmed so the map behind is visible and touchable, and enableFreeze() is never called, so the
 * map keeps drawing.
 */
export function AppNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="SessionMap" component={SessionMapScreen} />
      <Stack.Screen name="NewSession" component={NewSessionScreen} />
      {/* A link can arrive over anything, even a friend's sheet: always a full page of its own. */}
      <Stack.Screen
        name="Join"
        component={JoinScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="Person" component={PersonScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen
        name="Friend"
        component={DetailScreen}
        options={{
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
