import { askPhotoSource } from '@common/ui';

import { useOnboarding } from './hooks/useOnboarding';
import { ProfileStep } from './views/ProfileStep';
import { WelcomeStep } from './views/WelcomeStep';

/** First launch: welcome, then your name and photo. */
export function OnboardingScreen() {
  const o = useOnboarding();
  if (o.step === 'welcome') return <WelcomeStep onNext={o.next} />;
  return (
    <ProfileStep
      name={o.name}
      onName={o.setName}
      photo={o.photo}
      initials={o.initials}
      onPhoto={async () => o.choosePhoto(await askPhotoSource(o.photo !== null))}
      canFinish={o.canFinish}
      onFinish={o.finish}
      onBack={o.back}
    />
  );
}
