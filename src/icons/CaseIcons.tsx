/**
 * Case Icons
 * 
 * SVG icon components for immigration case types.
 * Each icon accepts size, color, and strokeWidth props.
 * 
 * Validates: Requirements 5.2, 5.9
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

/**
 * Common props interface for all icons
 */
export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = 'currentColor';
const DEFAULT_STROKE_WIDTH = 1.8;

/**
 * GreenCardIcon
 * 
 * Represents I-485 Green Card / Permanent Residence applications.
 * Design: A card with a checkmark, symbolizing approved permanent residence.
 */
export const GreenCardIcon: React.FC<IconProps> = ({
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
    {/* Card outline */}
    <Rect x="3" y="5" width="18" height="14" rx="2" />
    {/* Checkmark inside card */}
    <Path d="M8 12l2.5 2.5L16 9" />
    {/* Horizontal line representing text/info */}
    <Line x1="7" y1="16" x2="12" y2="16" />
  </Svg>
);

/**
 * WorkPermitIcon
 * 
 * Represents I-765 Employment Authorization Document (EAD) applications.
 * Design: A briefcase with a document, symbolizing work authorization.
 */
export const WorkPermitIcon: React.FC<IconProps> = ({
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
    {/* Briefcase body */}
    <Rect x="2" y="7" width="20" height="14" rx="2" />
    {/* Briefcase handle */}
    <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    {/* Document/permit inside */}
    <Line x1="12" y1="11" x2="12" y2="17" />
    <Line x1="9" y1="14" x2="15" y2="14" />
  </Svg>
);

/**
 * AsylumIcon
 * 
 * Represents Asylum/EOIR cases.
 * Design: A shield with a person, symbolizing protection and refuge.
 */
export const AsylumIcon: React.FC<IconProps> = ({
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
    {/* Shield outline */}
    <Path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" />
    {/* Person inside shield (head) */}
    <Circle cx="12" cy="9" r="2" />
    {/* Person inside shield (body) */}
    <Path d="M12 13c-2 0-3.5 1-3.5 2.5V16h7v-.5c0-1.5-1.5-2.5-3.5-2.5z" />
  </Svg>
);

/**
 * CitizenshipIcon
 * 
 * Represents N-400 Naturalization/Citizenship applications.
 * Design: A star with a flag element, symbolizing becoming a citizen.
 */
export const CitizenshipIcon: React.FC<IconProps> = ({
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
    {/* Star shape */}
    <Path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
  </Svg>
);

/**
 * VisaIcon
 * 
 * Represents various visa applications (B1/B2, F1, H1B, etc.).
 * Design: A passport/document with a stamp, symbolizing travel authorization.
 */
export const VisaIcon: React.FC<IconProps> = ({
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
    {/* Passport/document outline */}
    <Rect x="4" y="2" width="16" height="20" rx="2" />
    {/* Photo area */}
    <Rect x="7" y="5" width="6" height="7" rx="1" />
    {/* Text lines */}
    <Line x1="7" y1="15" x2="17" y2="15" />
    <Line x1="7" y1="18" x2="14" y2="18" />
    {/* Stamp circle */}
    <Circle cx="16" cy="8" r="2.5" />
  </Svg>
);

/**
 * DacaIcon
 * 
 * Represents DACA (Deferred Action for Childhood Arrivals) applications.
 * Design: A graduation cap with a heart, symbolizing dreamers and education.
 */
export const DacaIcon: React.FC<IconProps> = ({
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
