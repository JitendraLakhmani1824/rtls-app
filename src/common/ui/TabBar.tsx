import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadow } from './theme';

/** Height the floating bar takes from the bottom of a tab's content (scroll padding). */
export const TAB_BAR_SPACE = 96;

/**
 * A floating dark pill: the selected tab is a white pill with its icon and label, the others are
 * icons. Each tab's `tabBarIcon` draws its icon.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
    >
      <View style={[styles.bar, shadow]} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = options?.title ?? route.name;
          const icon: ReactNode = options?.tabBarIcon?.({
            focused,
            color: focused ? colors.ink : '#FFFFFF',
            size: 22,
          });
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[styles.tab, focused && styles.tabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              hitSlop={6}
            >
              {icon}
              {focused && <Text style={styles.label}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    minWidth: 56,
    paddingHorizontal: 16,
    borderRadius: 999,
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: '#FFFFFF' },
  label: { fontSize: 15, fontWeight: '600', color: colors.ink },
});
