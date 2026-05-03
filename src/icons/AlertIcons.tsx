/**
 * Alert Icons
 * 
 * SVG icon components for different alert types.
 * Each icon accepts size, color, and strokeWidth props.
 * 
 * Validates: Requirements 5.7, 5.9
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polygon } from 'react-native-svg';
import { IconProps } from './CaseIcons';

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = 'currentColor';
const DEFAULT_STROKE_WIDTH = 1.8;

/**
 * AlertApprovedIcon
 * 
 * Represents approval alerts.
 * Design: A checkmark inside a circle, symbolizing success/approval.
 */
export const AlertApprovedIcon: React.FC<IconProps> = ({
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
    {/* Circle */}
    <Circle cx="12" cy="12" r="9" />
    {/* Checkmark */}
    <Path d="M8 12l2.5 2.5L16 9" />
  </Svg>
);

/**
 * AlertSpeedIcon
 * 
 * Represents speed/velocity change alerts.
 * Design: A speedometer gauge, symbolizing processing speed changes.
 */
export const AlertSpeedIcon: React.FC<IconProps> = ({
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
    {/* Speedometer arc */}
    <Path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
    {/* Speed indicator needle */}
    <Path d="M12 12l4-4" />
    {/* Center dot */}
    <Circle cx="12" cy="12" r="1.5" />
    {/* Speed marks */}
    <Line x1="12" y1="5" x2="12" y2="7" />
    <Line x1="5" y1="12" x2="7" y2="12" />
    <Line x1="19" y1="12" x2="17" y2="12" />
  </Svg>
);

/**
 * AlertCalendarIcon
 * 
 * Represents date/calendar update alerts.
 * Design: A calendar with a date marker.
 */
export const AlertCalendarIcon: React.FC<IconProps> = ({
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
    {/* Calendar body */}
    <Rect x="3" y="4" width="18" height="18" rx="2" />
    {/* Calendar top binding */}
    <Line x1="3" y1="10" x2="21" y2="10" />
    {/* Calendar hooks */}
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    {/* Date marker */}
    <Circle cx="12" cy="15" r="2" />
  </Svg>
);

/**
 * AlertWarningIcon
 * 
 * Represents risk/warning alerts.
 * Design: A warning triangle with exclamation mark.
 */
export const AlertWarningIcon: React.FC<IconProps> = ({
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
    {/* Warning triangle */}
    <Path d="M12 3L2 20h20L12 3z" />
    {/* Exclamation mark line */}
    <Line x1="12" y1="9" x2="12" y2="13" />
    {/* Exclamation mark dot */}
    <Circle cx="12" cy="16" r="0.5" />
  </Svg>
);

/**
 * AlertNewsIcon
 * 
 * Represents news alerts.
 * Design: A newspaper/document with lines, symbolizing news content.
 */
export const AlertNewsIcon: React.FC<IconProps> = ({
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
    {/* Newspaper outline */}
    <Path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    {/* Headline area */}
    <Rect x="6" y="7" width="5" height="4" />
    {/* Text lines */}
    <Line x1="14" y1="7" x2="18" y2="7" />
    <Line x1="14" y1="10" x2="18" y2="10" />
    <Line x1="6" y1="14" x2="18" y2="14" />
    <Line x1="6" y1="17" x2="14" y2="17" />
  </Svg>
);

/**
 * AlertCourtIcon
 * 
 * Represents court/legal update alerts.
 * Design: A gavel, symbolizing court decisions and legal proceedings.
 */
export const AlertCourtIcon: React.FC<IconProps> = ({
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
    {/* Gavel head */}
    <Rect x="3" y="3" width="8" height="5" rx="1" transform="rotate(45 7 5.5)" />
    {/* Gavel handle */}
    <Line x1="10" y1="10" x2="17" y2="17" />
    {/* Sound block base */}
    <Rect x="14" y="18" width="8" height="3" rx="1" />
    {/* Sound block top */}
    <Path d="M15 15l6 0" />
  </Svg>
);
