/**
 * ProTabs Component
 * 
 * Tab navigation component for Pro features:
 * - Forecast: Date predictions and probability
 * - Intelligence: USCIS processing data
 * - Accelerators: Actionable recommendations
 * - Alerts: Real-time notifications
 * 
 * Shows paywall overlay for non-Pro users.
 * 
 * Validates: Requirements 7.1, 7.10, 8.1, 9.1, 10.1
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import {
  ForecastIcon,
  IntelIcon,
  AccelerateIcon,
  AlertsIcon,
} from '../../icons/ProIcons';
import { useViewTranslation } from '../../i18n';
import type { IconProps } from '../../icons/CaseIcons';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { usePressAnimation, springConfigs } from '../../styles/animations';

export type ProTabId = 'forecast' | 'intelligence' | 'accelerators' | 'alerts';

interface TabConfig {
  id: ProTabId;
  Icon: React.ComponentType<IconProps>;
}

const TABS: TabConfig[] = [
  { id: 'forecast', Icon: ForecastIcon },
  { id: 'intelligence', Icon: IntelIcon },
  { id: 'accelerators', Icon: AccelerateIcon },
  { id: 'alerts', Icon: AlertsIcon },
];

export interface ProTabsProps {
  isPro: boolean;
  activeTab?: ProTabId;
  onTabChange?: (tab: ProTabId) => void;
  onPaywall?: () => void;
  children?: React.ReactNode | ((activeTab: ProTabId) => React.ReactNode);
  style?: ViewStyle;
}

interface TabButtonProps {
  tab: TabConfig;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, label, isActive, onPress }) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  const { Icon } = tab;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabButtonContent, animatedStyle]}>
        <Icon size={20} color={isActive ? colors.pro : colors.warm.inkFaint} />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const PaywallOverlay: React.FC<{
  onPress?: () => void;
  tx: (key: string, defaultValue: string, options?: Record<string, unknown>) => string;
}> = ({ onPress, tx }) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();

  return (
    <View style={styles.paywallContainer}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={styles.paywallTouchable}
      >
        <Animated.View style={[styles.paywallContent, animatedStyle]}>
          <View style={styles.paywallIconContainer}>
            <ForecastIcon size={32} color={colors.pro} />
          </View>
          <Text style={styles.paywallTitle}>{tx('proTabs.unlockTitle', 'Desbloquea Pro')}</Text>
          <Text style={styles.paywallDescription}>
            {tx(
              'proTabs.unlockDescription',
              'Accede a predicciones, inteligencia, aceleradores y alertas',
            )}
          </Text>
          <View style={styles.paywallPriceContainer}>
            <Text style={styles.paywallPrice}>{tx('proTabs.price', '$20')}</Text>
            <Text style={styles.paywallPeriod}>{tx('proTabs.period', '/ano')}</Text>
          </View>
          <View style={styles.paywallButton}>
            <Text style={styles.paywallButtonText}>{tx('proTabs.action', 'Ver planes')}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export const ProTabs: React.FC<ProTabsProps> = ({
  isPro,
  activeTab: controlledActiveTab,
  onTabChange,
  onPaywall,
  children,
  style,
}) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [internalActiveTab, setInternalActiveTab] = useState<ProTabId>('forecast');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const [containerWidth, setContainerWidth] = useState(0);
  
  const indicatorPosition = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const activeTabIndex = useMemo(() => {
    return TABS.findIndex((tab) => tab.id === activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    if (containerWidth > 0) {
      const tabWidth = containerWidth / TABS.length;
      indicatorPosition.value = withSpring(activeTabIndex * tabWidth, springConfigs.snappy);
      indicatorWidth.value = withSpring(tabWidth, springConfigs.snappy);
    }
  }, [activeTabIndex, containerWidth, indicatorPosition, indicatorWidth]);

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: indicatorWidth.value,
  }));

  const handleTabPress = useCallback((tabId: ProTabId) => {
    if (!isPro) {
      onPaywall?.();
      return;
    }
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    onTabChange?.(tabId);
  }, [isPro, controlledActiveTab, onTabChange, onPaywall]);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    const tabWidth = width / TABS.length;
    const initialIndex = TABS.findIndex((tab) => tab.id === activeTab);
    indicatorPosition.value = initialIndex * tabWidth;
    indicatorWidth.value = tabWidth;
  }, [activeTab, indicatorPosition, indicatorWidth]);

  const renderContent = () => {
    if (!isPro) return <PaywallOverlay onPress={onPaywall} tx={tx} />;
    if (typeof children === 'function') return children(activeTab);
    return children;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar} onLayout={handleContainerLayout}>
          <Animated.View style={[styles.indicator, indicatorAnimatedStyle]}>
            <View style={styles.indicatorInner} />
          </Animated.View>
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              label={tx(`proTabs.${tab.id}`, tab.id)}
              isActive={activeTab === tab.id}
              onPress={() => handleTabPress(tab.id)}
            />
          ))}
        </View>
      </View>
      <View style={styles.contentContainer}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBarContainer: { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.warm.sand,
    borderRadius: borderRadius.large,
    padding: spacing.xs,
    position: 'relative',
  },
  tabButton: { flex: 1, zIndex: 1 },
  tabButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tabLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tabLabelActive: { color: colors.pro, fontFamily: typography.fontFamily.semibold },
  indicator: {
    position: 'absolute',
    top: spacing.xs,
    bottom: spacing.xs,
    left: spacing.xs,
    zIndex: 0,
  },
  indicatorInner: {
    flex: 1,
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentContainer: { flex: 1, marginTop: spacing.md },
  paywallContainer: { flex: 1, padding: spacing.base },
  paywallTouchable: { flex: 1 },
  paywallContent: {
    flex: 1,
    backgroundColor: `${colors.pro}10`,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: `${colors.pro}30`,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.pro}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  paywallTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
  },
  paywallDescription: {
    fontSize: typography.fontSize.base,
    color: colors.warm.inkSoft,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  paywallPriceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.lg },
  paywallPrice: { fontSize: typography.fontSize['3xl'], fontFamily: typography.fontFamily.bold, color: colors.pro },
  paywallPeriod: { fontSize: typography.fontSize.md, color: colors.warm.inkSoft, marginLeft: spacing.xs },
  paywallButton: {
    backgroundColor: colors.pro,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  paywallButtonText: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.semibold, color: colors.warm.cream },
});

export default ProTabs;
