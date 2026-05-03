/**
 * Utility Icons
 * 
 * SVG icon components for utility and legal-related features.
 * Each icon accepts size, color, and strokeWidth props.
 * 
 * Validates: Requirements 5.4, 5.9
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { IconProps } from './CaseIcons';

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = 'currentColor';
const DEFAULT_STROKE_WIDTH = 1.8;

/**
 * JudgeIcon
 * 
 * Represents judicial/court-related features.
 * Design: A gavel symbolizing legal proceedings.
 */
export const JudgeIcon: React.FC<IconProps> = ({
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
    <Rect x="2" y="4" width="8" height="5" rx="1" />
    {/* Gavel handle */}
    <Line x1="6" y1="9" x2="14" y2="17" />
    {/* Sound block */}
    <Rect x="14" y="17" width="8" height="4" rx="1" />
    {/* Strike line */}
    <Path d="M16 14l2 2" />
  </Svg>
);

/**
 * DocLetterIcon
 * 
 * Represents documents and letters.
 * Design: A document/letter with lines representing text.
 */
export const DocLetterIcon: React.FC<IconProps> = ({
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
    {/* Document outline with folded corner */}
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
    {/* Folded corner */}
    <Path d="M14 2v6h6" />
    {/* Text lines */}
    <Line x1="8" y1="13" x2="16" y2="13" />
    <Line x1="8" y1="17" x2="14" y2="17" />
  </Svg>
);

/**
 * InquiryIcon
 * 
 * Represents inquiries and questions.
 * Design: A magnifying glass with question mark, symbolizing search/inquiry.
 */
export const InquiryIcon: React.FC<IconProps> = ({
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
    {/* Magnifying glass circle */}
    <Circle cx="10" cy="10" r="7" />
    {/* Magnifying glass handle */}
    <Line x1="15" y1="15" x2="21" y2="21" />
    {/* Question mark inside */}
    <Path d="M8 8c0-1.5 1-2.5 2-2.5s2 1 2 2c0 1.5-2 1.5-2 3" />
    <Circle cx="10" cy="13" r="0.5" />
  </Svg>
);

/**
 * CongressIcon
 * 
 * Represents congressional/legislative contact.
 * Design: A capitol building dome symbolizing Congress.
 */
export const CongressIcon: React.FC<IconProps> = ({
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
    {/* Dome */}
    <Path d="M12 2c-3 0-6 3-6 6h12c0-3-3-6-6-6z" />
    {/* Dome top */}
    <Line x1="12" y1="2" x2="12" y2="4" />
    {/* Building base */}
    <Rect x="4" y="8" width="16" height="3" />
    {/* Columns */}
    <Line x1="6" y1="11" x2="6" y2="18" />
    <Line x1="10" y1="11" x2="10" y2="18" />
    <Line x1="14" y1="11" x2="14" y2="18" />
    <Line x1="18" y1="11" x2="18" y2="18" />
    {/* Foundation */}
    <Rect x="3" y="18" width="18" height="3" />
  </Svg>
);

/**
 * MandamusIcon
 * 
 * Represents Mandamus legal action.
 * Design: A legal document with an official seal.
 */
export const MandamusIcon: React.FC<IconProps> = ({
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
    {/* Text lines */}
    <Line x1="8" y1="6" x2="16" y2="6" />
    <Line x1="8" y1="10" x2="16" y2="10" />
    <Line x1="8" y1="14" x2="12" y2="14" />
    {/* Official seal */}
    <Circle cx="16" cy="16" r="3" />
    {/* Seal inner detail */}
    <Circle cx="16" cy="16" r="1.5" />
  </Svg>
);
