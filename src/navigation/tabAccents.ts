import { colors } from '../styles/theme';
import type { MainTabParamList } from '../types/navigation';

export type MainTabRouteName = keyof MainTabParamList;

export const MAIN_TAB_ACCENTS: Record<MainTabRouteName, string> = {
  Chat: colors.pro,
  Cases: colors.accent,
  Community: colors.caseAccent.greenCard,
  Resources: colors.caseAccent.visa,
};

export const getMainTabAccent = (routeName: MainTabRouteName): string => {
  return MAIN_TAB_ACCENTS[routeName];
};