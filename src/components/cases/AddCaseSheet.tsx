import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ApiException } from '../../services/api';
import type { AddCaseInput, AddCaseSource } from '../../services/cases';
import { getEoirNationalities, type EoirNationality } from '../../services/eoir';
import { EOIR_NATIONALITIES_FALLBACK } from '../../services/eoir-nationalities-fallback';
import { useViewTranslation } from '../../i18n';
import { PlatformBottomSheet } from '../common/PlatformBottomSheet';
import { GlassCard } from '../common/GlassCard';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export interface AddCaseSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: AddCaseInput) => Promise<void>;
  initialInput?: AddCaseInput | null;
  externalError?: string | null;
  onExternalErrorChange?: (error: string | null) => void;
}

const RECEIPT_PATTERN = /^[A-Z]{3}\d{7,13}$/;
const MAX_RECEIPT_LENGTH = 16;
const MIN_ALIEN_LENGTH = 8;
const MAX_ALIEN_LENGTH = 9;
const MAX_NATIONALITY_CODE_LENGTH = 3;
const DEFAULT_EOIR_NATIONALITY_CODE = 'CU';

function normalizeReceiptNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_RECEIPT_LENGTH);
}

function normalizeAlienNumber(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, MAX_ALIEN_LENGTH);
}

function normalizeNationalityCode(value: string): string {
  return value.trim();
}

export const AddCaseSheet: React.FC<AddCaseSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialInput,
  externalError,
  onExternalErrorChange,
}) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [caseSource, setCaseSource] = useState<AddCaseSource>('uscis');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [alienNumber, setAlienNumber] = useState('');
  const [nationalityCode, setNationalityCode] = useState(DEFAULT_EOIR_NATIONALITY_CODE);
  const [nationalityQuery, setNationalityQuery] = useState('');
  const [isNationalitySelectorOpen, setIsNationalitySelectorOpen] = useState(false);
  const [nationalities, setNationalities] = useState<EoirNationality[]>([]);
  const [alias, setAlias] = useState('');
  const [hasLawyer, setHasLawyer] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [alienNumberError, setAlienNumberError] = useState<string | null>(null);
  const [nationalityCodeError, setNationalityCodeError] = useState<string | null>(null);
  const [nationalityLoadError, setNationalityLoadError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNationalities, setIsLoadingNationalities] = useState(false);

  const caseSourceOptions = useMemo<Array<{
    id: AddCaseSource;
    label: string;
    description: string;
  }>>(
    () => [
      {
        id: 'uscis',
        label: 'USCIS',
        description: tx('addCase.sources.uscis.description', 'Receipt number y alta inmediata.'),
      },
      {
        id: 'eoir',
        label: 'EOIR',
        description: tx('addCase.sources.eoir.description', 'Alien Number, nacionalidad y contexto base.'),
      },
    ],
    [tx],
  );

  useEffect(() => {
    if (visible) {
      if (initialInput?.kind === 'eoir') {
        setCaseSource('eoir');
        setReceiptNumber('');
        setAlienNumber(initialInput.alienNumber);
        setNationalityCode(initialInput.nationalityCode);
        setAlias(initialInput.alias ?? '');
        setHasLawyer(initialInput.hasLawyer);
      } else {
        setCaseSource('uscis');
        setReceiptNumber(initialInput?.kind === 'uscis' ? initialInput.receiptNumber : '');
        setAlienNumber('');
        setNationalityCode(DEFAULT_EOIR_NATIONALITY_CODE);
        setAlias(initialInput?.kind === 'uscis' ? initialInput.alias ?? '' : '');
        setHasLawyer(false);
      }

      setNationalityQuery('');
      setIsNationalitySelectorOpen(false);
      setReceiptError(null);
      setAlienNumberError(null);
      setNationalityCodeError(null);
      setNationalityLoadError(null);
      setGeneralError(null);
      setIsSubmitting(false);
      setIsLoadingNationalities(false);
      return;
    }

    setCaseSource('uscis');
    setReceiptNumber('');
    setAlienNumber('');
    setNationalityCode(DEFAULT_EOIR_NATIONALITY_CODE);
    setNationalityQuery('');
    setIsNationalitySelectorOpen(false);
    setAlias('');
    setHasLawyer(false);
    setReceiptError(null);
    setAlienNumberError(null);
    setNationalityCodeError(null);
    setNationalityLoadError(null);
    setGeneralError(null);
    setIsSubmitting(false);
    setIsLoadingNationalities(false);
  }, [initialInput, visible]);

  const clearAllErrors = () => {
    if (generalError) {
      setGeneralError(null);
    }

    if (externalError) {
      onExternalErrorChange?.(null);
    }
  };

  useEffect(() => {
    if (
      !visible ||
      caseSource !== 'eoir' ||
      nationalities.length > 0 ||
      nationalityLoadError !== null
    ) {
      return;
    }

    let cancelled = false;

    setIsLoadingNationalities(true);
    setNationalityLoadError(null);

    void getEoirNationalities()
      .then((items) => {
        if (cancelled) {
          return;
        }

        setNationalities(items);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setNationalityLoadError(
          tx(
            'addCase.errors.catalogLoad',
            'No pudimos actualizar el catalogo oficial EOIR. Seguimos mostrando la version disponible.',
          ),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingNationalities(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [caseSource, nationalities.length, nationalityLoadError, tx, visible]);

  const nationalityCatalog = nationalities.length
    ? nationalities
    : EOIR_NATIONALITIES_FALLBACK;

  const selectedNationality = useMemo(
    () => nationalityCatalog.find((nationality) => nationality.code === nationalityCode) ?? null,
    [nationalityCatalog, nationalityCode],
  );

  const filteredNationalities = useMemo(() => {
    if (!nationalityCatalog.length) {
      return [];
    }

    const query = nationalityQuery.trim().toLowerCase();
    const source = query
      ? nationalityCatalog.filter(
          (nationality) =>
            nationality.label.toLowerCase().includes(query) ||
            nationality.code.toLowerCase().includes(query),
        )
      : nationalityCatalog;

    return source.slice(0, 8);
  }, [nationalityCatalog, nationalityQuery]);

  const validateReceiptNumber = (value: string): boolean => {
    if (!value) {
      setReceiptError(tx('addCase.errors.receiptRequired', 'Ingresa tu numero de recibo USCIS.'));
      return false;
    }

    if (!RECEIPT_PATTERN.test(value)) {
      setReceiptError(tx('addCase.errors.receiptFormat', 'Usa un formato valido, por ejemplo MSC2590039073.'));
      return false;
    }

    setReceiptError(null);
    return true;
  };

  const validateAlienNumber = (value: string): boolean => {
    if (!value) {
      setAlienNumberError(tx('addCase.errors.alienRequired', 'Ingresa tu Alien Number.'));
      return false;
    }

    if (value.length < MIN_ALIEN_LENGTH) {
      setAlienNumberError(tx('addCase.errors.alienFormat', 'Usa un Alien Number valido de 8 o 9 digitos.'));
      return false;
    }

    setAlienNumberError(null);
    return true;
  };

  const validateNationalityCode = (value: string): boolean => {
    if (!value) {
      setNationalityCodeError(tx('addCase.errors.nationalityRequired', 'Ingresa el codigo de nacionalidad EOIR.'));
      return false;
    }

    setNationalityCodeError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (caseSource === 'eoir') {
      const normalizedAlien = normalizeAlienNumber(alienNumber);
      const normalizedNationality = selectedNationality?.code ?? normalizeNationalityCode(nationalityCode);
      const isAlienValid = validateAlienNumber(normalizedAlien);
      const isNationalityValid = validateNationalityCode(normalizedNationality);

      if (!isAlienValid || !isNationalityValid) {
        return;
      }

      setIsSubmitting(true);
      setGeneralError(null);

      try {
        await onSubmit({
          kind: 'eoir',
          alienNumber: normalizedAlien,
          alias: alias.trim() || undefined,
          nationalityCode: normalizedNationality,
          nationalityLabel: selectedNationality?.label,
          hasLawyer,
        });
      } catch (error) {
        if (error instanceof ApiException) {
          setGeneralError(error.message);
        } else {
          setGeneralError(tx('addCase.errors.addCourtCase', 'No pudimos agregar el caso de corte. Intenta de nuevo.'));
        }
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const normalizedReceipt = normalizeReceiptNumber(receiptNumber);

    if (!validateReceiptNumber(normalizedReceipt)) {
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      await onSubmit({
        kind: 'uscis',
        receiptNumber: normalizedReceipt,
        alias: alias.trim() || undefined,
      });
    } catch (error) {
      if (error instanceof ApiException) {
        const receiptDetail = error.details?.receiptNumber?.[0];
        if (receiptDetail) {
          setReceiptError(receiptDetail);
        }
        setGeneralError(error.message);
      } else {
        setGeneralError(tx('addCase.errors.addCase', 'No pudimos agregar el caso. Intenta de nuevo.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    (caseSource === 'uscis'
      ? normalizeReceiptNumber(receiptNumber).length === 0
      : normalizeAlienNumber(alienNumber).length === 0 ||
        (selectedNationality?.code ?? normalizeNationalityCode(nationalityCode)).length === 0);

  const handleNationalitySelect = (nationality: EoirNationality) => {
    setNationalityCode(nationality.code);
    setNationalityQuery('');
    setIsNationalitySelectorOpen(false);
    setNationalityCodeError(null);
    setGeneralError(null);
  };

  const heroCardContent = (
    <>
      <View style={styles.heroHeader}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>
            {caseSource === 'uscis'
              ? tx('addCase.hero.uscis.eyebrow', 'Seguimiento instantaneo')
              : tx('addCase.hero.eoir.eyebrow', 'Validacion EOIR en vivo')}
          </Text>
          <Text style={styles.heroTitle}>
            {caseSource === 'uscis'
              ? tx('addCase.hero.uscis.title', 'Solo necesitamos tu receipt number')
              : tx('addCase.hero.eoir.title', 'Validamos tu caso de corte antes de guardarlo')}
          </Text>
          <Text style={styles.heroDescription}>
            {caseSource === 'uscis'
              ? tx('addCase.hero.uscis.description', 'Inmigreat deduce el tipo de caso desde USCIS y crea el seguimiento para este usuario sin pedir datos extra.')
              : tx('addCase.hero.eoir.description', 'La app resuelve hCaptcha, consulta EOIR y envia el resultado validado al backend para la persistencia inicial.')}
          </Text>
        </View>
      </View>

      <View style={styles.heroChips}>
        {caseSource === 'uscis' ? (
          <>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>MSC</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>LIN</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>IOE</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>SRC</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{tx('addCase.hero.chips.alienNumber', 'Alien Number')}</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{tx('addCase.hero.chips.nationalityCode', 'Codigo de nacionalidad')}</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>{tx('addCase.hero.chips.hasLawyer', 'Tiene abogado')}</Text>
            </View>
          </>
        )}
      </View>
    </>
  );

  return (
    <PlatformBottomSheet
      visible={visible}
      onClose={onClose}
      title={tx('addCase.title', 'Agregar caso')}
      heightPercent={0.86}
      dismissOnBackdropPress={!isSubmitting}
      dismissOnDrag={Platform.OS === 'ios' && !isSubmitting}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.base : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sourceSelector}>
            {caseSourceOptions.map((option) => {
              const isSelected = option.id === caseSource;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.sourceOption, isSelected && styles.sourceOptionSelected]}
                  onPress={() => {
                    if (isSubmitting) {
                      return;
                    }

                    setCaseSource(option.id);
                    setReceiptError(null);
                    setAlienNumberError(null);
                    setNationalityCodeError(null);
                    setNationalityLoadError(null);
                    setNationalityQuery('');
                    setIsNationalitySelectorOpen(false);
                    clearAllErrors();
                  }}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.sourceOptionLabel, isSelected && styles.sourceOptionLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.sourceOptionDescription,
                      isSelected && styles.sourceOptionDescriptionSelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {Platform.OS === 'android' ? (
            <View style={[styles.heroCard, styles.heroCardAndroid]}>{heroCardContent}</View>
          ) : (
            <GlassCard style={styles.heroCard}>{heroCardContent}</GlassCard>
          )}

          {caseSource === 'uscis' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{tx('addCase.fields.receiptNumber.label', 'Numero de recibo')}</Text>
              <TextInput
                style={[styles.input, receiptError && styles.inputError]}
                placeholder={tx('addCase.fields.receiptNumber.placeholder', 'Ej. MSC2590039073')}
                placeholderTextColor={colors.warm.inkFaint}
                value={receiptNumber}
                onChangeText={(text) => {
                  const nextValue = normalizeReceiptNumber(text);
                  setReceiptNumber(nextValue);
                  if (receiptError) {
                    validateReceiptNumber(nextValue);
                  }
                  clearAllErrors();
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isSubmitting}
                maxLength={MAX_RECEIPT_LENGTH}
                returnKeyType="next"
                onBlur={() => validateReceiptNumber(normalizeReceiptNumber(receiptNumber))}
              />
              <Text style={styles.helperText}>
                {tx('addCase.fields.receiptNumber.helper', 'Aceptamos letras y numeros. Si pegas espacios o guiones, los limpiamos automaticamente.')}
              </Text>
              {receiptError ? <Text style={styles.errorText}>{receiptError}</Text> : null}
            </View>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{tx('addCase.fields.alienNumber.label', 'Alien Number')}</Text>
                <TextInput
                  style={[styles.input, alienNumberError && styles.inputError]}
                  placeholder={tx('addCase.fields.alienNumber.placeholder', 'Ej. 123456789')}
                  placeholderTextColor={colors.warm.inkFaint}
                  value={alienNumber}
                  onChangeText={(text) => {
                    const nextValue = normalizeAlienNumber(text);
                    setAlienNumber(nextValue);
                    if (alienNumberError) {
                      validateAlienNumber(nextValue);
                    }
                    clearAllErrors();
                  }}
                  keyboardType="number-pad"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  maxLength={MAX_ALIEN_LENGTH}
                  returnKeyType="next"
                  onBlur={() => validateAlienNumber(normalizeAlienNumber(alienNumber))}
                />
                <Text style={styles.helperText}>
                  {tx('addCase.fields.alienNumber.helper', 'Usa solo digitos. Si pegas A-123-456-789, lo limpiamos automaticamente.')}
                </Text>
                {alienNumberError ? <Text style={styles.errorText}>{alienNumberError}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{tx('addCase.fields.nationality.label', 'Nacionalidad')}</Text>

                {isLoadingNationalities ? (
                  <View style={styles.nationalityLoadingCard}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.nationalityLoadingText}>
                      {nationalities.length > 0
                        ? tx('addCase.loadingNationalities.refreshing', 'Actualizando nacionalidades EOIR...')
                        : tx('addCase.loadingNationalities.initial', 'Cargando nacionalidades EOIR...')}
                    </Text>
                  </View>
                ) : null}

                {nationalityLoadError ? <Text style={styles.errorBanner}>{nationalityLoadError}</Text> : null}

                <TouchableOpacity
                  style={[
                    styles.selectorTrigger,
                    isNationalitySelectorOpen && styles.selectorTriggerOpen,
                    nationalityCodeError && styles.inputError,
                  ]}
                  onPress={() => {
                    if (isSubmitting) {
                      return;
                    }

                    setIsNationalitySelectorOpen((current) => !current);
                    clearAllErrors();
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <View style={styles.selectorTriggerCopy}>
                    <Text
                      style={[
                        styles.selectorTriggerValue,
                        !selectedNationality && styles.selectorTriggerPlaceholder,
                      ]}
                    >
                      {selectedNationality?.label ?? tx('addCase.fields.nationality.selectPlaceholder', 'Selecciona una nacionalidad')}
                    </Text>
                  </View>
                  <Text style={styles.selectorTriggerIcon}>
                    {isNationalitySelectorOpen
                      ? tx('addCase.fields.nationality.hide', 'Ocultar')
                      : tx('addCase.fields.nationality.choose', 'Elegir')}
                  </Text>
                </TouchableOpacity>

                {isNationalitySelectorOpen ? (
                  <View style={styles.nationalitySelectorCard}>
                    <TextInput
                      style={styles.nationalitySearchInput}
                      placeholder={tx('addCase.fields.nationality.searchPlaceholder', 'Busca una nacionalidad')}
                      placeholderTextColor={colors.warm.inkFaint}
                      value={nationalityQuery}
                      onChangeText={(text) => {
                        setNationalityQuery(text);
                        clearAllErrors();
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      returnKeyType="search"
                    />

                    <Text style={styles.helperText}>
                      {nationalityQuery.trim().length > 0
                        ? tx('addCase.fields.nationality.searchCount', 'Mostrando {{count}} nacionalidad(es).', {
                            count: filteredNationalities.length,
                          })
                        : tx('addCase.fields.nationality.searchHelper', 'Empieza a escribir para filtrar el catalogo activo.')}
                    </Text>

                    {filteredNationalities.length > 0 ? (
                      <View style={styles.nationalityResultsCard}>
                        {filteredNationalities.map((nationality) => {
                          const isSelected = nationality.code === selectedNationality?.code;

                          return (
                            <TouchableOpacity
                              key={nationality.code}
                              style={[
                                styles.nationalityOption,
                                isSelected && styles.nationalityOptionSelected,
                              ]}
                              onPress={() => handleNationalitySelect(nationality)}
                              disabled={isSubmitting}
                            >
                              <Text style={styles.nationalityOptionLabel}>{nationality.label}</Text>
                              <Text
                                style={[
                                  styles.nationalityOptionStatus,
                                  isSelected && styles.nationalityOptionStatusSelected,
                                ]}
                              >
                                {isSelected
                                  ? tx('addCase.fields.nationality.selected', 'Seleccionada')
                                  : tx('addCase.fields.nationality.choose', 'Elegir')}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.helperText}>
                        {tx('addCase.fields.nationality.noResults', 'No encontramos coincidencias para esa busqueda.')}
                      </Text>
                    )}

                    {nationalityLoadError ? (
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                          setNationalities([]);
                          setNationalityLoadError(null);
                        }}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.retryButtonText}>{tx('addCase.buttons.retryCatalog', 'Reintentar catalogo oficial')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                {nationalityCodeError ? <Text style={styles.errorText}>{nationalityCodeError}</Text> : null}
              </View>
            </>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{tx('addCase.fields.alias.label', 'Alias opcional')}</Text>
            <TextInput
              style={styles.input}
              placeholder={caseSource === 'uscis'
                ? tx('addCase.fields.alias.placeholderUscis', 'Ej. Permiso de trabajo de Ana')
                : tx('addCase.fields.alias.placeholderEoir', 'Ej. Caso corte de Ana')}
              placeholderTextColor={colors.warm.inkFaint}
              value={alias}
              onChangeText={(text) => {
                setAlias(text);
                clearAllErrors();
              }}
              autoCapitalize="sentences"
              autoCorrect={false}
              editable={!isSubmitting}
              maxLength={120}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <Text style={styles.helperText}>
              {tx('addCase.fields.alias.helper', 'El alias se guarda solo para este usuario y te ayuda a identificar el caso rapido.')}
            </Text>
          </View>

          {caseSource === 'eoir' ? (
            <>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.label}>{tx('addCase.fields.hasLawyer.label', 'Tiene abogado')}</Text>
                  <Text style={styles.helperText}>
                    {tx('addCase.fields.hasLawyer.helper', 'Este dato viaja junto al payload validado que enviamos al backend en el alta inicial.')}
                  </Text>
                </View>
                <Switch
                  value={hasLawyer}
                  onValueChange={setHasLawyer}
                  disabled={isSubmitting}
                  trackColor={{ false: colors.border.light, true: `${colors.accent}55` }}
                  thumbColor={hasLawyer ? colors.accent : colors.background.primary}
                />
              </View>
            </>
          ) : null}

          {externalError ?? generalError ? <Text style={styles.errorBanner}>{externalError ?? generalError}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonText}>{tx('addCase.buttons.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, isSubmitDisabled && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.warm.cream} />
              ) : (
                <Text style={styles.primaryButtonText}>{tx('addCase.buttons.submit', 'Agregar caso')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PlatformBottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  sourceSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceOption: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
    backgroundColor: colors.warm.sand,
    gap: spacing.xs,
  },
  sourceOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}12`,
  },
  sourceOptionLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  sourceOptionLabelSelected: {
    color: colors.accent,
  },
  sourceOptionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  sourceOptionDescriptionSelected: {
    color: colors.warm.ink,
  },
  heroCard: {
    padding: spacing.lg,
    backgroundColor: 'rgba(39, 198, 190, 0.1)',
    borderColor: 'rgba(15, 97, 103, 0.12)',
  },
  heroCardAndroid: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
  },
  heroHeader: {
    gap: spacing.xs,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
  },
  heroDescription: {
    fontSize: typography.fontSize.base,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.warmStrong,
  },
  heroChipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.accent,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  selectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
    backgroundColor: colors.warm.sand,
  },
  selectorTriggerOpen: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}10`,
  },
  selectorTriggerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  selectorTriggerValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  selectorTriggerPlaceholder: {
    color: colors.warm.inkFaint,
    fontFamily: typography.fontFamily.medium,
  },
  selectorTriggerIcon: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  nationalityLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  nationalityLoadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
  },
  nationalitySelectorCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.large,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  nationalitySearchInput: {
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.warm.ink,
  },
  nationalityResultsCard: {
    gap: spacing.sm,
  },
  nationalityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  nationalityOptionSelected: {
    backgroundColor: `${colors.accent}10`,
    borderColor: `${colors.accent}25`,
  },
  nationalityOptionLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warm.ink,
    fontFamily: typography.fontFamily.medium,
  },
  nationalityOptionStatus: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.inkSoft,
    textTransform: 'uppercase',
  },
  nationalityOptionStatusSelected: {
    color: colors.accent,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  retryButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  input: {
    backgroundColor: colors.warm.sand,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
  },
  inputError: {
    borderColor: colors.status.urgentWarm,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.status.urgentWarm,
  },
  errorBanner: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.status.urgentWarm,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.16)',
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
    backgroundColor: colors.warm.sand,
    minHeight: 52,
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  primaryButton: {
    flex: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.large,
    backgroundColor: colors.accent,
    minHeight: 52,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border.medium,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.cream,
  },
});

export default AddCaseSheet;