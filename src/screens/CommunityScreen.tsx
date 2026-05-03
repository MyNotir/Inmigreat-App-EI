/**
 * CommunityScreen
 * 
 * Main screen for displaying community groups.
 * - Displays list of groups with GroupRow components
 * - Handles join free group action
 * - Displays paywall for paid groups
 * - Navigates to group detail on tap
 * 
 * Validates: Requirements 7.1, 7.4, 11.1, 11.4, 11.5, 11.6
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { BrandedLoadingState } from '../components/common/BrandedLoadingState';
import { GlassCard } from '../components/common/GlassCard';
import { CreateGroupSheet } from '../components/community/CreateGroupSheet';
import { PremiumPaywallModal } from '../components/premium/PremiumPaywallModal';
import { GroupRow } from '../components/community/GroupRow';
import { useAuth } from '../context/AuthContext';
import { useAppAlert } from '../context/AppAlertContext';
import { useViewTranslation } from '../i18n';
import { getMainTabAccent } from '../navigation/tabAccents';
import { communityService, type CreateGroupRequest } from '../services/community';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';
import type { Group } from '../types/community';
import type { CommunityStackParamList, MainTabParamList } from '../types/navigation';

type CommunityNavigationProp = StackNavigationProp<CommunityStackParamList>;

const COMMUNITY_ACCENT = getMainTabAccent('Community');

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

function translateCommunityPeriod(period: string | undefined, tx: CommunityTranslate): string {
  const normalized = period?.trim().toLowerCase();

  if (normalized === 'mes' || normalized === 'month') {
    return tx('paywall.periods.month', 'mes');
  }

  if (normalized === 'ano' || normalized === 'año' || normalized === 'year') {
    return tx('paywall.periods.year', 'ano');
  }

  return tx('paywall.periods.year', 'ano');
}

/**
 * CommunityScreen Component
 */
export const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<CommunityNavigationProp>();
  const { subscriptionStatus } = useAuth();
  const { showAlert, showError } = useAppAlert();
  const { t } = useViewTranslation('community');
  const tx = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(key, { defaultValue, ...(options ?? {}) }),
    [t],
  );
  const isPro = subscriptionStatus.isPro;

  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [selectedPaidGroup, setSelectedPaidGroup] = useState<Group | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [createGroupType, setCreateGroupType] = useState<Group['type']>('free');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const hasCompletedInitialLoadRef = useRef(false);

  /**
   * Fetch groups from API
   */
  const fetchGroups = useCallback(async () => {
    try {
      setError(null);
      const fetchedGroups = await communityService.getGroups();
      const moderatorGroups = fetchedGroups.filter((group) => group.viewerCanModerate);

      if (moderatorGroups.length === 0) {
        setGroups(fetchedGroups);
      } else {
        const moderationCounts = await Promise.allSettled(
          moderatorGroups.map(async (group) => {
            const stats = await communityService.getModerationStats(group.id);
            return { groupId: group.id, openCount: stats.openCount };
          }),
        );

        const openCountByGroupId = moderationCounts.reduce<Record<string, number>>((accumulator, result) => {
          if (result.status === 'fulfilled') {
            accumulator[result.value.groupId] = result.value.openCount;
          }

          return accumulator;
        }, {});

        setGroups(
          fetchedGroups.map((group) => ({
            ...group,
            moderationOpenCount: openCountByGroupId[group.id] ?? 0,
          })),
        );
      }

      setJoinedGroups(new Set(fetchedGroups.filter((group) => group.isMember).map((group) => group.id)));
    } catch (err) {
      console.error('[CommunityScreen] Error fetching groups:', err);
      setError(tx('feedback.loadError', 'No se pudieron cargar los grupos. Intenta de nuevo.'));
    }
  }, [tx]);

  // Fetch groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      setIsLoading(true);
      await fetchGroups();
      setIsLoading(false);
      hasCompletedInitialLoadRef.current = true;
    };
    loadGroups();
  }, [fetchGroups]);

  useFocusEffect(
    useCallback(() => {
      if (!hasCompletedInitialLoadRef.current) {
        return undefined;
      }

      void fetchGroups();
      return undefined;
    }, [fetchGroups]),
  );

  useEffect(() => {
    return communityService.subscribeToGroupsFeedChanges(() => {
      void fetchGroups();
    });
  }, [fetchGroups]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  const handleRetry = useCallback(async () => {
    setIsLoading(true);
    await fetchGroups();
    setIsLoading(false);
  }, [fetchGroups]);

  /**
   * Handle group row press - navigate to group detail
   * Validates: Requirement 11.6
   */
  const handleGroupPress = useCallback(
    (group: Group) => {
      const isJoined = Boolean(group.isMember || joinedGroups.has(group.id));

      if (group.type === 'paid' && !isPro && !isJoined) {
        setSelectedPaidGroup(group);
        setPaywallVisible(true);
        return;
      }
      
      // Navigate to group detail
      navigation.navigate('GroupDetail', { groupId: group.id });
    },
    [navigation, isPro, joinedGroups]
  );

  /**
   * Handle join button press
   * - Free groups: Join immediately (Requirement 7.4)
   * - Paid groups: Show paywall (Requirement 11.5)
   */
  const handleJoinGroup = useCallback(
    async (group: Group) => {
      const isJoined = Boolean(group.isMember || joinedGroups.has(group.id));

      if (isJoined) {
        navigation.navigate('GroupDetail', { groupId: group.id });
        return;
      }

      if (group.type === 'paid' && !isPro) {
        // Show paywall for paid groups
        setSelectedPaidGroup(group);
        setPaywallVisible(true);
      } else {
        // Join free group or Pro user joining paid group
        setJoiningGroupId(group.id);
        
        try {
          await communityService.joinGroup(group.id);
          
          setJoinedGroups((prev) => {
            const newSet = new Set(prev);
            newSet.add(group.id);
            return newSet;
          });
          setGroups((prev) =>
            prev.map((item) =>
              item.id === group.id
                ? {
                    ...item,
                    isMember: true,
                    memberCount: item.memberCount + 1,
                  }
                : item,
            ),
          );
          
          showAlert({
            title: tx('feedback.joinedTitle', 'Te has unido'),
            message: tx('feedback.joinedMessage', 'Ahora eres miembro de {{name}}', {
              name: group.name,
            }),
            tone: 'success',
          });
        } catch (err) {
          console.error('[CommunityScreen] Error joining group:', err);
          showError(err, {
            title: tx('feedback.joinErrorTitle', 'No se pudo unir al grupo'),
            fallbackMessage: tx('feedback.joinErrorFallback', 'No se pudo unir al grupo. Intenta de nuevo.'),
          });
        } finally {
          setJoiningGroupId(null);
        }
      }
    },
    [isPro, joinedGroups, navigation, showAlert, showError, tx]
  );

  /**
   * Handle paywall close
   */
  const handlePaywallClose = useCallback(() => {
    setPaywallVisible(false);
    setSelectedPaidGroup(null);
  }, []);

  const handleOpenChatFromPaywall = useCallback(() => {
    handlePaywallClose();
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Chat', {
      sourceScreen: 'CommunityScreen',
      sourceAction: 'open_chat_from_community_paywall',
    });
  }, [handlePaywallClose, navigation]);

  const openCreateGroup = useCallback((type: Group['type']) => {
    setCreateGroupType(type);
    setCreateGroupVisible(true);
  }, []);

  const closeCreateGroup = useCallback(() => {
    if (isCreatingGroup) {
      return;
    }

    setCreateGroupVisible(false);
  }, [isCreatingGroup]);

  const handleCreateGroup = useCallback(
    async (input: CreateGroupRequest) => {
      setIsCreatingGroup(true);

      try {
        const createdGroup = await communityService.createGroup(input);

        setGroups((prev) => [createdGroup, ...prev]);
        setJoinedGroups((prev) => {
          const next = new Set(prev);
          next.add(createdGroup.id);
          return next;
        });
        setCreateGroupVisible(false);
        navigation.navigate('GroupDetail', { groupId: createdGroup.id });
      } catch (err) {
        console.error('[CommunityScreen] Error creating group:', err);
        showError(err, {
          title: tx('feedback.createErrorTitle', 'No se pudo crear el grupo'),
          fallbackMessage: tx('feedback.createErrorFallback', 'Revisa la informacion e intenta de nuevo.'),
        });
      } finally {
        setIsCreatingGroup(false);
      }
    },
    [navigation, showError, tx],
  );

  /**
   * Render empty state when no groups
   */
  const renderEmptyState = () => (
    <View style={styles.emptyStateStack}>
      <GlassCard style={styles.emptyHeroCard}>
        <Text style={styles.emptyEyebrow}>{tx('empty.eyebrow', 'Comienza aqui')}</Text>
        <Text style={styles.emptyTitle}>{tx('empty.title', 'Crea el primer grupo')}</Text>
        <Text style={styles.emptyDescription}>
          {tx(
            'empty.description',
            'Todavia no hay grupos disponibles. Puedes crear el primero para reunir personas con intereses en comun, compartir informacion util y construir un espacio de apoyo desde aqui.',
          )}
        </Text>

        <View style={styles.emptyActionRow}>
          <TouchableOpacity
            style={styles.emptyPrimaryButton}
            onPress={() => openCreateGroup('free')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyPrimaryButtonText}>{tx('empty.createFree', 'Crear grupo gratis')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptySecondaryButton}
            onPress={() => openCreateGroup('paid')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptySecondaryButtonText}>{tx('empty.createPro', 'Crear grupo Pro')}</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>

      <GlassCard style={styles.planCard}>
        <Text style={styles.planTitle}>{tx('plans.free.title', 'Grupo gratis')}</Text>
        <Text style={styles.planDescription}>
          {tx(
            'plans.free.description',
            'Perfecto para conversaciones abiertas, preguntas frecuentes y apoyo entre personas que estan viviendo procesos similares.',
          )}
        </Text>
        <Text style={styles.planBullet}>{tx('plans.free.bullet1', 'Cualquier persona podra entrar facilmente desde esta seccion.')}</Text>
        <Text style={styles.planBullet}>{tx('plans.free.bullet2', 'Ideal para crecer la comunidad y compartir recursos utiles.')}</Text>
        <TouchableOpacity
          style={styles.planCtaButton}
          onPress={() => openCreateGroup('free')}
          activeOpacity={0.85}
        >
          <Text style={styles.planCtaButtonText}>{tx('plans.free.cta', 'Crear grupo gratis')}</Text>
        </TouchableOpacity>
      </GlassCard>

      <GlassCard style={StyleSheet.flatten([styles.planCard, styles.planCardPro])}>
        <Text style={styles.planTitle}>{tx('plans.pro.title', 'Grupo Pro')}</Text>
        <Text style={styles.planDescription}>
          {tx(
            'plans.pro.description',
            'Pensado para espacios mas exclusivos, programas privados y contenido especial para miembros con acceso Pro.',
          )}
        </Text>
        <Text style={styles.planBullet}>{tx('plans.pro.bullet1', 'Las personas con acceso Pro podran entrar directamente desde la app.')}</Text>
        <Text style={styles.planBullet}>{tx('plans.pro.bullet2', 'Ideal para clases, seguimiento cercano y recursos premium.')}</Text>
        <TouchableOpacity
          style={[styles.planCtaButton, styles.planCtaButtonPro]}
          onPress={() => openCreateGroup('paid')}
          activeOpacity={0.85}
        >
          <Text style={styles.planCtaButtonText}>{tx('plans.pro.cta', 'Crear grupo Pro')}</Text>
        </TouchableOpacity>
      </GlassCard>

      <GlassCard style={styles.joinPreviewCard}>
        <Text style={styles.joinPreviewTitle}>{tx('preview.title', 'Asi lo veran tus clientes')}</Text>

        <View style={styles.joinPreviewRow}>
          <View style={styles.joinPreviewMeta}>
            <Text style={styles.joinPreviewGroupName}>{tx('preview.freeTitle', 'Grupo gratis')}</Text>
            <Text style={styles.joinPreviewHelp}>{tx('preview.freeHelp', 'Entrada abierta para cualquier persona')}</Text>
          </View>
          <View style={styles.joinPreviewButton}>
            <Text style={styles.joinPreviewButtonText}>{tx('preview.freeAction', 'Unirse gratis')}</Text>
          </View>
        </View>

        <View style={styles.joinPreviewDivider} />

        <View style={styles.joinPreviewRow}>
          <View style={styles.joinPreviewMeta}>
            <Text style={styles.joinPreviewGroupName}>{tx('preview.proTitle', 'Grupo Pro')}</Text>
            <Text style={styles.joinPreviewHelp}>{tx('preview.proHelp', 'Disponible para miembros con acceso Pro')}</Text>
          </View>
          <View style={[styles.joinPreviewButton, styles.joinPreviewButtonPro]}>
            <Text style={styles.joinPreviewButtonText}>{tx('preview.proAction', 'Unirse Pro')}</Text>
          </View>
        </View>

        <Text style={styles.joinPreviewCaption}>
          {tx(
            'preview.caption',
            'Desde esta pantalla sabran de inmediato si pueden entrar gratis o si el grupo es exclusivo para miembros Pro.',
          )}
        </Text>
      </GlassCard>
    </View>
  );

  /**
   * Render loading state
   */
  const renderLoadingState = () => (
    <BrandedLoadingState
      title={tx('loading.title', 'Cargando la comunidad')}
      subtitle={tx('loading.subtitle', 'Preparando grupos, actividad y accesos para ti.')}
      variant="community"
    />
  );

  /**
   * Render error state
   */
  const renderErrorState = () => (
    <View style={styles.errorStateStack}>
      <GlassCard style={styles.errorHeroCard}>
        <View style={styles.errorBadge}>
          <View style={styles.errorBadgeDot} />
          <Text style={styles.errorBadgeText}>{tx('error.badge', 'Conectividad')}</Text>
        </View>

        <View style={styles.errorIconWrap}>
          <Text style={styles.errorIconGlyph}>!</Text>
        </View>

        <Text style={styles.errorTitle}>{tx('error.title', 'No pudimos cargar la comunidad')}</Text>
        <Text style={styles.errorDescription}>{error}</Text>

        <View style={styles.errorMetaRow}>
          <View style={styles.errorMetaPill}>
            <Text style={styles.errorMetaText}>{tx('error.noMockData', 'Sin datos simulados')}</Text>
          </View>
          <View style={styles.errorMetaPill}>
            <Text style={styles.errorMetaText}>{tx('error.backendRequired', 'Backend requerido')}</Text>
          </View>
        </View>

        <Text style={styles.errorSupportText}>
          {tx(
            'error.support',
            'Cuando el servicio vuelva a responder, los grupos reales apareceran aqui automaticamente.',
          )}
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.85}>
          <Text style={styles.retryButtonText}>{tx('error.retry', 'Volver a intentar')}</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{tx('header.title', 'Comunidad')}</Text>
            <Text style={styles.headerSubtitle}>
              {isLoading
                ? tx('header.loadingSubtitle', 'Preparando grupos')
                : error && groups.length === 0
                  ? tx('header.backendWaitingSubtitle', 'Esperando respuesta del backend')
                : groups.length === 0
                  ? tx('header.emptySubtitle', 'Crea el primer grupo de la comunidad')
                  : tx('header.availableGroups', '{{count}} grupos disponibles', { count: groups.length })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.createHeaderButton}
              onPress={() => openCreateGroup('free')}
              activeOpacity={0.85}
            >
              <Text style={styles.createHeaderButtonText}>{tx('header.create', '+ Crear')}</Text>
            </TouchableOpacity>
            {isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
        </View>

        {/* Groups List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COMMUNITY_ACCENT}
            />
          }
        >
          {isLoading ? (
            renderLoadingState()
          ) : error && groups.length === 0 ? (
            renderErrorState()
          ) : groups.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.groupsContainer}>
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  onPress={() => handleGroupPress(group)}
                  onJoin={() => handleJoinGroup(group)}
                  isJoined={Boolean(group.isMember || joinedGroups.has(group.id))}
                  isJoining={joiningGroupId === group.id}
                  actionLabel={
                    group.type === 'paid' && !isPro && !Boolean(group.isMember || joinedGroups.has(group.id))
                      ? tx('paywall.viewAccess', 'Ver acceso')
                      : undefined
                  }
                  style={styles.groupRow}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Paywall Modal */}
        <PremiumPaywallModal
          visible={paywallVisible}
          title={selectedPaidGroup?.name ?? tx('paywall.titleFallback', 'InMiGreat Pro')}
          subtitle={tx('paywall.subtitle', 'Acceso Pro requerido')}
          description={tx(
            'paywall.description',
            'Los grupos Pro ya pueden verse desde Comunidad, pero la contratacion de acceso Pro desde esta app todavia no esta habilitada. Si ya tienes acceso Pro, podras entrar directamente cuando tu cuenta lo tenga activo.',
          )}
          priceValue={selectedPaidGroup ? `$${selectedPaidGroup.price}` : '$20'}
          pricePeriod={`/${translateCommunityPeriod(selectedPaidGroup?.period, tx)}`}
          benefits={[
            tx('paywall.benefits.webinars', 'Acceso a webinars exclusivos'),
            tx('paywall.benefits.experts', 'Consultas con expertos'),
            tx('paywall.benefits.downloads', 'Recursos premium descargables'),
            tx('paywall.benefits.privateCommunity', 'Comunidad privada de miembros'),
          ]}
          showSubscribeButton={false}
          showChatButton={true}
          chatCtaLabel={tx('paywall.chatCta', 'Preguntar a la AI')}
          dismissLabel={tx('paywall.dismiss', 'Entendido')}
          onClose={handlePaywallClose}
          onOpenChat={handleOpenChatFromPaywall}
          onSubscribe={handlePaywallClose}
        />

        <CreateGroupSheet
          key={createGroupType}
          visible={createGroupVisible}
          onClose={closeCreateGroup}
          onSubmit={handleCreateGroup}
          initialType={createGroupType}
          isSubmitting={isCreatingGroup}
        />
      </SafeAreaView>
    </AnimatedBackground>
  );
};

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  createHeaderButton: {
    backgroundColor: `${COMMUNITY_ACCENT}14`,
    borderWidth: 1,
    borderColor: `${COMMUNITY_ACCENT}28`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  createHeaderButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: COMMUNITY_ACCENT,
  },
  proBadge: {
    backgroundColor: colors.pro,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  proBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  
  // Scroll view styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  
  // Groups container
  groupsContainer: {
    paddingHorizontal: spacing.base,
  },
  groupRow: {
    marginBottom: spacing.md,
  },
  
  // Empty state styles
  emptyStateStack: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  errorStateStack: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  errorHeroCard: {
    padding: spacing.xl,
    borderColor: `${colors.error}22`,
    backgroundColor: `${colors.error}08`,
    ...shadows.lg,
  },
  errorBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.error}12`,
    borderWidth: 1,
    borderColor: `${colors.error}18`,
    marginBottom: spacing.lg,
  },
  errorBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    marginRight: spacing.xs,
  },
  errorBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.background.primary}80`,
    borderWidth: 1,
    borderColor: `${colors.error}14`,
    marginBottom: spacing.lg,
  },
  errorIconGlyph: {
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyHeroCard: {
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: COMMUNITY_ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  emptyCard: {
    margin: spacing.base,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  errorDescription: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    marginBottom: spacing.lg,
  },
  errorMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  errorMetaPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}75`,
    borderWidth: 1,
    borderColor: `${colors.border.medium}50`,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorMetaText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  errorSupportText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.lg,
  },
  emptyActionRow: {
    marginTop: spacing.sm,
  },
  emptyPrimaryButton: {
    minHeight: 48,
    backgroundColor: COMMUNITY_ACCENT,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyPrimaryButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  emptySecondaryButton: {
    minHeight: 48,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.pro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySecondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  planCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planCardPro: {
    borderColor: `${colors.pro}24`,
  },
  planTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  planDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  planBullet: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  planCtaButton: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: borderRadius.medium,
    backgroundColor: COMMUNITY_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCtaButtonPro: {
    backgroundColor: colors.pro,
  },
  planCtaButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  joinPreviewCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  joinPreviewTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  joinPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinPreviewMeta: {
    flex: 1,
    paddingRight: spacing.md,
  },
  joinPreviewGroupName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  joinPreviewHelp: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  joinPreviewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: `${COMMUNITY_ACCENT}18`,
  },
  joinPreviewButtonPro: {
    backgroundColor: `${colors.pro}18`,
  },
  joinPreviewButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  joinPreviewDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },
  joinPreviewCaption: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginTop: spacing.md,
  },
  retryButton: {
    backgroundColor: COMMUNITY_ACCENT,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
});

export default CommunityScreen;
