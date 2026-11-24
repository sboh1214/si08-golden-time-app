import { COMPACT_WIDTH, MIN_SIDE_BY_SIDE_WIDTH, resolveExplanationLayout } from '../layout';

describe('resolveExplanationLayout', () => {
  it('일반 휴대폰 폭에서는 고른 배치를 그대로 쓴다 (나란히 보기가 기본)', () => {
    expect(resolveExplanationLayout('side', 390, false)).toEqual({
      layout: 'side',
      preferred: 'side',
      autoStacked: false,
    });
    expect(resolveExplanationLayout('stack', 390, false).layout).toBe('stack');
  });

  it('두 단이 읽기 어려울 만큼 좁으면 저장된 설정은 두고 위아래로 보여 준다', () => {
    expect(resolveExplanationLayout('side', MIN_SIDE_BY_SIDE_WIDTH - 1, false)).toEqual({
      layout: 'stack',
      preferred: 'side',
      autoStacked: true,
    });
    // 글자 크게 보기를 켠 작은 화면
    expect(resolveExplanationLayout('side', COMPACT_WIDTH - 1, true).autoStacked).toBe(true);
    expect(resolveExplanationLayout('side', COMPACT_WIDTH, true).autoStacked).toBe(false);
  });

  it('위아래 보기를 고른 경우는 자동 전환으로 표시하지 않는다', () => {
    expect(resolveExplanationLayout('stack', 320, true).autoStacked).toBe(false);
  });
});
