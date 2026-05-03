/**
 * OnboardingStack Navigator
 * Stack navigator for the onboarding flow including Splash, Language, Name, Login, ForgotPassword, and Biometric screens
 * Validates: Requirements 2.2
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { OnboardingStackParamList } from '../types/navigation';
import {
  SplashScreen,
  LanguageScreen,
  NameScreen,
  LoginScreen,
  ForgotPasswordScreen,
  ConfirmRegistrationScreen,
  ResetPasswordScreen,
  BiometricScreen,
} from '../screens/onboarding';

const Stack = createStackNavigator<OnboardingStackParamList>();

/**
 * OnboardingStack - Stack navigator for the onboarding flow
 * Screens: Splash -> Language -> Name -> Login -> Biometric
 * ForgotPassword is accessible from Login screen
 */
export const OnboardingStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen}
      />
      <Stack.Screen 
        name="Language" 
        component={LanguageScreen}
      />
      <Stack.Screen 
        name="Name" 
        component={NameScreen}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ConfirmRegistration"
        component={ConfirmRegistrationScreen}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
      />
      <Stack.Screen 
        name="Biometric" 
        component={BiometricScreen}
      />
    </Stack.Navigator>
  );
};

export default OnboardingStack;
