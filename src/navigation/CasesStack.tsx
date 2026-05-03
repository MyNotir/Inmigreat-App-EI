/**
 * CasesStack Navigator
 *
 * Stack navigator for the Cases tab.
 * Handles navigation between cases list and case detail.
 *
 * Validates: Requirements 6.2, 6.3
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { CasesStackParamList } from '../types/navigation';

import { CasesScreen } from '../screens/CasesScreen';
import { CaseDetailScreen } from '../screens/CaseDetailScreen';
import { LoadingPreviewScreen } from '../screens/LoadingPreviewScreen';

const Stack = createStackNavigator<CasesStackParamList>();

export const CasesStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CasesList" component={CasesScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
      <Stack.Screen name="LoadingPreview" component={LoadingPreviewScreen} />
    </Stack.Navigator>
  );
};

export default CasesStack;
