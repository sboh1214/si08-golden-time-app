import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import {
  ConsentChecklist,
  INITIAL_CONSENT,
  isConsentComplete,
  type ConsentState,
} from '../consent-checklist';

function Harness() {
  const [consent, setConsent] = useState<ConsentState>(INITIAL_CONSENT);
  return <ConsentChecklist consent={consent} onChange={setConsent} />;
}

const allCheckbox = () => screen.getByRole('checkbox', { name: '모두 동의해요' });
const aiCheckbox = () => screen.getByRole('checkbox', { name: /AI 해설은 참고용/ });
const dataCheckbox = () => screen.getByRole('checkbox', { name: /민감정보/ });

describe('ConsentChecklist', () => {
  it('필수 항목을 모두 체크하면 전체 동의도 체크된다', async () => {
    await render(<Harness />);
    expect(allCheckbox()).not.toBeChecked();

    await fireEvent.press(aiCheckbox());
    expect(aiCheckbox()).toBeChecked();
    expect(allCheckbox()).not.toBeChecked();

    await fireEvent.press(dataCheckbox());
    expect(allCheckbox()).toBeChecked();
  });

  it('모두 동의를 누르면 전체가 체크되고, 다시 누르면 모두 해제된다', async () => {
    await render(<Harness />);

    await fireEvent.press(allCheckbox());
    expect(aiCheckbox()).toBeChecked();
    expect(dataCheckbox()).toBeChecked();

    await fireEvent.press(allCheckbox());
    expect(aiCheckbox()).not.toBeChecked();
    expect(dataCheckbox()).not.toBeChecked();
  });
});

describe('isConsentComplete', () => {
  it('필수 항목이 하나라도 빠지면 false', () => {
    expect(isConsentComplete(INITIAL_CONSENT)).toBe(false);
    expect(isConsentComplete({ aiNotice: true, dataProcessing: false })).toBe(false);
    expect(isConsentComplete({ aiNotice: true, dataProcessing: true })).toBe(true);
  });
});
