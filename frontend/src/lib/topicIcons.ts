import {
  Activity, AppWindow, Binary, Blocks, Braces, Cable, Code, Component, Cpu,
  FlaskConical, Gauge, Globe, HardDrive, Hourglass, LayoutGrid, Layers,
  MonitorSmartphone, Network, Plug, Puzzle, Rocket, Route, Ruler, Shapes, Share2,
  ShieldCheck, Smartphone, ToggleRight, Waves, Workflow, type LucideIcon,
} from 'lucide-react';

/**
 * One icon per topic, from the same lucide set the rest of the chrome uses,
 * so a topic reads as a picture rather than two letters. The mapping is by
 * *concept*, not by stack: "Networking & REST", "iOS Networking" and "Android
 * Networking" all get the globe, so the same idea looks the same in every
 * sidebar group and a returning eye finds it without reading.
 */
export const TOPIC_ICONS_BY_SLUG: Record<string, LucideIcon> = {
  // Language basics / OOP / advanced
  'dart-basics': Code,
  'swift-basics': Code,
  'kotlin-basics': Code,
  'oop-dart': Shapes,
  'swift-oop-protocols': Shapes,
  'kotlin-oop': Shapes,
  'advanced-dart': Braces,
  'swift-advanced': Braces,
  'kotlin-advanced': Braces,

  // UI frameworks
  'flutter-fundamentals': Component,
  'swiftui-fundamentals': Component,
  'compose-fundamentals': Component,
  'basic-widgets': LayoutGrid,
  'uikit-fundamentals': AppWindow,
  'uikit-layout': Ruler,
  'navigation-routing': Route,

  // State
  'basic-state': ToggleRight,
  'swiftui-state': ToggleRight,
  'compose-state': ToggleRight,
  provider: Share2,
  bloc: Workflow,
  'advanced-state': Waves,

  // Async & reactive
  'async-futures': Hourglass,
  'swift-concurrency': Hourglass,
  'kotlin-coroutines': Hourglass,
  streams: Activity,
  combine: Activity,

  // Data
  networking: Globe,
  'ios-networking': Globe,
  'android-networking': Globe,
  'local-storage': HardDrive,
  'ios-persistence': HardDrive,
  'android-persistence': HardDrive,

  // Structure & quality
  architecture: Blocks,
  'ios-architecture': Blocks,
  'android-architecture': Blocks,
  'design-patterns': Puzzle,
  'android-di': Plug,
  dsa: Binary,
  testing: FlaskConical,
  security: ShieldCheck,
  'mobile-security': ShieldCheck,
  performance: Gauge,
  'ios-performance': Gauge,
  'android-performance': Gauge,
  'flutter-internals': Cpu,
  'platform-channels': Cable,

  // Platform & delivery
  'android-fundamentals': Smartphone,
  cicd: Rocket,
  'mobile-cicd': Rocket,
  kmp: Layers,
  'compose-multiplatform': MonitorSmartphone,
  'mobile-system-design': Network,
};

/** A topic added later without a slug entry still gets its category's icon. */
export const TOPIC_ICONS_BY_CATEGORY: Record<string, LucideIcon> = {
  Dart: Code,
  Swift: Code,
  Kotlin: Code,
  Flutter: Component,
  SwiftUI: Component,
  Compose: Component,
  UIKit: AppWindow,
  State: ToggleRight,
  Quality: FlaskConical,
  Architecture: Blocks,
  'CS Fundamentals': Binary,
  Native: Cable,
  DevOps: Rocket,
  iOS: Smartphone,
  Android: Smartphone,
  'Cross-Platform': Layers,
  Mobile: Network,
};
