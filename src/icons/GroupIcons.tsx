/**
 * Group Icons
 * 
 * SVG icon components for community group types.
 * Each icon accepts size, color, and strokeWidth props.
 * 
 * Validates: Requirements 5.6, 5.9
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polygon } from 'react-native-svg';
import { IconProps } from './CaseIcons';

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = 'currentColor';
const DEFAULT_STROKE_WIDTH = 1.8;

/**
 * GroupFamilyIcon
 * 
 * Represents family-based community groups.
 * Design: Multiple people figures symbolizing family unity.
 */
export const GroupFamilyIcon: React.FC<IconProps> = ({
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
    {/* Adult 1 (left) - head */}
    <Circle cx="6" cy="6" r="2" />
    {/* Adult 1 - body */}
    <Path d="M6 10c-2 0-3.5 1.5-3.5 3v3h7v-3c0-1.5-1.5-3-3.5-3z" />
    
    {/* Adult 2 (right) - head */}
    <Circle cx="18" cy="6" r="2" />
    {/* Adult 2 - body */}
    <Path d="M18 10c-2 0-3.5 1.5-3.5 3v3h7v-3c0-1.5-1.5-3-3.5-3z" />
    
    {/* Child (center) - head */}
    <Circle cx="12" cy="9" r="1.5" />
    {/* Child - body */}
    <Path d="M12 12c-1.5 0-2.5 1-2.5 2v2h5v-2c0-1-1-2-2.5-2z" />
  </Svg>
);

/**
 * GroupClassIcon
 * 
 * Represents class action community groups.
 * Design: A book with a bookmark, symbolizing education and collective learning.
 */
export const GroupClassIcon: React.FC<IconProps> = ({
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
    {/* Open book left page */}
    <Path d="M2 4c2-1 4-1 6 0v14c-2-1-4-1-6 0V4z" />
    {/* Open book right page */}
    <Path d="M22 4c-2-1-4-1-6 0v14c2-1 4-1 6 0V4z" />
    {/* Book spine */}
    <Path d="M8 4c2-1 4-1 6 0" />
    <Path d="M8 18c2-1 4-1 6 0" />
    {/* Center binding */}
    <Line x1="12" y1="4" x2="12" y2="18" />
  </Svg>
);

/**
 * GroupDacaIcon
 * 
 * Represents DACA community groups.
 * Design: A graduation cap symbolizing dreamers and education.
 */
export const GroupDacaIcon: React.FC<IconProps> = ({
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
    {/* Graduation cap top */}
    <Path d="M12 4L2 9l10 5 10-5-10-5z" />
    {/* Cap sides */}
    <Path d="M6 11v5c0 2 2.7 3 6 3s6-1 6-3v-5" />
    {/* Tassel */}
    <Line x1="20" y1="9" x2="20" y2="15" />
    <Circle cx="20" cy="16" r="1" />
  </Svg>
);

/**
 * MasterclassIcon
 * 
 * Represents masterclass/video content groups.
 * Design: A play button inside a screen, symbolizing video content.
 */
export const MasterclassIcon: React.FC<IconProps> = ({
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
    {/* Screen/monitor outline */}
    <Rect x="2" y="3" width="20" height="14" rx="2" />
    {/* Play button triangle */}
    <Polygon points="10,7 10,13 15,10" />
    {/* Stand */}
    <Line x1="8" y1="21" x2="16" y2="21" />
    <Line x1="12" y1="17" x2="12" y2="21" />
  </Svg>
);

/**
 * GroupUsaIcon
 * 
 * Represents USA-related community groups.
 * Design: A simplified USA map outline with a star.
 */
export const GroupUsaIcon: React.FC<IconProps> = ({
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
    {/* Simplified USA map outline */}
    <Path d="M3 8h2l1-2h3l1 1h2l2-1h4l2 1h1v2l-1 2v3l-2 2h-3l-1 1h-4l-2-1h-2l-1-2H3l-1-2V10l1-2z" />
    {/* Star in center */}
    <Path d="M12 9l.7 2.2H15l-1.8 1.3.7 2.2-1.9-1.4-1.9 1.4.7-2.2-1.8-1.3h2.3L12 9z" />
  </Svg>
);
