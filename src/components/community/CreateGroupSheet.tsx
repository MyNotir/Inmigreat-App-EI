import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { PlatformBottomSheet } from '../common/PlatformBottomSheet';
import { useViewTranslation } from '../../i18n';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import type { Group } from '../../types/community';
import type { CreateGroupRequest } from '../../services/community';

type GroupPreset = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  tags: string[];
  suggestedDescription: string;
};

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

const PERIOD_OPTIONS = ['mes', 'año'] as const;

function buildFreePresets(tx: CommunityTranslate): GroupPreset[] {
  return [
    {
      id: 'support-circle',
      title: tx('createGroup.presets.supportCircle.title', 'Grupo de apoyo'),
      subtitle: tx('createGroup.presets.supportCircle.subtitle', 'Para compartir experiencias y resolver dudas del dia a dia.'),
      icon: 'family',
      iconColor: colors.success,
      backgroundColor: `${colors.success}18`,
      tags: [
        tx('createGroup.presets.supportCircle.tags.tag1', 'Apoyo'),
        tx('createGroup.presets.supportCircle.tags.tag2', 'Comunidad'),
        tx('createGroup.presets.supportCircle.tags.tag3', 'Guia'),
      ],
      suggestedDescription: tx(
        'createGroup.presets.supportCircle.suggestedDescription',
        'Un espacio para acompanarse, hacer preguntas y compartir informacion util entre personas que estan viviendo situaciones similares.',
      ),
    },
    {
      id: 'daca-help',
      title: tx('createGroup.presets.dacaHelp.title', 'DACA y permisos'),
      subtitle: tx('createGroup.presets.dacaHelp.subtitle', 'Novedades, orientacion y experiencias reales.'),
      icon: 'daca',
      iconColor: colors.caseAccent.daca,
      backgroundColor: `${colors.caseAccent.daca}18`,
      tags: [
        tx('createGroup.presets.dacaHelp.tags.tag1', 'DACA'),
        tx('createGroup.presets.dacaHelp.tags.tag2', 'Permisos'),
        tx('createGroup.presets.dacaHelp.tags.tag3', 'Legal'),
      ],
      suggestedDescription: tx(
        'createGroup.presets.dacaHelp.suggestedDescription',
        'Aqui puedes reunir a personas interesadas en DACA y permisos para compartir novedades, pasos del proceso y recomendaciones utiles.',
      ),
    },
    {
      id: 'citizenship-class',
      title: tx('createGroup.presets.citizenshipClass.title', 'Ciudadania paso a paso'),
      subtitle: tx('createGroup.presets.citizenshipClass.subtitle', 'Estudio, preguntas y acompanamiento en comunidad.'),
      icon: 'class',
      iconColor: colors.caseAccent.citizenship,
      backgroundColor: `${colors.caseAccent.citizenship}18`,
      tags: [
        tx('createGroup.presets.citizenshipClass.tags.tag1', 'Ciudadania'),
        tx('createGroup.presets.citizenshipClass.tags.tag2', 'N-400'),
        tx('createGroup.presets.citizenshipClass.tags.tag3', 'Estudio'),
      ],
      suggestedDescription: tx(
        'createGroup.presets.citizenshipClass.suggestedDescription',
        'Grupo pensado para prepararse para la ciudadania, estudiar en comunidad y resolver dudas durante el proceso.',
      ),
    },
  ];
}

function buildProPresets(tx: CommunityTranslate): GroupPreset[] {
  return [
    {
      id: 'masterclass-pro',
      title: tx('createGroup.presets.masterclassPro.title', 'Clases privadas Pro'),
      subtitle: tx('createGroup.presets.masterclassPro.subtitle', 'Sesiones exclusivas, materiales y comunidad cerrada.'),
      icon: 'masterclass',
      iconColor: colors.pro,
      backgroundColor: `${colors.pro}18`,
      tags: [
        tx('createGroup.presets.masterclassPro.tags.tag1', 'Pro'),
        tx('createGroup.presets.masterclassPro.tags.tag2', 'Masterclass'),
        tx('createGroup.presets.masterclassPro.tags.tag3', 'Expertos'),
      ],
      suggestedDescription: tx(
        'createGroup.presets.masterclassPro.suggestedDescription',
        'Ideal para ofrecer clases privadas, sesiones en vivo y recursos exclusivos para personas con acceso Pro.',
      ),
    },
    {
      id: 'green-card-lab',
      title: tx('createGroup.presets.greenCardLab.title', 'Camino a la residencia'),
      subtitle: tx('createGroup.presets.greenCardLab.subtitle', 'Acompanamiento cercano, materiales y seguimiento privado.'),
      icon: 'usa',
      iconColor: colors.caseAccent.greenCard,
      backgroundColor: `${colors.caseAccent.greenCard}18`,
      tags: [
        tx('createGroup.presets.greenCardLab.tags.tag1', 'Pro'),
        tx('createGroup.presets.greenCardLab.tags.tag2', 'Residencia'),
        tx('createGroup.presets.greenCardLab.tags.tag3', 'Estrategia'),
      ],
      suggestedDescription: tx(
        'createGroup.presets.greenCardLab.suggestedDescription',
        'Espacio privado para acompanar procesos de residencia con guias, sesiones y contenido especial para miembros Pro.',
      ),
    },
  ];
}

function getPresetsForType(type: Group['type'], tx: CommunityTranslate) {
  return type === 'paid' ? buildProPresets(tx) : buildFreePresets(tx);
}

function getDefaultPreset(type: Group['type'], tx: CommunityTranslate): GroupPreset {
  return getPresetsForType(type, tx)[0];
}

function translateCreateGroupPeriod(period: (typeof PERIOD_OPTIONS)[number], tx: CommunityTranslate): string {
  return period === 'mes'
    ? tx('createGroup.periods.month', 'mes')
    : tx('createGroup.periods.year', 'ano');
}

export interface CreateGroupSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGroupRequest) => void;
  initialType?: Group['type'];
  isSubmitting?: boolean;
}

export const CreateGroupSheet: React.FC<CreateGroupSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialType = 'free',
  isSubmitting = false,
}) => {
  const { t } = useViewTranslation('community');
  const tx = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(key, { defaultValue, ...(options ?? {}) }),
    [t],
  );
  const [groupType, setGroupType] = useState<Group['type']>(initialType);
  const [selectedPresetId, setSelectedPresetId] = useState(getDefaultPreset(initialType, tx).id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [priceText, setPriceText] = useState('20');
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>('mes');

  useEffect(() => {
    if (!visible) {
      return;
    }

    const preset = getDefaultPreset(initialType, tx);
    setGroupType(initialType);
    setSelectedPresetId(preset.id);
    setName('');
    setDescription('');
    setTagsRaw(preset.tags.join(', '));
    setPriceText('20');
    setPeriod('mes');
  }, [initialType, tx, visible]);

  const presets = useMemo(() => getPresetsForType(groupType, tx), [groupType, tx]);
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? presets[0],
    [presets, selectedPresetId],
  );

  useEffect(() => {
    if (!presets.some((preset) => preset.id === selectedPresetId)) {
      setSelectedPresetId(presets[0].id);
    }
  }, [presets, selectedPresetId]);

  // Sync tags input when preset changes
  useEffect(() => {
    setTagsRaw(selectedPreset.tags.join(', '));
  }, [selectedPreset]);

  const parsedPrice = Number.parseFloat(priceText.replace(',', '.'));
  const isPriceValid = groupType === 'free' || (Number.isFinite(parsedPrice) && parsedPrice > 0);
  const isFormValid = name.trim().length >= 3 && description.trim().length >= 12 && isPriceValid;

  const handleSubmit = () => {
    if (!isFormValid || isSubmitting) {
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      type: groupType,
      price: groupType === 'paid' ? parsedPrice : undefined,
      period: groupType === 'paid' ? period : undefined,
      icon: selectedPreset.icon,
      iconColor: selectedPreset.iconColor,
      backgroundColor: selectedPreset.backgroundColor,
      tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <PlatformBottomSheet
      visible={visible}
      onClose={onClose}
      title={tx('createGroup.title', 'Crea tu grupo')}
      heightPercent={0.92}
      dismissOnDrag={Platform.OS === 'ios' && !isSubmitting}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{tx('createGroup.hero.eyebrow', 'Nuevo grupo')}</Text>
            <Text style={styles.title}>{tx('createGroup.hero.title', 'Crea un espacio para tu comunidad')}</Text>
            <Text style={styles.descriptionText}>
              {tx(
                'createGroup.hero.description',
                'Elige si quieres un grupo gratis o un grupo Pro. Despues podras compartir informacion, reunir personas alrededor de un tema y ofrecer un espacio claro para unirse.',
              )}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>{tx('createGroup.sections.type', 'Tipo de grupo')}</Text>
          <View style={styles.typeGrid}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.typeCard, groupType === 'free' && styles.typeCardActive]}
              onPress={() => setGroupType('free')}
            >
              <Text style={styles.typeCardBadge}>{tx('createGroup.typeCards.free.badge', 'Gratis')}</Text>
              <Text style={styles.typeCardTitle}>{tx('createGroup.typeCards.free.title', 'Abierto y facil para unirse')}</Text>
              <Text style={styles.typeCardDescription}>
                {tx(
                  'createGroup.typeCards.free.description',
                  'Ideal para resolver dudas, compartir recursos y conectar personas con intereses similares.',
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.typeCard, groupType === 'paid' && styles.typeCardActive, styles.typeCardPro]}
              onPress={() => setGroupType('paid')}
            >
              <Text style={[styles.typeCardBadge, styles.typeCardBadgePro]}>{tx('createGroup.typeCards.pro.badge', 'Pro')}</Text>
              <Text style={styles.typeCardTitle}>{tx('createGroup.typeCards.pro.title', 'Privado con acceso Pro')}</Text>
              <Text style={styles.typeCardDescription}>
                {tx(
                  'createGroup.typeCards.pro.description',
                  'Pensado para clases, programas y contenido exclusivo para miembros con acceso Pro.',
                )}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{tx('createGroup.sections.style', 'Estilo del grupo')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetList}>
            {presets.map((preset) => {
              const isSelected = preset.id === selectedPreset.id;

              return (
                <TouchableOpacity
                  key={preset.id}
                  activeOpacity={0.85}
                  style={[
                    styles.presetCard,
                    { borderColor: isSelected ? preset.iconColor : colors.border.light },
                  ]}
                  onPress={() => setSelectedPresetId(preset.id)}
                >
                  <View style={[styles.presetIconBubble, { backgroundColor: preset.backgroundColor }]}> 
                    <Text style={[styles.presetIconText, { color: preset.iconColor }]}>●</Text>
                  </View>
                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetSubtitle}>{preset.subtitle}</Text>
                  <View style={styles.presetTagsRow}>
                    {preset.tags.slice(0, 2).map((tag) => (
                      <View key={tag} style={styles.presetTag}>
                        <Text style={styles.presetTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>{tx('createGroup.sections.mainData', 'Datos principales')}</Text>
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>{tx('createGroup.fields.name', 'Nombre del grupo')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={groupType === 'paid'
                ? tx('createGroup.fields.namePlaceholderPro', 'Ej. Clases privadas de ciudadania')
                : tx('createGroup.fields.namePlaceholderFree', 'Ej. Red de apoyo para familias inmigrantes')}
              placeholderTextColor={colors.warm.inkFaint}
              style={styles.input}
              maxLength={80}
            />

            <Text style={styles.inputLabel}>{tx('createGroup.fields.description', 'Descripcion')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={selectedPreset.suggestedDescription}
              placeholderTextColor={colors.warm.inkFaint}
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
              maxLength={280}
            />

            {groupType === 'paid' && (
              <>
                <Text style={styles.inputLabel}>{tx('createGroup.fields.price', 'Precio')}</Text>
                <View style={styles.priceRow}>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.pricePrefix}>$</Text>
                    <TextInput
                      value={priceText}
                      onChangeText={setPriceText}
                      placeholder="20"
                      placeholderTextColor={colors.warm.inkFaint}
                      keyboardType="decimal-pad"
                      style={styles.priceInput}
                    />
                  </View>
                  <View style={styles.periodSwitch}>
                    {PERIOD_OPTIONS.map((option) => {
                      const selected = option === period;

                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.periodOption, selected && styles.periodOptionActive]}
                          onPress={() => setPeriod(option)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.periodOptionText, selected && styles.periodOptionTextActive]}>
                            /{translateCreateGroupPeriod(option, tx)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <Text style={styles.helpText}>
                  {tx(
                    'createGroup.fields.priceHelp',
                    'Los miembros veran este precio cuando el grupo aparezca con el CTA Unirse Pro.',
                  )}
                </Text>
              </>
            )}

            <Text style={styles.inputLabel}>
              {tx('createGroup.fields.tags', 'Etiquetas')} <Text style={styles.inputLabelHint}>{tx('createGroup.fields.tagsHint', '(separadas por coma)')}</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={tagsRaw}
              onChangeText={setTagsRaw}
              placeholder={tx('createGroup.fields.tagsPlaceholder', 'ej. DACA, Legal, Comunidad')}
              placeholderTextColor={colors.warm.inkSoft}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{tx('createGroup.info.title', 'Que pasara cuando lo publiques')}</Text>
            <Text style={styles.infoLine}>{tx('createGroup.info.line1', '1. Tu administraras el grupo y podras organizar la conversacion.')}</Text>
            <Text style={styles.infoLine}>{tx('createGroup.info.line2', '2. Si es gratis, las personas podran unirse directamente desde Comunidad.')}</Text>
            <Text style={styles.infoLine}>{tx('createGroup.info.line3', '3. Si es Pro, solo podran entrar quienes tengan acceso Pro.')}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose} disabled={isSubmitting} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>{tx('createGroup.buttons.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, (!isFormValid || isSubmitting) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting
                ? tx('createGroup.buttons.creating', 'Creando...')
                : groupType === 'paid'
                  ? tx('createGroup.buttons.createPro', 'Crear grupo Pro')
                  : tx('createGroup.buttons.createFree', 'Crear grupo gratis')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </PlatformBottomSheet>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    backgroundColor: `${colors.accent}10`,
    borderRadius: borderRadius.large,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
  },
  typeGrid: {
    marginBottom: spacing.lg,
  },
  typeCard: {
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.large,
    padding: spacing.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.warm.sand,
  },
  typeCardActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}10`,
  },
  typeCardPro: {
    backgroundColor: `${colors.pro}08`,
  },
  typeCardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent}16`,
    color: colors.accent,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.sm,
  },
  typeCardBadgePro: {
    backgroundColor: `${colors.pro}16`,
    color: colors.pro,
  },
  typeCardTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
  },
  typeCardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  presetList: {
    paddingBottom: spacing.sm,
  },
  presetCard: {
    width: 220,
    borderWidth: 1,
    borderRadius: borderRadius.large,
    padding: spacing.base,
    marginRight: spacing.sm,
    backgroundColor: colors.warm.sand,
  },
  presetIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  presetIconText: {
    fontSize: 18,
    lineHeight: 18,
  },
  presetTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
  },
  presetSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  presetTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  presetTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warm.cream,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  presetTagText: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkSoft,
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.large,
    padding: spacing.base,
    marginBottom: spacing.lg,
    backgroundColor: colors.warm.sand,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.warm.ink,
    backgroundColor: colors.warm.cream,
  },
  textArea: {
    minHeight: 108,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warm.cream,
    marginRight: spacing.sm,
  },
  pricePrefix: {
    fontSize: typography.fontSize.base,
    color: colors.warm.inkSoft,
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.warm.ink,
  },
  periodSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  periodOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.warm.cream,
  },
  periodOptionActive: {
    backgroundColor: colors.accent,
  },
  periodOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.medium,
  },
  periodOptionTextActive: {
    color: colors.warm.cream,
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkSoft,
    marginTop: spacing.xs,
  },
  inputLabelHint: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.normal,
  },
  infoCard: {
    borderRadius: borderRadius.large,
    backgroundColor: `${colors.pro}10`,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
  },
  infoLine: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.warm,
    backgroundColor: colors.warm.sand,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.warmStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.warm.ink,
    fontFamily: typography.fontFamily.medium,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.warm.cream,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default CreateGroupSheet;