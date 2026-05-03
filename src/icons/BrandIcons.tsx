/**
 * Brand Icons
 * 
 * SVG icon components for app branding and main features.
 * Each icon accepts size, color, and strokeWidth props.
 * 
 * Validates: Requirements 5.5, 5.9
 */

import React from 'react';
import { Image } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

import { IconProps } from './CaseIcons';

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = 'currentColor';
const DEFAULT_STROKE_WIDTH = 1.8;
const addCaseStatuePng = require('../../assets/illustrations/add-case-statue.png');

/**
 * ChatAiIcon
 * 
 * Represents the AI chat feature.
 * Design: A chat bubble with AI indicator (sparkle/dots).
 */
export const ChatAiIcon: React.FC<IconProps> = ({
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
    {/* Chat bubble */}
    <Path d="M21 12c0 4.4-4 8-9 8-1.6 0-3.1-.4-4.4-1L3 21l1.5-3.5C3.5 16 3 14.1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
    {/* AI sparkle/indicator dots */}
    <Circle cx="8" cy="12" r="1" />
    <Circle cx="12" cy="12" r="1" />
    <Circle cx="16" cy="12" r="1" />
  </Svg>
);

/**
 * CaseTrackerIcon
 * 
 * Represents the case tracking feature.
 * Design: A document with progress indicator.
 */
export const CaseTrackerIcon: React.FC<IconProps> = ({
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
    {/* Document outline */}
    <Rect x="4" y="2" width="16" height="20" rx="2" />
    {/* Progress checkmarks */}
    <Path d="M8 8l2 2 4-4" />
    <Path d="M8 14l2 2 4-4" />
    {/* Pending item */}
    <Circle cx="9" cy="19" r="1" />
    <Line x1="12" y1="19" x2="16" y2="19" />
  </Svg>
);

/**
 * ResourcesIcon
 * 
 * Represents the resources/learning section.
 * Design: A book or folder with content.
 */
export const ResourcesIcon: React.FC<IconProps> = ({
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
    {/* Book spine */}
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    {/* Book cover */}
    <Path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
    {/* Bookmark */}
    <Path d="M8 2v7l2.5-2 2.5 2V2" />
  </Svg>
);

/**
 * InmigreatLogo
 * 
 * Renders the shared PNG brand illustration so splash and chat stay aligned
 * without depending on Metro SVG transformation.
 */
export const InmigreatLogo: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
}) => (
  <Image
    source={addCaseStatuePng}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);
