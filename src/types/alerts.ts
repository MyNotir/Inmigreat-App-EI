export type AppAlertTone = 'info' | 'success' | 'warning' | 'error';

export type AppAlertActionStyle = 'default' | 'cancel' | 'destructive';

export interface AppAlertAction {
  label: string;
  style?: AppAlertActionStyle;
  onPress?: () => void;
}

export interface AppAlertConfig {
  title: string;
  message: string;
  tone?: AppAlertTone;
  actions?: AppAlertAction[];
  dismissible?: boolean;
}

export interface ErrorAlertOptions {
  title?: string;
  fallbackMessage?: string;
  preferInlineValidation?: boolean;
}