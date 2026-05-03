/**
 * ResourcesStack Navigator
 *
 * Stack for the Resources tab — the educational + provider-network surface.
 * Routes:
 *   - ResourcesList: master Resources screen (attorneys section, calculator,
 *     glossary, visa bulletin)
 *   - AttorneyDirectory: full search/filter directory of verified attorneys
 *   - AttorneyDetail: full attorney profile with consent-gated contact flow
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import type { ResourcesStackParamList } from '../types/navigation';
import { ResourcesScreen } from '../screens/ResourcesScreen';
import { AttorneyDirectoryScreen } from '../screens/AttorneyDirectoryScreen';
import { AttorneyProfileScreen } from '../screens/AttorneyProfileScreen';

const Stack = createStackNavigator<ResourcesStackParamList>();

export const ResourcesStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ResourcesList"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        presentation: 'card',
      }}
    >
      <Stack.Screen name="ResourcesList" component={ResourcesScreen} />
      <Stack.Screen name="AttorneyDirectory" component={AttorneyDirectoryScreen} />
      <Stack.Screen name="AttorneyDetail" component={AttorneyProfileScreen} />
    </Stack.Navigator>
  );
};

export default ResourcesStack;
