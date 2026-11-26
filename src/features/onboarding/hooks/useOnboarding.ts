import { useManagers, useProfile } from '@common/di';
import type { PhotoChoice } from '@common/ui';
import { initialsOf } from '@core/utils';
import { useState } from 'react';

export type OnboardingStep = 'welcome' | 'profile';

/**
 * First launch: a welcome, then your name and (optionally) a photo. Finishing saves the profile;
 * the app then shows your sessions (or the invite link that opened it).
 */
export function useOnboarding() {
  const { sessions, photos } = useManagers();
  const profile = useProfile();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<string | null>(profile.photo);

  // A photo picked here and then replaced or dropped is ours to delete; the saved one stays until finish.
  const discard = (uri: string | null) => {
    if (uri && uri !== profile.photo) void photos.remove(uri);
  };

  return {
    step,
    next: () => setStep('profile'),
    back: () => setStep('welcome'),
    name,
    setName,
    photo,
    initials: initialsOf(name.trim() || '?'),
    choosePhoto: async (choice: PhotoChoice | null) => {
      if (choice === null) return;
      if (choice === 'remove') {
        discard(photo);
        setPhoto(null);
        return;
      }
      const uri = await photos.pick(choice);
      if (!uri) return;
      discard(photo);
      setPhoto(uri);
    },
    canFinish: name.trim().length > 0,
    finish: () => {
      if (name.trim().length === 0) return;
      if (profile.photo && profile.photo !== photo) void photos.remove(profile.photo);
      sessions.updateProfile({ name, photo, onboarded: true });
    },
  };
}
