import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';

import { getMainTabAccent, type MainTabRouteName } from '../../navigation/tabAccents';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

const ADD_CASE_STATUE = require('../../../assets/illustrations/add-case-statue.png');

export type BrandedLoadingStateVariant = 'cases' | 'community';

interface BrandedLoadingStateProps {
  title: string;
  subtitle: string;
  variant?: BrandedLoadingStateVariant;
  accentColor?: string;
  eyebrow?: string;
  style?: ViewStyle;
}

const VARIANT_CONTENT: Record<BrandedLoadingStateVariant, { eyebrow: string }> = {
  cases: {
    eyebrow: 'Casos',
  },
  community: {
    eyebrow: 'Comunidad',
  },
};

const VARIANT_TAB_ROUTES: Record<BrandedLoadingStateVariant, MainTabRouteName> = {
  cases: 'Cases',
  community: 'Community',
};

export const BrandedLoadingState: React.FC<BrandedLoadingStateProps> = ({
  title,
  subtitle,
  variant = 'cases',
  accentColor,
  eyebrow,
  style,
}) => {
  const { width, height } = useWindowDimensions();
  const ringSpin = useRef(new Animated.Value(0)).current;
  const content = VARIANT_CONTENT[variant];
  const resolvedAccentColor = accentColor ?? getMainTabAccent(VARIANT_TAB_ROUTES[variant]);

  const circleSize = useMemo(() => {
    const target = Math.min(width * 0.76, height * 0.4);
    return Math.max(232, Math.min(304, Math.round(target)));
  }, [height, width]);
  const illustrationSize = useMemo(
    () => Math.max(144, Math.round(circleSize * 0.68)),
    [circleSize],
  );

  const ringRotation = useMemo(
    () =>
      ringSpin.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [ringSpin],
  );

  useEffect(() => {
    ringSpin.setValue(0);

    const loop = Animated.loop(
      Animated.timing(ringSpin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [ringSpin]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.heroStage, { minHeight: circleSize + 176 }] }>
        <View
          style={[
            styles.loadingCircle,
            {
              width: circleSize,
              minHeight: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
        >
          <Image
            source={ADD_CASE_STATUE}
            style={[
              styles.backgroundIllustration,
              { width: illustrationSize, height: illustrationSize },
            ]}
            resizeMode="contain"
          />

          <Animated.View
            style={[
              styles.loadingRing,
              {
                borderRadius: circleSize / 2,
                borderColor: 'rgba(255, 255, 255, 0.18)',
                borderTopColor: resolvedAccentColor,
                borderRightColor: `${resolvedAccentColor}66`,
                transform: [{ rotate: ringRotation }],
              },
            ]}
          />

          <View style={styles.loadingInner}>
            <View style={styles.copyBlock}>
              <Text style={[styles.heroEyebrow, { color: resolvedAccentColor }]}>
                {eyebrow ?? content.eyebrow}
              </Text>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroSubtitle}>{subtitle}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  heroStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundIllustration: {
    position: 'absolute',
    opacity: 0.14,
  },
  loadingCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    overflow: 'hidden',
  },
  loadingRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 5,
  },
  loadingInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  copyBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 228,
  },
  heroTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    maxWidth: 228,
    fontSize: typography.fontSize.sm,
    lineHeight: 19,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default BrandedLoadingState;