/**
 * MainTabs Navigator
 * 
 * Bottom tab navigator for the main app screens.
 * Configures 4 tabs: Chat, Cases, Community, Resources
 * 
 * Validates: Requirements 2.1, 2.4
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useViewTranslation } from '../i18n';
import { MainTabParamList } from '../types/navigation';
import {
  ChatAiIcon,
  CaseTrackerIcon,
  CommunityProIcon,
  ResourcesIcon,
} from '../icons';
import {
  FloatingTabBar,
  getFloatingTabBarReservedSpace,
  shouldHideFloatingTabBarForRoute,
} from '../components/navigation/FloatingTabBar';
import { DEFAULT_GRADIENT_COLORS } from '../components/common/AnimatedBackground';
import { CommunityStack } from './CommunityStack';
import { CasesStack } from './CasesStack';
import { ChatScreen } from '../screens/ChatScreen';
import { ResourcesScreen } from '../screens/ResourcesScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../styles/theme';
import { isIOS } from '../utils/platform';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Tab bar icon component
 */
interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
}

const getTabIcon = (routeName: keyof MainTabParamList) => {
  return ({ focused, color, size }: TabIconProps) => {
    const iconProps = {
      size,
      color,
      strokeWidth: focused ? 2 : 1.8,
    };

    switch (routeName) {
      case 'Chat':
        return <ChatAiIcon {...iconProps} />;
      case 'Cases':
        return <CaseTrackerIcon {...iconProps} />;
      case 'Community':
        return <CommunityProIcon {...iconProps} />;
      case 'Resources':
        return <ResourcesIcon {...iconProps} />;
      default:
        return null;
    }
  };
};

/**
 * MainTabs Navigator Component
 * 
 * Bottom tab navigator with 4 main screens:
 * - Chat: AI-powered immigration chat
 * - Cases: Immigration case tracking
 * - Community: Social features and groups
 * - Resources: Educational content
 */
export const MainTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { t } = useViewTranslation('root-navigation');
  const tx = useCallback(
    (key: string, fallback: string) => t(key, { defaultValue: fallback }),
    [t],
  );

  useEffect(() => {
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const tabBarReservedSpace = getFloatingTabBarReservedSpace(insets.bottom);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={DEFAULT_GRADIENT_COLORS}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={[styles.bottomBackdrop, { height: tabBarReservedSpace + spacing.lg }]}
      />

      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} keyboardVisible={keyboardVisible} />}
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle: {
            backgroundColor: 'transparent',
            paddingBottom:
              keyboardVisible || shouldHideFloatingTabBarForRoute(route)
                ? 0
                : tabBarReservedSpace,
          },
          tabBarHideOnKeyboard: true,
        })}
      >
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            tabBarLabel: tx('tabs.chat', 'Chat'),
            tabBarAccessibilityLabel: tx('tabs.accessibility.chat', 'Abrir pestana de chat'),
            tabBarIcon: getTabIcon('Chat'),
          }}
        />
        <Tab.Screen
          name="Cases"
          component={CasesStack}
          options={{
            tabBarLabel: tx('tabs.cases', 'Casos'),
            tabBarAccessibilityLabel: tx('tabs.accessibility.cases', 'Abrir pestana de casos'),
            tabBarIcon: getTabIcon('Cases'),
          }}
        />
        <Tab.Screen
          name="Community"
          component={CommunityStack}
          options={{
            tabBarLabel: tx('tabs.community', 'Comunidad'),
            tabBarAccessibilityLabel: tx('tabs.accessibility.community', 'Abrir pestana de comunidad'),
            tabBarIcon: getTabIcon('Community'),
          }}
        />
        <Tab.Screen
          name="Resources"
          component={ResourcesScreen}
          options={{
            tabBarLabel: tx('tabs.resources', 'Recursos'),
            tabBarAccessibilityLabel: tx('tabs.accessibility.resources', 'Abrir pestana de recursos'),
            tabBarIcon: getTabIcon('Resources'),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});

export default MainTabs;
