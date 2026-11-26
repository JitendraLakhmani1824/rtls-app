import { BackButton, colors, PhotoButton, PrimaryButton, radius, typeScale } from '@common/ui';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StepDots } from './StepDots';

/** Step 2: your photo (optional) and name. */
export function ProfileStep({
  name,
  onName,
  photo,
  initials,
  onPhoto,
  canFinish,
  onFinish,
  onBack,
}: {
  name: string;
  onName: (name: string) => void;
  photo: string | null;
  initials: string;
  onPhoto: () => void;
  canFinish: boolean;
  onFinish: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 6 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <BackButton onPress={onBack} />
          <StepDots step={1} of={2} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Set up your profile
        </Text>
        <Text style={styles.sub}>This is how friends see you on the map and in invites.</Text>
        <View style={styles.photo}>
          <PhotoButton
            photo={photo}
            initials={initials}
            placeholder={name.trim() === ''}
            onPress={onPhoto}
          />
        </View>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={onName}
          placeholder="e.g. Asha"
          placeholderTextColor={colors.faint}
          style={styles.input}
          maxLength={40}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onFinish}
          accessibilityLabel="Your name"
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Continue" onPress={onFinish} disabled={!canFinish} />
        <Text style={styles.footnote}>Your name and photo stay on this phone.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { ...typeScale.title, marginTop: 8 },
  sub: { fontSize: 16, lineHeight: 23, color: colors.muted, marginTop: 8 },
  photo: { marginTop: 28 },
  label: { ...typeScale.label, marginTop: 30, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: colors.ink,
  },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 14 },
  footnote: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
