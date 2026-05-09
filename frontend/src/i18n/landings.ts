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
  title: [string, string]; // [first line plain, second line gradient]
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
    canonical: '/flutter',
    ogImage: '/og.png', // shared until per-platform PNGs ship
    en: {
      eyebrow: 'Flutter & Dart prep',
      title: ['Ready for the', 'Flutter interview.'],
      desc: 'SRS-driven Flutter / Dart drills, mock interviews, and AI grading — for engineers heading into widget trees, BLoC, and platform channels next week.',
      docTitle: 'Flutter & Dart Interview Prep — prepiroshi',
      metaDesc: 'Practice Flutter and Dart interview questions with spaced repetition, mock interviews, and AI-graded answers. 17 topics covering widgets, state, async, navigation, and more.',
    },
    ru: {
      eyebrow: 'Подготовка · Flutter & Dart',
      title: ['Готов к', 'Flutter-собесу.'],
      desc: 'SRS-задрочка по Flutter и Dart, mock-интервью и AI-оценка — для тех, у кого через неделю BLoC, виджет-дерево и platform channels.',
      docTitle: 'Подготовка к Flutter-собесу — prepiroshi',
      metaDesc: 'Тренируй Flutter и Dart с SRS, mock-интервью и AI-проверкой ответов. 17 тем — виджеты, состояние, async, навигация и больше.',
    },
  },
  ios: {
    platform: 'ios',
    canonical: '/ios',
    ogImage: '/og.png',
    en: {
      eyebrow: 'iOS prep · Swift / SwiftUI / UIKit',
      title: ['Ready for the', 'iOS interview.'],
      desc: 'Swift, SwiftUI, UIKit and iOS architecture — drilled with SRS, mock interviews, and AI grading. Recall mode forces real recall, not skim.',
      docTitle: 'iOS Interview Prep — Swift, SwiftUI, UIKit · prepiroshi',
      metaDesc: 'iOS interview questions with SRS scheduling and AI-graded answers. Swift, SwiftUI, UIKit, Combine, persistence, and architecture — 13 topics.',
    },
    ru: {
      eyebrow: 'Подготовка · iOS — Swift, SwiftUI, UIKit',
      title: ['Готов к', 'iOS-собесу.'],
      desc: 'Swift, SwiftUI, UIKit и iOS-архитектура — с SRS, mock-интервью и AI-проверкой. Recall-режим заставляет вспоминать, а не скроллить.',
      docTitle: 'Подготовка к iOS-собесу — Swift, SwiftUI, UIKit · prepiroshi',
      metaDesc: 'Вопросы для iOS-собеседования с SRS и AI-проверкой ответов. Swift, SwiftUI, UIKit, Combine, хранение, архитектура — 13 тем.',
    },
  },
  android: {
    platform: 'android',
    canonical: '/android',
    ogImage: '/og.png',
    en: {
      eyebrow: 'Android prep · Kotlin / Compose',
      title: ['Ready for the', 'Android interview.'],
      desc: 'Kotlin, coroutines, Jetpack Compose, and Android architecture — drilled with SRS, mock interviews, and AI grading. Built for senior screens, not Hello World.',
      docTitle: 'Android Interview Prep — Kotlin, Compose · prepiroshi',
      metaDesc: 'Android interview questions with SRS, mocks, and AI-graded answers. Kotlin, coroutines, Jetpack Compose, performance, DI — 12 topics, senior-ready.',
    },
    ru: {
      eyebrow: 'Подготовка · Android — Kotlin, Compose',
      title: ['Готов к', 'Android-собесу.'],
      desc: 'Kotlin, корутины, Jetpack Compose и Android-архитектура — с SRS, mock-интервью и AI-проверкой. Заточено под senior-секции, не Hello World.',
      docTitle: 'Подготовка к Android-собесу — Kotlin, Compose · prepiroshi',
      metaDesc: 'Вопросы для Android-собеседования с SRS и AI-проверкой. Kotlin, корутины, Jetpack Compose, perf, DI — 12 тем, до senior-уровня.',
    },
  },
  kmp: {
    // Cross-platform stack in our taxonomy = KMP / Compose Multiplatform.
    platform: 'cross',
    canonical: '/kmp',
    ogImage: '/og.png',
    en: {
      eyebrow: 'KMP & Compose Multiplatform',
      title: ['Ready for the', 'KMP interview.'],
      desc: 'Kotlin Multiplatform and Compose Multiplatform fundamentals — for the rare cross-platform Kotlin interview. Curated questions, SRS scheduling, AI grading.',
      docTitle: 'KMP / Compose Multiplatform Interview Prep — prepiroshi',
      metaDesc: 'Kotlin Multiplatform and Compose Multiplatform interview prep — shared modules, expect/actual, KMP+Compose stack interop. SRS + AI grading.',
    },
    ru: {
      eyebrow: 'Подготовка · KMP & Compose Multiplatform',
      title: ['Готов к', 'KMP-собесу.'],
      desc: 'Основы Kotlin Multiplatform и Compose Multiplatform — для редкой, но точечной собеседовательной секции по cross-platform Kotlin. SRS + AI-проверка.',
      docTitle: 'Подготовка к KMP / Compose Multiplatform собесу — prepiroshi',
      metaDesc: 'Подготовка к собесу по Kotlin Multiplatform и Compose Multiplatform — shared-модули, expect/actual, interop. SRS и AI-проверка.',
    },
  },
};

export const LANDING_KEYS: string[] = Object.keys(LANDINGS);
