import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions, getFocusedRouteNameFromRoute, type ParamListBase, type RouteProp } from '@react-navigation/native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabRouteName } from '../../navigation/tabAccents';
import { borderRadius, spacing, typography } from '../../styles/theme';
import type { ChatTabParams } from '../../types/navigation';
import { hapticSelection, isIOS } from '../../utils/platform';

type TabRouteName = MainTabRouteName;

const LEGACY_TAB_BAR_COLORS = {
  bar: '#0D1F4D',
  item: '#2A3A62',
  itemBorder: 'rgba(255, 255, 255, 0.16)',
  activeBg: '#FFFFFF',
  activeText: '#000000FA',
  inactiveText: '#FFFFFF',
} as const;

const LEGACY_TAB_BAR_SIZES = {
  barHeight: 80,
  barPadding: 8,
  gap: 4,
  horizontalMargin: spacing.base,
  activeMinWidth: 100,
  activeMaxWidth: 130,
  inactiveMinWidth: 50,
  inactiveMaxWidth: 64,
  itemPaddingHorizontal: 18,
} as const;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const ROOT_TAB_SCREENS: Partial<Record<TabRouteName, string>> = {
  Cases: 'CasesList',
  Community: 'GroupsList',
};

const CHAT_SOURCE_ACTIONS: Partial<Record<string, string>> = {
  CasesList: 'open_chat_from_cases',
  CaseDetail: 'open_chat_from_case_detail',
  GroupsList: 'open_chat_from_community',
  GroupDetail: 'open_chat_from_group_detail',
  ThreadView: 'open_chat_from_thread',
  Resources: 'open_chat_from_resources',
};

interface TabRouteContext {
  tabName: TabRouteName;
  routeName: string;
  routeParams?: Record<string, unknown>;
}

const normalizeActionSegment = (value: string): string => value
  .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  .replace(/[^a-zA-Z0-9]+/g, '_')
  .toLowerCase();

const getStringParam = (
  params: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = params?.[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const getCaseSourceParam = (
  params: Record<string, unknown> | undefined,
): ChatTabParams['caseSource'] | undefined => {
  const directSource = params?.source;
  if (directSource === 'uscis' || directSource === 'eoir') {
    return directSource;
  }

  const initialCase = params?.initialCase;
  if (
    initialCase &&
    typeof initialCase === 'object' &&
    'source' in initialCase &&
    (initialCase.source === 'uscis' || initialCase.source === 'eoir')
  ) {
    return initialCase.source;
  }

  return undefined;
};

const getDeepestRouteContext = (
  route: RouteProp<ParamListBase, string>,
): Pick<TabRouteContext, 'routeName' | 'routeParams'> => {
  const fallbackRouteName = getFocusedRouteNameFromRoute(route)
    ?? ROOT_TAB_SCREENS[route.name as TabRouteName]
    ?? route.name;

  let currentRoute: Record<string, unknown> | undefined = route as unknown as Record<string, unknown>;

  while (
    currentRoute?.state &&
    typeof currentRoute.state === 'object' &&
    'routes' in currentRoute.state &&
    Array.isArray(currentRoute.state.routes) &&
    currentRoute.state.routes.length > 0
  ) {
    const routeState = currentRoute.state as {
      index?: number;
      routes: Array<Record<string, unknown>>;
    };
    const index = typeof routeState.index === 'number' ? routeState.index : 0;
    currentRoute = routeState.routes[index];
  }

  const routeName = typeof currentRoute?.name === 'string' ? currentRoute.name : fallbackRouteName;
  const routeParams =
    currentRoute?.params && typeof currentRoute.params === 'object'
      ? (currentRoute.params as Record<string, unknown>)
      : undefined;

  return { routeName, routeParams };
};

const getActiveTabRouteContext = (state: BottomTabBarProps['state']): TabRouteContext => {
  const currentRoute = state.routes[state.index] as RouteProp<ParamListBase, string>;
  const { routeName, routeParams } = getDeepestRouteContext(currentRoute);

  return {
    tabName: currentRoute.name as TabRouteName,
    routeName,
    routeParams,
  };
};

const buildChatTabParams = (sourceContext: TabRouteContext): ChatTabParams => {
  const caseId = getStringParam(sourceContext.routeParams, 'caseId');
  const caseSource = getCaseSourceParam(sourceContext.routeParams);
  const sourceAction = CHAT_SOURCE_ACTIONS[sourceContext.routeName]
    ?? `open_chat_from_${normalizeActionSegment(sourceContext.routeName)}`;

  return {
    sourceScreen: sourceContext.routeName,
    sourceAction,
    caseId,
    caseSource,
    userUscisCaseId: caseId && caseSource === 'uscis' ? caseId : undefined,
    userEoirCaseId: caseId && caseSource === 'eoir' ? caseId : undefined,
  };
};

export const FLOATING_TAB_BAR_SHELL_HEIGHT = LEGACY_TAB_BAR_SIZES.barHeight;

export const getFloatingTabBarBottomOffset = (safeAreaBottom: number): number => {
  if (isIOS && safeAreaBottom > 0) {
    return Math.max(safeAreaBottom - spacing.lg, spacing.md);
  }

  return safeAreaBottom + spacing.md;
};

export const getFloatingTabBarReservedSpace = (safeAreaBottom: number): number => {
  return FLOATING_TAB_BAR_SHELL_HEIGHT + getFloatingTabBarBottomOffset(safeAreaBottom) + spacing.sm;
};

export const shouldHideFloatingTabBarForRoute = (
  route: RouteProp<ParamListBase, string>,
): boolean => {
  const routeName = route.name as TabRouteName;
  const rootScreen = ROOT_TAB_SCREENS[routeName];

  if (!rootScreen) {
    return false;
  }

  const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? rootScreen;
  return focusedRouteName !== rootScreen;
};

const shouldHideTabBar = (state: BottomTabBarProps['state']): boolean => {
  const currentRoute = state.routes[state.index];
  return shouldHideFloatingTabBarForRoute(currentRoute as RouteProp<ParamListBase, string>);
};

const getTabLabel = (
  options: BottomTabBarProps['descriptors'][string]['options'],
  routeName: string
): string => {
  if (typeof options.tabBarLabel === 'string') {
    return options.tabBarLabel;
  }

  if (typeof options.title === 'string' && options.title.length > 0) {
    return options.title;
  }

  return routeName;
};

interface FloatingTabBarItemProps {
  label: string;
  isFocused: boolean;
  activeWidth: number;
  inactiveWidth: number;
  icon: React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

interface FloatingTabBarProps extends BottomTabBarProps {
  keyboardVisible?: boolean;
}

const FloatingTabBarItem: React.FC<FloatingTabBarItemProps> = ({
  activeWidth,
  label,
  isFocused,
  inactiveWidth,
  icon,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}) => {
  const focusProgress = useSharedValue(isFocused ? 1 : 0);
  const pressProgress = useSharedValue(0);

  useEffect(() => {
    focusProgress.value = withSpring(isFocused ? 1 : 0, {
      damping: 16,
      stiffness: 220,
      mass: 0.9,
    });
  }, [focusProgress, isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    const focusScale = interpolate(focusProgress.value, [0, 1], [1, 1.01]);
    const pressScale = interpolate(pressProgress.value, [0, 1], [1, 0.97]);
    const width = interpolate(focusProgress.value, [0, 1], [inactiveWidth, activeWidth]);

    return {
      width,
      transform: [
        { scale: focusScale * pressScale },
      ],
    };
  });

  const chipStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [LEGACY_TAB_BAR_COLORS.item, LEGACY_TAB_BAR_COLORS.activeBg],
      ),
      borderColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [LEGACY_TAB_BAR_COLORS.itemBorder, 'rgba(255,255,255,0)'],
      ),
    };
  });

  const labelWrapStyle = useAnimatedStyle(() => {
    return {
      marginLeft: interpolate(focusProgress.value, [0, 1], [0, 8]),
      maxWidth: interpolate(
        focusProgress.value,
        [0, 1],
        [0, Math.max(activeWidth - inactiveWidth, 0)],
      ),
      opacity: interpolate(focusProgress.value, [0, 1], [0, 1]),
    };
  });

  return (
    <Animated.View style={[styles.itemSlot, animatedStyle]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        onLongPress={onLongPress}
        onPress={onPress}
        onPressIn={() => {
          pressProgress.value = withTiming(1, { duration: 100 });
        }}
        onPressOut={() => {
          pressProgress.value = withTiming(0, { duration: 180 });
        }}
        style={styles.pressable}
        testID={testID}
      >
        <Animated.View style={[styles.chip, chipStyle]}>
            <View style={styles.iconWrap}>{icon}</View>
          <Animated.View style={[styles.labelWrap, labelWrapStyle]}>
            <Text numberOfLines={1} style={styles.label}>
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  descriptors,
  navigation,
  keyboardVisible = false,
}) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const focusedOptions = descriptors[state.routes[state.index].key]?.options;

  if (shouldHideTabBar(state) || (keyboardVisible && focusedOptions?.tabBarHideOnKeyboard)) {
    return null;
  }

  const bottomOffset = getFloatingTabBarBottomOffset(insets.bottom);
  const routeCount = state.routes.length;
  const availableWidth = Math.max(
    windowWidth
      - LEGACY_TAB_BAR_SIZES.horizontalMargin * 2
      - LEGACY_TAB_BAR_SIZES.barPadding * 2
      - LEGACY_TAB_BAR_SIZES.gap * Math.max(routeCount - 1, 0),
    LEGACY_TAB_BAR_SIZES.activeMinWidth
      + LEGACY_TAB_BAR_SIZES.inactiveMinWidth * Math.max(routeCount - 1, 0),
  );
  const inactiveWidth = routeCount > 1
    ? clamp(
        availableWidth / (routeCount + 0.9),
        LEGACY_TAB_BAR_SIZES.inactiveMinWidth,
        LEGACY_TAB_BAR_SIZES.inactiveMaxWidth,
      )
    : availableWidth;
  const activeWidth = clamp(
    availableWidth - inactiveWidth * Math.max(routeCount - 1, 0),
    LEGACY_TAB_BAR_SIZES.activeMinWidth,
    LEGACY_TAB_BAR_SIZES.activeMaxWidth,
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: bottomOffset }]}>
      <View style={styles.shell}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            const routeName = route.name as TabRouteName;
            const label = getTabLabel(descriptor.options, route.name);
            const isFocused = state.index === index;
            const icon = descriptor.options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? LEGACY_TAB_BAR_COLORS.activeText : LEGACY_TAB_BAR_COLORS.inactiveText,
              size: 22,
            });

            const onPress = () => {
              const event = navigation.emit({
                canPreventDefault: true,
                target: route.key,
                type: 'tabPress',
              });

              if (isFocused || event.defaultPrevented) {
                return;
              }

              void hapticSelection();

              if (routeName === 'Chat') {
                const params = buildChatTabParams(getActiveTabRouteContext(state));
                navigation.dispatch(
                  CommonActions.navigate({
                    name: 'Chat',
                    params,
                  }),
                );
                return;
              }

              navigation.navigate(route.name, route.params);
            };

            const onLongPress = () => {
              navigation.emit({
                target: route.key,
                type: 'tabLongPress',
              });
            };

            return (
              <FloatingTabBarItem
                accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
                activeWidth={activeWidth}
                icon={icon}
                inactiveWidth={inactiveWidth}
                isFocused={isFocused}
                key={route.key}
                label={label}
                onLongPress={onLongPress}
                onPress={onPress}
                testID={descriptor.options.tabBarButtonTestID}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    bottom: 0,
    left: 0,
    alignItems: 'center',
    position: 'absolute',
    right: 0,
  },
  shell: {
    alignItems: 'center',
    backgroundColor: LEGACY_TAB_BAR_COLORS.bar,
    borderRadius: borderRadius.full,
    height: FLOATING_TAB_BAR_SHELL_HEIGHT,
    marginHorizontal: LEGACY_TAB_BAR_SIZES.horizontalMargin,
    padding: LEGACY_TAB_BAR_SIZES.barPadding,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LEGACY_TAB_BAR_SIZES.gap,
    justifyContent: 'center',
  },
  itemSlot: {
    height: '100%',
  },
  pressable: {
    borderRadius: borderRadius.full,
    height: '100%',
  },
  chip: {
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: LEGACY_TAB_BAR_SIZES.itemPaddingHorizontal,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    overflow: 'hidden',
  },
  label: {
    color: LEGACY_TAB_BAR_COLORS.activeText,
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
});

export default FloatingTabBar;
