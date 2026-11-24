# 앱 아이콘·스플래시 원본 (SVG)

`assets/images/*.png` 는 이 폴더의 SVG를 1024×1024로 렌더링한 결과입니다 (favicon 은 48×48로 축소).

| 파일 | 용도 |
| --- | --- |
| icon.svg | iOS·공통 앱 아이콘 (app.json `icon`) — 투명도 없음 |
| android-icon-foreground.svg / background.svg / monochrome.svg | Android 적응형 아이콘 (안전 영역 66dp 안에 배치) |
| splash-icon.svg | 스플래시 이미지 (배경색 `#0E7C6B` 은 app.json 에서 지정) |
| favicon.svg | 웹 파비콘 |

디자인: 흰 수첩(건강수첩) + 브랜드 틸 `#0E7C6B` 십자 + 골든타임 앰버 `#E8A317` 책갈피.
정식 브랜드 아이덴티티가 정해지면 같은 파일명으로 교체하면 됩니다.
