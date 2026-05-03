/**
 * CommunityStack Navigator
 * 
 * Stack navigator for the Community tab screens.
 * Handles navigation between groups list, group detail, thread view, and compose.
 * 
 * Validates: Requirements 11.6
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { CommunityStackParamList } from '../types/navigation';

import { CommunityScreen } from '../screens/CommunityScreen';
import { GroupDetailScreen } from '../screens/GroupDetailScreen';
import { ThreadViewScreen } from '../screens/ThreadViewScreen';

const Stack = createStackNavigator<CommunityStackParamList>();

/**
 * CommunityStack Navigator Component
 * 
 * Provides navigation for:
 * - GroupsList: Main community screen with groups
 * - GroupDetail: Individual group with feed and resources
 * - ThreadView: Post thread with comments (to be implemented)
 * - Compose: Create new post (handled via modal in GroupDetailScreen)
 */
export const CommunityStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="GroupsList"
        component={CommunityScreen}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
      />
      <Stack.Screen
        name="ThreadView"
        component={ThreadViewScreen}
      />
    </Stack.Navigator>
  );
};

export default CommunityStack;
