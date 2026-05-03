/**
 * ResourcesScreen
 * 
 * Main screen for displaying educational resources about immigration.
 * - Displays expandable sections: Attorneys, Calculator, Glossary, Visa Bulletin
 * - Implements attorney listings with contact info
 * - Implements processing time calculator
 * - Implements searchable glossary
 * - Displays Visa Bulletin information
 * 
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { GlassCard } from '../components/common/GlassCard';
import { PlatformBottomSheet } from '../components/common/PlatformBottomSheet';
import { ProfileSheet } from '../components/ProfileSheet';
import { useAuth } from '../context/AuthContext';
import { useViewTranslation } from '../i18n';
import { getMainTabAccent } from '../navigation/tabAccents';
import {
  createColoredGlassBackground,
  createGlassBorder,
} from '../styles/glassmorphism';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

const RESOURCES_ACCENT = getMainTabAccent('Resources');

// ============================================================================
// TYPES
// ============================================================================

interface Attorney {
  id: string;
  name: string;
  firm: string;
  specialty: string;
  phone: string;
  email: string;
  location: string;
  rating: number;
}

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
}

interface VisaBulletinData {
  category: string;
  chargeabilityArea: string;
  currentDate: string;
  movement: 'forward' | 'retrogressed' | 'current';
}

interface ProcessingTime {
  formType: string;
  serviceCenter: string;
  estimatedWeeks: number;
}

type ResourcesTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

// ============================================================================
// ICONS
// ============================================================================

const ChevronDownIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = colors.text.secondary 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BriefcaseIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 24, 
  color = colors.text.primary 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke={color} strokeWidth={2} />
  </Svg>
);

const CalculatorIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 24, 
  color = colors.text.primary 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth={2} />
    <Line x1="8" y1="6" x2="16" y2="6" stroke={color} strokeWidth={2} />
    <Circle cx="8" cy="10" r="1" fill={color} />
    <Circle cx="12" cy="10" r="1" fill={color} />
    <Circle cx="16" cy="10" r="1" fill={color} />
    <Circle cx="8" cy="14" r="1" fill={color} />
    <Circle cx="12" cy="14" r="1" fill={color} />
    <Circle cx="16" cy="14" r="1" fill={color} />
    <Circle cx="8" cy="18" r="1" fill={color} />
    <Circle cx="12" cy="18" r="1" fill={color} />
    <Circle cx="16" cy="18" r="1" fill={color} />
  </Svg>
);

const BookIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 24, 
  color = colors.text.primary 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 24, 
  color = colors.text.primary 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} />
  </Svg>
);

const PhoneIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = colors.accent 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MailIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = colors.accent 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 20, 
  color = colors.text.tertiary 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const StarIcon: React.FC<{ size?: number; color?: string; filled?: boolean }> = ({ 
  size = 14, 
  color = colors.warning,
  filled = true
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ============================================================================
// SAMPLE DATA
// ============================================================================

function buildSampleAttorneys(tx: ResourcesTranslate): Attorney[] {
  return [
    {
      id: '1',
      name: 'Maria Garcia Lopez',
      firm: 'Garcia Immigration Law',
      specialty: tx('attorneys.items.maria.specialty', 'Casos familiares y asilo'),
      phone: '+1 (305) 555-0123',
      email: 'maria@garcialaw.com',
      location: 'Miami, FL',
      rating: 4.9,
    },
    {
      id: '2',
      name: 'Carlos Rodriguez',
      firm: 'Rodriguez & Associates',
      specialty: tx('attorneys.items.carlos.specialty', 'Visas de trabajo y EB-2 NIW'),
      phone: '+1 (212) 555-0456',
      email: 'carlos@rodriguezlaw.com',
      location: 'New York, NY',
      rating: 4.8,
    },
    {
      id: '3',
      name: 'Ana Martinez',
      firm: 'Martinez Legal Group',
      specialty: tx('attorneys.items.ana.specialty', 'DACA y ciudadania'),
      phone: '+1 (713) 555-0789',
      email: 'ana@martinezlegal.com',
      location: 'Houston, TX',
      rating: 4.7,
    },
  ];
}

function buildSampleGlossary(tx: ResourcesTranslate): GlossaryTerm[] {
  return [
    {
      id: '1',
      term: 'Adjustment of Status (AOS)',
      definition: tx(
        'glossary.items.aos.definition',
        'Proceso para cambiar tu estatus migratorio a residente permanente mientras estas en Estados Unidos.',
      ),
      category: tx('glossary.category.process', 'Proceso'),
    },
    {
      id: '2',
      term: 'Biometrics',
      definition: tx(
        'glossary.items.biometrics.definition',
        'Cita para tomar huellas dactilares, fotografia y firma como parte del proceso de inmigracion.',
      ),
      category: tx('glossary.category.process', 'Proceso'),
    },
    {
      id: '3',
      term: 'Consular Processing',
      definition: tx(
        'glossary.items.consularProcessing.definition',
        'Proceso de obtener visa de inmigrante a traves de una embajada o consulado de EE.UU. en el extranjero.',
      ),
      category: tx('glossary.category.process', 'Proceso'),
    },
    {
      id: '4',
      term: 'DACA',
      definition: tx(
        'glossary.items.daca.definition',
        'Accion Diferida para los Llegados en la Infancia. Programa que protege de deportacion a ciertos inmigrantes que llegaron como menores.',
      ),
      category: tx('glossary.category.program', 'Programa'),
    },
    {
      id: '5',
      term: 'EAD',
      definition: tx(
        'glossary.items.ead.definition',
        'Employment Authorization Document. Documento que autoriza trabajar legalmente en Estados Unidos.',
      ),
      category: tx('glossary.category.document', 'Documento'),
    },
    {
      id: '6',
      term: 'Green Card',
      definition: tx(
        'glossary.items.greenCard.definition',
        'Tarjeta de Residente Permanente. Documento que prueba el estatus de residente permanente legal.',
      ),
      category: tx('glossary.category.document', 'Documento'),
    },
    {
      id: '7',
      term: 'I-485',
      definition: tx(
        'glossary.items.i485.definition',
        'Formulario para solicitar ajuste de estatus a residente permanente.',
      ),
      category: tx('glossary.category.form', 'Formulario'),
    },
    {
      id: '8',
      term: 'I-765',
      definition: tx(
        'glossary.items.i765.definition',
        'Formulario para solicitar autorizacion de empleo (EAD).',
      ),
      category: tx('glossary.category.form', 'Formulario'),
    },
    {
      id: '9',
      term: 'NIW',
      definition: tx(
        'glossary.items.niw.definition',
        'National Interest Waiver. Exencion por interes nacional para la categoria EB-2.',
      ),
      category: tx('glossary.category.category', 'Categoria'),
    },
    {
      id: '10',
      term: 'Priority Date',
      definition: tx(
        'glossary.items.priorityDate.definition',
        'Fecha que determina tu lugar en la fila para una visa de inmigrante.',
      ),
      category: tx('glossary.category.process', 'Proceso'),
    },
    {
      id: '11',
      term: 'RFE',
      definition: tx(
        'glossary.items.rfe.definition',
        'Request for Evidence. Solicitud de USCIS para documentacion adicional.',
      ),
      category: tx('glossary.category.process', 'Proceso'),
    },
    {
      id: '12',
      term: 'USCIS',
      definition: tx(
        'glossary.items.uscis.definition',
        'U.S. Citizenship and Immigration Services. Agencia que procesa solicitudes de inmigracion.',
      ),
      category: tx('glossary.category.agency', 'Agencia'),
    },
  ];
}

function buildSampleVisaBulletin(tx: ResourcesTranslate): VisaBulletinData[] {
  return [
    {
      category: 'EB-1',
      chargeabilityArea: tx('visaBulletin.area.allChargeability', 'All Chargeability Areas'),
      currentDate: tx('visaBulletin.currentDate', 'Current'),
      movement: 'current',
    },
    {
      category: 'EB-2',
      chargeabilityArea: tx('visaBulletin.area.allChargeability', 'All Chargeability Areas'),
      currentDate: '01 Mar 2022',
      movement: 'forward',
    },
    {
      category: 'EB-2',
      chargeabilityArea: tx('visaBulletin.area.chinaIndia', 'China/India'),
      currentDate: '15 Jan 2013',
      movement: 'retrogressed',
    },
    {
      category: 'EB-3',
      chargeabilityArea: tx('visaBulletin.area.allChargeability', 'All Chargeability Areas'),
      currentDate: '01 Sep 2022',
      movement: 'forward',
    },
    {
      category: 'F-1',
      chargeabilityArea: tx('visaBulletin.area.allChargeability', 'All Chargeability Areas'),
      currentDate: '22 Nov 2015',
      movement: 'forward',
    },
    {
      category: 'F-2A',
      chargeabilityArea: tx('visaBulletin.area.allChargeability', 'All Chargeability Areas'),
      currentDate: tx('visaBulletin.currentDate', 'Current'),
      movement: 'current',
    },
    {
      category: 'F-2B',
      chargeabilityArea: tx('visaBulletin.area.allChargeability', 'All Chargeability Areas'),
      currentDate: '22 Sep 2015',
      movement: 'forward',
    },
  ];
}

const SAMPLE_PROCESSING_TIMES: ProcessingTime[] = [
  { formType: 'I-485', serviceCenter: 'Nebraska', estimatedWeeks: 18 },
  { formType: 'I-485', serviceCenter: 'Texas', estimatedWeeks: 22 },
  { formType: 'I-765', serviceCenter: 'Nebraska', estimatedWeeks: 8 },
  { formType: 'I-765', serviceCenter: 'Texas', estimatedWeeks: 10 },
  { formType: 'I-130', serviceCenter: 'Nebraska', estimatedWeeks: 14 },
  { formType: 'I-140', serviceCenter: 'Nebraska', estimatedWeeks: 12 },
  { formType: 'I-140', serviceCenter: 'Texas', estimatedWeeks: 16 },
  { formType: 'N-400', serviceCenter: 'Field Office', estimatedWeeks: 20 },
];

// ============================================================================
// EXPANDABLE SECTION COMPONENT
// ============================================================================

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function mixHexWithWhite(hexColor: string, ratio: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const mix = (channel: number) => Math.round(channel + ((255 - channel) * ratio));

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  icon,
  iconColor,
  expanded,
  onToggle,
  children,
}) => {
  const rotation = useSharedValue(expanded ? 1 : 0);
  const isAndroid = Platform.OS === 'android';
  const sectionBackgroundColor = isAndroid
    ? mixHexWithWhite(iconColor, 0.82)
    : createColoredGlassBackground(iconColor, 0.06);
  const headerBackgroundColor = isAndroid
    ? mixHexWithWhite(iconColor, 0.76)
    : createColoredGlassBackground(iconColor, 0.1);
  const headerBorderColor = isAndroid
    ? mixHexWithWhite(iconColor, 0.64)
    : createColoredGlassBackground(iconColor, 0.16);
  const contentBackgroundColor = isAndroid
    ? 'transparent'
    : createColoredGlassBackground(iconColor, 0.04);
  const sectionCardStyle = {
    ...styles.sectionCard,
    backgroundColor: sectionBackgroundColor,
    borderColor: headerBorderColor,
    shadowColor: iconColor,
  };

  React.useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, { duration: 200 });
  }, [expanded, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }));

  return (
    <GlassCard style={sectionCardStyle} blurIntensity={0}>
      <TouchableOpacity
        style={[
          styles.sectionHeader,
          {
            backgroundColor: headerBackgroundColor,
            borderBottomColor: expanded ? headerBorderColor : 'transparent',
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.sectionIconContainer,
            {
              backgroundColor: isAndroid
                ? mixHexWithWhite(iconColor, 0.68)
                : createColoredGlassBackground(iconColor, 0.12),
            },
          ]}
        >
          {icon}
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Animated.View style={chevronStyle}>
          <ChevronDownIcon />
        </Animated.View>
      </TouchableOpacity>
      {expanded ? (
        <View
          style={[
            styles.sectionContent,
            { backgroundColor: contentBackgroundColor },
          ]}
        >
          {children}
        </View>
      ) : null}
    </GlassCard>
  );
};

// ============================================================================
// ATTORNEY CARD COMPONENT
// ============================================================================

interface AttorneyCardProps {
  attorney: Attorney;
  tx: ResourcesTranslate;
}

const AttorneyCard: React.FC<AttorneyCardProps> = ({ attorney, tx }) => {
  const handleCall = useCallback(() => {
    Linking.openURL(`tel:${attorney.phone.replace(/[^0-9+]/g, '')}`);
  }, [attorney.phone]);

  const handleEmail = useCallback(() => {
    Linking.openURL(`mailto:${attorney.email}`);
  }, [attorney.email]);

  return (
    <View style={styles.attorneyCard}>
      <View style={styles.attorneyHeader}>
        <View style={styles.attorneyInfo}>
          <Text style={styles.attorneyName}>{attorney.name}</Text>
          <Text style={styles.attorneyFirm}>{attorney.firm}</Text>
          <Text style={styles.attorneySpecialty}>{attorney.specialty}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <StarIcon />
          <Text style={styles.ratingText}>{attorney.rating}</Text>
        </View>
      </View>
      <Text style={styles.attorneyLocation}>{attorney.location}</Text>
      <View style={styles.contactButtons}>
        <TouchableOpacity style={styles.contactButton} onPress={handleCall} activeOpacity={0.7}>
          <PhoneIcon />
          <Text style={styles.contactButtonText}>{tx('contact.call', 'Llamar')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactButton} onPress={handleEmail} activeOpacity={0.7}>
          <MailIcon />
          <Text style={styles.contactButtonText}>{tx('contact.email', 'Correo')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================================
// GLOSSARY ITEM COMPONENT
// ============================================================================

interface GlossaryItemProps {
  term: GlossaryTerm;
}

const GlossaryItem: React.FC<GlossaryItemProps> = ({ term }) => (
  <View style={styles.glossaryItem}>
    <View style={styles.glossaryHeader}>
      <Text style={styles.glossaryTerm}>{term.term}</Text>
      <View style={[styles.categoryBadge, { backgroundColor: `${colors.accent}15` }]}>
        <Text style={styles.categoryText}>{term.category}</Text>
      </View>
    </View>
    <Text style={styles.glossaryDefinition}>{term.definition}</Text>
  </View>
);

// ============================================================================
// VISA BULLETIN ROW COMPONENT
// ============================================================================

interface VisaBulletinRowProps {
  data: VisaBulletinData;
  tx: ResourcesTranslate;
}

const VisaBulletinRow: React.FC<VisaBulletinRowProps> = ({ data, tx }) => {
  const getMovementColor = () => {
    switch (data.movement) {
      case 'forward': return colors.success;
      case 'retrogressed': return colors.error;
      case 'current': return colors.accent;
      default: return colors.text.secondary;
    }
  };

  const getMovementLabel = () => {
    switch (data.movement) {
      case 'forward': return tx('visaBulletin.movement.forward', '↑ Avanzo');
      case 'retrogressed': return tx('visaBulletin.movement.retrogressed', '↓ Retrocedio');
      case 'current': return tx('visaBulletin.movement.current', '● Actual');
      default: return '';
    }
  };

  return (
    <View style={styles.bulletinRow}>
      <View style={styles.bulletinCategory}>
        <Text style={styles.bulletinCategoryText}>{data.category}</Text>
        <Text style={styles.bulletinAreaText}>{data.chargeabilityArea}</Text>
      </View>
      <View style={styles.bulletinDate}>
        <Text style={styles.bulletinDateText}>{data.currentDate}</Text>
        <Text style={[styles.bulletinMovement, { color: getMovementColor() }]}>
          {getMovementLabel()}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// PROCESSING TIME CALCULATOR COMPONENT
// ============================================================================

interface ProcessingTimeCalculatorProps {
  processingTimes: ProcessingTime[];
  tx: ResourcesTranslate;
}

const ProcessingTimeCalculator: React.FC<ProcessingTimeCalculatorProps> = ({ processingTimes, tx }) => {
  const [selectedForm, setSelectedForm] = useState<string>('I-485');
  const [selectedCenter, setSelectedCenter] = useState<string>('Nebraska');

  const formatCenterLabel = useCallback(
    (center: string) => {
      if (center === 'Field Office') {
        return tx('calculator.centers.fieldOffice', 'Field Office');
      }

      return center;
    },
    [tx],
  );

  const formTypes = useMemo(() => 
    [...new Set(processingTimes.map(pt => pt.formType))],
    [processingTimes]
  );

  const availableCenters = useMemo(() => 
    [...new Set(processingTimes.filter(pt => pt.formType === selectedForm).map(pt => pt.serviceCenter))],
    [processingTimes, selectedForm]
  );

  const estimatedTime = useMemo(() => 
    processingTimes.find(pt => pt.formType === selectedForm && pt.serviceCenter === selectedCenter),
    [processingTimes, selectedForm, selectedCenter]
  );

  return (
    <View style={styles.calculatorContainer}>
      <Text style={styles.calculatorLabel}>{tx('calculator.formTypeLabel', 'Tipo de formulario')}</Text>
      <View style={styles.optionsRow}>
        {formTypes.map(form => (
          <TouchableOpacity
            key={form}
            style={[styles.optionButton, selectedForm === form && styles.optionButtonActive]}
            onPress={() => {
              setSelectedForm(form);
              const newCenters = [...new Set(processingTimes.filter(pt => pt.formType === form).map(pt => pt.serviceCenter))];
              if (!newCenters.includes(selectedCenter)) {
                setSelectedCenter(newCenters[0] || '');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, selectedForm === form && styles.optionTextActive]}>
              {form}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.calculatorLabel}>{tx('calculator.serviceCenterLabel', 'Centro de servicio')}</Text>
      <View style={styles.optionsRow}>
        {availableCenters.map(center => (
          <TouchableOpacity
            key={center}
            style={[styles.optionButton, selectedCenter === center && styles.optionButtonActive]}
            onPress={() => setSelectedCenter(center)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, selectedCenter === center && styles.optionTextActive]}>
              {formatCenterLabel(center)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {estimatedTime && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{tx('calculator.resultLabel', 'Tiempo estimado de procesamiento')}</Text>
          <Text style={styles.resultValue}>
            {tx('calculator.weeks', '{{count}} semanas', { count: estimatedTime.estimatedWeeks })}
          </Text>
          <Text style={styles.resultNote}>
            {tx('calculator.monthsApprox', 'Aproximadamente {{count}} meses', {
              count: Math.round(estimatedTime.estimatedWeeks / 4.3),
            })}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// MAIN RESOURCES SCREEN COMPONENT
// ============================================================================

export const ResourcesScreen: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const { t: profileT } = useViewTranslation('profile');
  const { t: resourcesT, i18n: resourcesI18n } = useViewTranslation('resources');
  const profileTx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    profileT(key, { defaultValue, ...(options ?? {}) });
  const resourcesTx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    resourcesT(key, { defaultValue, ...(options ?? {}) });
  const { currentUser, userName } = useAuth();

  const sampleAttorneys = useMemo(
    () => buildSampleAttorneys(resourcesTx),
    [resourcesI18n.resolvedLanguage],
  );
  const sampleGlossary = useMemo(
    () => buildSampleGlossary(resourcesTx),
    [resourcesI18n.resolvedLanguage],
  );
  const sampleVisaBulletin = useMemo(
    () => buildSampleVisaBulletin(resourcesTx),
    [resourcesI18n.resolvedLanguage],
  );

  const profileName =
    currentUser?.name?.trim() ||
    userName?.trim() ||
    profileTx('user.fallback', 'Usuario');
  const profileInitial = profileName.charAt(0).toUpperCase();

  const handleToggleSection = useCallback((section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  }, []);

  const handleOpenProfile = useCallback(() => {
    setIsProfileVisible(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setIsProfileVisible(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const filteredGlossary = useMemo(() => {
    if (!glossarySearch.trim()) return sampleGlossary;
    const searchLower = glossarySearch.toLowerCase();
    return sampleGlossary.filter(
      term => 
        term.term.toLowerCase().includes(searchLower) ||
        term.definition.toLowerCase().includes(searchLower) ||
        term.category.toLowerCase().includes(searchLower)
    );
  }, [glossarySearch, sampleGlossary]);

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{resourcesTx('header.title', 'Recursos')}</Text>
            <Text style={styles.headerSubtitle}>
              {resourcesTx('header.subtitle', 'Informacion y herramientas utiles')}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={profileTx(
              'resourcesEntry.accessibilityLabel',
              'Abrir perfil de {{name}}',
              { name: profileName },
            )}
            accessibilityRole="button"
            activeOpacity={0.85}
            onPress={handleOpenProfile}
            style={styles.profileButton}
          >
            <GlassCard blurIntensity={18} opacity={0.68} style={styles.profileButtonCard}>
              <View style={styles.profileButtonContent}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{profileInitial}</Text>
                </View>
                <Text style={styles.profileButtonLabel}>
                  {profileTx('resourcesEntry.buttonLabel', 'Perfil')}
                </Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={RESOURCES_ACCENT}
            />
          }
        >
          {/* Attorneys Section */}
          <ExpandableSection
            title={resourcesTx('section.attorneys.title', 'Abogados')}
            icon={<BriefcaseIcon color={colors.pro} />}
            iconColor={colors.pro}
            expanded={expandedSection === 'attorneys'}
            onToggle={() => handleToggleSection('attorneys')}
          >
            <Text style={styles.sectionDescription}>
              {resourcesTx(
                'section.attorneys.description',
                'Abogados de inmigracion recomendados por la comunidad',
              )}
            </Text>
            {sampleAttorneys.map(attorney => (
              <AttorneyCard key={attorney.id} attorney={attorney} tx={resourcesTx} />
            ))}
          </ExpandableSection>

          {/* Calculator Section */}
          <ExpandableSection
            title={resourcesTx('section.calculator.title', 'Calculadora')}
            icon={<CalculatorIcon color={colors.accent} />}
            iconColor={colors.accent}
            expanded={expandedSection === 'calculator'}
            onToggle={() => handleToggleSection('calculator')}
          >
            <Text style={styles.sectionDescription}>
              {resourcesTx(
                'section.calculator.description',
                'Estima el tiempo de procesamiento de tu caso',
              )}
            </Text>
            <ProcessingTimeCalculator processingTimes={SAMPLE_PROCESSING_TIMES} tx={resourcesTx} />
          </ExpandableSection>

          {/* Glossary Section */}
          <ExpandableSection
            title={resourcesTx('section.glossary.title', 'Glosario')}
            icon={<BookIcon color={colors.success} />}
            iconColor={colors.success}
            expanded={expandedSection === 'glossary'}
            onToggle={() => handleToggleSection('glossary')}
          >
            <Text style={styles.sectionDescription}>
              {resourcesTx('section.glossary.description', 'Terminos comunes de inmigracion')}
            </Text>
            <View style={styles.searchContainer}>
              <SearchIcon />
              <TextInput
                style={styles.searchInput}
                placeholder={resourcesTx('section.glossary.searchPlaceholder', 'Buscar termino...')}
                placeholderTextColor={colors.text.tertiary}
                value={glossarySearch}
                onChangeText={setGlossarySearch}
              />
            </View>
            {filteredGlossary.length === 0 ? (
              <Text style={styles.noResultsText}>
                {resourcesTx('section.glossary.empty', 'No se encontraron terminos')}
              </Text>
            ) : (
              filteredGlossary.map(term => (
                <GlossaryItem key={term.id} term={term} />
              ))
            )}
          </ExpandableSection>

          {/* Visa Bulletin Section */}
          <ExpandableSection
            title={resourcesTx('section.visaBulletin.title', 'Visa Bulletin')}
            icon={<CalendarIcon color={colors.caseAccent.daca} />}
            iconColor={colors.caseAccent.daca}
            expanded={expandedSection === 'bulletin'}
            onToggle={() => handleToggleSection('bulletin')}
          >
            <Text style={styles.sectionDescription}>
              {resourcesTx(
                'section.visaBulletin.description',
                'Fechas de prioridad actuales del Boletin de Visas',
              )}
            </Text>
            <View style={styles.bulletinHeader}>
              <Text style={styles.bulletinHeaderText}>
                {resourcesTx('section.visaBulletin.headerCategory', 'Categoria')}
              </Text>
              <Text style={styles.bulletinHeaderText}>
                {resourcesTx('section.visaBulletin.headerDate', 'Fecha actual')}
              </Text>
            </View>
            {sampleVisaBulletin.map((data, index) => (
              <VisaBulletinRow
                key={`${data.category}-${data.chargeabilityArea}-${index}`}
                data={data}
                tx={resourcesTx}
              />
            ))}
            <Text style={styles.bulletinNote}>
              {resourcesTx(
                'section.visaBulletin.note',
                '* Datos actualizados mensualmente por el Departamento de Estado',
              )}
            </Text>
          </ExpandableSection>
        </ScrollView>

        <PlatformBottomSheet
          visible={isProfileVisible}
          onClose={handleCloseProfile}
          heightPercent={0.88}
        >
          <ProfileSheet embedded onClose={handleCloseProfile} />
        </PlatformBottomSheet>
      </SafeAreaView>
    </AnimatedBackground>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
  },
  profileButton: {
    marginLeft: spacing.md,
  },
  profileButtonCard: {
    borderRadius: borderRadius.full,
  },
  profileButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RESOURCES_ACCENT,
  },
  profileAvatarText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
  },
  profileButtonLabel: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Scroll view styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },

  // Section card styles
  sectionCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  sectionContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderTopColor: createGlassBorder(0.08),
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  // Attorney card styles
  attorneyCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.large,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: createGlassBorder(0.08),
  },
  attorneyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attorneyInfo: {
    flex: 1,
  },
  attorneyName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  attorneyFirm: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  attorneySpecialty: {
    fontSize: typography.fontSize.sm,
    color: colors.accent,
    marginTop: 4,
  },
  attorneyLocation: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  ratingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warning,
    marginLeft: 4,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: createColoredGlassBackground(colors.accent, 0.14),
  },
  contactButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.accent,
  },

  // Calculator styles
  calculatorContainer: {
    marginTop: spacing.sm,
  },
  calculatorLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: createGlassBorder(0.08),
  },
  optionButtonActive: {
    backgroundColor: createColoredGlassBackground(colors.accent, 0.12),
    borderColor: createColoredGlassBackground(colors.accent, 0.22),
  },
  optionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  optionTextActive: {
    color: colors.accent,
    fontFamily: typography.fontFamily.semibold,
  },
  resultCard: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.large,
    padding: spacing.base,
    marginTop: spacing.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: createColoredGlassBackground(colors.success, 0.18),
  },
  resultLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  resultValue: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.success,
  },
  resultNote: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Glossary styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: createGlassBorder(0.08),
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  glossaryItem: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: createGlassBorder(0.08),
  },
  glossaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  glossaryTerm: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontFamily: typography.fontFamily.medium,
  },
  glossaryDefinition: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  noResultsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  // Visa Bulletin styles
  bulletinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: createGlassBorder(0.08),
    marginBottom: spacing.sm,
  },
  bulletinHeaderText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  bulletinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: createGlassBorder(0.08),
  },
  bulletinCategory: {
    flex: 1,
  },
  bulletinCategoryText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  bulletinAreaText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  bulletinDate: {
    alignItems: 'flex-end',
  },
  bulletinDateText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  bulletinMovement: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  bulletinNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default ResourcesScreen;
