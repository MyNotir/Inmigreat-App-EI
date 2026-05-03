/**
 * Pro Feature Icons
 * 
 * SVG icon components for Pro subscription features.
 * Each icon accepts size, color, and strokeWidth props.
 * 
 * Validates: Requirements 5.3
 */

import React from 'react';
import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg';
import { IconProps } from './CaseIcons';

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = 'currentColor';
const DEFAULT_STROKE_WIDTH = 1.8;

/**
 * ForecastIcon
 * 
 * Represents date predictions and forecasting.
 * Design: A calendar with a trend line, symbolizing date predictions.
 */
export const ForecastIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Calendar outline */}
    <Rect x="3" y="4" width="18" height="18" rx="2" />
    {/* Calendar top binding */}
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    {/* Horizontal divider */}
    <Line x1="3" y1="10" x2="21" y2="10" />
    {/* Trend line going up */}
    <Polyline points="7,17 10,14 13,16 17,12" />
  </Svg>
);

/**
 * IntelIcon
 * 
 * Represents intelligence data and insights.
 * Design: A lightbulb with rays, symbolizing intelligence and insights.
 */
export const IntelIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Lightbulb body */}
    <Path d="M9 18h6" />
    <Path d="M10 22h4" />
    <Path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z" />
    {/* Light rays */}
    <Line x1="12" y1="2" x2="12" y2="0" />
    <Line x1="4.22" y1="4.22" x2="2.81" y2="2.81" />
    <Line x1="2" y1="12" x2="0" y2="12" />
    <Line x1="19.78" y1="4.22" x2="21.19" y2="2.81" />
    <Line x1="22" y1="12" x2="24" y2="12" />
  </Svg>
);

/**
 * AccelerateIcon
 * 
 * Represents accelerators and speed improvements.
 * Design: A rocket, symbolizing acceleration and speed.
 */
export const AccelerateIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Rocket body */}
    <Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <Path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    {/* Rocket fins */}
    <Path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <Path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </Svg>
);

/**
 * AlertsIcon
 * 
 * Represents notifications and alerts.
 * Design: A bell with notification indicator, symbolizing alerts.
 */
export const AlertsIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Bell body */}
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    {/* Bell clapper */}
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    {/* Notification dot */}
    <Circle cx="18" cy="5" r="3" />
  </Svg>
);

/**
 * CommunityProIcon
 * 
 * Represents Pro community features.
 * Design: People with a crown/star, symbolizing premium community.
 */
export const CommunityProIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Crown/star at top */}
    <Path d="M12 2l1.5 3 3.5.5-2.5 2.5.5 3.5L12 10l-3 1.5.5-3.5L7 5.5l3.5-.5L12 2z" />
    {/* Left person */}
    <Circle cx="6" cy="15" r="2" />
    <Path d="M6 19c-2 0-3 1-3 2v1h6v-1c0-1-1-2-3-2z" />
    {/* Right person */}
    <Circle cx="18" cy="15" r="2" />
    <Path d="M18 19c-2 0-3 1-3 2v1h6v-1c0-1-1-2-3-2z" />
  </Svg>
);
