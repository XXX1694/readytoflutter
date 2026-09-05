// Landing-page copy for /flutter, /ios, /android, /kmp.
//
// Each landing reuses HomePage but with:
//  - a tighter ICP-tuned hero (eyebrow / title / desc),
//  - the platform filter pre-applied via prefs,
//  - per-page <title> + meta description for SEO/social,
//  - per-page OG image (PNG) so link unfurls reflect the audience.
//
// The 'mobile' (root /) version stays generic — that's the catch-all entry.

import type { PlatformKey } from '../types/domain.ts';

export interface LandingCopy {
  eyebrow: string;
  // [first line, second line]. The second line used to be rendered with a
  // clipped indigo→violet gradient; both lines are plain ink now, the type
  // does the work (see DESIGN.md).
  title: [string, string];
  desc: string;
  docTitle: string;
  metaDesc: string;
}

export interface LandingConfig {
  platform: PlatformKey;
  canonical: string;
  ogImage: string;
  en: LandingCopy;
  ru: LandingCopy;
}

export const LANDINGS: Record<string, LandingConfig> = {
  flutter: {
    platform: 'flutter',
    canonical: '/flutter/',
    ogImage: '/og.png', // shared until per-platform PNGs ship
    en: {
      eyebrow: 'Flutter & Dart prep',
      title: ['Ready for the', 'Flutter interview.'],
      desc: 'SRS-driven Flutter / Dart drills, timed mock interviews, and per-topic cheatsheets — for engineers heading into widget trees, BLoC, and platform channels next week.',
      docTitle: 'Flutter & Dart Interview Prep — Onsite',
      metaDesc: 'Practice Flutter and Dart interview questions with spaced repetition, timed mock interviews, and per-topic cheatsheets. 23 topics covering widgets, state, async, navigation, and more.',
    },
    ru: {
      eyebrow: 'Подготовка · Flutter & Dart',
      title: ['Готов к', 'Flutter-собесу.'],
      desc: 'SRS-тренировки по Flutter и Dart, mock-интервью на время и шпаргалки по темам — для тех, у кого через неделю BLoC, виджет-дерево и platform channels.',
      docTitle: 'Подготовка к Flutter-собесу — Onsite',
      metaDesc: 'Тренируй Flutter и Dart с интервальным повторением, mock-интервью на время и шпаргалками по темам. 23 темы — виджеты, состояние, async, навигация и больше.',
    },
  },
  ios: {
    platform: 'ios',
    canonical: '/ios/',
    ogImage: '/og.png',
    en: {
      eyebrow: 'iOS prep · Swift / SwiftUI / UIKit',
      title: ['Ready for the', 'iOS interview.'],
      desc: 'Swift, SwiftUI, UIKit and iOS architecture — drilled with SRS, timed mock interviews, and per-topic cheatsheets. Write it first forces real recall, not skim.',
      docTitle: 'iOS Interview Prep — Swift, SwiftUI, UIKit · Onsite',
      metaDesc: 'iOS interview questions with SRS scheduling and timed mock interviews. Swift, SwiftUI, UIKit, Combine, persistence, and architecture — 13 topics, English and Russian.',
    },
    ru: {
      eyebrow: 'Подготовка · iOS — Swift, SwiftUI, UIKit',
      title: ['Готов к', 'iOS-собесу.'],
      desc: 'Swift, SwiftUI, UIKit и iOS-архитектура — с SRS, mock-интервью на время и шпаргалками по темам. «Сначала своими словами» заставляет вспоминать, а не скроллить.',
      docTitle: 'Подготовка к iOS-собесу — Swift, SwiftUI, UIKit · Onsite',
      metaDesc: 'Вопросы для iOS-собеседования с интервальным повторением и mock-интервью на время. Swift, SwiftUI, UIKit, Combine, хранение, архитектура — 13 тем, на русском и английском.',
    },
  },
  android: {
    platform: 'android',
    canonical: '/android/',
    ogImage: '/og.png',
    en: {
      eyebrow: 'Android prep · Kotlin / Compose',
      title: ['Ready for the', 'Android interview.'],
      desc: 'Kotlin, coroutines, Jetpack Compose, and Android architecture — drilled with SRS, timed mock interviews, and per-topic cheatsheets. Built for senior screens, not Hello World.',
      docTitle: 'Android Interview Prep — Kotlin, Compose · Onsite',
      metaDesc: 'Android interview questions with SRS scheduling, timed mocks, and per-topic cheatsheets. Kotlin, coroutines, Jetpack Compose, performance, DI — 12 topics, senior-ready.',
    },
    ru: {
      eyebrow: 'Подготовка · Android — Kotlin, Compose',
      title: ['Готов к', 'Android-собесу.'],
      desc: 'Kotlin, корутины, Jetpack Compose и Android-архитектура — с SRS, mock-интервью на время и шпаргалками по темам. Заточено под senior-секции, не Hello World.',
      docTitle: 'Подготовка к Android-собесу — Kotlin, Compose · Onsite',
      metaDesc: 'Вопросы для Android-собеседования с интервальным повторением, mock-интервью и шпаргалками по темам. Kotlin, корутины, Jetpack Compose, perf, DI — 12 тем, до senior-уровня.',
    },
  },
  kmp: {
    // Cross-platform stack in our taxonomy = KMP / Compose Multiplatform.
    platform: 'cross',
    canonical: '/kmp/',
    ogImage: '/og.png',
    en: {
      eyebrow: 'KMP & Compose Multiplatform',
      title: ['Ready for the', 'KMP interview.'],
      desc: 'Kotlin Multiplatform and Compose Multiplatform fundamentals — for the rare cross-platform Kotlin interview. Curated questions, SRS scheduling, timed mock interviews.',
      docTitle: 'KMP / Compose Multiplatform Interview Prep — Onsite',
      metaDesc: 'Kotlin Multiplatform and Compose Multiplatform interview prep — shared modules, expect/actual, KMP+Compose stack interop. Curated questions on an SRS schedule, plus timed mocks.',
    },
    ru: {
      eyebrow: 'Подготовка · KMP & Compose Multiplatform',
      title: ['Готов к', 'KMP-собесу.'],
      desc: 'Основы Kotlin Multiplatform и Compose Multiplatform — для редкой, но точечной собеседовательной секции по cross-platform Kotlin. Отобранные вопросы, SRS, mock-интервью на время.',
      docTitle: 'Подготовка к KMP / Compose Multiplatform собесу — Onsite',
      metaDesc: 'Подготовка к собесу по Kotlin Multiplatform и Compose Multiplatform — shared-модули, expect/actual, interop. Отобранные вопросы с интервальным повторением и mock-интервью.',
    },
  },
};
