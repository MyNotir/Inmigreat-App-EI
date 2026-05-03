/**
 * Navigation Types - React Navigation param list type definitions
 * Validates: Requirements 6.2, 6.3, 11.1, 11.7
 */

import type { CaseDetail, CaseSource } from './case';

export type ChatTabParams = {
  conversationId?: string;
  userUscisCaseId?: string;
  userEoirCaseId?: string;
  caseId?: string;
  caseSource?: CaseSource;
  sourceScreen?: string;
  sourceAction?: string;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type OnboardingStackParamList = {
  Splash: undefined;
  Language: undefined;
  Name: { email?: string; notice?: string; completePendingProvisioning?: boolean } | undefined;
  Login: { email?: string; notice?: string } | undefined;
  ForgotPassword: { email?: string } | undefined;
  ConfirmRegistration: { email: string };
  ResetPassword: { email: string };
  Biometric: undefined;
  EIPreview: undefined;
};

export type MainTabParamList = {
  Chat: ChatTabParams | undefined;
  Cases: undefined;
  Community: undefined;
  Resources: undefined;
};

export type ResourcesEntryParams = {
  /** When set, AttorneyDirectory pre-filters by case type tag. */
  caseTypeFilter?: string;
};

export type CasesStackParamList = {
  CasesList: undefined;
  CaseDetail: { caseId: string; source?: CaseSource; initialCase?: CaseDetail };
  LoadingPreview: undefined;
};

export type CommunityStackParamList = {
  GroupsList: undefined;
  GroupDetail: { groupId: string };
  ThreadView: { postId: string; groupId?: string; isMember?: boolean; hadMembership?: boolean };
  Compose: { groupId: string };
};

export type ResourcesStackParamList = {
  ResourcesList: undefined;
  AttorneyDirectory: ResourcesEntryParams | undefined;
  AttorneyDetail: { attorneyId: string };
  GlossaryTerm: { termId: string };
};

// Declare global navigation types for React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
