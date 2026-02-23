// Static data — all topics and questions
// Progress is saved separately in data/progress.json

const topics = [
  // JUNIOR
  { id: 1,  title: 'Dart Basics',           slug: 'dart-basics',         level: 'junior', category: 'Dart',           description: 'Variables, types, functions, null safety, and core Dart syntax',           icon: '🎯', order_index: 1  },
  { id: 2,  title: 'OOP in Dart',            slug: 'oop-dart',            level: 'junior', category: 'Dart',           description: 'Classes, inheritance, interfaces, mixins, and abstract classes',           icon: '🏗️', order_index: 2  },
  { id: 3,  title: 'Flutter Fundamentals',   slug: 'flutter-fundamentals',level: 'junior', category: 'Flutter',        description: 'Widget tree, StatelessWidget, StatefulWidget, BuildContext',                icon: '💙', order_index: 3  },
  { id: 4,  title: 'Basic Widgets',          slug: 'basic-widgets',       level: 'junior', category: 'Flutter',        description: 'Core layout widgets: Container, Row, Column, Stack, ListView',             icon: '🧩', order_index: 4  },
  { id: 5,  title: 'Navigation & Routing',   slug: 'navigation-routing',  level: 'junior', category: 'Flutter',        description: 'Navigator, named routes, go_router, passing data between screens',        icon: '🧭', order_index: 5  },
  { id: 6,  title: 'Basic State Management', slug: 'basic-state',         level: 'junior', category: 'State',          description: 'setState, InheritedWidget, ValueNotifier',                                icon: '🔄', order_index: 6  },
  { id: 7,  title: 'Async & Futures',        slug: 'async-futures',       level: 'junior', category: 'Dart',           description: 'Future, async/await, then/catchError, FutureBuilder',                    icon: '⏳', order_index: 7  },
  // MID
  { id: 8,  title: 'Streams & Rx',           slug: 'streams',             level: 'mid',    category: 'Dart',           description: 'Streams, StreamController, StreamBuilder, broadcast streams',             icon: '🌊', order_index: 8  },
  { id: 9,  title: 'Advanced Dart',          slug: 'advanced-dart',       level: 'mid',    category: 'Dart',           description: 'Generics, extensions, mixins, isolates, dart:core advanced',              icon: '🔬', order_index: 9  },
  { id: 10, title: 'State — Provider',       slug: 'provider',            level: 'mid',    category: 'State',          description: 'Provider package, ChangeNotifier, Consumer, context.watch/read/select',   icon: '📦', order_index: 10 },
  { id: 11, title: 'State — BLoC',           slug: 'bloc',                level: 'mid',    category: 'State',          description: 'BLoC pattern, Cubit, Events, States, BlocBuilder, BlocConsumer',         icon: '🧱', order_index: 11 },
  { id: 12, title: 'Networking & REST',      slug: 'networking',          level: 'mid',    category: 'Flutter',        description: 'http, Dio, REST APIs, JSON serialization, interceptors',                  icon: '🌐', order_index: 12 },
  { id: 13, title: 'Local Storage',          slug: 'local-storage',       level: 'mid',    category: 'Flutter',        description: 'SharedPreferences, sqflite, Hive, flutter_secure_storage',               icon: '💾', order_index: 13 },
  { id: 14, title: 'Testing',               slug: 'testing',             level: 'mid',    category: 'Quality',        description: 'Unit tests, widget tests, integration tests, mocking',                    icon: '🧪', order_index: 14 },
  { id: 15, title: 'Architecture Patterns',  slug: 'architecture',        level: 'mid',    category: 'Architecture',   description: 'MVC, MVP, MVVM, Clean Architecture, Repository pattern',                  icon: '🏛️', order_index: 15 },
  // SENIOR
  { id: 16, title: 'Design Patterns',        slug: 'design-patterns',     level: 'senior', category: 'Architecture',   description: 'Singleton, Factory, Observer, Builder, Strategy, Command in Flutter',     icon: '📐', order_index: 16 },
  { id: 17, title: 'Data Structures & Algo', slug: 'dsa',                 level: 'senior', category: 'CS Fundamentals',description: 'Arrays, trees, graphs, sorting, searching, Big O notation',               icon: '📊', order_index: 17 },
  { id: 18, title: 'Platform Channels',      slug: 'platform-channels',   level: 'senior', category: 'Native',         description: 'MethodChannel, EventChannel, plugin development, FFI',                    icon: '📱', order_index: 18 },
  { id: 19, title: 'Performance',            slug: 'performance',         level: 'senior', category: 'Flutter',        description: 'Rendering pipeline, jank, memory leaks, profiling tools',                icon: '⚡', order_index: 19 },
  { id: 20, title: 'State — Riverpod',       slug: 'advanced-state',      level: 'senior', category: 'State',          description: 'Riverpod providers, AsyncNotifier, ref, code generation',                 icon: '🎯', order_index: 20 },
  { id: 21, title: 'Security',               slug: 'security',            level: 'senior', category: 'Quality',        description: 'Secure storage, certificate pinning, obfuscation, OWASP mobile top 10',  icon: '🔐', order_index: 21 },
  { id: 22, title: 'CI/CD & DevOps',         slug: 'cicd',                level: 'senior', category: 'DevOps',         description: 'GitHub Actions, Fastlane, Firebase Distribution, flavors',                icon: '🚀', order_index: 22 },
  { id: 23, title: 'Flutter Internals',      slug: 'flutter-internals',   level: 'senior', category: 'Flutter',        description: 'Three trees, RenderObject, Element tree, BuildOwner, rendering pipeline', icon: '🔧', order_index: 23 },
];

let _qid = 1;
const q = (topic_id, order_index, difficulty, question, answer, code_example, code_language = 'dart') => ({
  id: _qid++, topic_id, order_index, difficulty, question, answer, code_example, code_language,
});

const bulkTopicCycle = [
  1, 2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23,
];

const bulkQuestionThemes = [
  {
    title: 'debugging strategy',
    answer: 'Start with reproducible steps, isolate the failing widget or service, inspect logs with meaningful context, then confirm the fix with tests.',
    code: `void debugFlow(String step) {
  assert(step.isNotEmpty);
  debugPrint('[debug] step: $step');
}`,
  },
  {
    title: 'performance optimization',
    answer: 'Measure first with DevTools, remove unnecessary rebuilds, cache expensive operations, and prefer const constructors where possible.',
    code: `class FastTitle extends StatelessWidget {
  const FastTitle({super.key});

  @override
  Widget build(BuildContext context) {
    return const Text('Optimized Widget');
  }
}`,
  },
  {
    title: 'state management trade-offs',
    answer: 'Choose the simplest solution that fits scale: local state for small screens, Provider/Riverpod/BLoC for shared or asynchronous flows.',
    code: `final counter = ValueNotifier<int>(0);

void increment() => counter.value++;`,
  },
  {
    title: 'error handling',
    answer: 'Catch expected failures at boundaries, map technical exceptions to user-friendly messages, and keep stack traces for diagnostics.',
    code: `Future<String> safeLoad() async {
  try {
    return await Future.value('ok');
  } catch (e, st) {
    debugPrint('error: $e\n$st');
    return 'fallback';
  }
}`,
  },
  {
    title: 'testing approach',
    answer: 'Use unit tests for business logic, widget tests for UI behavior, and integration tests for critical user flows.',
    code: `test('sum works', () {
  expect(2 + 2, 4);
});`,
  },
  {
    title: 'API integration',
    answer: 'Model API responses with typed DTOs, validate nullable fields, and centralize request/retry logic in a data layer.',
    code: `class UserDto {
  final String id;
  final String name;

  UserDto({required this.id, required this.name});

  factory UserDto.fromJson(Map<String, dynamic> json) {
    return UserDto(id: json['id'] as String, name: json['name'] as String);
  }
}`,
  },
  {
    title: 'clean architecture boundaries',
    answer: 'Keep UI, domain, and data layers independent; dependencies should point inward to make the core testable and stable.',
    code: `abstract class GetProfile {
  Future<String> call(String id);
}`,
  },
  {
    title: 'null safety best practices',
    answer: 'Model optional data explicitly with nullable types, avoid overusing !, and handle nulls close to data boundaries.',
    code: `String labelFor(String? value) {
  return value?.trim().isNotEmpty == true ? value! : 'Unknown';
}`,
  },
  {
    title: 'stream handling',
    answer: 'Cancel subscriptions in dispose, debounce noisy sources, and keep transformation logic in dedicated services or blocs.',
    code: `late final StreamSubscription<int> sub;

void start(Stream<int> source) {
  sub = source.listen((value) => debugPrint('value: $value'));
}`,
  },
  {
    title: 'code review readiness',
    answer: 'Submit small focused changes, document non-obvious decisions, and include tests that prove behavior before and after.',
    code: `/// Explains why this fallback exists for older API versions.
String normalizeName(String input) => input.trim();`,
  },
];

const bulkDifficultyCycle = ['easy', 'medium', 'hard'];

const bulkFocusAreas = [
  'widget lifecycle',
  'BuildContext usage',
  'navigation guards',
  'form validation',
  'async loading states',
  'pagination strategy',
  'offline-first sync',
  'secure storage',
  'dependency injection',
  'code generation',
  'platform channels',
  'render performance',
  'memory leak prevention',
  'feature flags',
  'CI reliability',
  'accessibility',
  'internationalization',
  'error reporting',
  'analytics instrumentation',
  'release rollback plan',
];

const generateBulkQuestions = (count = 110) =>
  Array.from({ length: count }, (_, index) => {
    const topicId = bulkTopicCycle[index % bulkTopicCycle.length];
    const theme = bulkQuestionThemes[index % bulkQuestionThemes.length];
    const focus = bulkFocusAreas[index % bulkFocusAreas.length];
    const difficulty = bulkDifficultyCycle[index % bulkDifficultyCycle.length];
    const orderIndex = 100 + Math.floor(index / bulkTopicCycle.length) + 1;
    const number = index + 1;

    return q(
      topicId,
      orderIndex,
      difficulty,
      `Interview scenario #${number}: How would you handle ${theme.title} for ${focus} in a Flutter app?`,
      `${theme.answer}\n\nFocus area: ${focus}. In interviews, explain trade-offs, failure modes, and how you would validate the result in production.`,
      `${theme.code}\n\n// Focus area\nconst String focusArea = '${focus}';\nvoid discuss() {\n  debugPrint('Scenario ${number}: $focusArea');\n}`,
    );
  });

const questions = [

  // ══ DART BASICS (1) ══════════════════════════════════════════════════════
  q(1, 1, 'easy',
    'What is null safety in Dart and what are nullable vs non-nullable types?',
    `Null safety (Dart 2.12+) means variables cannot be null by default — you must explicitly opt-in with the ? suffix.

• Non-nullable: String name = 'Alice'; — must always have a value
• Nullable: String? name; — can be null
• Late: late String name; — non-nullable but initialized later

Key operators:
• ?. (null-aware access): user?.email
• ?? (null coalescing): name ?? 'Guest'
• ??= (null assignment): name ??= 'Default'
• ! (non-null assertion): name! — throws if null at runtime`,
    `// Non-nullable — must be initialized
String name = 'Alice';

// Nullable
String? email;
print(email?.length); // null (safe access)

// Null coalescing
String display = email ?? 'No email';

// Late initialization
late final String config;
void init() {
  config = loadConfig(); // assigned before use
}

// Null assertion (use carefully!)
String? maybeNull = getUser();
print(maybeNull!.length); // throws if null

// Conditional assignment
email ??= 'default@mail.com';

// Pattern: required in functions
void greet({required String name}) {
  print('Hello, \$name');
}`),

  q(1, 2, 'easy',
    'What are the main data types in Dart?',
    `Dart is statically typed with these core types:

• int — 64-bit integer
• double — 64-bit floating point
• num — parent of int and double
• String — immutable UTF-16 string
• bool — true/false
• List<T> — ordered, indexed collection
• Map<K,V> — key-value pairs, keys unique
• Set<T> — unordered unique elements
• dynamic — disables type checking (avoid!)
• Object? — root of the type hierarchy
• void — no return value
• Never — function that never returns (throws/loops)`,
    `int age = 30;
double salary = 75000.50;
num anything = 3; // can be int or double

String name = 'Flutter';
String interpolated = 'Hello, \$name! Age: \${age + 1}';
String multi = """
  Multi-line
  string
""";

bool isActive = true;

List<String> skills = ['Dart', 'Flutter'];
skills.add('Firebase');

Map<String, int> scores = {'Alice': 95, 'Bob': 87};
scores['Carol'] = 92;

Set<String> tags = {'flutter', 'dart'};
tags.add('dart'); // no duplicate — still 2 items

// Type checking
print(age.runtimeType);  // int
print(3.14 is double);   // true
print(3 is num);          // true`),

  q(1, 3, 'easy',
    'Explain the difference between final and const in Dart.',
    `Both prevent reassignment, but differ in when the value is determined:

• final — set once at RUNTIME. Can hold values computed when the app runs.
• const — compile-time constant. Value must be known at compile time (literals, const expressions).

const objects are canonicalized — two identical const objects share the same memory instance.
In Flutter: use const for widget constructors to enable the framework's optimization (widget tree diffing skips const widgets).`,
    `// final — runtime value OK
final name = 'Alice';
final now = DateTime.now(); // ✅ runtime value

// const — compile-time only
const pi = 3.14159;
const maxItems = 100;
// const now = DateTime.now(); // ❌ ERROR

// Deeply immutable const collections
const colors = ['red', 'green', 'blue'];
// colors.add('yellow'); // throws — unmodifiable

// Const constructors — Flutter optimization
const Text('Hello'); // Flutter reuses this instance
// Widget tree diff sees const → skips reconciliation

// Canonicalization
class Circle {
  final double radius;
  const Circle(this.radius);
}
const a = Circle(1.0);
const b = Circle(1.0);
print(identical(a, b)); // true — same object!

// Best practice in Flutter:
class MyWidget extends StatelessWidget {
  const MyWidget({super.key}); // const constructor
  @override Widget build(BuildContext context) => const Text('Hi');
}`),

  q(1, 4, 'medium',
    'What are arrow functions, anonymous functions, and closures in Dart?',
    `Dart supports multiple function styles:

• Named functions — standard declaration with return type
• Arrow functions — single-expression shorthand using =>
• Anonymous functions (lambdas) — unnamed, often passed as arguments
• Closures — functions that capture variables from their enclosing scope

Closures are key to Flutter callbacks, stream handlers, and functional operations on collections.`,
    `// Named function
int add(int a, int b) => a + b;

// Arrow — single expression only
double circle(double r) => 3.14159 * r * r;

// Anonymous function stored in variable
var greet = (String name) => 'Hello, \$name!';

// Optional named parameters
void log(String msg, {String? level, bool timestamp = true}) {}
log('Error', level: 'ERROR');

// Optional positional
String format(String text, [String prefix = '']) => '\$prefix\$text';

// Higher-order functions (functions taking/returning functions)
List<int> nums = [1, 2, 3, 4, 5];
var doubled = nums.map((n) => n * 2).toList();  // [2,4,6,8,10]
var evens   = nums.where((n) => n.isEven).toList(); // [2,4]
var sum     = nums.fold<int>(0, (acc, n) => acc + n); // 15

// Closure — captures surrounding scope
Function makeCounter() {
  int count = 0;            // captured variable
  return () => ++count;     // closes over 'count'
}
var counter = makeCounter();
print(counter()); // 1
print(counter()); // 2

// typedef for reusable function types
typedef Predicate<T> = bool Function(T);
Predicate<int> isEven = (n) => n % 2 == 0;`),

  q(1, 5, 'medium',
    'Explain Dart collections: List, Map, Set and their common operations.',
    `Three main collections in dart:core:

List<T> — ordered, indexed, allows duplicates
Map<K,V> — unordered key-value pairs, unique keys
Set<T> — unordered, unique elements

All support collection-if, collection-for, and spread operators for expressive construction.`,
    `// ── LIST ──────────────────────────────────────────
var fruits = <String>['apple', 'banana', 'cherry'];
fruits.add('date');
fruits.remove('banana');
fruits.sort();

// Functional operations — return new lists
final upper  = fruits.map((f) => f.toUpperCase()).toList();
final long   = fruits.where((f) => f.length > 5).toList();
final total  = [1,2,3].fold<int>(0, (sum, x) => sum + x); // 6
final hasLong = fruits.any((f) => f.length > 6);   // bool
final allUpper = upper.every((f) => f == f.toUpperCase()); // true

// ── MAP ────────────────────────────────────────────
var user = <String, dynamic>{'name': 'Alice', 'age': 30};
user['email'] = 'alice@mail.com';
user.remove('age');
print(user.keys);            // (name, email)
print(user.containsKey('name')); // true
final mapped = user.map((k, v) => MapEntry(k, '\$v'));

// ── SET ────────────────────────────────────────────
var a = {1, 2, 3, 4};
var b = {3, 4, 5, 6};
print(a.union(b));        // {1,2,3,4,5,6}
print(a.intersection(b)); // {3,4}
print(a.difference(b));   // {1,2}

// ── Collection if/for & spread ─────────────────────
bool show = true;
var list = [
  'always',
  if (show) 'conditional',
  ...['spread1', 'spread2'],
  for (var i in [1,2,3]) 'item\$i',
];`),

  // ══ OOP IN DART (2) ═══════════════════════════════════════════════════════
  q(2, 1, 'easy',
    'Explain classes, constructors, and named constructors in Dart.',
    `Every class in Dart automatically extends Object. Constructor types:

• Default — same name as class, can use initializer shorthand (this.field)
• Named — ClassName.name(...), for alternative creation paths
• Factory — can return existing instances or subtypes; used for fromJson patterns
• Const — for compile-time constant objects
• Redirecting — delegates to another constructor with :this(...)

Initializer list (: field = value before body) runs before the constructor body — required for initializing final fields.`,
    `class User {
  final String name;
  final String email;
  int age;

  // Default constructor with initializer shorthand
  User(this.name, this.email, {required this.age});

  // Named constructor
  User.guest() : name = 'Guest', email = '', age = 0;

  // Factory constructor (can return cached/subtype)
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      json['name'] as String,
      json['email'] as String,
      age: json['age'] as int,
    );
  }

  // Redirecting constructor
  User.admin(String email) : this('Admin', email, age: 99);

  // Getter
  bool get isGuest => name == 'Guest';

  // Setter with validation
  set displayAge(int value) {
    if (value >= 0) age = value;
  }

  Map<String, dynamic> toJson() => {'name': name, 'email': email, 'age': age};

  @override
  String toString() => 'User(\$name, \$email, age: \$age)';
}

// Usage
final alice = User('Alice', 'alice@mail.com', age: 30);
final guest = User.guest();
final bob   = User.fromJson({'name': 'Bob', 'email': 'b@m.com', 'age': 25});`),

  q(2, 2, 'medium',
    'What is the difference between abstract class, interface, and mixin in Dart?',
    `Dart uses a unified class system with keywords that define usage:

• abstract class — cannot be instantiated; can have abstract (no body) and concrete methods. Used as a base class via extends.
• interface — no keyword; any class can act as an interface via implements. You must implement ALL members (no implementation reuse).
• mixin — reusable code mixed into classes via with. Can have state, concrete methods, but cannot be instantiated.

Key rules:
• extends → single inheritance, reuses parent implementation
• implements → contract only, must reimplement everything
• with → multiple mixins allowed, copies members into class`,
    `// Abstract class
abstract class Shape {
  double area();  // abstract — subclasses must implement
  String describe() => 'Area: \${area().toStringAsFixed(2)}'; // concrete
}

// Mixin — reusable behavior
mixin Logging {
  void log(String msg) => print('[\${runtimeType}] \$msg');
}

mixin Validatable {
  bool isValid(); // abstract in mixin
  void validateOrThrow() {
    if (!isValid()) throw StateError('Validation failed');
  }
}

// Interface usage via implements
abstract class Serializable {
  Map<String, dynamic> toJson();
}

// Combining everything
class Circle extends Shape with Logging, Validatable
    implements Serializable {
  final double radius;
  Circle(this.radius);

  @override double area() => 3.14159 * radius * radius;
  @override bool isValid() => radius > 0;
  @override Map<String, dynamic> toJson() => {'radius': radius, 'area': area()};
}

// 'mixin on' — restricts mixin usage to specific type
mixin AnimationMixin on StatefulWidget {
  void startAnimation() {}
}

// Difference in practice:
// extends → IS-A, reuse code
// implements → CAN-DO, fulfill contract
// with → HAS-A behavior, compose without inheritance`),

  q(2, 3, 'medium',
    'What are extensions in Dart and when would you use them?',
    `Extensions (Dart 2.7+) add methods/getters to existing types without modifying or subclassing them.

Use cases:
• Utility methods on String, int, List, DateTime
• Adding methods to third-party types you don't own
• Flutter: widget helper methods for cleaner widget trees
• Organizing helpers close to the type they extend

Limitations:
• Cannot add instance variables (only methods, getters, setters, operators)
• Cannot override existing methods
• Not visible unless imported`,
    `// String extensions
extension StringX on String {
  String get capitalized =>
      isEmpty ? '' : '\${this[0].toUpperCase()}\${substring(1)}';

  bool get isEmail =>
      RegExp(r'^[\\w.+-]+@[\\w-]+\\.[\\w.]+\$').hasMatch(this);

  String truncate(int max, {String ellipsis = '...'}) =>
      length <= max ? this : '\${substring(0, max)}\$ellipsis';
}

// int/Duration extensions
extension IntX on int {
  Duration get seconds      => Duration(seconds: this);
  Duration get milliseconds => Duration(milliseconds: this);
  Duration get minutes      => Duration(minutes: this);
}

// List extensions
extension ListX<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
  List<List<T>> chunked(int size) => [
    for (var i = 0; i < length; i += size)
      sublist(i, (i + size).clamp(0, length)),
  ];
}

// Flutter Widget extension (DX improvement)
extension WidgetX on Widget {
  Widget padAll(double v) => Padding(padding: EdgeInsets.all(v), child: this);
  Widget center() => Center(child: this);
  Widget expanded([int flex = 1]) => Expanded(flex: flex, child: this);
}

// Usage
print('hello'.capitalized);       // Hello
print(3.seconds);                  // 0:00:03.000000
print([1,2,3,4,5].chunked(2));    // [[1,2],[3,4],[5]]
// Text('Title').padAll(16).center()`),

  // ══ FLUTTER FUNDAMENTALS (3) ══════════════════════════════════════════════
  q(3, 1, 'easy',
    'What is Flutter and how does it differ from other cross-platform frameworks?',
    `Flutter is Google's UI toolkit for building natively compiled apps from a single codebase for mobile, web, and desktop.

Key differentiators:
• Own rendering engine (Skia / Impeller) — doesn't use native UI widgets; Flutter draws every pixel itself → pixel-perfect, consistent across platforms
• Dart language — AOT compiled for production (fast), JIT for development (hot reload)
• Widget-based — everything is a widget, composable by design
• No JavaScript bridge — unlike React Native, Flutter talks directly to the GPU via its engine

vs React Native: Uses native UI components via JS bridge → platform-native look, but bridge overhead and platform inconsistencies
vs Xamarin: Shares business logic, native UI per platform — no shared UI layer
vs Flutter: Shares everything including UI, own renderer → fastest UI updates, consistent

Architecture layers: Dart app → Flutter Framework → Flutter Engine (C++) → Skia/Impeller → GPU`,
    `// Everything in Flutter is a widget composed together
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Hello, Flutter!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {},
              child: const Text('Press Me'),
            ),
          ],
        ),
      ),
    );
  }
}`),

  q(3, 2, 'easy',
    'What is the difference between StatelessWidget and StatefulWidget?',
    `StatelessWidget — immutable description of UI. Rebuild only when parent provides new data. Use when the widget's appearance depends only on its constructor arguments.

StatefulWidget — splits into Widget (immutable config) + State (mutable). Call setState() to schedule a rebuild. Use for user interactions, animations, network data.

Why the split? Widget objects are lightweight and cheap to recreate on every build. State objects are heavy and persist — they hold the actual data.

Lifecycle (StatefulWidget State):
createState → initState → didChangeDependencies → build → setState → build → deactivate → dispose`,
    `// StatelessWidget — pure function of its inputs
class GreetingCard extends StatelessWidget {
  final String name;
  final Color color;
  const GreetingCard({super.key, required this.name, this.color = Colors.blue});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: color.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text('Hello, \$name!'),
      ),
    );
  }
}

// StatefulWidget — owns mutable state
class Counter extends StatefulWidget {
  const Counter({super.key});
  @override State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  @override
  void initState() {
    super.initState();
    // One-time setup: init controllers, start subscriptions
  }

  @override
  void dispose() {
    // Clean up controllers, subscriptions — ALWAYS call super.dispose()
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: \$_count', style: const TextStyle(fontSize: 32)),
        ElevatedButton(
          onPressed: () => setState(() => _count++),
          child: const Text('+'),
        ),
      ],
    );
  }
}`),

  q(3, 3, 'medium',
    'What is BuildContext and why is it important?',
    `BuildContext is a handle to a widget's location in the widget tree. Every build() receives a context that represents THAT widget's position.

Key uses:
• Theme.of(context) — material theme data
• Navigator.of(context) — push/pop screens
• MediaQuery.of(context) — screen size, orientation, padding
• Scaffold.of(context) — show snackbar, open drawer
• Provider.of<T>(context) — state access

Critical pitfalls:
• Never use context after async gaps without checking mounted
• Each widget has its OWN context — don't use parent context in child
• Context from an ancestor might not have access to a descendant's inherited widgets`,
    `class MyWidget extends StatefulWidget {
  const MyWidget({super.key});
  @override State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  @override
  Widget build(BuildContext context) {
    // Reading theme
    final colorScheme = Theme.of(context).colorScheme;

    // Screen dimensions
    final size = MediaQuery.sizeOf(context);
    final isTablet = size.width >= 600;

    return Scaffold(
      body: Column(children: [
        Text('Width: \${size.width.toInt()}',
            style: TextStyle(color: colorScheme.primary)),
        ElevatedButton(
          onPressed: () => _doAsync(context),
          child: const Text('Go'),
        ),
      ]),
    );
  }

  Future<void> _doAsync(BuildContext context) async {
    // ✅ Capture what you need BEFORE the async gap
    final nav = Navigator.of(context);
    await Future.delayed(const Duration(seconds: 1));

    // ✅ Check mounted after every async gap
    if (!mounted) return;

    nav.pushNamed('/next'); // safe — navigator captured before gap
  }
}`),

  q(3, 4, 'medium',
    'What is the widget lifecycle in Flutter?',
    `StatelessWidget: Constructor → build()

StatefulWidget State lifecycle:
1. createState() — creates the State object
2. initState() — called ONCE after insertion into tree. Set up controllers, subscriptions.
3. didChangeDependencies() — after initState(), and when an InheritedWidget ancestor changes
4. build() — returns widget tree; called on setState() or when dependencies change
5. didUpdateWidget(oldWidget) — when parent passes new configuration (new widget props)
6. setState() — marks dirty, schedules rebuild
7. deactivate() — temporarily removed from tree (might be reinserted)
8. dispose() — permanently removed. Cancel subscriptions, dispose controllers.`,
    `class RichLifecycleWidget extends StatefulWidget {
  final String config;
  const RichLifecycleWidget({super.key, required this.config});
  @override State<RichLifecycleWidget> createState() => _State();
}

class _State extends State<RichLifecycleWidget> {
  late TextEditingController _ctrl;
  late AnimationController _anim;

  @override
  void initState() {
    super.initState(); // always first
    _ctrl = TextEditingController(text: widget.config);
    // DON'T use context here for InheritedWidgets — use didChangeDependencies
    print('initState: config=\${widget.config}');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Safe to use context here — InheritedWidget reads
    final locale = Localizations.localeOf(context);
    print('locale: \$locale');
  }

  @override
  void didUpdateWidget(RichLifecycleWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.config != widget.config) {
      _ctrl.text = widget.config; // react to config change
    }
  }

  @override
  Widget build(BuildContext context) => TextField(controller: _ctrl);

  @override
  void dispose() {
    _ctrl.dispose();   // ✅ prevent memory leak
    // _anim.dispose(); // dispose all controllers
    super.dispose();   // always last
  }
}`),

  // ══ BASIC WIDGETS (4) ═════════════════════════════════════════════════════
  q(4, 1, 'easy',
    'What is the difference between Container, SizedBox, Padding, and ColoredBox?',
    `Use the simplest widget that meets your needs — Flutter optimizes simpler widget trees.

• SizedBox — constraints only (width/height). Lightest spacer widget.
• Padding — only adds padding. More efficient than Container for this.
• ColoredBox — only sets background color. Cheaper than Container.
• DecoratedBox — decoration (border, shadow, gradient) without size.
• Container — combines sizing + padding + margin + decoration + transform. Creates multiple intermediary widgets internally. Use only when you need multiple features at once.`,
    `// ── Lightweight options (prefer these) ────────────
const SizedBox(width: 16, height: 16)  // spacer
const SizedBox.expand()                 // fills available space
const SizedBox.shrink()                 // 0×0 invisible

Padding(
  padding: const EdgeInsets.symmetric(horizontal: 16),
  child: Text('Padded'),
)

const ColoredBox(
  color: Colors.blue,
  child: Text('Colored'),
)

// ── Container — when you need multiple properties ──
Container(
  width: 200, height: 100,
  margin: const EdgeInsets.all(8),
  padding: const EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: Colors.blue.shade100,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: Colors.blue, width: 2),
    boxShadow: const [
      BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 4)),
    ],
  ),
  child: const Text('Box'),
)

// ── Performance tips ────────────────────────────────
// ✅ Just padding:
Padding(padding: const EdgeInsets.all(8), child: child)
// ❌ Wasteful (Container creates extra widgets):
Container(padding: const EdgeInsets.all(8), child: child)`),

  q(4, 2, 'easy',
    'Explain Row, Column, and Stack with their key properties.',
    `Row — horizontal layout (main axis = horizontal)
Column — vertical layout (main axis = vertical)
Stack — overlapping layers (z-axis)

Row/Column key properties:
• mainAxisAlignment: start, end, center, spaceBetween, spaceAround, spaceEvenly
• crossAxisAlignment: start, end, center, stretch, baseline
• mainAxisSize: max (fill space), min (wrap children)

Stack key properties:
• alignment — default position for un-positioned children
• fit — StackFit.loose (children choose size) or StackFit.expand
• Positioned — absolute positioning within Stack`,
    `// Row
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  crossAxisAlignment: CrossAxisAlignment.center,
  children: [
    const Icon(Icons.star, color: Colors.amber),
    const Text('Rating'),
    const Text('4.5', style: TextStyle(fontWeight: FontWeight.bold)),
  ],
)

// Column with shrink-wrap
Column(
  mainAxisSize: MainAxisSize.min,
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    const Text('Title', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
    const SizedBox(height: 8),
    const Text('Subtitle', style: TextStyle(color: Colors.grey)),
  ],
)

// Expanded & Flexible — control how children fill main axis
Row(
  children: [
    Expanded(child: TextField()),         // fills remaining space
    const SizedBox(width: 8),
    ElevatedButton(onPressed: () {}, child: const Text('Send')),
  ],
)
// Flexible(flex: 2, child: ...) — proportional sizing

// Stack
Stack(
  alignment: Alignment.center,
  children: [
    // Back layer
    Image.network('https://picsum.photos/400/200', fit: BoxFit.cover),
    // Semi-transparent overlay
    Container(color: Colors.black38),
    // Absolute position
    Positioned(
      bottom: 16, right: 16,
      child: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
    ),
    // Centered text
    const Text('Overlay', style: TextStyle(color: Colors.white, fontSize: 24)),
  ],
)`),

  q(4, 3, 'medium',
    'What is the difference between ListView, GridView, and CustomScrollView?',
    `ListView — scrollable list (single axis):
• ListView() — all children built immediately (small, fixed lists only)
• ListView.builder() — lazy rendering, efficient for large/infinite lists
• ListView.separated() — adds separators between items

GridView — 2D scrollable grid:
• GridView.count() — fixed column count
• GridView.builder() — lazy, efficient
• GridView.extent() — fixed max item cross-axis size

CustomScrollView — compose multiple scroll areas as slivers in one coordinated scroll view. Most flexible, most complex. Use SliverAppBar, SliverList, SliverGrid, SliverToBoxAdapter.`,
    `// ListView.builder — for any dynamic list
ListView.builder(
  itemCount: items.length,
  itemExtent: 72.0,  // ✅ fixed height enables fast scrolling
  itemBuilder: (context, index) => ListTile(
    leading: CircleAvatar(child: Text('\${index + 1}')),
    title: Text(items[index].title),
    subtitle: Text(items[index].subtitle),
    onTap: () => navigate(items[index]),
  ),
)

// ListView.separated — with dividers
ListView.separated(
  itemCount: items.length,
  separatorBuilder: (_, __) => const Divider(height: 1),
  itemBuilder: (context, i) => ItemTile(item: items[i]),
)

// GridView.builder
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
    crossAxisSpacing: 8,
    mainAxisSpacing: 8,
    childAspectRatio: 0.75,
  ),
  itemCount: products.length,
  itemBuilder: (ctx, i) => ProductCard(product: products[i]),
)

// CustomScrollView — collapsing header + list
CustomScrollView(
  slivers: [
    SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      floating: true,
      flexibleSpace: FlexibleSpaceBar(title: const Text('Catalog')),
    ),
    SliverToBoxAdapter(
      child: Padding(padding: const EdgeInsets.all(16),
        child: Text('Products', style: Theme.of(context).textTheme.headlineSmall)),
    ),
    SliverGrid(
      delegate: SliverChildBuilderDelegate(
        (ctx, i) => ProductCard(product: products[i]), childCount: products.length,
      ),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2),
    ),
  ],
)`),

  // ══ NAVIGATION (5) ════════════════════════════════════════════════════════
  q(5, 1, 'easy',
    'Explain Navigator 1.0 (imperative) vs go_router (declarative).',
    `Navigator 1.0 — imperative, stack-based:
• push/pop/pushReplacement/pushAndRemoveUntil
• Simple but struggles with deep links, web URLs, and complex flows

Navigator 2.0 (Router API) — declarative, URL-driven:
• RouterDelegate + RouteInformationParser — complex to implement manually
• go_router (Google-maintained) wraps Navigator 2.0 into a simple API

Use go_router for: any app with deep linking, web URL support, or complex navigation graphs. Use Navigator 1.0 only for very simple apps with no URL routing.`,
    `// ── Navigator 1.0 ─────────────────────────────────────
// Push
Navigator.of(context).push(
  MaterialPageRoute(builder: (_) => const DetailScreen(id: 42)),
);
// Pop with value
Navigator.of(context).pop('result');
// Receive result
final result = await Navigator.of(context).push<String>(
  MaterialPageRoute(builder: (_) => const PickerScreen()),
);
// Clear stack (e.g. after login)
Navigator.of(context).pushAndRemoveUntil(
  MaterialPageRoute(builder: (_) => const HomeScreen()),
  (route) => false,
);

// ── go_router (recommended) ───────────────────────────
// pubspec: go_router: ^14.0.0

final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(
      path: '/product/:id',
      builder: (ctx, state) {
        final id = int.parse(state.pathParameters['id']!);
        return ProductScreen(id: id);
      },
      routes: [
        GoRoute(
          path: 'review',
          builder: (ctx, state) => ReviewScreen(
            id: int.parse(state.pathParameters['id']!),
          ),
        ),
      ],
    ),
    ShellRoute(
      builder: (ctx, state, child) => BottomNavShell(child: child),
      routes: [
        GoRoute(path: '/home',    builder: (_, __) => const HomeTab()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileTab()),
      ],
    ),
  ],
);

// Usage in widget
context.go('/product/42');         // replace
context.push('/product/42');       // push
context.push('/product/42/review');
context.pop();
context.goNamed('product', pathParameters: {'id': '42'});`),

  // ══ BASIC STATE (6) ═══════════════════════════════════════════════════════
  q(6, 1, 'easy',
    'How does setState work and what are its performance implications?',
    `setState() marks the State as dirty and schedules rebuild of build() for the next frame.

Performance: setState() rebuilds the ENTIRE subtree under the widget calling it. This is wasteful if only a small portion of the UI changed.

Optimization strategies:
• Extract unchanged subtrees into separate widgets (especially const widgets)
• Keep stateful widgets small and focused — only wrap what actually changes
• Use const constructors on children — Flutter skips unchanged const subtrees
• Check mounted before calling setState after async operations`,
    `class CartPage extends StatefulWidget {
  const CartPage({super.key});
  @override State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  final List<Item> _items = [];
  bool _loading = false;

  // ✅ setState only around the changing data
  void _add(Item item) => setState(() => _items.add(item));
  void _remove(Item item) => setState(() => _items.remove(item));

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await fetchItems();
    if (!mounted) return;              // ✅ check after async gap
    setState(() {
      _items.addAll(items);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Column(
      children: [
        // ✅ const — never rebuilds even when _items changes
        const CartHeader(),
        // ✅ Extracted — only this part rebuilds with _items
        Expanded(
          child: ListView.builder(
            itemCount: _items.length,
            itemBuilder: (_, i) => ItemTile(item: _items[i]),
          ),
        ),
        // Passes data explicitly — rebuilds only when _items changes
        CartTotal(items: _items),
      ],
    );
  }
}`),

  q(6, 2, 'medium',
    'What is InheritedWidget and how does it work?',
    `InheritedWidget is the fundamental mechanism for efficient state propagation down the widget tree. It's the foundation for Provider, Riverpod, and Theme.of(context).

How it works:
1. InheritedWidget sits in the tree above widgets that need the data
2. Descendants call context.dependOnInheritedWidgetOfExactType<T>() to subscribe
3. When the InheritedWidget is rebuilt with new data, only subscribed descendants rebuild
4. updateShouldNotify() controls which changes trigger rebuilds

This is O(1) lookup — Flutter stores InheritedWidgets in a hash map per Element.`,
    `// Define InheritedWidget
class AppTheme extends InheritedWidget {
  final Color primary;
  final double fontSize;

  const AppTheme({
    super.key,
    required this.primary,
    required this.fontSize,
    required super.child,
  });

  // Convenience accessor — subscribes to changes
  static AppTheme of(BuildContext context) {
    final result = context.dependOnInheritedWidgetOfExactType<AppTheme>();
    assert(result != null, 'AppTheme not found in context');
    return result!;
  }

  // Return true to rebuild dependents when data changes
  @override
  bool updateShouldNotify(AppTheme old) =>
      primary != old.primary || fontSize != old.fontSize;
}

// Provide it high in the tree
class App extends StatefulWidget {
  const App({super.key});
  @override State<App> createState() => _AppState();
}
class _AppState extends State<App> {
  Color _primary = Colors.blue;

  @override Widget build(BuildContext context) {
    return AppTheme(
      primary: _primary, fontSize: 16,
      child: MaterialApp(
        home: Scaffold(body: Column(children: [
          const TitleWidget(),          // subscribes to AppTheme
          ElevatedButton(
            onPressed: () => setState(() => _primary = Colors.red),
            child: const Text('Change'),
          ),
        ])),
      ),
    );
  }
}

class TitleWidget extends StatelessWidget {
  const TitleWidget({super.key});
  @override Widget build(BuildContext context) {
    final theme = AppTheme.of(context); // subscribes, rebuilds on change
    return Text('Title', style: TextStyle(color: theme.primary, fontSize: theme.fontSize));
  }
}`),

  // ══ ASYNC & FUTURES (7) ═══════════════════════════════════════════════════
  q(7, 1, 'easy',
    'Explain Future, async/await, and error handling in Dart.',
    `A Future<T> represents a value available at some point. Like a Promise in JS.

States: uncompleted → completed with value | completed with error

async/await is syntactic sugar:
• async marks a function — it returns a Future implicitly
• await pauses execution until the Future completes
• try/catch for error handling; finally always runs

Dart event loop: single-threaded with microtask queue (high priority, Futures) and event queue (I/O, timers). await yields to the event loop.`,
    `// Basic Future
Future<String> fetchUser(int id) async {
  await Future.delayed(const Duration(seconds: 1)); // simulate network
  if (id <= 0) throw ArgumentError('Invalid id');
  return 'User #\$id';
}

// Error handling
Future<void> loadUser(int id) async {
  try {
    final user = await fetchUser(id);
    print(user);
  } on ArgumentError catch (e) {
    print('Bad input: \$e');      // specific exception
  } catch (e, stackTrace) {
    print('Error: \$e');           // catch all
    // log(stackTrace)
  } finally {
    print('Done (always runs)');   // cleanup
  }
}

// Parallel: Future.wait
Future<void> loadAll() async {
  final results = await Future.wait([
    fetchUser(1),
    fetchUser(2),
    fetchUser(3),
  ]); // all 3 run concurrently
  print(results); // [User #1, User #2, User #3]
}

// Sequential (use when order matters or each depends on previous)
Future<void> sequential() async {
  final user    = await fetchUser(1);
  final profile = await fetchProfile(user);
  final posts   = await fetchPosts(profile.id);
}

// FutureBuilder in Flutter
FutureBuilder<String>(
  future: fetchUser(1),
  builder: (context, snapshot) {
    return switch (snapshot.connectionState) {
      ConnectionState.waiting => const CircularProgressIndicator(),
      ConnectionState.done when snapshot.hasError =>
          Text('Error: \${snapshot.error}'),
      ConnectionState.done => Text(snapshot.data ?? 'No data'),
      _ => const SizedBox(),
    };
  },
)`),

  // ══ STREAMS (8) ═══════════════════════════════════════════════════════════
  q(8, 1, 'medium',
    'What are Streams in Dart? Explain single-subscription vs broadcast streams.',
    `A Stream<T> delivers a sequence of async events over time. Like an async iterator.

Single-subscription (default):
• Only ONE listener at a time
• Can pause/resume the producer
• Use for: file reading, HTTP body, socket

Broadcast:
• MULTIPLE simultaneous listeners
• Cannot pause producer
• Use for: user input events, pub/sub, ChangeNotifier-style

StreamController — creates and exposes a stream you can push events into.
async* generator — simplest way to create streams with yield.`,
    `// ── async* generator ──────────────────────────────
Stream<int> countDown(int from) async* {
  for (var i = from; i >= 0; i--) {
    await Future.delayed(const Duration(seconds: 1));
    yield i;
  }
}

// ── StreamController ────────────────────────────────
class EventBus {
  static final _ctrl = StreamController<String>.broadcast();
  static Stream<String> get events => _ctrl.stream;
  static void emit(String event) => _ctrl.add(event);
  static void dispose() => _ctrl.close();
}

// ── Transformations ─────────────────────────────────
Stream.fromIterable([1, 2, 3, 4, 5, 6])
  .where((n) => n.isEven)          // 2, 4, 6
  .map((n) => n * 10)              // 20, 40, 60
  .take(2)                          // 20, 40
  .listen(print);

// ── StreamBuilder in Flutter ────────────────────────
StreamBuilder<int>(
  stream: countDown(10),
  builder: (context, snapshot) {
    return switch (snapshot.connectionState) {
      ConnectionState.waiting => const Text('Starting...'),
      ConnectionState.active  => Text('T-\${snapshot.data}'),
      ConnectionState.done    => const Text('Launched!'),
      _                       => const SizedBox(),
    };
  },
)

// ── ALWAYS cancel subscriptions in dispose! ──────────
class _MyState extends State<MyWidget> {
  late StreamSubscription<int> _sub;

  @override void initState() {
    super.initState();
    _sub = myStream.listen((v) => setState(() {}));
  }

  @override void dispose() {
    _sub.cancel(); // ✅ prevent memory leak
    super.dispose();
  }
}`),

  // ══ ADVANCED DART (9) ═════════════════════════════════════════════════════
  q(9, 1, 'hard',
    'What are Isolates in Dart and when should you use them?',
    `Dart is single-threaded, but Isolates provide TRUE parallelism. Each isolate has its own memory heap and event loop — no shared state, no race conditions. Communication is via message passing (SendPort/ReceivePort).

Use isolates for heavy CPU work that would block the UI thread:
• Parsing large JSON (>1MB)
• Image processing / resizing
• Cryptography / hashing
• Complex algorithms

APIs (simplest to most powerful):
• Isolate.run() (Dart 2.19+) — one-shot, simplest
• compute() (Flutter) — wraps Isolate.run, for functions
• Isolate.spawn() — full control, for long-lived isolates`,
    `// ── Isolate.run() — simplest (Dart 2.19+) ──────────
import 'dart:isolate';

Future<List<int>> sortHeavy(List<int> data) async {
  return Isolate.run(() {
    final copy = List<int>.from(data);
    copy.sort();
    return copy;
  });
}

// ── compute() — Flutter helper ───────────────────────
import 'package:flutter/foundation.dart';

// MUST be top-level or static
List<Product> _parseProducts(String json) {
  final list = jsonDecode(json) as List;
  return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
}

Future<List<Product>> loadProducts(String jsonBody) {
  return compute(_parseProducts, jsonBody); // runs in isolate
}

// ── Manual Isolate — for long-lived workers ──────────
Future<void> manualIsolate() async {
  final receivePort = ReceivePort();
  await Isolate.spawn(_worker, receivePort.sendPort);

  receivePort.listen((message) {
    print('Result: \$message');
    receivePort.close();
  });
}

// Must be a top-level function
void _worker(SendPort sendPort) {
  var sum = 0;
  for (var i = 0; i < 100000000; i++) sum += i;
  sendPort.send(sum);
}

// ── When NOT to use isolates ────────────────────────
// • Fast operations (<10ms) — overhead not worth it
// • Flutter UI work — must be on main isolate
// • Operations needing shared state — use streams/ports`),

  // ══ PROVIDER (10) ════════════════════════════════════════════════════════
  q(10, 1, 'medium',
    'Explain Provider: ChangeNotifier, Consumer, context.watch vs context.read vs context.select.',
    `Provider wraps InheritedWidget with a simpler API for DI and state management.

Core components:
• ChangeNotifier — mutable state class; call notifyListeners() to trigger rebuilds
• ChangeNotifierProvider — inserts ChangeNotifier into the tree
• Consumer<T> — rebuilds only its builder subtree when T notifies
• context.watch<T>() — subscribe; rebuilds the CURRENT widget when T notifies
• context.read<T>() — one-time read, NO subscription (for callbacks)
• context.select<T,R>() — subscribe to a specific slice; rebuilds only when that slice changes

Rule: read() in callbacks, watch()/Consumer in build().`,
    `// 1. ChangeNotifier model
class CartNotifier extends ChangeNotifier {
  final List<Product> _items = [];
  List<Product> get items => List.unmodifiable(_items);
  int get count => _items.length;
  double get total => _items.fold(0, (s, p) => s + p.price);

  void add(Product p) { _items.add(p); notifyListeners(); }
  void remove(Product p) { _items.remove(p); notifyListeners(); }
}

// 2. Provide at root
void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CartNotifier()),
        ChangeNotifierProvider(create: (_) => AuthNotifier()),
      ],
      child: const MyApp(),
    ),
  );
}

// 3a. context.watch — full widget rebuild
class CartBadge extends StatelessWidget {
  const CartBadge({super.key});
  @override Widget build(BuildContext context) {
    final count = context.watch<CartNotifier>().count; // subscribes
    return Badge(label: Text('\$count'), child: const Icon(Icons.cart));
  }
}

// 3b. Consumer — only subtree rebuilds
Consumer<CartNotifier>(
  builder: (context, cart, child) => Badge(
    label: Text('\${cart.count}'),
    child: child!, // static child won't rebuild
  ),
  child: const Icon(Icons.shopping_cart),
)

// 3c. context.read — no subscription (callbacks only!)
ElevatedButton(
  onPressed: () => context.read<CartNotifier>().add(product),
  child: const Text('Add to Cart'),
)

// 3d. context.select — granular subscription
final count = context.select<CartNotifier, int>((c) => c.count);
// Only rebuilds when count changes, not when prices change`),

  // ══ BLOC (11) ════════════════════════════════════════════════════════════
  q(11, 1, 'medium',
    'Explain BLoC pattern: Events, States, Bloc vs Cubit.',
    `BLoC (Business Logic Component) separates UI from business logic using events and states.

Cubit — simplified BLoC:
• No events — call methods directly to emit new states
• Less boilerplate, good for simple state

Bloc — full event-driven:
• Explicit Event classes → better auditing, logging, undo/redo
• on<Event>() handlers registered in constructor
• More testable, more explicit flow

Both:
• BlocBuilder — rebuild UI based on state
• BlocListener — side effects (navigation, snackbar)
• BlocConsumer — builder + listener combined
• MultiBlocProvider — provide multiple blocs`,
    `// ── CUBIT ─────────────────────────────────────────
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
  void reset() => emit(0);
}

// ── BLOC (full event-driven) ───────────────────────
// Events
sealed class AuthEvent {}
class LoginRequested extends AuthEvent {
  final String email, password;
  LoginRequested(this.email, this.password);
}
class LogoutRequested extends AuthEvent {}

// States
sealed class AuthState {}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthSuccess extends AuthState { final User user; AuthSuccess(this.user); }
class AuthFailure extends AuthState { final String message; AuthFailure(this.message); }

// Bloc
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _repo;
  AuthBloc(this._repo) : super(AuthInitial()) {
    on<LoginRequested>(_onLogin);
    on<LogoutRequested>(_onLogout);
  }

  Future<void> _onLogin(LoginRequested e, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final user = await _repo.login(e.email, e.password);
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }

  Future<void> _onLogout(LogoutRequested e, Emitter<AuthState> emit) async {
    await _repo.logout();
    emit(AuthInitial());
  }
}

// ── UI ─────────────────────────────────────────────
BlocConsumer<AuthBloc, AuthState>(
  listener: (ctx, state) {
    if (state is AuthSuccess) ctx.go('/home');
    if (state is AuthFailure) {
      ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(state.message)));
    }
  },
  builder: (ctx, state) {
    if (state is AuthLoading) return const CircularProgressIndicator();
    return LoginForm(
      onLogin: (e, p) => ctx.read<AuthBloc>().add(LoginRequested(e, p)),
    );
  },
)`),

  // ══ NETWORKING (12) ══════════════════════════════════════════════════════
  q(12, 1, 'medium',
    'How do you handle REST APIs and JSON serialization in Flutter?',
    `Steps:
1. Choose HTTP client: http (simple), Dio (interceptors, multipart, cancellation)
2. Make request and handle status codes + exceptions
3. Deserialize JSON → Dart models
4. Show loading/error/data in UI

Serialization approaches:
• Manual fromJson/toJson — fine for small projects
• json_serializable — code generation, type-safe (recommended)
• Freezed — immutable + copyWith + pattern matching (production grade)

Dio advantages over http: interceptors, request cancellation, form data, response transformers, base URL.`,
    `// ── Model with json_serializable ──────────────────
@JsonSerializable()
class User {
  final int id;
  final String name;
  @JsonKey(name: 'email_address')
  final String email;

  const User({required this.id, required this.name, required this.email});

  factory User.fromJson(Map<String, dynamic> json) => _\$UserFromJson(json);
  Map<String, dynamic> toJson() => _\$UserToJson(this);
}
// Run: dart run build_runner build

// ── API service with Dio ───────────────────────────
class ApiService {
  late final Dio _dio;

  ApiService(String baseUrl) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.addAll([
      // Auth header interceptor
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = TokenStorage.getToken();
          if (token != null) options.headers['Authorization'] = 'Bearer \$token';
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            await refreshToken();
            return handler.resolve(await _retry(error.requestOptions));
          }
          handler.next(error);
        },
      ),
      LogInterceptor(requestBody: true, responseBody: true),
    ]);
  }

  Future<List<User>> getUsers({int page = 1}) async {
    final response = await _dio.get('/users', queryParameters: {'page': page});
    return (response.data as List)
        .map((e) => User.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<User> createUser(String name, String email) async {
    final response = await _dio.post('/users', data: {'name': name, 'email': email});
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Response<dynamic>> _retry(RequestOptions options) =>
      _dio.fetch(options);
}`),

  // ══ LOCAL STORAGE (13) ═══════════════════════════════════════════════════
  q(13, 1, 'medium',
    'Compare SharedPreferences, SQLite (sqflite), Hive, and flutter_secure_storage.',
    `Use the right tool for the right job:

SharedPreferences:
• Simple key-value, small amounts of data
• Good for: settings, flags, onboarding state

sqflite (SQLite):
• Full relational database with SQL
• Good for: complex queries, relationships, offline data

Hive:
• NoSQL key-value in "boxes", very fast, pure Dart
• Good for: app state, offline cache, simple objects

flutter_secure_storage:
• Encrypted storage — Keychain (iOS) / Keystore (Android)
• REQUIRED for: tokens, passwords, sensitive PII
• NEVER store auth tokens in SharedPreferences`,
    `// ── SharedPreferences ─────────────────────────────
final prefs = await SharedPreferences.getInstance();
await prefs.setString('theme', 'dark');
await prefs.setBool('onboarding_done', true);
final theme = prefs.getString('theme') ?? 'light';

// ── Hive ──────────────────────────────────────────
// Setup in main()
await Hive.initFlutter();
Hive.registerAdapter(UserAdapter()); // generated by hive_generator
final box = await Hive.openBox<User>('users');

await box.put('alice', User(name: 'Alice'));
final alice = box.get('alice');
final all = box.values.toList();
await box.delete('alice');

// ── sqflite ───────────────────────────────────────
class DB {
  static Database? _db;
  static Future<Database> get instance async {
    _db ??= await openDatabase(
      join(await getDatabasesPath(), 'app.db'),
      version: 1,
      onCreate: (db, v) => db.execute('''
        CREATE TABLE tasks(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          done INTEGER DEFAULT 0
        )
      '''),
    );
    return _db!;
  }

  static Future<int> insert(String title) async {
    return (await instance).insert('tasks', {'title': title});
  }

  static Future<List<Map<String, dynamic>>> all() async {
    return (await instance).query('tasks', orderBy: 'id DESC');
  }

  static Future<void> toggle(int id, bool done) async {
    await (await instance).update('tasks', {'done': done ? 1 : 0},
        where: 'id = ?', whereArgs: [id]);
  }
}

// ── flutter_secure_storage ─────────────────────────
const _secure = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);
await _secure.write(key: 'access_token', value: token);
final token = await _secure.read(key: 'access_token');
await _secure.delete(key: 'access_token'); // on logout`),

  // ══ TESTING (14) ══════════════════════════════════════════════════════════
  q(14, 1, 'medium',
    'What are the three types of tests in Flutter and when to use each?',
    `Testing pyramid (more → fewer as you go up):

Unit Tests — fastest, most numerous:
• Single function, class, or method in isolation
• Mock all dependencies
• Run with: flutter test test/unit/

Widget Tests — medium speed, medium coverage:
• Single widget or small widget tree
• testWidgets() + WidgetTester
• Can simulate user interactions (tap, scroll, type)
• Run with: flutter test test/widget/

Integration Tests — slowest, fewest, highest confidence:
• Full app flows on real device or emulator
• Uses integration_test package or patrol
• Covers E2E user journeys

Also: Golden Tests — screenshot comparison for catching UI regressions.`,
    `// ── Unit Test ─────────────────────────────────────
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockUserRepo extends Mock implements UserRepository {}

void main() {
  group('UserBloc', () {
    late UserBloc bloc;
    late MockUserRepo mockRepo;

    setUp(() {
      mockRepo = MockUserRepo();
      bloc = UserBloc(mockRepo);
    });
    tearDown(() => bloc.close());

    test('emits [Loading, Success] on fetch', () async {
      final user = User(id: 1, name: 'Alice');
      when(() => mockRepo.getUser(1)).thenAnswer((_) async => user);

      bloc.add(const FetchUser(1));

      await expectLater(bloc.stream, emitsInOrder([
        isA<UserLoading>(),
        isA<UserSuccess>(),
      ]));
    });

    test('emits [Loading, Failure] on error', () async {
      when(() => mockRepo.getUser(any())).thenThrow(Exception('Network error'));
      bloc.add(const FetchUser(99));
      await expectLater(bloc.stream, emitsInOrder([isA<UserLoading>(), isA<UserFailure>()]));
    });
  });
}

// ── Widget Test ────────────────────────────────────
void main() {
  testWidgets('Counter increments on tap', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: CounterPage()));

    expect(find.text('0'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();
    expect(find.text('1'), findsOneWidget);
  });

  testWidgets('Shows loading then user name', (tester) async {
    final mockRepo = MockUserRepo();
    when(() => mockRepo.getUser(1)).thenAnswer(
      (_) async => User(id: 1, name: 'Alice'));

    await tester.pumpWidget(MaterialApp(
      home: UserPage(repo: mockRepo),
    ));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle(); // wait for futures
    expect(find.text('Alice'), findsOneWidget);
  });
}`),

  // ══ ARCHITECTURE (15) ════════════════════════════════════════════════════
  q(15, 1, 'hard',
    'Explain Clean Architecture in Flutter with layers and responsibilities.',
    `Clean Architecture (Robert C. Martin) organizes code in concentric layers with the Dependency Rule: outer layers depend on inner layers, NEVER the reverse.

Three layers (inside out):

1. Domain (innermost, pure Dart):
   • Entities — core business objects (no framework dependencies)
   • Use Cases — single business operations
   • Repository interfaces — abstract contracts

2. Data (implements domain contracts):
   • Repository implementations
   • Remote data sources (API)
   • Local data sources (database/cache)
   • Data models (JSON-capable)

3. Presentation (outer):
   • Blocs/Cubits/ViewModels
   • Pages and Widgets
   • Only knows domain objects through use cases

Testability: domain is tested with zero dependencies; data with mocked sources; presentation with mocked use cases.`,
    `// ── Domain Layer (pure Dart, zero imports) ─────────
class Product {
  final int id; final String name; final double price;
  const Product({required this.id, required this.name, required this.price});
}

abstract class ProductRepository {
  Future<List<Product>> getProducts({int page = 1});
  Future<Product> getProduct(int id);
}

class GetProductsUseCase {
  final ProductRepository _repo;
  GetProductsUseCase(this._repo);
  Future<List<Product>> call({int page = 1}) => _repo.getProducts(page: page);
}

// ── Data Layer ─────────────────────────────────────
class ProductModel extends Product {
  const ProductModel({required super.id, required super.name, required super.price});
  factory ProductModel.fromJson(Map<String, dynamic> j) =>
      ProductModel(id: j['id'], name: j['name'], price: (j['price'] as num).toDouble());
}

class ProductRepositoryImpl implements ProductRepository {
  final ProductApiDataSource _remote;
  final ProductCacheDataSource _local;
  ProductRepositoryImpl(this._remote, this._local);

  @override
  Future<List<Product>> getProducts({int page = 1}) async {
    try {
      final products = await _remote.getProducts(page: page);
      await _local.cache(products);
      return products;
    } catch (_) {
      return _local.getCached() ?? []; // offline fallback
    }
  }

  @override Future<Product> getProduct(int id) => _remote.getProduct(id);
}

// ── Presentation Layer ─────────────────────────────
class ProductsCubit extends Cubit<ProductsState> {
  final GetProductsUseCase _getProducts;
  ProductsCubit(this._getProducts) : super(ProductsInitial());

  Future<void> load() async {
    emit(ProductsLoading());
    try {
      final products = await _getProducts();
      emit(ProductsLoaded(products));
    } catch (e) {
      emit(ProductsError(e.toString()));
    }
  }
}

// ── Dependency Injection (get_it) ──────────────────
final sl = GetIt.instance;
void setupDi() {
  sl
    ..registerLazySingleton<ProductRepository>(() => ProductRepositoryImpl(sl(), sl()))
    ..registerLazySingleton(() => GetProductsUseCase(sl()))
    ..registerFactory(() => ProductsCubit(sl()));
}`),

  // ══ DESIGN PATTERNS (16) ═════════════════════════════════════════════════
  q(16, 1, 'hard',
    'Implement and explain the Repository Pattern in Flutter.',
    `The Repository Pattern abstracts data access behind an interface. The rest of the app works with the interface — it doesn't care if data comes from an API, a database, or a cache.

Benefits:
• Swap implementations without touching business logic
• Inject mocks in tests
• Centralize caching and offline logic
• Single source of truth for data

Pattern: Domain defines abstract interface → Data layer provides concrete implementation.`,
    `// Abstract contract (Domain layer)
abstract class WeatherRepository {
  Future<Weather> getWeather(String city);
  Stream<Weather> watchWeather(String city);
}

// Remote data source
class WeatherApiSource {
  final Dio _dio;
  WeatherApiSource(this._dio);
  Future<WeatherModel> fetch(String city) async {
    final r = await _dio.get('/weather', queryParameters: {'q': city});
    return WeatherModel.fromJson(r.data as Map<String, dynamic>);
  }
}

// Local cache source
class WeatherCacheSource {
  final Box<WeatherModel> _box;
  WeatherCacheSource(this._box);
  Future<void> save(String city, WeatherModel w) => _box.put(city, w);
  WeatherModel? get(String city) => _box.get(city);
}

// Implementation with stale-while-revalidate strategy
class WeatherRepositoryImpl implements WeatherRepository {
  final WeatherApiSource _api;
  final WeatherCacheSource _cache;
  WeatherRepositoryImpl(this._api, this._cache);

  @override
  Future<Weather> getWeather(String city) async {
    // Return cached immediately, refresh in background
    final cached = _cache.get(city);
    if (cached != null) {
      _api.fetch(city).then((fresh) => _cache.save(city, fresh));
      return cached;
    }
    // No cache — wait for network
    final weather = await _api.fetch(city);
    await _cache.save(city, weather);
    return weather;
  }

  @override
  Stream<Weather> watchWeather(String city) =>
      Stream.periodic(const Duration(minutes: 15))
          .asyncMap((_) => getWeather(city));
}

// Testing — inject mock
class MockWeatherRepository extends Mock implements WeatherRepository {}

void main() {
  test('WeatherCubit loads weather', () async {
    final mock = MockWeatherRepository();
    when(() => mock.getWeather('London'))
        .thenAnswer((_) async => Weather(city: 'London', temp: 15));

    final cubit = WeatherCubit(mock);
    await cubit.load('London');

    expect(cubit.state, isA<WeatherLoaded>());
  });
}`),

  q(16, 2, 'hard',
    'Explain common GoF design patterns in Flutter: Singleton, Factory, Observer, Strategy.',
    `Design Patterns in Flutter context:

Singleton — single instance throughout app life (service locator, config)
Factory — create objects via a method that can return subtypes (platform-specific services)
Observer — publish/subscribe (ChangeNotifier, Streams are the pattern!)
Strategy — plug-in interchangeable algorithms at runtime
Builder — build complex objects step-by-step
Command — encapsulate operations as objects (Actions, undo/redo)`,
    `// ── SINGLETON ─────────────────────────────────────
class AppConfig {
  static AppConfig? _instance;
  late final String apiUrl;
  late final bool isDebug;
  AppConfig._();
  static AppConfig get instance => _instance ??= AppConfig._()
    ..apiUrl = const String.fromEnvironment('API_URL', defaultValue: 'https://api.example.com')
    ..isDebug = kDebugMode;
}
// Usage: AppConfig.instance.apiUrl

// ── FACTORY (platform-specific) ────────────────────
abstract class PushNotificationService {
  Future<void> requestPermission();
  Future<String?> getToken();

  factory PushNotificationService() {
    if (Platform.isAndroid) return FCMService();
    if (Platform.isIOS) return APNsService();
    return WebPushService();
  }
}

// ── OBSERVER (ChangeNotifier = Observer) ────────────
class ThemeStore extends ChangeNotifier { // Subject
  bool _dark = false;
  bool get isDark => _dark;
  void toggle() { _dark = !_dark; notifyListeners(); } // notify all observers
}
// Observers registered via Provider/context.watch

// ── STRATEGY ───────────────────────────────────────
abstract class PaymentStrategy {
  Future<bool> pay(double amount);
}
class CardPayment implements PaymentStrategy {
  @override Future<bool> pay(double amount) async => processCard(amount);
}
class PayPalPayment implements PaymentStrategy {
  @override Future<bool> pay(double amount) async => processPayPal(amount);
}

class Checkout {
  PaymentStrategy _strategy = CardPayment();
  void setStrategy(PaymentStrategy s) => _strategy = s;
  Future<bool> checkout(double total) => _strategy.pay(total);
}

// ── BUILDER ────────────────────────────────────────
class NotificationBuilder {
  String _title = '';
  String _body = '';
  String? _imageUrl;
  Map<String, String> _data = {};

  NotificationBuilder title(String t) { _title = t; return this; }
  NotificationBuilder body(String b)  { _body = b;  return this; }
  NotificationBuilder image(String u) { _imageUrl = u; return this; }
  NotificationBuilder data(String k, String v) { _data[k] = v; return this; }
  RemoteMessage build() => RemoteMessage(title: _title, body: _body, imageUrl: _imageUrl, data: _data);
}

final notif = NotificationBuilder()
  .title('New Message')
  .body('Alice sent you a message')
  .data('screen', 'chat')
  .build();`),

  // ══ DSA (17) ═════════════════════════════════════════════════════════════
  q(17, 1, 'hard',
    'Explain Big O notation and common algorithm complexities.',
    `Big O describes how an algorithm's time or space scales with input size n.

Common complexities (best → worst):
• O(1) — constant: hash map lookup, array access
• O(log n) — logarithmic: binary search, balanced BST
• O(n) — linear: loop through array, linear search
• O(n log n) — linearithmic: merge sort, heap sort
• O(n²) — quadratic: nested loops, bubble sort
• O(2ⁿ) — exponential: subset enumeration, naive recursive Fib
• O(n!) — factorial: permutations, brute-force TSP

Dart built-in complexities:
• List.add() = O(1) amortized; List.insert(0) = O(n)
• Map/Set operations = O(1) average (hash-based)
• List.sort() = O(n log n) (Timsort)`,
    `// O(1) — constant
int getHead(List<int> list) => list[0]; // always 1 op
bool inSet(Set<int> s, int val) => s.contains(val); // hash lookup

// O(log n) — binary search
int binarySearch(List<int> sorted, int target) {
  var lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    final mid = lo + (hi - lo) ~/ 2;
    if (sorted[mid] == target) return mid;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// O(n) — linear search
int linearSearch(List<int> list, int target) {
  for (var i = 0; i < list.length; i++) {
    if (list[i] == target) return i;
  }
  return -1;
}

// O(n log n) — merge sort
List<int> mergeSort(List<int> list) {
  if (list.length <= 1) return list;
  final mid   = list.length ~/ 2;
  final left  = mergeSort(list.sublist(0, mid));
  final right = mergeSort(list.sublist(mid));
  return _merge(left, right);
}

List<int> _merge(List<int> a, List<int> b) {
  final res = <int>[];
  var i = 0, j = 0;
  while (i < a.length && j < b.length) {
    res.add(a[i] <= b[j] ? a[i++] : b[j++]);
  }
  return res..addAll(a.sublist(i))..addAll(b.sublist(j));
}

// O(n²) — bubble sort (educational only)
void bubbleSort(List<int> list) {
  for (var i = 0; i < list.length - 1; i++) {
    for (var j = 0; j < list.length - i - 1; j++) {
      if (list[j] > list[j + 1]) {
        final t = list[j]; list[j] = list[j + 1]; list[j + 1] = t;
      }
    }
  }
}

// ✅ Always prefer Dart's built-in list.sort() — it's Timsort O(n log n)`),

  q(17, 2, 'hard',
    'Implement a linked list and explain when to use it vs List.',
    `Linked List — each node holds data + pointer to next.
• O(1) insert/remove at head
• O(n) access by index
• No capacity limit (no reallocation)
• More memory per element (pointer overhead)

Dart's List is a dynamic array:
• O(1) amortized add (doubles capacity on resize)
• O(1) index access
• O(n) insert/remove in the middle

Use linked list when: frequent O(1) head/tail insertions/removals, implementing stacks/queues. Use List for everything else in practice.`,
    `class ListNode<T> {
  T value;
  ListNode<T>? next;
  ListNode(this.value, [this.next]);
}

class LinkedList<T> {
  ListNode<T>? head;
  int _length = 0;
  int get length => _length;
  bool get isEmpty => head == null;

  // O(1) — prepend
  void prepend(T value) {
    head = ListNode(value, head);
    _length++;
  }

  // O(n) — append
  void append(T value) {
    if (head == null) { prepend(value); return; }
    var cur = head!;
    while (cur.next != null) cur = cur.next!;
    cur.next = ListNode(value);
    _length++;
  }

  // O(1) — remove head
  T? removeFirst() {
    if (head == null) return null;
    final val = head!.value;
    head = head!.next;
    _length--;
    return val;
  }

  // O(n) — remove by value
  bool remove(T value) {
    if (head == null) return false;
    if (head!.value == value) { head = head!.next; _length--; return true; }
    var cur = head!;
    while (cur.next != null) {
      if (cur.next!.value == value) {
        cur.next = cur.next!.next;
        _length--;
        return true;
      }
      cur = cur.next!;
    }
    return false;
  }

  // O(n) — reverse in-place
  void reverse() {
    ListNode<T>? prev, cur = head;
    while (cur != null) {
      final next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
    head = prev;
  }

  List<T> toList() {
    final result = <T>[];
    var cur = head;
    while (cur != null) { result.add(cur.value); cur = cur.next; }
    return result;
  }
}

// Usage
final list = LinkedList<int>();
list.append(1); list.append(2); list.append(3);
list.prepend(0);
print(list.toList()); // [0, 1, 2, 3]
list.reverse();
print(list.toList()); // [3, 2, 1, 0]`),

  // ══ PLATFORM CHANNELS (18) ═══════════════════════════════════════════════
  q(18, 1, 'hard',
    'How do Platform Channels work? Implement a MethodChannel example.',
    `Platform Channels allow Flutter (Dart) to communicate with native code (Android/Kotlin, iOS/Swift).

Three channel types:
• MethodChannel — request/response. Flutter calls native method, awaits result. Best for: battery level, camera, sensors.
• EventChannel — continuous stream FROM native. Best for: accelerometer, location updates.
• BasicMessageChannel — raw message passing with a custom codec.

Both sides must use the SAME channel name string. Messages are serialized via StandardMessageCodec (supports: null, bool, int, double, String, Uint8List, List, Map).`,
    `// ── FLUTTER SIDE (Dart) ────────────────────────────
class DeviceService {
  static const _method = MethodChannel('com.example.app/device');
  static const _events = EventChannel('com.example.app/accelerometer');

  // One-shot call
  static Future<String> getDeviceId() async {
    try {
      return await _method.invokeMethod<String>('getDeviceId') ?? '';
    } on PlatformException catch (e) {
      throw Exception('Native error: \${e.message}');
    }
  }

  // Calling with arguments
  static Future<bool> vibrate(int duration) async {
    return await _method.invokeMethod<bool>('vibrate', {'duration': duration}) ?? false;
  }

  // Continuous event stream
  static Stream<Map<String, double>> watchAccelerometer() {
    return _events.receiveBroadcastStream().map((event) {
      final m = Map<String, dynamic>.from(event as Map);
      return {'x': m['x'] as double, 'y': m['y'] as double, 'z': m['z'] as double};
    });
  }
}

// ── ANDROID (Kotlin) ───────────────────────────────
/*
class MainActivity : FlutterActivity() {
  private val DEVICE_CHANNEL = "com.example.app/device"

  override fun configureFlutterEngine(engine: FlutterEngine) {
    super.configureFlutterEngine(engine)

    MethodChannel(engine.dartExecutor.binaryMessenger, DEVICE_CHANNEL)
      .setMethodCallHandler { call, result ->
        when (call.method) {
          "getDeviceId" -> {
            val id = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
            result.success(id)
          }
          "vibrate" -> {
            val duration = call.argument<Int>("duration") ?: 200
            val vibrator = getSystemService(Vibrator::class.java)
            vibrator.vibrate(VibrationEffect.createOneShot(duration.toLong(), -1))
            result.success(true)
          }
          else -> result.notImplemented()
        }
      }
  }
}
*/

// ── iOS (Swift) ────────────────────────────────────
/*
@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(_ application: UIApplication,
    didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let controller = window?.rootViewController as! FlutterViewController
    let channel = FlutterMethodChannel(name: "com.example.app/device",
                                       binaryMessenger: controller.binaryMessenger)
    channel.setMethodCallHandler { call, result in
      if call.method == "getDeviceId" {
        result(UIDevice.current.identifierForVendor?.uuidString)
      } else {
        result(FlutterMethodNotImplemented)
      }
    }
    return super.application(application, didFinishLaunchingWithOptions: options)
  }
}
*/`),

  // ══ PERFORMANCE (19) ═════════════════════════════════════════════════════
  q(19, 1, 'hard',
    'What causes jank in Flutter and how do you optimize performance?',
    `Jank = dropped frames (< 60fps / >16ms per frame). The UI thread must complete layout+paint in 16ms.

Common jank causes:
1. Heavy computation on the UI thread (should use isolates)
2. Excessive widget rebuilds (setState rebuilds too much)
3. Large images not sized/cached properly
4. Missing const constructors
5. Synchronous I/O
6. Memory pressure causing GC pauses

Optimization tools:
• Flutter DevTools → Performance tab, Rebuild counts
• Flutter Inspector → Highlight repaints
• --profile mode: flutter run --profile
• Timeline events, flame charts`,
    `// ── Const constructors — zero cost reuse ───────────
// ❌ Creates new TextStyle object every build
Text('Hello', style: TextStyle(fontSize: 16, color: Colors.blue));
// ✅ Reuses same instance
const Text('Hello', style: TextStyle(fontSize: 16, color: Colors.blue));

// ── Extract heavy subtrees ─────────────────────────
// ❌ HeavyList rebuilds on every counter change
class BadPage extends StatefulWidget { ... }
class _BadPageState extends State<BadPage> {
  int _tab = 0;
  @override Widget build(BuildContext context) => Column(children: [
    TabBar(onTap: (i) => setState(() => _tab = i), ...),
    HeavyProductGrid(products: allProducts), // ❌ rebuilds on tab change
  ]);
}
// ✅ Extract into const or separate widget
class GoodPage extends StatefulWidget { ... }
class _GoodPageState extends State<GoodPage> {
  int _tab = 0;
  @override Widget build(BuildContext context) => Column(children: [
    TabBar(onTap: (i) => setState(() => _tab = i), ...),
    const HeavyProductGrid(), // ✅ const — Flutter skips diff
  ]);
}

// ── RepaintBoundary — isolate animation layers ──────
RepaintBoundary(
  child: AnimatedRotation(turns: _rotation, child: const Logo()),
)
// Only the logo layer repaints on animation frame

// ── CustomPainter — shouldRepaint optimization ──────
class ProgressPainter extends CustomPainter {
  final double progress;
  const ProgressPainter(this.progress);

  @override void paint(Canvas canvas, Size size) { /* draw arc */ }

  @override bool shouldRepaint(ProgressPainter old) =>
      progress != old.progress; // skip repaint if unchanged
}

// ── Move heavy work off UI thread ────────────────────
// ❌ Blocks UI
void onTap() {
  final sorted = hugeList.toList()..sort(); // freezes UI!
}
// ✅ Compute in isolate
Future<void> onTap() async {
  final sorted = await compute(_sort, hugeList);
  setState(() => _items = sorted);
}
List<int> _sort(List<int> list) => list..sort();`),

  // ══ ADVANCED STATE — RIVERPOD (20) ═══════════════════════════════════════
  q(20, 1, 'hard',
    'Explain Riverpod: providers, WidgetRef, and AsyncNotifier.',
    `Riverpod is a complete Provider rewrite with compile-time safety.

Key advantages over Provider:
• No context needed to read providers outside widgets
• Compile-time type safety — no runtime ProviderNotFoundException
• Auto-dispose — no memory leaks from forgotten providers
• DevTools integration — view provider state

Provider types:
• Provider<T> — read-only derived value
• StateProvider<T> — simple mutable state
• NotifierProvider — complex sync state (Notifier class)
• AsyncNotifierProvider — async state with loading/error/data
• StreamProvider — stream of values
• FutureProvider — one-time async value`,
    `// pubspec: flutter_riverpod: ^2.5.0

// ── Simple providers ──────────────────────────────
final apiUrlProvider = Provider<String>((ref) => 'https://api.example.com');
final counterProvider = StateProvider<int>((ref) => 0);

// ── AsyncNotifier — recommended for async state ────
class ProductsNotifier extends AsyncNotifier<List<Product>> {
  @override
  Future<List<Product>> build() async {
    // Called once on first use; result is cached
    final repo = ref.watch(productRepositoryProvider);
    return repo.getProducts();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() =>
      ref.read(productRepositoryProvider).getProducts()
    );
  }

  Future<void> addProduct(Product p) async {
    final repo = ref.read(productRepositoryProvider);
    await repo.create(p);
    ref.invalidateSelf(); // re-run build()
  }
}

final productsProvider = AsyncNotifierProvider<ProductsNotifier, List<Product>>(
  ProductsNotifier.new,
);

// ── Combining providers ────────────────────────────
final searchProvider = StateProvider<String>((ref) => '');

final filteredProductsProvider = Provider<AsyncValue<List<Product>>>((ref) {
  final products = ref.watch(productsProvider);
  final search   = ref.watch(searchProvider);
  return products.whenData((list) =>
    list.where((p) => p.name.toLowerCase().contains(search.toLowerCase())).toList(),
  );
});

// ── Widget usage ────────────────────────────────────
class ProductsPage extends ConsumerWidget {
  const ProductsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(filteredProductsProvider);

    return products.when(
      data: (list) => ListView.builder(
        itemCount: list.length,
        itemBuilder: (ctx, i) => ProductTile(product: list[i]),
      ),
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: \$e'),
    );
  }
}

// ── ConsumerStatefulWidget ─────────────────────────
class SearchPage extends ConsumerStatefulWidget {
  @override ConsumerState<SearchPage> createState() => _SearchPageState();
}
class _SearchPageState extends ConsumerState<SearchPage> {
  @override Widget build(BuildContext context) {
    return TextField(
      onChanged: (v) => ref.read(searchProvider.notifier).state = v,
    );
  }
}`),

  // ══ SECURITY (21) ════════════════════════════════════════════════════════
  q(21, 1, 'hard',
    'What are the key security best practices for Flutter mobile apps?',
    `Mobile app security layers:

1. Data at Rest:
• flutter_secure_storage for tokens/passwords (Keychain/Keystore)
• SQLCipher for encrypted databases
• Never SharedPreferences for sensitive data

2. Data in Transit:
• HTTPS only
• SSL/Certificate pinning (prevent MITM)
• Certificate validation

3. Code Security:
• Code obfuscation (--obfuscate flag)
• Don't log sensitive data
• No hardcoded secrets (use .env or remote config)

4. Authentication:
• Short-lived access tokens + refresh tokens
• Biometric auth (local_auth package)
• Jailbreak/root detection

5. OWASP Mobile Top 10: Improper Credential Usage, Insecure Data Storage, Insecure Communication, Insufficient Input/Output Validation`,
    `// ── Secure Storage ────────────────────────────────
const _storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device,
  ),
);

class TokenService {
  Future<void> save(String access, String refresh) => Future.wait([
    _storage.write(key: 'access_token', value: access),
    _storage.write(key: 'refresh_token', value: refresh),
  ]);
  Future<String?> getAccess() => _storage.read(key: 'access_token');
  Future<void> clear() => _storage.deleteAll(); // on logout
}

// ── SSL Pinning with Dio ────────────────────────────
Dio buildSecureDio() {
  final dio = Dio();
  (dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
    final client = HttpClient();
    client.badCertificateCallback = (cert, host, port) {
      // Verify certificate fingerprint
      final fingerprint = sha256.convert(cert.der).toString();
      return fingerprint == kExpectedFingerprint; // false = reject
    };
    return client;
  };
  return dio;
}

// ── Code obfuscation (build commands) ──────────────
// flutter build apk --release --obfuscate --split-debug-info=./debug
// flutter build ipa --release --obfuscate --split-debug-info=./debug

// ── Biometric Authentication ────────────────────────
final _auth = LocalAuthentication();
Future<bool> authenticateWithBiometrics() async {
  final canAuth = await _auth.canCheckBiometrics;
  if (!canAuth) return false;
  return _auth.authenticate(
    localizedReason: 'Authenticate to access your account',
    options: const AuthenticationOptions(biometricOnly: true),
  );
}

// ── Prevent screenshots on sensitive screens ─────────
@override void initState() {
  super.initState();
  FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE);
}
@override void dispose() {
  FlutterWindowManager.clearFlags(FlutterWindowManager.FLAG_SECURE);
  super.dispose();
}`),

  // ══ CI/CD (22) ══════════════════════════════════════════════════════════
  q(22, 1, 'hard',
    'How do you set up CI/CD for Flutter with GitHub Actions?',
    `CI/CD pipeline structure:

CI (every PR):
1. Checkout → setup Flutter → pub get
2. dart format --check
3. flutter analyze
4. flutter test --coverage
5. Upload coverage to Codecov

CD (merge to main/release):
1. Build signed artifact (APK/IPA)
2. Upload to Firebase App Distribution (beta) or Play Store/App Store (prod)

Secrets management: Store keystore, certificates, API keys as GitHub Secrets. Never commit them.

Fastlane: Automate signing, versioning, screenshots, and store submissions.`,
    `# .github/workflows/ci.yml
name: Flutter CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.22.0'
          cache: true

      - run: flutter pub get

      - name: Check formatting
        run: dart format --output=none --set-exit-if-changed .

      - name: Analyze
        run: flutter analyze --fatal-infos

      - name: Test with coverage
        run: flutter test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage/lcov.info

  build-android:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.22.0', cache: true }

      - name: Decode keystore
        run: |
          echo "\${{ secrets.KEYSTORE_B64 }}" | base64 --decode > android/app/release.jks

      - name: Build release APK
        env:
          STORE_PASS: \${{ secrets.KEYSTORE_PASS }}
          KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          KEY_PASS: \${{ secrets.KEY_PASS }}
        run: flutter build apk --release --obfuscate --split-debug-info=debug-info/

      - name: Deploy to Firebase App Distribution
        uses: wzieba/Firebase-Distribution-Github-Action@v1
        with:
          appId: \${{ secrets.FIREBASE_APP_ID }}
          token: \${{ secrets.FIREBASE_TOKEN }}
          groups: beta-testers
          file: build/app/outputs/flutter-apk/app-release.apk
          releaseNotes: "Build from commit \${{ github.sha }}"`,
    'yaml'),

  // ══ FLUTTER INTERNALS (23) ═══════════════════════════════════════════════
  q(23, 1, 'hard',
    'Explain Flutter\'s three trees: Widget, Element, and RenderObject.',
    `Flutter maintains three parallel trees for efficient UI rendering:

1. Widget Tree — immutable blueprints (what you write in build())
   • Created fresh on every build() call
   • Lightweight value objects — cheap to recreate
   • Describes WHAT to show

2. Element Tree — mutable, long-lived instances
   • Bridges widgets and render objects
   • Holds widget + mounted state
   • Performs reconciliation (diffing old vs new widget tree)
   • Created once; updated when widget changes

3. RenderObject Tree — actual layout, paint, hit-testing
   • Expensive to create, persists long-term
   • Handles constraints (layout), sizes, and painting
   • Updated only when layout/paint properties change

Reconciliation: Same type at same position → update element (fast). Different type → unmount old, mount new (creates new RenderObject).

Keys help Flutter identify elements when the position changes (e.g., reordering lists).`,
    `// Understanding the three trees:

// What you write (WIDGET TREE):
Scaffold(
  body: Center(child: Text('Hello')),
)
// ↓ Flutter inflates into:
// ELEMENT TREE:
// ScaffoldElement
//   └── CenterElement
//         └── TextElement → holds reference to RenderParagraph

// RENDER OBJECT TREE:
// RenderPositionedBox (Center)
//   └── RenderParagraph (Text) → actual paint logic

// ── Keys: fix identity when position changes ─────────
// Without keys — Flutter uses position to match elements
// PROBLEM: Removing first item shifts everything → wrong state!
Column(children: [
  if (showFirst) const StatefulBox(color: Colors.red),  // position 0
  const StatefulBox(color: Colors.blue),                  // position 1 → 0
])

// ✅ With ValueKey — Flutter matches by key, not position
Column(children: [
  if (showFirst) const StatefulBox(key: ValueKey('red'), color: Colors.red),
  const StatefulBox(key: ValueKey('blue'), color: Colors.blue),
])

// Key types:
// ValueKey — equality by value (item.id)
ListView.builder(
  itemBuilder: (ctx, i) => ItemTile(key: ValueKey(items[i].id), item: items[i]),
)

// ObjectKey — equality by reference
ListTile(key: ObjectKey(userObject))

// UniqueKey — always unique; forces element recreation (resets state)
AnimatedSwitcher(child: Widget(key: UniqueKey())) // new key = new animation

// GlobalKey — access element/state from anywhere
final _scaffoldKey = GlobalKey<ScaffoldState>();
Scaffold(key: _scaffoldKey, ...)
_scaffoldKey.currentState?.openDrawer(); // call imperative API

// GlobalKey<FormState> — form validation
final _formKey = GlobalKey<FormState>();
Form(key: _formKey, child: ...)
if (_formKey.currentState!.validate()) _formKey.currentState!.save();`),

  // ══ DART BASICS — additional ══════════════════════════════════════════════
  q(1, 6, 'medium',
    'What are Dart enums and how do enhanced enums work?',
    `Dart has two types of enums:

Simple enum — a named set of constant values:
  enum Direction { north, south, east, west }

Enhanced enum (Dart 2.17+) — enums with fields, methods, and constructors. They behave like classes but with the enum constraint.

All enums automatically get:
• .name — the String name of the value
• .index — the position (0-based)
• EnumType.values — List of all values

Enhanced enums are ideal for representing rich constants (HTTP methods, status codes, app routes) without a separate class.`,
    `// Simple enum
enum Status { pending, active, suspended, deleted }

// Using simple enum
Status userStatus = Status.active;
print(userStatus.name);  // 'active'
print(userStatus.index); // 1

// Switch (exhaustive with sealed/enum)
String label = switch (userStatus) {
  Status.pending   => 'Awaiting review',
  Status.active    => 'Active',
  Status.suspended => 'Suspended',
  Status.deleted   => 'Deleted',
};

// Enhanced enum (Dart 2.17+)
enum HttpMethod {
  get('GET'),
  post('POST'),
  put('PUT'),
  patch('PATCH'),
  delete('DELETE');

  final String value;
  const HttpMethod(this.value);

  bool get hasBody => this == post || this == put || this == patch;
}

enum AppRoute {
  home('/'),
  profile('/profile'),
  settings('/settings');

  final String path;
  const AppRoute(this.path);

  // Methods on enums
  bool get requiresAuth => this != home;
}

// Usage
print(HttpMethod.post.value);    // 'POST'
print(HttpMethod.post.hasBody);  // true
print(AppRoute.settings.path);   // '/settings'
print(AppRoute.values.map((r) => r.path)); // (/, /profile, /settings)`),

  q(1, 7, 'medium',
    'Explain Dart 3 Records and Pattern Matching.',
    `Records (Dart 3.0+) are anonymous, immutable, fixed-size aggregations of values — like lightweight tuples. Unlike Map, records are statically typed.

Syntax: (value1, value2) for positional, (name: value) for named fields.

Pattern matching works with:
• switch expressions (exhaustive)
• if-case statements
• Destructuring in assignments

Records are great for returning multiple values from a function without creating a class.`,
    `// ── Records ─────────────────────────────────────
// Positional record
(String, int) getUser() => ('Alice', 30);
final (name, age) = getUser(); // destructure
print(name); // Alice

// Named fields
({String name, int age, String email}) fetchProfile() =>
    (name: 'Bob', age: 25, email: 'bob@mail.com');

final profile = fetchProfile();
print(profile.name);  // Bob
print(profile.age);   // 25

// Mix of positional and named
(int, {String label}) = (42, label: 'score');

// Records as map keys (equality by value)
final a = (1, 'hello');
final b = (1, 'hello');
print(a == b); // true!

// ── Pattern Matching ───────────────────────────────
sealed class Shape {}
class Circle extends Shape { final double radius; Circle(this.radius); }
class Rect extends Shape { final double w, h; Rect(this.w, this.h); }

double area(Shape s) => switch (s) {
  Circle(radius: var r) => 3.14 * r * r,
  Rect(w: var w, h: var h) => w * h,
};

// if-case pattern
void handleResult(Object result) {
  if (result case (String msg, int code) when code >= 400) {
    print('Error \$code: \$msg');
  } else if (result case String s) {
    print('Success: \$s');
  }
}

// List patterns
final [first, second, ...rest] = [1, 2, 3, 4, 5];
print(first);  // 1
print(rest);   // [3, 4, 5]

// Map patterns
final {'name': String name, 'age': int age} = {'name': 'Alice', 'age': 30};`),

  // ══ OOP — additional ═════════════════════════════════════════════════════
  q(2, 4, 'medium',
    'How does operator overloading work in Dart?',
    `Dart allows overloading a fixed set of operators by defining them as methods:
==, <, >, <=, >=, +, -, *, /, ~/, %, ^, &, |, <<, >>, >>>, [], []=, ~, unary-

When you override ==, you should also override hashCode to maintain the contract: objects that are equal must have the same hashCode.

Use operator overloading to make custom classes work naturally with arithmetic or comparison operations (e.g. Vector, Money, Version).`,
    `class Vector {
  final double x, y;
  const Vector(this.x, this.y);

  // Arithmetic operators
  Vector operator +(Vector other) => Vector(x + other.x, y + other.y);
  Vector operator -(Vector other) => Vector(x - other.x, y - other.y);
  Vector operator *(double scalar) => Vector(x * scalar, y * scalar);

  // Comparison
  bool operator <(Vector other) => magnitude < other.magnitude;

  // Index operator
  double operator [](int i) {
    if (i == 0) return x;
    if (i == 1) return y;
    throw RangeError('Index must be 0 or 1');
  }

  // Equality — must also override hashCode
  @override
  bool operator ==(Object other) =>
      other is Vector && x == other.x && y == other.y;

  @override
  int get hashCode => Object.hash(x, y);

  double get magnitude => (x * x + y * y);

  @override
  String toString() => 'Vector(\$x, \$y)';
}

// Usage
final a = Vector(1, 2);
final b = Vector(3, 4);
print(a + b);      // Vector(4.0, 6.0)
print(b - a);      // Vector(2.0, 2.0)
print(a * 3);      // Vector(3.0, 6.0)
print(a == Vector(1, 2)); // true
print(a[0]);       // 1.0

// Practical: Money class
class Money {
  final int cents;
  final String currency;
  const Money(this.cents, this.currency);
  Money operator +(Money o) {
    assert(currency == o.currency);
    return Money(cents + o.cents, currency);
  }
  @override String toString() => '\$currency \${(cents / 100).toStringAsFixed(2)}';
}`),

  q(2, 5, 'hard',
    'What is the difference between covariant and contravariant types in Dart?',
    `Dart generics are invariant by default — List<Dog> is NOT a subtype of List<Animal> even though Dog extends Animal. This prevents type errors at runtime.

covariant keyword — relaxes type safety on a specific parameter to allow subtype override. Useful when you know the runtime type is correct.

Sound type system: Dart uses sound null safety and generics. The type system guarantees no implicit null errors.

Key rules:
• Function return types are covariant (can return a subtype)
• Function parameter types are contravariant in theory (but Dart is unsound here for practicality)
• Use covariant when overriding with a more specific parameter type`,
    `class Animal {
  void eat() {}
}
class Dog extends Animal {
  void bark() {}
}

// ── Generic invariance ─────────────────────────────
List<Dog> dogs = [Dog()];
// List<Animal> animals = dogs; // ❌ compile error — invariant
List<Animal> animals = dogs; // ✅ only works because Dart is unsound here (legacy)

// ── covariant keyword ──────────────────────────────
class Cage<T extends Animal> {
  T animal;
  Cage(this.animal);

  // Without covariant: cannot override parameter with subtype
  void put(covariant T newAnimal) {
    animal = newAnimal;
  }
}

class DogCage extends Cage<Dog> {
  DogCage(super.animal);

  @override
  void put(Dog dog) { // covariant allows this override
    super.put(dog);
    dog.bark();
  }
}

// ── Return type covariance (naturally allowed) ──────
abstract class Repository {
  Animal find(int id);
}
class DogRepository implements Repository {
  @override
  Dog find(int id) => Dog(); // ✅ Dog is a subtype of Animal — allowed
}

// ── Practical: typed callbacks ──────────────────────
abstract class EventHandler {
  void handle(covariant Object event);
}
class TapHandler extends EventHandler {
  @override
  void handle(TapEvent event) { // covariant makes this safe
    print('Tapped at \${event.position}');
  }
}`),

  // ══ FLUTTER FUNDAMENTALS — additional ════════════════════════════════════
  q(3, 5, 'easy',
    'What is the difference between hot reload, hot restart, and full restart?',
    `Three ways to update a running Flutter app during development:

Hot Reload (r) — injects new code into the running Dart VM and rebuilds the widget tree. State is PRESERVED. Fastest — milliseconds. Works for most UI changes.

Hot Restart (R) — restarts the Dart VM, resets all state. Slower than hot reload but faster than a full restart. Needed when: changing main(), modifying initState, changing native code.

Full Restart — stops and relaunches the app from scratch. Required when: changing native code (Kotlin/Swift), adding plugins, changing build config.

Limitations of hot reload: doesn't work for changes to main(), native code, global variable initializers, or static fields.`,
    `// Hot Reload works for:
// ✅ Widget UI changes
// ✅ Adding/modifying build() methods
// ✅ Changing styles, layouts
// ✅ Adding new widgets

// Hot Reload does NOT work for:
// ❌ Changes to initState (state already initialized)
// ❌ Changes to main() or runApp()
// ❌ Adding/removing packages (pubspec.yaml changes)
// ❌ Native code changes (Android/iOS)
// ❌ Changing static/global variable initializers

// Hot Restart needed for:
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      // Changing theme seed requires hot restart
      // because ThemeData is computed at app start
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue)),
      home: const HomePage(),
    );
  }
}

// Example of what breaks hot reload:
class _MyState extends State<MyWidget> {
  late final String _data;

  @override
  void initState() {
    super.initState();
    _data = 'initialized'; // ← change this → need hot restart
  }
}

// Using flutter CLI:
// flutter run              → starts app
// r                        → hot reload
// R                        → hot restart
// q                        → quit
// flutter run --release    → production build (no hot reload)`),

  q(3, 6, 'medium',
    'What is MediaQuery and how do you build responsive layouts?',
    `MediaQuery provides information about the device screen: size, pixel ratio, text scale, padding (safe area), orientation, and accessibility settings.

Responsive layout strategies:
• MediaQuery.sizeOf(context) — get screen dimensions
• LayoutBuilder — get available constraints from parent
• OrientationBuilder — react to portrait/landscape changes
• AdaptiveLayout / adaptive_breakpoints — Google's responsive package

Best practice: prefer LayoutBuilder over MediaQuery for layouts — it responds to the actual available space (accounts for sidebars, drawers) rather than the full screen size.`,
    `class ResponsivePage extends StatelessWidget {
  const ResponsivePage({super.key});

  @override
  Widget build(BuildContext context) {
    // Screen information
    final size = MediaQuery.sizeOf(context);
    final padding = MediaQuery.paddingOf(context);  // safe area
    final textScale = MediaQuery.textScalerOf(context);
    final orientation = MediaQuery.orientationOf(context);
    final isDark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;

    final isTablet = size.width >= 600;
    final isDesktop = size.width >= 1200;

    return Scaffold(
      body: SafeArea(  // respects status bar + notch
        child: LayoutBuilder(  // ✅ prefer over MediaQuery for layouts
          builder: (context, constraints) {
            if (constraints.maxWidth >= 1200) {
              return _DesktopLayout();
            } else if (constraints.maxWidth >= 600) {
              return _TabletLayout();
            }
            return _MobileLayout();
          },
        ),
      ),
    );
  }
}

// Responsive grid
class ResponsiveGrid extends StatelessWidget {
  final List<Widget> items;
  const ResponsiveGrid({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = switch (constraints.maxWidth) {
          >= 1200 => 4,
          >= 800  => 3,
          >= 600  => 2,
          _       => 1,
        };
        return GridView.builder(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: items.length,
          itemBuilder: (_, i) => items[i],
        );
      },
    );
  }
}`),

  // ══ BASIC WIDGETS — additional ════════════════════════════════════════════
  q(4, 4, 'medium',
    'How do you handle forms and validation in Flutter?',
    `Flutter's form system uses:
• Form — wraps form fields; provides a GlobalKey<FormState> to validate/save/reset
• TextFormField — combines TextField with Form integration; has validator callback
• FormField<T> — base class for any custom form field

Validation flow:
1. User taps submit
2. _formKey.currentState!.validate() — calls all field validators, shows error text
3. If valid → _formKey.currentState!.save() — calls onSaved callbacks
4. Collect data and proceed

Use AutovalidateMode.onUserInteraction to validate as user types.`,
    `class LoginForm extends StatefulWidget {
  const LoginForm({super.key});
  @override State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool _obscure = true;

  @override void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();
    // Proceed with login
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      child: Column(
        children: [
          TextFormField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (val) {
              if (val == null || val.isEmpty) return 'Email is required';
              if (!RegExp(r'^[\\w.]+@[\\w]+\\.[\\w]+\$').hasMatch(val))
                return 'Enter a valid email';
              return null; // null = valid
            },
            onSaved: (val) => print('Email: \$val'),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passCtrl,
            obscureText: _obscure,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: 'Password',
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(
                icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (val) {
              if (val == null || val.length < 8) return 'Min 8 characters';
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(onPressed: _submit, child: const Text('Sign In')),
          ),
        ],
      ),
    );
  }
}`),

  q(4, 5, 'hard',
    'How does CustomPainter work and when would you use it?',
    `CustomPainter gives you direct access to a Canvas to draw anything — shapes, paths, gradients, charts — that built-in widgets cannot achieve.

Steps:
1. Extend CustomPainter and implement paint() and shouldRepaint()
2. Use CustomPaint widget, passing your painter
3. Use Canvas API: drawLine, drawCircle, drawPath, drawRect, drawArc, drawText, drawImage

shouldRepaint() controls when to repaint:
• Return false if the visual output hasn't changed (performance optimization)
• Return true only when the painter's properties that affect drawing have changed

Use canvas coordinates — top-left is (0,0), size.width × size.height is available.`,
    `class PieChartPainter extends CustomPainter {
  final List<double> values;
  final List<Color> colors;

  PieChartPainter({required this.values, required this.colors});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2;
    final total = values.fold<double>(0, (s, v) => s + v);

    final paint = Paint()..style = PaintingStyle.fill;
    var startAngle = -3.14159 / 2; // start at top

    for (var i = 0; i < values.length; i++) {
      final sweepAngle = (values[i] / total) * 2 * 3.14159;
      paint.color = colors[i % colors.length];
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle, sweepAngle,
        true, paint, // true = include center point (pie slice)
      );
      startAngle += sweepAngle;
    }

    // Draw center hole (donut chart)
    paint.color = Colors.white;
    canvas.drawCircle(center, radius * 0.55, paint);
  }

  @override
  bool shouldRepaint(PieChartPainter old) =>
      values != old.values || colors != old.colors;
}

// Animated gradient progress ring
class RingPainter extends CustomPainter {
  final double progress; // 0.0 to 1.0
  final Color color;
  RingPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide / 2) - 8;

    // Background ring
    canvas.drawCircle(center, radius, Paint()
      ..color = color.withOpacity(0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12);

    // Progress arc
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -3.14159 / 2,
      progress * 2 * 3.14159,
      false,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 12
        ..strokeCap = StrokeCap.round,
    );
  }
  @override bool shouldRepaint(RingPainter old) => progress != old.progress;
}

// Widget usage
CustomPaint(
  size: const Size(200, 200),
  painter: RingPainter(progress: 0.75, color: Colors.blue),
)`),

  // ══ NAVIGATION — additional ══════════════════════════════════════════════
  q(5, 3, 'medium',
    'How do you implement bottom navigation with persistent state in Flutter?',
    `Bottom navigation should preserve state in each tab — users expect the Home tab to stay scrolled where they left it.

Options:
• IndexedStack — renders all tabs at once, preserves state. Simple but higher memory use.
• AutomaticKeepAliveClientMixin — explicitly keep state alive in PageView/TabBarView
• go_router ShellRoute — best for deep linking + bottom nav

IndexedStack is the simplest: all children exist in the tree simultaneously, only the selected one is visible. State is never destroyed.`,
    `// ── IndexedStack approach (simplest) ──────────────
class MainNav extends StatefulWidget {
  const MainNav({super.key});
  @override State<MainNav> createState() => _MainNavState();
}

class _MainNavState extends State<MainNav> {
  int _currentIndex = 0;

  static const _tabs = [
    HomeTab(),
    SearchTab(),
    ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs, // all built, only one shown
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined),   selectedIcon: Icon(Icons.home),   label: 'Home'),
          NavigationDestination(icon: Icon(Icons.search),                                             label: 'Search'),
          NavigationDestination(icon: Icon(Icons.person_outlined), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

// ── AutomaticKeepAliveClientMixin ──────────────────
class SearchTab extends StatefulWidget {
  const SearchTab({super.key});
  @override State<SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends State<SearchTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true; // don't dispose when switching tabs

  @override
  Widget build(BuildContext context) {
    super.build(context); // required
    return const SearchContent();
  }
}

// ── go_router ShellRoute (deep linking support) ────
final router = GoRouter(
  initialLocation: '/home',
  routes: [
    ShellRoute(
      builder: (context, state, child) {
        return BottomNavShell(child: child);
      },
      routes: [
        GoRoute(path: '/home',    builder: (_, __) => const HomeTab()),
        GoRoute(path: '/search',  builder: (_, __) => const SearchTab()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileTab()),
      ],
    ),
  ],
);`),

  // ══ ASYNC & FUTURES — additional ═════════════════════════════════════════
  q(7, 2, 'medium',
    'What is a Completer in Dart and when would you use it?',
    `A Completer<T> creates a Future that you can complete manually — useful when you need to bridge callback-based APIs with Futures.

Without Completer, async/await handles most cases. Use Completer when:
• Converting callback APIs to Futures
• Creating a Future whose completion is controlled externally
• Implementing one-time events that multiple awaiters can subscribe to

Completer has:
• .future — the Future to await
• .complete(value) — resolve with a value
• .completeError(error) — resolve with an error
• .isCompleted — check if already completed`,
    `// ── Basic usage ────────────────────────────────────
Future<String> waitForUser() {
  final completer = Completer<String>();

  // Simulate callback-based API
  someCallbackAPI(
    onSuccess: (data) => completer.complete(data),
    onError: (err) => completer.completeError(err),
  );

  return completer.future;
}

// ── Converting platform channel callback to Future ──
Future<String?> pickImage() {
  final completer = Completer<String?>();
  _channel.invokeMethod('pickImage').then(
    (path) => completer.complete(path as String?),
    onError: (e) => completer.completeError(e),
  );
  return completer.future;
}

// ── One-time initialization guard ──────────────────
class DatabaseManager {
  Completer<Database>? _initCompleter;

  Future<Database> get database async {
    if (_initCompleter != null) return _initCompleter!.future;
    _initCompleter = Completer<Database>();
    try {
      final db = await openDatabase('app.db');
      _initCompleter!.complete(db);
    } catch (e) {
      _initCompleter!.completeError(e);
      _initCompleter = null; // allow retry
    }
    return _initCompleter!.future;
  }
}

// ── Dialog that returns a result ────────────────────
Future<bool> showConfirmDialog(BuildContext context, String message) {
  final completer = Completer<bool>();
  showDialog(
    context: context,
    builder: (_) => AlertDialog(
      content: Text(message),
      actions: [
        TextButton(onPressed: () { Navigator.pop(context); completer.complete(false); }, child: const Text('Cancel')),
        TextButton(onPressed: () { Navigator.pop(context); completer.complete(true); },  child: const Text('Confirm')),
      ],
    ),
  );
  return completer.future;
}`),

  // ══ STREAMS — additional ═════════════════════════════════════════════════
  q(8, 2, 'medium',
    'How do you use StreamController and explain stream transformations?',
    `StreamController gives you a stream + a sink to push events into.

Transformations (all return a new Stream):
• map() — transform each event
• where() — filter events
• take(n) / skip(n) — limit or skip events
• distinct() — skip duplicate consecutive events
• debounceTime() — wait for silence (rxdart)
• throttle() — rate limit
• switchMap() — cancel previous inner stream when new event arrives
• asyncMap() — map with async operations
• expand() — one-to-many transform
• scan() — accumulate (like fold but streaming)`,
    `// ── StreamController ────────────────────────────────
class SearchBloc {
  final _queryCtrl = StreamController<String>();
  Sink<String> get querySink => _queryCtrl.sink;

  // Debounce: wait 300ms after last keystroke
  late final Stream<List<Result>> results = _queryCtrl.stream
      .where((q) => q.length >= 2)          // skip short queries
      .distinct()                             // skip unchanged queries
      .asyncMap((q) => searchApi(q))         // async fetch
      .handleError((e) { print(e); return []; });

  void dispose() => _queryCtrl.close();
}

// ── StreamTransformer ────────────────────────────────
class ThrottleTransformer<T> extends StreamTransformerBase<T, T> {
  final Duration duration;
  ThrottleTransformer(this.duration);

  @override
  Stream<T> bind(Stream<T> stream) async* {
    DateTime? lastEmit;
    await for (final event in stream) {
      final now = DateTime.now();
      if (lastEmit == null || now.difference(lastEmit) >= duration) {
        lastEmit = now;
        yield event;
      }
    }
  }
}

// ── Merging streams ─────────────────────────────────
import 'dart:async';

Stream<int> merge(List<Stream<int>> streams) async* {
  final ctrl = StreamController<int>();
  var active = streams.length;
  for (final s in streams) {
    s.listen(
      ctrl.add,
      onError: ctrl.addError,
      onDone: () { if (--active == 0) ctrl.close(); },
    );
  }
  yield* ctrl.stream;
}

// ── scan() — running accumulator ─────────────────────
extension ScanExtension<T> on Stream<T> {
  Stream<S> scan<S>(S initial, S Function(S acc, T event) accumulator) async* {
    var acc = initial;
    await for (final event in this) {
      acc = accumulator(acc, event);
      yield acc;
    }
  }
}

// Example: running total of cart additions
Stream<double> runningTotal(Stream<double> prices) =>
    prices.scan<double>(0, (total, price) => total + price);`),

  // ══ PROVIDER — additional ════════════════════════════════════════════════
  q(10, 2, 'medium',
    'Explain ProxyProvider and how to combine providers.',
    `ProxyProvider creates a provider that depends on other providers. It rebuilds when its dependencies change.

Use cases:
• A service that needs a dependency injected at runtime
• A provider whose value is derived from another provider
• Repository that needs an authenticated HTTP client

ProxyProvider variants:
• ProxyProvider<A, T> — depends on 1 provider
• ProxyProvider2<A, B, T> — depends on 2 providers
• ChangeNotifierProxyProvider — produces a ChangeNotifier that depends on others`,
    `// Setup: ApiService depends on AuthToken
class AuthToken extends ChangeNotifier {
  String? _token;
  String? get token => _token;

  Future<void> login(String email, String pass) async {
    _token = await AuthApi.login(email, pass);
    notifyListeners();
  }
}

class ApiService {
  final String? authToken;
  ApiService({this.authToken});

  Future<List<Product>> getProducts() async {
    // Uses auth token in headers
    final dio = Dio();
    if (authToken != null) dio.options.headers['Authorization'] = 'Bearer \$authToken';
    final response = await dio.get('/products');
    return (response.data as List).map((e) => Product.fromJson(e)).toList();
  }
}

// ── ProxyProvider — rebuild ApiService when token changes ──
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => AuthToken()),

    // ProxyProvider: ApiService is rebuilt whenever AuthToken changes
    ProxyProvider<AuthToken, ApiService>(
      update: (context, auth, previousService) => ApiService(
        authToken: auth.token,
      ),
    ),

    // ChangeNotifierProxyProvider: the notifier itself needs a dependency
    ChangeNotifierProxyProvider<AuthToken, CartNotifier>(
      create: (_) => CartNotifier(null),
      update: (context, auth, previous) {
        return previous!..updateToken(auth.token);
      },
    ),
  ],
  child: const MyApp(),
)

// In widget — just read ApiService normally
final api = context.read<ApiService>();
final products = await api.getProducts();`),

  // ══ BLOC — additional ════════════════════════════════════════════════════
  q(11, 2, 'hard',
    'What is BlocObserver and how do you use it for logging and analytics?',
    `BlocObserver is a global listener for all Bloc/Cubit events, state changes, transitions, and errors. Set it once in main() — it applies to every Bloc in your app.

Use cases:
• Logging all state transitions (debugging)
• Sending analytics events
• Crash reporting (Sentry, Firebase Crashlytics)
• Performance monitoring

override methods:
• onCreate — bloc created
• onEvent — event added (Bloc only)
• onChange — state changed
• onTransition — event → state (Bloc only)
• onError — error occurred
• onClose — bloc closed`,
    `// ── Custom BlocObserver ─────────────────────────────
class AppBlocObserver extends BlocObserver {
  final AnalyticsService _analytics;
  final CrashService _crash;

  AppBlocObserver(this._analytics, this._crash);

  @override
  void onCreate(BlocBase bloc) {
    super.onCreate(bloc);
    print('[BLoC] Created: \${bloc.runtimeType}');
  }

  @override
  void onEvent(Bloc bloc, Object? event) {
    super.onEvent(bloc, event);
    print('[BLoC] Event: \${bloc.runtimeType} → \$event');
  }

  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    print('[BLoC] Change: \${bloc.runtimeType}');
    print('  From: \${change.currentState}');
    print('  To:   \${change.nextState}');
  }

  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    // Send to analytics
    _analytics.logEvent('bloc_transition', {
      'bloc': bloc.runtimeType.toString(),
      'event': transition.event.runtimeType.toString(),
      'from': transition.currentState.runtimeType.toString(),
      'to': transition.nextState.runtimeType.toString(),
    });
  }

  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    super.onError(bloc, error, stackTrace);
    print('[BLoC] Error in \${bloc.runtimeType}: \$error');
    _crash.report(error, stackTrace, context: {
      'bloc': bloc.runtimeType.toString(),
      'state': bloc.state.toString(),
    });
  }

  @override
  void onClose(BlocBase bloc) {
    super.onClose(bloc);
    print('[BLoC] Closed: \${bloc.runtimeType}');
  }
}

// ── Register in main() ──────────────────────────────
void main() {
  Bloc.observer = AppBlocObserver(
    AnalyticsService(),
    CrashService(),
  );
  runApp(const MyApp());
}`),

  // ══ NETWORKING — additional ═══════════════════════════════════════════════
  q(12, 2, 'medium',
    'How do you implement pagination and infinite scroll in Flutter?',
    `Pagination patterns:

1. Offset-based: ?page=2&limit=20 — simple, works everywhere
2. Cursor-based: ?after=cursor123 — better for real-time data, no skipped/duplicated items
3. Keyset: ?last_id=500 — efficient for large datasets

Flutter implementation:
• ScrollController — detect when user reaches the bottom
• ListView.builder with a loading indicator at the end
• Track state: items, isLoading, hasMore, error`,
    `class ProductListCubit extends Cubit<ProductListState> {
  final ProductRepository _repo;
  static const _pageSize = 20;

  int _page = 1;
  bool _hasMore = true;
  bool _loading = false;

  ProductListCubit(this._repo) : super(const ProductListState());

  Future<void> loadMore() async {
    if (_loading || !_hasMore) return;
    _loading = true;

    try {
      final newItems = await _repo.getProducts(page: _page, limit: _pageSize);
      _hasMore = newItems.length == _pageSize;
      _page++;
      emit(state.copyWith(
        items: [...state.items, ...newItems],
        hasMore: _hasMore,
        isLoading: false,
      ));
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isLoading: false));
    } finally {
      _loading = false;
    }
  }

  Future<void> refresh() async {
    _page = 1; _hasMore = true; _loading = false;
    emit(const ProductListState(isLoading: true));
    await loadMore();
  }
}

// ── Scroll detection widget ─────────────────────────
class InfiniteProductList extends StatefulWidget {
  const InfiniteProductList({super.key});
  @override State<InfiniteProductList> createState() => _State();
}

class _State extends State<InfiniteProductList> {
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    context.read<ProductListCubit>().loadMore();
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    final pos = _scrollCtrl.position;
    // Load more when 200px from bottom
    if (pos.pixels >= pos.maxScrollExtent - 200) {
      context.read<ProductListCubit>().loadMore();
    }
  }

  @override void dispose() { _scrollCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductListCubit, ProductListState>(
      builder: (context, state) => ListView.builder(
        controller: _scrollCtrl,
        itemCount: state.items.length + (state.hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == state.items.length) {
            return const Center(child: CircularProgressIndicator()); // loading indicator
          }
          return ProductTile(product: state.items[index]);
        },
      ),
    );
  }
}`),

  // ══ TESTING — additional ══════════════════════════════════════════════════
  q(14, 2, 'medium',
    'How do you write golden tests in Flutter?',
    `Golden tests (snapshot tests) compare a widget's rendered output pixel-by-pixel against a saved "golden" reference image. They catch unintended visual regressions.

Workflow:
1. Write test with matchesGoldenFile()
2. Run flutter test --update-goldens to generate reference images
3. Commit the golden files to source control
4. CI runs tests — fails if pixels differ

Gotchas:
• Golden images are platform-dependent (macOS vs Linux vs Windows render slightly differently)
• Run goldens on a fixed platform (usually Linux in CI)
• Use goldenFileComparator to set tolerance for minor anti-aliasing differences`,
    `import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

void main() {
  // ── Basic golden test ────────────────────────────
  testWidgets('ProductCard golden', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(useMaterial3: true),
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 300,
              child: ProductCard(
                product: Product(
                  id: 1,
                  name: 'Flutter in Action',
                  price: 39.99,
                  imageUrl: '', // use local asset for deterministic output
                ),
              ),
            ),
          ),
        ),
      ),
    );

    // Compare with golden file
    await expectLater(
      find.byType(ProductCard),
      matchesGoldenFile('goldens/product_card.png'),
    );
  });

  // ── Golden with different states ─────────────────
  testWidgets('Button states golden', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(children: [
            AppButton(label: 'Default', state: ButtonState.idle),
            AppButton(label: 'Loading', state: ButtonState.loading),
            AppButton(label: 'Success', state: ButtonState.success),
          ]),
        ),
      ),
    );
    await expectLater(find.byType(Column), matchesGoldenFile('goldens/button_states.png'));
  });
}

// ── Generate goldens (first time or after intentional change):
// flutter test --update-goldens

// ── Run goldens:
// flutter test

// ── CI setup — use Linux for consistency
// goldenFileComparator: LocalFileComparator (default) or custom with tolerance
void setUpGoldens() {
  goldenFileComparator = GoldenFileComparator(
    Uri.parse('test/goldens/'),
  );
}`),

  // ══ ARCHITECTURE — additional ══════════════════════════════════════════════
  q(15, 2, 'hard',
    'How do you structure a large Flutter app by features (feature-first)?',
    `Feature-first (vertical slicing) groups files by FEATURE rather than by layer.

Layer-first (horizontal):
lib/models/ lib/repositories/ lib/blocs/ lib/screens/
Problem: Adding a feature requires touching 4+ folders.

Feature-first (vertical):
lib/features/auth/ lib/features/cart/ lib/features/profile/
Each feature folder contains its own models, bloc, repo, screens, widgets.

Benefits:
• High cohesion — related code sits together
• Easy to delete/add features
• Teams can own features independently
• Clear boundaries → better for micro-frontends / modularization

Convention: shared code lives in lib/core/ or lib/shared/`,
    `// ── Feature-first project structure ───────────────
/*
lib/
├── main.dart
├── app.dart                    # MaterialApp, router setup
├── core/
│   ├── network/
│   │   ├── api_client.dart
│   │   └── interceptors.dart
│   ├── storage/
│   │   └── secure_storage.dart
│   ├── theme/
│   │   └── app_theme.dart
│   └── utils/
│       └── extensions.dart
├── shared/
│   ├── widgets/
│   │   ├── app_button.dart
│   │   └── loading_overlay.dart
│   └── models/
│       └── paginated_response.dart
└── features/
    ├── auth/
    │   ├── data/
    │   │   ├── auth_api.dart
    │   │   └── auth_repository_impl.dart
    │   ├── domain/
    │   │   ├── auth_repository.dart  # interface
    │   │   └── login_use_case.dart
    │   ├── presentation/
    │   │   ├── bloc/
    │   │   │   ├── auth_bloc.dart
    │   │   │   ├── auth_event.dart
    │   │   │   └── auth_state.dart
    │   │   ├── screens/
    │   │   │   ├── login_screen.dart
    │   │   │   └── register_screen.dart
    │   │   └── widgets/
    │   │       └── social_login_button.dart
    │   └── auth_module.dart        # DI setup for this feature
    ├── products/
    │   ├── data/ ...
    │   ├── domain/ ...
    │   └── presentation/ ...
    └── cart/
        └── ...
*/

// ── Feature module — DI registration ───────────────
class AuthModule {
  static void register(GetIt sl) {
    // Data
    sl.registerLazySingleton<AuthApi>(() => AuthApi(sl()));
    sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl(), sl()));
    // Domain
    sl.registerLazySingleton(() => LoginUseCase(sl()));
    sl.registerLazySingleton(() => LogoutUseCase(sl()));
    // Presentation
    sl.registerFactory(() => AuthBloc(sl(), sl()));
  }
}

// ── App module — compose all features ──────────────
void setupDependencies() {
  AuthModule.register(sl);
  ProductsModule.register(sl);
  CartModule.register(sl);
}`),

  // ══ DESIGN PATTERNS — additional ══════════════════════════════════════════
  q(16, 3, 'hard',
    'Explain Dependency Injection in Flutter. Compare get_it vs injectable vs Riverpod.',
    `Dependency Injection (DI) provides dependencies to a class from outside rather than creating them internally — enabling testability, flexibility, and loose coupling.

Approaches in Flutter:

get_it — service locator (global registry):
• Simple, no code generation
• Not compile-time safe (runtime lookup)
• Great for simple to medium apps

injectable (wraps get_it):
• Adds code generation with annotations
• @injectable, @singleton, @lazySingleton, @module
• Compile-time safe via generated code

Riverpod:
• First-class DI built into state management
• Compile-time safe, auto-dispose, testable
• Best for new Flutter apps`,
    `// ── get_it (manual registration) ──────────────────
import 'package:get_it/get_it.dart';

final sl = GetIt.instance;

Future<void> setupDi() async {
  // Singletons — created once
  sl.registerLazySingleton<Dio>(() => createDio());
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl()));

  // Factories — new instance each time
  sl.registerFactory(() => LoginBloc(sl()));
  sl.registerFactory<ProductsBloc>(() => ProductsBloc(sl(), sl()));

  // Async singleton
  sl.registerSingletonAsync<SharedPreferences>(
    () => SharedPreferences.getInstance(),
  );
  await sl.allReady(); // wait for async singletons
}

// Usage anywhere (no context needed):
final repo = sl<AuthRepository>();
final bloc = sl<LoginBloc>();

// ── injectable (code generation) ──────────────────
@module
abstract class NetworkModule {
  @lazySingleton
  Dio get dio => createDio();
}

@LazySingleton(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  final Dio _dio;
  AuthRepositoryImpl(this._dio); // injected automatically
}

@injectable
class LoginBloc extends Bloc<LoginEvent, LoginState> {
  final AuthRepository _repo;
  LoginBloc(this._repo) : super(LoginInitial());
}

// ── Riverpod (recommended for new projects) ─────────
final dioProvider = Provider<Dio>((ref) => createDio());

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(ref.watch(dioProvider));
});

final loginBlocProvider = StateNotifierProvider<LoginNotifier, LoginState>((ref) {
  return LoginNotifier(ref.watch(authRepositoryProvider));
});

// ── Testing: override dependencies ─────────────────
// get_it
sl.unregister<AuthRepository>();
sl.registerFactory<AuthRepository>(() => MockAuthRepository());

// Riverpod
testWidgets('login test', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(MockAuthRepository()),
      ],
      child: const App(),
    ),
  );
});`),

  // ══ DSA — additional ══════════════════════════════════════════════════════
  q(17, 3, 'hard',
    'Implement Stack and Queue in Dart and explain common interview problems.',
    `Stack — LIFO (Last In, First Out): push, pop, peek — all O(1)
Queue — FIFO (First In, First Out): enqueue, dequeue — all O(1)

Both can be implemented with Dart's built-in ListQueue from dart:collection.

Common interview problems that use stacks:
• Valid parentheses
• Evaluate RPN expressions
• Next greater element
• Min stack (with O(1) getMin)

Common problems with queues:
• BFS traversal
• Level-order tree traversal
• Sliding window maximum`,
    `import 'dart:collection';

// ── Stack ─────────────────────────────────────────
class Stack<T> {
  final _list = ListQueue<T>();
  void push(T item) => _list.addLast(item);
  T pop() => _list.removeLast();
  T get peek => _list.last;
  bool get isEmpty => _list.isEmpty;
  int get size => _list.length;
}

// Problem: Valid Parentheses — O(n) time, O(n) space
bool isValid(String s) {
  final stack = Stack<String>();
  const map = {'(': ')', '[': ']', '{': '}'};
  for (final c in s.split('')) {
    if (map.containsKey(c)) {
      stack.push(c);
    } else {
      if (stack.isEmpty || map[stack.pop()] != c) return false;
    }
  }
  return stack.isEmpty;
}
print(isValid('()[]{}')); // true
print(isValid('([)]'));   // false

// Problem: Min Stack — O(1) getMin
class MinStack {
  final _stack = Stack<int>();
  final _minStack = Stack<int>(); // tracks minimums

  void push(int val) {
    _stack.push(val);
    _minStack.push(_minStack.isEmpty ? val : val < _minStack.peek ? val : _minStack.peek);
  }
  int pop() { _minStack.pop(); return _stack.pop(); }
  int get top => _stack.peek;
  int get min => _minStack.peek; // O(1)!
}

// ── Queue ─────────────────────────────────────────
class Queue_<T> {
  final _list = ListQueue<T>();
  void enqueue(T item) => _list.addLast(item);
  T dequeue() => _list.removeFirst();
  T get front => _list.first;
  bool get isEmpty => _list.isEmpty;
}

// BFS on a graph
List<int> bfs(Map<int, List<int>> graph, int start) {
  final visited = <int>{};
  final queue = Queue_<int>();
  final order = <int>[];

  queue.enqueue(start);
  visited.add(start);

  while (!queue.isEmpty) {
    final node = queue.dequeue();
    order.add(node);
    for (final neighbor in graph[node] ?? []) {
      if (!visited.contains(neighbor)) {
        visited.add(neighbor);
        queue.enqueue(neighbor);
      }
    }
  }
  return order;
}`),

  q(17, 4, 'hard',
    'Explain the two-pointer and sliding window techniques with examples.',
    `Two-pointer — use two indices to traverse a sorted array or string. Avoids O(n²) nested loops.

Sliding window — maintain a "window" (subarray/substring) and slide it across the data. Useful for problems asking for max/min/sum/count within a contiguous range.

Both reduce O(n²) brute-force solutions to O(n) — critical for interview performance questions.`,
    `// ── TWO POINTERS ──────────────────────────────────

// Problem: Two Sum (sorted array) — O(n)
List<int>? twoSum(List<int> sorted, int target) {
  var left = 0, right = sorted.length - 1;
  while (left < right) {
    final sum = sorted[left] + sorted[right];
    if (sum == target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return null;
}
print(twoSum([1, 2, 3, 6, 8, 11], 14)); // [3, 5] (6+8)

// Problem: Remove duplicates from sorted array in-place — O(n)
int removeDuplicates(List<int> nums) {
  if (nums.isEmpty) return 0;
  var slow = 0;
  for (var fast = 1; fast < nums.length; fast++) {
    if (nums[fast] != nums[slow]) {
      nums[++slow] = nums[fast];
    }
  }
  return slow + 1;
}

// Problem: Reverse a string in-place
void reverseString(List<String> chars) {
  var l = 0, r = chars.length - 1;
  while (l < r) {
    final tmp = chars[l]; chars[l] = chars[r]; chars[r] = tmp;
    l++; r--;
  }
}

// ── SLIDING WINDOW ─────────────────────────────────

// Problem: Max sum subarray of size k — O(n)
int maxSubarraySum(List<int> nums, int k) {
  if (nums.length < k) return 0;
  var windowSum = nums.sublist(0, k).fold(0, (a, b) => a + b);
  var maxSum = windowSum;
  for (var i = k; i < nums.length; i++) {
    windowSum += nums[i] - nums[i - k]; // slide: add new, remove old
    if (windowSum > maxSum) maxSum = windowSum;
  }
  return maxSum;
}
print(maxSubarraySum([2, 1, 5, 1, 3, 2], 3)); // 9 (5+1+3)

// Problem: Longest substring without repeating chars — O(n)
int lengthOfLongestSubstring(String s) {
  final seen = <String, int>{}; // char → last seen index
  var maxLen = 0;
  var left = 0;
  for (var right = 0; right < s.length; right++) {
    final c = s[right];
    if (seen.containsKey(c) && seen[c]! >= left) {
      left = seen[c]! + 1; // shrink window
    }
    seen[c] = right;
    if (right - left + 1 > maxLen) maxLen = right - left + 1;
  }
  return maxLen;
}
print(lengthOfLongestSubstring('abcabcbb')); // 3 (abc)`),

  // ══ PLATFORM CHANNELS — additional ════════════════════════════════════════
  q(18, 2, 'hard',
    'How do you write a Flutter plugin from scratch?',
    `A Flutter plugin is a Dart package that wraps native platform code (Android + iOS) using platform channels. Publishing a plugin makes it reusable across projects.

Plugin structure:
• lib/ — Dart API (what app developers use)
• android/ — Kotlin implementation
• ios/ — Swift implementation
• test/ — unit and integration tests
• example/ — runnable demo app

Create with: flutter create --template=plugin --platforms=android,ios my_plugin

The Dart side defines the interface and delegates to native via MethodChannel.`,
    `// ── Dart API (lib/my_plugin.dart) ─────────────────
class MyPlugin {
  static const _channel = MethodChannel('com.example/my_plugin');

  // Simple method call
  static Future<String> getPlatformVersion() async {
    final version = await _channel.invokeMethod<String>('getPlatformVersion');
    return version ?? 'Unknown';
  }

  // Method with arguments and return type
  static Future<bool> requestPermission(String permission) async {
    return await _channel.invokeMethod<bool>('requestPermission', {
      'permission': permission,
    }) ?? false;
  }
}

// ── Android (android/src/main/kotlin/.../MyPlugin.kt) ──
/*
class MyPlugin : FlutterPlugin, MethodCallHandler {
  private lateinit var channel: MethodChannel
  private lateinit var context: Context

  override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    context = binding.applicationContext
    channel = MethodChannel(binding.binaryMessenger, "com.example/my_plugin")
    channel.setMethodCallHandler(this)
  }

  override fun onMethodCall(call: MethodCall, result: Result) {
    when (call.method) {
      "getPlatformVersion" -> result.success("Android \${Build.VERSION.RELEASE}")
      "requestPermission" -> {
        val perm = call.argument<String>("permission")!!
        // request permission logic...
        result.success(true)
      }
      else -> result.notImplemented()
    }
  }

  override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
    channel.setMethodCallHandler(null)
  }
}
*/

// ── iOS (ios/Classes/MyPlugin.swift) ───────────────
/*
public class MyPlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(
      name: "com.example/my_plugin",
      binaryMessenger: registrar.messenger()
    )
    let instance = MyPlugin()
    registrar.addMethodCallDelegate(instance, channel: channel)
  }

  public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "getPlatformVersion":
      result("iOS " + UIDevice.current.systemVersion)
    case "requestPermission":
      result(true)
    default:
      result(FlutterMethodNotImplemented)
    }
  }
}
*/

// ── pubspec.yaml for the plugin ────────────────────
/*
flutter:
  plugin:
    platforms:
      android:
        package: com.example.my_plugin
        pluginClass: MyPlugin
      ios:
        pluginClass: MyPlugin
*/`),

  // ══ PERFORMANCE — additional ══════════════════════════════════════════════
  q(19, 2, 'hard',
    'How do you detect and fix memory leaks in Flutter?',
    `Common sources of memory leaks in Flutter:

1. StreamSubscription not cancelled in dispose()
2. AnimationController not disposed
3. TextEditingController / FocusNode not disposed
4. Timer not cancelled
5. GlobalKey held in static variables
6. Closures capturing large objects
7. Image cache growing unbounded

Detection tools:
• Flutter DevTools → Memory tab → heap snapshots
• Leak Tracker package (flutter_test)
• Observatory → allocation profiling`,
    `// ── Common leaks and fixes ─────────────────────────

class LeakyWidget extends StatefulWidget {
  @override State<LeakyWidget> createState() => _LeakyState();
}

class _LeakyState extends State<LeakyWidget>
    with SingleTickerProviderStateMixin {

  // These ALL need disposal
  late AnimationController _anim;
  late TextEditingController _textCtrl;
  late FocusNode _focusNode;
  late StreamSubscription _sub;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(seconds: 1));
    _textCtrl = TextEditingController();
    _focusNode = FocusNode();
    _sub = eventStream.listen(_handleEvent);
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _refresh());
  }

  @override
  void dispose() {
    // ✅ Dispose ALL controllers and cancel ALL subscriptions
    _anim.dispose();
    _textCtrl.dispose();
    _focusNode.dispose();
    _sub.cancel();
    _timer?.cancel();
    super.dispose();
  }

  @override Widget build(BuildContext context) => const Placeholder();
}

// ── Image cache limits ─────────────────────────────
// In main() or app init:
PaintingBinding.instance.imageCache.maximumSize = 100; // max 100 images
PaintingBinding.instance.imageCache.maximumSizeBytes = 50 << 20; // 50 MB

// ── Avoid closures capturing large state ───────────
class _BadState extends State<MyWidget> {
  Uint8List _largeBuffer = Uint8List(1024 * 1024);

  @override Widget build(BuildContext context) {
    return ElevatedButton(
      // ❌ closure captures 'this' → captures _largeBuffer
      onPressed: () => print(_largeBuffer.length),
      child: const Text('Bad'),
    );
  }
}

class _GoodState extends State<MyWidget> {
  Uint8List _largeBuffer = Uint8List(1024 * 1024);

  void _onPressed() => print(_largeBuffer.length);

  @override Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: _onPressed, // ✅ method reference, not a new closure each build
      child: const Text('Good'),
    );
  }
}

// ── Detect leaks with leak_tracker ─────────────────
// flutter test --enable-leak-tracking
// Or in test:
testWidgets('no leaks', (tester) async {
  await tester.pumpWidget(const MyApp());
  // All disposables tracked automatically in test mode
});`),

  // ══ RIVERPOD — additional ═════════════════════════════════════════════════
  q(20, 2, 'hard',
    'Explain Riverpod family modifier and how to override providers in tests.',
    `family — parametrize a provider by an argument. Creates a separate provider instance per parameter value. Each instance is cached and auto-disposed when no longer watched.

Use for: fetching by ID, filtering by category, locale-specific providers.

Testing with Riverpod — override any provider in ProviderScope for unit and widget tests. This replaces the real implementation with a mock.`,
    `// ── family modifier ────────────────────────────────
// Provider parameterized by product ID
final productProvider = FutureProvider.family<Product, int>((ref, id) async {
  final repo = ref.watch(productRepositoryProvider);
  return repo.getProduct(id);
});

// Usage in widget — each ID gets its own cached provider
class ProductPage extends ConsumerWidget {
  final int productId;
  const ProductPage({super.key, required this.productId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productProvider(productId)); // unique per ID
    return product.when(
      data: (p) => Text(p.name),
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: \$e'),
    );
  }
}

// ── Combining family with autoDispose ────────────────
final userPostsProvider = StreamProvider.autoDispose.family<List<Post>, int>(
  (ref, userId) {
    final repo = ref.watch(postRepositoryProvider);
    return repo.watchPosts(userId); // auto-cancels stream when widget leaves
  },
);

// ── Overriding in tests ─────────────────────────────
class FakeProductRepository implements ProductRepository {
  @override Future<Product> getProduct(int id) async =>
      Product(id: id, name: 'Fake Product', price: 9.99);
  @override Future<List<Product>> getProducts({int page = 1}) async => [];
}

void main() {
  testWidgets('ProductPage shows product name', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          // Override the repository — affects all providers that depend on it
          productRepositoryProvider.overrideWithValue(FakeProductRepository()),
        ],
        child: MaterialApp(
          home: ProductPage(productId: 42),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Fake Product'), findsOneWidget);
  });

  // Unit testing a notifier
  test('ProductsNotifier loads products', () async {
    final container = ProviderContainer(
      overrides: [
        productRepositoryProvider.overrideWithValue(FakeProductRepository()),
      ],
    );
    addTearDown(container.dispose);

    final notifier = container.read(productsProvider.notifier);
    await container.read(productsProvider.future);

    expect(container.read(productsProvider).hasValue, true);
  });
}`),

  // ══ SECURITY — additional ══════════════════════════════════════════════════
  q(21, 2, 'hard',
    'What is SSL/certificate pinning and how do you implement it in Flutter?',
    `Certificate pinning prevents Man-in-the-Middle (MITM) attacks by hardcoding the expected server certificate or public key in the app. Even if an attacker installs a custom CA, the app rejects their certificate.

Two pinning approaches:
1. Certificate pinning — pin the full certificate (changes when cert renews ~1 year)
2. Public key pinning — pin just the public key (survives cert renewals, more flexible)

Implementation in Flutter:
• Override HttpClient's badCertificateCallback
• Or use http_certificate_pinning package
• Or custom Dio adapter

Warning: If you pin incorrectly or the certificate changes without updating the app, your app loses network access. Always include a backup pin.`,
    `// ── Approach 1: Dio with custom HttpClient ──────────
import 'dart:io';
import 'package:dio/adapter.dart';
import 'package:crypto/crypto.dart';

// Get server public key hash:
// openssl s_client -connect api.example.com:443 | openssl x509 -pubkey -noout |
//   openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64

const _pinnedPublicKeyHash = 'BBBBBBBBBBBBBBBBBBB='; // base64 SHA256 of public key

Dio createPinnedDio() {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.example.com'));

  (dio.httpClientAdapter as DefaultHttpClientAdapter).onHttpClientCreate = (client) {
    client.badCertificateCallback = (X509Certificate cert, String host, int port) {
      // Extract public key from certificate
      final publicKey = cert.der;
      final hash = base64Encode(sha256.convert(publicKey).bytes);
      return hash == _pinnedPublicKeyHash; // false = reject cert → blocks MITM
    };
    return client;
  };

  return dio;
}

// ── Approach 2: http_certificate_pinning package ────
import 'package:http_certificate_pinning/http_certificate_pinning.dart';

Future<bool> checkCertificate() async {
  try {
    await HttpCertificatePinning.check(
      serverURL: 'https://api.example.com',
      headerHttp: {},
      sha: SHA.SHA256,
      allowedSHAFingerprints: ['AA:BB:CC:DD:...'], // cert fingerprint
      timeout: 60,
    );
    return true;
  } on Exception {
    return false; // pinning failed — MITM detected
  }
}

// ── Backup pin strategy ─────────────────────────────
const _pins = [
  'primary-pin-base64=',    // current cert
  'backup-pin-base64=',     // next cert (rotate before primary expires)
];

bool _verifyPin(X509Certificate cert) {
  final hash = base64Encode(sha256.convert(cert.der).bytes);
  return _pins.contains(hash);
}

// ── Testing pinning ─────────────────────────────────
// Use Proxyman or Charles Proxy to intercept HTTPS
// Without pinning: you can see all traffic
// With pinning: connection fails → your pinning works`),

  // ══ CI/CD — additional ════════════════════════════════════════════════════
  q(22, 2, 'hard',
    'What are Flutter flavors and how do you set up dev/staging/production environments?',
    `Flavors (called "schemes" on iOS, "build types/product flavors" on Android) let you build multiple variants of your app from the same codebase — with different:
• Bundle IDs / package names
• API endpoints
• App names and icons
• Firebase projects
• Feature flags

This enables separate dev/staging/prod apps installable side-by-side.

Setup steps:
1. Configure Android productFlavors in build.gradle
2. Configure iOS schemes in Xcode
3. Create Dart entry points per flavor (or use --dart-define)
4. Use flutter_flavorizr package to automate the setup`,
    `// ── Dart side: environment config via --dart-define ──
// Run: flutter run --dart-define=FLAVOR=dev

class AppConfig {
  static const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');

  static const apiUrl = switch (flavor) {
    'prod'    => 'https://api.example.com',
    'staging' => 'https://staging.api.example.com',
    _         => 'https://dev.api.example.com',
  };

  static const appName = switch (flavor) {
    'prod'    => 'MyApp',
    'staging' => 'MyApp Staging',
    _         => 'MyApp Dev',
  };

  static bool get isDebug => flavor != 'prod';
}

// ── Multiple main entry points ──────────────────────
// lib/main_dev.dart
void main() {
  AppConfig.setup(flavor: 'dev');
  runApp(const MyApp());
}

// lib/main_prod.dart
void main() {
  AppConfig.setup(flavor: 'prod');
  runApp(const MyApp());
}

// ── Android build.gradle (android/app/build.gradle) ─
/*
android {
  flavorDimensions += "environment"
  productFlavors {
    dev {
      dimension "environment"
      applicationIdSuffix ".dev"
      versionNameSuffix "-dev"
      resValue "string", "app_name", "MyApp Dev"
    }
    staging {
      dimension "environment"
      applicationIdSuffix ".staging"
      resValue "string", "app_name", "MyApp Staging"
    }
    prod {
      dimension "environment"
      resValue "string", "app_name", "MyApp"
    }
  }
}
*/

// ── GitHub Actions — build per flavor ──────────────
/*
- name: Build dev APK
  run: flutter build apk --flavor dev --target lib/main_dev.dart

- name: Build prod APK
  run: flutter build apk --flavor prod --target lib/main_prod.dart --release \\
    --obfuscate --split-debug-info=debug-info/
*/

// ── flutter_flavorizr (automates all platform config) ─
/*
# pubspec.yaml
flavorizr:
  flavors:
    dev:
      app:
        name: "MyApp Dev"
      android:
        applicationId: "com.example.myapp.dev"
      ios:
        bundleId: "com.example.myapp.dev"
    prod:
      app:
        name: "MyApp"
      android:
        applicationId: "com.example.myapp"
      ios:
        bundleId: "com.example.myapp"

# dart run flavorizr
*/`),

  // ══ FLUTTER INTERNALS — additional ════════════════════════════════════════
  q(23, 2, 'hard',
    'How does Flutter\'s rendering pipeline work? Explain the frame lifecycle.',
    `Flutter's rendering pipeline for each frame (must complete in <16ms for 60fps):

1. Animation tick — Scheduler notifies that a new frame is needed
2. Build phase — dirty Elements call build(), creating new Widget subtrees
3. Layout phase — RenderObjects compute sizes and positions (constraints go down, sizes go up)
4. Paint phase — RenderObjects paint onto Layers (display list)
5. Compositing — Layer tree composited into a scene
6. Rasterization — Skia/Impeller rasterizes the scene on the GPU thread

The layout protocol (constraints go down, sizes go up, parent sets position):
• Parent passes BoxConstraints (min/max width/height) to child
• Child determines its own size within constraints
• Parent positions the child`,
    `// ── Layout protocol: constraints down, sizes up ─────
// Custom RenderObject example
class RenderCenteredBox extends RenderBox {
  RenderBox? _child;

  @override
  void performLayout() {
    if (_child == null) {
      size = constraints.smallest;
      return;
    }
    // Pass constraints to child
    _child!.layout(constraints.loosen(), parentUsesSize: true);
    // Set our own size (fill available space)
    size = constraints.biggest;
    // Center the child
    final childParentData = _child!.parentData as BoxParentData;
    childParentData.offset = Offset(
      (size.width - _child!.size.width) / 2,
      (size.height - _child!.size.height) / 2,
    );
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    if (_child == null) return;
    final childParentData = _child!.parentData as BoxParentData;
    context.paintChild(_child!, offset + childParentData.offset);
  }
}

// ── Understanding frame scheduling ─────────────────
// When setState() or notifyListeners() is called:
// 1. SchedulerBinding.scheduleFrame() — requests next vsync
// 2. Next vsync arrives → SchedulerBinding.handleBeginFrame()
// 3. Animations tick
// 4. SchedulerBinding.handleDrawFrame()
// 5. BuildOwner.buildScope() — rebuild dirty elements
// 6. PipelineOwner.flushLayout() — layout dirty render objects
// 7. PipelineOwner.flushCompositingBits()
// 8. PipelineOwner.flushPaint() — paint into layers
// 9. RenderView.compositeFrame() — send to GPU

// ── Debug tools for rendering ──────────────────────
// Show performance overlay
MaterialApp(
  showPerformanceOverlay: true, // UI & GPU frame timing bars
)

// Highlight repaints (flash red when layer repaints)
debugRepaintRainbowEnabled = true;

// Print layout of render tree
debugPrintMarkNeedsLayoutStacks = true;

// Show semantic overlay
SemanticsDebugger(child: MyApp())

// Profile mode is essential — debug mode is 10x slower
// flutter run --profile`),

  q(23, 3, 'hard',
    'What are slivers in Flutter and how do you build custom scroll effects?',
    `Slivers are scroll-aware render objects — they know their scroll offset and can change size/appearance as the user scrolls. They're the building blocks of CustomScrollView.

Why slivers?
• Mix different scroll behaviors (collapsing header + list + grid) in one scroll view
• Efficient — only render what's visible
• Enable advanced effects: parallax, sticky headers, collapsing toolbars

Built-in slivers:
• SliverAppBar — collapsing/floating/pinned app bar
• SliverList / SliverFixedExtentList — lazy list
• SliverGrid — lazy grid
• SliverToBoxAdapter — embed any widget
• SliverPadding, SliverFillRemaining, SliverPersistentHeader

Custom slivers with SliverPersistentHeader for sticky section headers.`,
    `// ── Full CustomScrollView example ──────────────────
CustomScrollView(
  physics: const BouncingScrollPhysics(),
  slivers: [
    // Collapsing + parallax app bar
    SliverAppBar(
      expandedHeight: 280,
      pinned: true,     // stays visible when collapsed
      floating: false,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text('Catalog'),
        titlePadding: const EdgeInsets.all(16),
        background: Image.network(heroUrl, fit: BoxFit.cover),
        collapseMode: CollapseMode.parallax,
      ),
    ),

    // Sticky section header
    SliverPersistentHeader(
      pinned: true,
      delegate: _StickyHeader('Featured'),
    ),

    // Lazy grid
    SliverGrid(
      delegate: SliverChildBuilderDelegate(
        (ctx, i) => ProductCard(product: featured[i]),
        childCount: featured.length,
      ),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 8, crossAxisSpacing: 8,
      ),
    ),

    SliverPersistentHeader(pinned: true, delegate: _StickyHeader('All Items')),

    SliverList(
      delegate: SliverChildBuilderDelegate(
        (ctx, i) => ItemTile(item: items[i]),
        childCount: items.length,
      ),
    ),

    // Fill remaining space or show "you're all caught up"
    SliverFillRemaining(
      hasScrollBody: false,
      child: Center(child: Text('All caught up! 🎉')),
    ),
  ],
)

// ── Custom SliverPersistentHeaderDelegate ───────────
class _StickyHeader extends SliverPersistentHeaderDelegate {
  final String title;
  _StickyHeader(this.title);

  @override double get minExtent => 48;
  @override double get maxExtent => 48;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: overlapsContent
          ? Theme.of(context).colorScheme.surface.withOpacity(0.95)
          : Theme.of(context).colorScheme.surface,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
        )),
    );
  }

  @override bool shouldRebuild(_StickyHeader old) => title != old.title;
}`),

  // ══ ADDITIONAL DART BASICS ══════════════════════════════════════════════
  q(1, 10, 'easy',
    'What is the difference between final and const in Dart?',
    `Both are immutable, but work differently:

• final: Runtime constant — value set once during execution
  - Can be initialized with runtime values
  - Instance variables can be final
  - Value known at runtime

• const: Compile-time constant — value must be known at compile time
  - Must be initialized with compile-time constant
  - Deeply immutable (entire object tree)
  - Creates canonical instances (same const objects are identical)
  - Better performance (less memory)

Key differences:
1. When value is determined (runtime vs compile-time)
2. Canonicalization (const reuses instances)
3. Deep vs shallow immutability`,
    `// final — runtime constant
final now = DateTime.now();  // ✓ OK
final user = User.fromApi(); // ✓ OK
final list = [1, 2, 3];      // ✓ OK
list.add(4);                 // ✓ can modify contents

// const — compile-time constant
const pi = 3.14159;          // ✓ OK
const name = 'Alice';        // ✓ OK
const list = [1, 2, 3];      // ✓ OK
list.add(4);                 // ✗ Error: cannot modify
const now = DateTime.now();  // ✗ Error: not compile-time constant

// Canonicalization
const a = [1, 2];
const b = [1, 2];
print(identical(a, b)); // true — same instance!

final c = [1, 2];
final d = [1, 2];
print(identical(c, d)); // false — different instances

// In widgets
const Text('Hello');     // Better performance
Text(userName);          // Use non-const for dynamic values`),

  q(1, 11, 'medium',
    'Explain the cascade operator (..) and spread operator (...) in Dart.',
    `Cascade operator (..):
• Allows multiple operations on the same object
• Returns the original object, not the method result
• Useful for builder patterns and configuration

Spread operator (...):
• Unpacks elements from a collection into another
• ...? for null-safe spreading
• Useful for combining collections`,
    `// ── Cascade operator (..) ──────────────────
var paint = Paint()
  ..color = Colors.red
  ..strokeWidth = 2.0
  ..style = PaintingStyle.stroke;

// Without cascade:
var paint2 = Paint();
paint2.color = Colors.red;
paint2.strokeWidth = 2.0;
paint2.style = PaintingStyle.stroke;

// Null-aware cascade (?..)
User? user;
user?..name = 'Bob'
    ..email = 'bob@example.com';

// ── Spread operator (...) ──────────────────
var list1 = [1, 2, 3];
var list2 = [0, ...list1, 4]; // [0, 1, 2, 3, 4]

// Null-aware spread
List<int>? nullableList;
var combined = [...?nullableList, 5, 6]; // [5, 6] if null

// Combining maps
var defaults = {'theme': 'dark', 'lang': 'en'};
var user = {'name': 'Alice', ...defaults}; // merges maps

// In widgets
Column(
  children: [
    const Text('Header'),
    ...items.map((item) => ItemWidget(item)),
    const Text('Footer'),
  ],
)`),

  // ══ ADDITIONAL OOP IN DART ══════════════════════════════════════════════
  q(2, 8, 'medium',
    'What are factory constructors and when would you use them?',
    `Factory constructors:
• Use the factory keyword
• Can return an instance from cache or subclass
• Don't automatically create a new instance
• Useful for singletons, caching, or returning subtypes

Use cases:
1. Singleton pattern
2. Object pooling/caching
3. Returning different subtypes
4. Factory pattern implementation
5. Constructing from different sources (JSON, etc.)`,
    `// ── Singleton pattern ──────────────────────
class Database {
  static final Database _instance = Database._internal();

  factory Database() {
    return _instance;
  }

  Database._internal();
}

var db1 = Database();
var db2 = Database();
print(identical(db1, db2)); // true — same instance

// ── Returning subtypes ─────────────────────
abstract class Animal {
  factory Animal(String type) {
    switch (type) {
      case 'dog': return Dog();
      case 'cat': return Cat();
      default: throw ArgumentError('Unknown type');
    }
  }
  void makeSound();
}

class Dog implements Animal {
  @override void makeSound() => print('Woof!');
}

class Cat implements Animal {
  @override void makeSound() => print('Meow!');
}

var pet = Animal('dog'); // returns Dog instance
pet.makeSound(); // Woof!

// ── Caching/pooling ────────────────────────
class Logger {
  static final Map<String, Logger> _cache = {};
  final String name;

  factory Logger(String name) {
    return _cache.putIfAbsent(name, () => Logger._internal(name));
  }

  Logger._internal(this.name);
}`),

  // ══ ADDITIONAL FLUTTER FUNDAMENTALS ════════════════════════════════════
  q(3, 7, 'medium',
    'What is BuildContext and why is it important?',
    `BuildContext:
• Represents the location of a widget in the widget tree
• Handle to the widget's position in the tree hierarchy
• Used to access inherited widgets and theme data
• Each widget has its own BuildContext

Important uses:
1. Accessing InheritedWidgets (Theme, MediaQuery, Provider, etc.)
2. Navigation (Navigator.of(context))
3. Showing dialogs/snackbars
4. Finding ancestor/descendant widgets

Common pitfalls:
• Using BuildContext after async gaps (use mounted check)
• Accessing context before widget is built
• Confused context when using Builder widgets`,
    `class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // context represents THIS widget's position in tree

    // ── Accessing InheritedWidgets ──────────
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final navigator = Navigator.of(context);

    // ── Navigation ──────────────────────────
    return ElevatedButton(
      onPressed: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => NextPage()),
        );
      },
      child: Text('Next'),
    );
  }
}

// ── Common mistake: wrong context ──────────
class MyPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // This context is MyPage's context
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: ElevatedButton(
        onPressed: () {
          // ✗ Wrong: tries to find Scaffold in MyPage ancestors
          Scaffold.of(context).openDrawer();
        },
        child: Text('Open'),
      ),
    );
  }
}

// ── Fix with Builder ──────────────────────
class MyPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: Builder(
        builder: (scaffoldContext) {
          // scaffoldContext is inside Scaffold
          return ElevatedButton(
            onPressed: () {
              // ✓ Correct: scaffoldContext has Scaffold as ancestor
              Scaffold.of(scaffoldContext).openDrawer();
            },
            child: Text('Open'),
          );
        },
      ),
    );
  }
}

// ── Async pitfall ─────────────────────────
class MyWidget extends StatefulWidget {
  @override State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  Future<void> loadData() async {
    await Future.delayed(Duration(seconds: 2));

    // ✗ Dangerous: widget might be disposed
    if (context.mounted) {  // ✓ Check mounted first
      Navigator.of(context).pop();
    }
  }

  @override Widget build(BuildContext context) => Container();
}`),

  q(3, 8, 'hard',
    'Explain the difference between StatelessWidget and StatefulWidget lifecycle.',
    `StatelessWidget lifecycle:
1. Constructor called
2. build() called
3. Widget rendered
• build() called again only when parent rebuilds with different parameters
• Immutable — cannot change internal state

StatefulWidget lifecycle:
1. Constructor (widget)
2. createState() — creates State object (once)
3. initState() — initialization (once)
4. didChangeDependencies() — when InheritedWidget changes
5. build() — renders UI
6. didUpdateWidget() — when parent rebuilds with new widget
7. setState() — triggers rebuild
8. deactivate() — when removed from tree (might be reinserted)
9. dispose() — cleanup (once, when removed permanently)

State object persists across rebuilds, widget does not.`,
    `// ── StatelessWidget ────────────────────────
class MyStateless extends StatelessWidget {
  final String title;

  const MyStateless({required this.title, super.key});

  @override
  Widget build(BuildContext context) {
    print('Building StatelessWidget');
    return Text(title);
  }
}

// ── StatefulWidget ─────────────────────────
class MyStateful extends StatefulWidget {
  final String initialValue;

  const MyStateful({required this.initialValue, super.key});

  @override
  State<MyStateful> createState() {
    print('1. createState()');
    return _MyStatefulState();
  }
}

class _MyStatefulState extends State<MyStateful> {
  late String value;

  @override
  void initState() {
    super.initState();
    print('2. initState()');
    value = widget.initialValue;
    // Can't use context here for InheritedWidgets
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    print('3. didChangeDependencies()');
    // Called after initState and when InheritedWidget changes
  }

  @override
  Widget build(BuildContext context) {
    print('4. build()');
    return Column(
      children: [
        Text(value),
        ElevatedButton(
          onPressed: () {
            setState(() {
              value = 'Updated';
              print('setState() -> triggers build()');
            });
          },
          child: Text('Update'),
        ),
      ],
    );
  }

  @override
  void didUpdateWidget(MyStateful oldWidget) {
    super.didUpdateWidget(oldWidget);
    print('5. didUpdateWidget()');
    if (oldWidget.initialValue != widget.initialValue) {
      setState(() {
        value = widget.initialValue;
      });
    }
  }

  @override
  void deactivate() {
    print('6. deactivate()');
    super.deactivate();
  }

  @override
  void dispose() {
    print('7. dispose()');
    // Clean up controllers, listeners, subscriptions
    super.dispose();
  }
}

// Order of calls:
// Initial build: createState -> initState -> didChangeDependencies -> build
// setState: build
// Parent rebuild with new widget: didUpdateWidget -> build
// Remove from tree: deactivate -> dispose`),

  // ══ ADDITIONAL NAVIGATION ═══════════════════════════════════════════════
  q(5, 6, 'medium',
    'How do you pass data between screens and get results back?',
    `Three approaches for passing data:

1. Constructor arguments (simple, type-safe)
2. Named route arguments
3. Router parameters (go_router)

Getting results back:
• Navigator.push returns Future
• Use .then() or await to get result
• Call Navigator.pop(result) from second screen`,
    `// ── Method 1: Constructor (recommended) ────
class DetailsPage extends StatelessWidget {
  final String userId;
  final int age;

  const DetailsPage({required this.userId, required this.age});

  @override Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('User: \$userId')),
      body: Text('Age: \$age'),
    );
  }
}

// Navigate and pass data
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (_) => DetailsPage(userId: '123', age: 25),
  ),
);

// ── Method 2: Named routes with arguments ──
// In route definition
routes: {
  '/details': (ctx) {
    final args = ModalRoute.of(ctx)!.settings.arguments as Map<String, dynamic>;
    return DetailsPage(userId: args['userId'], age: args['age']);
  },
}

// Navigate
Navigator.pushNamed(
  context,
  '/details',
  arguments: {'userId': '123', 'age': 25},
);

// ── Getting results back ───────────────────
// Screen 1: Push and await result
final result = await Navigator.push<String>(
  context,
  MaterialPageRoute(builder: (_) => SelectColorPage()),
);

if (result != null) {
  print('Selected color: \$result');
}

// Screen 2: Pop with result
class SelectColorPage extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context, 'Red');
            },
            child: Text('Red'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context, 'Blue');
            },
            child: Text('Blue'),
          ),
        ],
      ),
    );
  }
}

// ── With go_router ─────────────────────────
// Define route with parameters
GoRoute(
  path: '/details/:userId',
  builder: (context, state) {
    final userId = state.pathParameters['userId']!;
    final age = int.parse(state.uri.queryParameters['age'] ?? '0');
    return DetailsPage(userId: userId, age: age);
  },
),

// Navigate
context.go('/details/123?age=25');

// Or type-safe
context.push('/details/\$userId', extra: {'age': 25});`),

  // ══ ADDITIONAL STATE MANAGEMENT ═════════════════════════════════════════
  q(6, 5, 'medium',
    'What is InheritedWidget and how does it work?',
    `InheritedWidget:
• Base class for widgets that propagate data down the tree
• Efficient way to share data with descendants without passing through constructors
• Widgets can "subscribe" to changes using context.dependOnInheritedWidgetOfExactType
• Foundation for Provider, Theme, MediaQuery, etc.

How it works:
1. Create InheritedWidget subclass
2. Override updateShouldNotify() to control rebuilds
3. Descendants use of(context) to access data
4. Flutter automatically rebuilds dependents when data changes`,
    `// ── InheritedWidget definition ─────────────
class UserData extends InheritedWidget {
  final String username;
  final int score;

  const UserData({
    required this.username,
    required this.score,
    required super.child,
    super.key,
  });

  // Access method (convention)
  static UserData? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<UserData>();
  }

  @override
  bool updateShouldNotify(UserData oldWidget) {
    // Return true if dependents should rebuild
    return username != oldWidget.username || score != oldWidget.score;
  }
}

// ── Wrapper with state ─────────────────────
class UserProvider extends StatefulWidget {
  final Widget child;

  const UserProvider({required this.child, super.key});

  @override State<UserProvider> createState() => _UserProviderState();
}

class _UserProviderState extends State<UserProvider> {
  String username = 'Guest';
  int score = 0;

  void updateUser(String name) {
    setState(() {
      username = name;
    });
  }

  void addScore(int points) {
    setState(() {
      score += points;
    });
  }

  @override
  Widget build(BuildContext context) {
    return UserData(
      username: username,
      score: score,
      child: widget.child,
    );
  }
}

// ── Usage in app ───────────────────────────
void main() {
  runApp(
    UserProvider(
      child: MaterialApp(home: HomePage()),
    ),
  );
}

// ── Consuming widget ───────────────────────
class ScoreDisplay extends StatelessWidget {
  @override Widget build(BuildContext context) {
    // This widget will rebuild when UserData changes
    final userData = UserData.of(context);

    return Text(
      '\${userData?.username}: \${userData?.score}',
      style: TextStyle(fontSize: 24),
    );
  }
}

// ── Note: This is simplified ───────────────
// Real-world: use Provider package or Riverpod
// InheritedWidget is low-level building block`),

  // ══ ADDITIONAL ASYNC ════════════════════════════════════════════════════
  q(7, 6, 'medium',
    'How do you handle multiple concurrent async operations?',
    `Multiple approaches for concurrent async operations:

1. Future.wait() — wait for all to complete
2. Future.any() — wait for first to complete
3. Stream.merge() — combine multiple streams
4. Parallel isolates — true parallelism

Error handling:
• Future.wait() fails fast by default
• Use eagerError: false to wait for all
• Catch individual futures before combining`,
    `// ── Future.wait() — parallel execution ──────
Future<void> loadAllData() async {
  try {
    final results = await Future.wait([
      fetchUser(),
      fetchPosts(),
      fetchComments(),
    ]);

    final user = results[0] as User;
    final posts = results[1] as List<Post>;
    final comments = results[2] as List<Comment>;

    print('All loaded!');
  } catch (e) {
    print('One or more failed: \$e');
  }
}

// ── Individual error handling ──────────────
Future<void> loadWithFallbacks() async {
  final results = await Future.wait([
    fetchUser().catchError((_) => User.guest()),
    fetchPosts().catchError((_) => <Post>[]),
    fetchComments().catchError((_) => <Comment>[]),
  ]);

  // All complete, with fallback values on error
}

// ── Future.any() — first to complete ────────
Future<String> fastestServer() async {
  final result = await Future.any([
    fetchFromServer('us-east'),
    fetchFromServer('us-west'),
    fetchFromServer('eu-central'),
  ]);

  return result; // Returns first successful result
}

// ── Sequential vs parallel ─────────────────
// Sequential (slow)
Future<void> sequentialLoad() async {
  final user = await fetchUser();     // waits
  final posts = await fetchPosts();   // waits
  final comments = await fetchComments(); // waits
  // Total time: sum of all
}

// Parallel (fast)
Future<void> parallelLoad() async {
  final userFuture = fetchUser();
  final postsFuture = fetchPosts();
  final commentsFuture = fetchComments();

  final user = await userFuture;
  final posts = await postsFuture;
  final comments = await commentsFuture;
  // Total time: max of all
}

// ── With error handling and timeout ────────
Future<List<T>> fetchAllWithTimeout<T>({
  required List<Future<T>> futures,
  required Duration timeout,
}) async {
  try {
    return await Future.wait(
      futures.map((f) => f.timeout(timeout)),
      eagerError: false, // wait for all, even if some fail
    );
  } on TimeoutException {
    throw Exception('Request timeout');
  }
}

// ── In FutureBuilder ───────────────────────
class Dashboard extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: Future.wait([
        fetchUser(),
        fetchStats(),
        fetchNotifications(),
      ]),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return CircularProgressIndicator();
        }

        if (snapshot.hasError) {
          return Text('Error: \${snapshot.error}');
        }

        final user = snapshot.data![0] as User;
        final stats = snapshot.data![1] as Stats;
        final notifications = snapshot.data![2] as List<Notification>;

        return Column(
          children: [
            UserCard(user),
            StatsWidget(stats),
            NotificationList(notifications),
          ],
        );
      },
    );
  }
}`),

  // ══ ADDITIONAL NETWORKING ═══════════════════════════════════════════════
  q(12, 6, 'medium',
    'How do you implement request/response interceptors in Flutter?',
    `Interceptors allow you to:
• Add headers to all requests (auth tokens)
• Log requests/responses
• Handle errors globally
• Retry failed requests
• Transform data

Implementation:
• Dio package has built-in interceptors
• For http package, create wrapper class
• Can chain multiple interceptors`,
    `// ── Using Dio with interceptors ────────────
import 'package:dio/dio.dart';

class ApiClient {
  late final Dio dio;

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: 'https://api.example.com',
      connectTimeout: Duration(seconds: 5),
      receiveTimeout: Duration(seconds: 3),
    ));

    dio.interceptors.add(AuthInterceptor());
    dio.interceptors.add(LoggingInterceptor());
    dio.interceptors.add(ErrorInterceptor());
  }
}

// ── Auth interceptor ───────────────────────
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Add token to all requests
    final token = await getAuthToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer \$token';
    }

    // Continue with modified request
    handler.next(options);
  }

  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Refresh token on 401
    if (err.response?.statusCode == 401) {
      try {
        await refreshToken();

        // Retry original request
        final opts = err.requestOptions;
        final response = await Dio().request(
          opts.path,
          options: Options(
            method: opts.method,
            headers: opts.headers,
          ),
          data: opts.data,
          queryParameters: opts.queryParameters,
        );

        return handler.resolve(response);
      } catch (e) {
        return handler.reject(err);
      }
    }

    handler.next(err);
  }
}

// ── Logging interceptor ────────────────────
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    print('REQUEST[\${options.method}] => \${options.path}');
    print('Headers: \${options.headers}');
    print('Data: \${options.data}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    print('RESPONSE[\${response.statusCode}] => \${response.requestOptions.path}');
    print('Data: \${response.data}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    print('ERROR[\${err.response?.statusCode}] => \${err.requestOptions.path}');
    print('Message: \${err.message}');
    handler.next(err);
  }
}

// ── Error handling interceptor ─────────────
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    String message;

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message = 'Connection timeout';
        break;
      case DioExceptionType.badResponse:
        message = 'Server error: \${err.response?.statusCode}';
        break;
      case DioExceptionType.cancel:
        message = 'Request cancelled';
        break;
      default:
        message = 'Network error';
    }

    // Could show snackbar here or log to analytics
    print('Error: \$message');

    handler.next(err);
  }
}

// ── Usage ──────────────────────────────────
final api = ApiClient();

Future<User> getUser(String id) async {
  try {
    final response = await api.dio.get('/users/\$id');
    return User.fromJson(response.data);
  } on DioException catch (e) {
    if (e.response?.statusCode == 404) {
      throw NotFoundException('User not found');
    }
    rethrow;
  }
}

// ── Custom http wrapper (without Dio) ──────
import 'package:http/http.dart' as http;

class HttpClient {
  final String baseUrl;
  final Map<String, String> defaultHeaders;

  HttpClient({
    required this.baseUrl,
    this.defaultHeaders = const {},
  });

  Future<http.Response> get(String path) async {
    final url = Uri.parse('\$baseUrl\$path');
    final headers = await _buildHeaders();

    _logRequest('GET', url, headers);

    final response = await http.get(url, headers: headers);

    _logResponse(response);

    return response;
  }

  Future<Map<String, String>> _buildHeaders() async {
    final token = await getAuthToken();
    return {
      ...defaultHeaders,
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer \$token',
    };
  }

  void _logRequest(String method, Uri url, Map<String, String> headers) {
    print('[\$method] \$url');
    print('Headers: \$headers');
  }

  void _logResponse(http.Response response) {
    print('Response [\${response.statusCode}]');
    print('Body: \${response.body}');
  }
}`),

  // ══ ADDITIONAL TESTING ══════════════════════════════════════════════════
  q(14, 6, 'medium',
    'How do you test widgets that depend on InheritedWidgets (Theme, MediaQuery, etc.)?',
    `When testing widgets that depend on InheritedWidgets:

1. Wrap in MaterialApp or WidgetsApp for Theme/MediaQuery
2. Use MediaQuery.withClampedTextScaling() for MediaQuery
3. Provide mocked InheritedWidgets
4. Use testWidgets and pumpWidget

Common inherited dependencies:
• Theme
• MediaQuery (size, orientation, padding)
• Navigator
• Localizations
• Provider`,
    `import 'package:flutter_test/flutter_test.dart';

// ── Testing widget with Theme ──────────────
testWidgets('Button uses primary color', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: ThemeData(
        primaryColor: Colors.red,
      ),
      home: Scaffold(
        body: MyButton(),
      ),
    ),
  );

  final button = tester.widget<ElevatedButton>(
    find.byType(ElevatedButton),
  );

  expect(button.style?.backgroundColor?.resolve({}), Colors.red);
});

// ── Testing with MediaQuery ────────────────
testWidgets('Layout adapts to screen size', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: MediaQuery(
        data: const MediaQueryData(
          size: Size(600, 800),
          devicePixelRatio: 2.0,
          textScaleFactor: 1.0,
        ),
        child: ResponsiveWidget(),
      ),
    ),
  );

  expect(find.text('Tablet Layout'), findsOneWidget);

  // Change size
  await tester.pumpWidget(
    MaterialApp(
      home: MediaQuery(
        data: const MediaQueryData(
          size: Size(400, 800),
        ),
        child: ResponsiveWidget(),
      ),
    ),
  );

  expect(find.text('Phone Layout'), findsOneWidget);
});

// ── Testing with Navigator ─────────────────
testWidgets('Navigation works', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: HomePage(),
      routes: {
        '/details': (_) => DetailsPage(),
      },
    ),
  );

  // Tap button that navigates
  await tester.tap(find.text('Go to Details'));
  await tester.pumpAndSettle(); // Wait for navigation animation

  expect(find.byType(DetailsPage), findsOneWidget);

  // Go back
  await tester.pageBack();
  await tester.pumpAndSettle();

  expect(find.byType(HomePage), findsOneWidget);
});

// ── Testing with Provider ──────────────────
import 'package:provider/provider.dart';

testWidgets('Widget reads from Provider', (tester) async {
  final mockUser = User(name: 'Test User', age: 25);

  await tester.pumpWidget(
    MaterialApp(
      home: Provider<User>.value(
        value: mockUser,
        child: UserProfile(),
      ),
    ),
  );

  expect(find.text('Test User'), findsOneWidget);
  expect(find.text('25'), findsOneWidget);
});

// ── Testing with ChangeNotifier ────────────
testWidgets('Counter increments', (tester) async {
  final counter = Counter();

  await tester.pumpWidget(
    MaterialApp(
      home: ChangeNotifierProvider.value(
        value: counter,
        child: CounterPage(),
      ),
    ),
  );

  expect(find.text('0'), findsOneWidget);

  await tester.tap(find.byIcon(Icons.add));
  await tester.pump(); // Rebuild after state change

  expect(find.text('1'), findsOneWidget);
  expect(counter.value, 1);
});

// ── Custom wrapper for common setup ────────
Widget createTestWidget(Widget child) {
  return MaterialApp(
    theme: ThemeData.light(),
    home: Scaffold(
      body: child,
    ),
  );
}

testWidgets('Using helper', (tester) async {
  await tester.pumpWidget(
    createTestWidget(MyWidget()),
  );

  expect(find.byType(MyWidget), findsOneWidget);
});

// ── Testing InheritedWidget ────────────────
testWidgets('Custom InheritedWidget', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: UserData(
        username: 'Alice',
        score: 100,
        child: ScoreDisplay(),
      ),
    ),
  );

  expect(find.text('Alice: 100'), findsOneWidget);
});`),

  // ══ ADDITIONAL PERFORMANCE ══════════════════════════════════════════════
  q(19, 6, 'hard',
    'What causes jank in Flutter and how do you fix it?',
    `Jank = dropped frames (< 60fps on most devices, < 120fps on high refresh rate)

Common causes:
1. Expensive build() methods
2. Unnecessary rebuilds
3. Large lists without lazy loading
4. Heavy computations on UI thread
5. Non-const widgets
6. Opacity/clip/backdrop filter overuse

Fixes:
• Use const constructors
• ListView.builder for long lists
• RepaintBoundary for expensive subtrees
• Isolates for heavy computation
• Cached values and memoization
• Profile with DevTools`,
    `// ── Problem: Expensive build ───────────────
class BadWidget extends StatelessWidget {
  @override Widget build(BuildContext context) {
    // ✗ Creates new list every build
    final items = List.generate(1000, (i) => Item(i));

    // ✗ Expensive computation in build
    final sortedItems = items..sort((a, b) => a.compareTo(b));

    return ListView(
      children: sortedItems.map((item) => ItemTile(item)).toList(),
    );
  }
}

// ── Solution: Cache and lazy load ──────────
class GoodWidget extends StatefulWidget {
  @override State<GoodWidget> createState() => _GoodWidgetState();
}

class _GoodWidgetState extends State<GoodWidget> {
  late final List<Item> items;

  @override
  void initState() {
    super.initState();
    // ✓ Compute once
    items = List.generate(1000, (i) => Item(i))
      ..sort((a, b) => a.compareTo(b));
  }

  @override Widget build(BuildContext context) {
    // ✓ Lazy loading with builder
    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (ctx, i) => ItemTile(items[i]),
    );
  }
}

// ── Problem: Unnecessary rebuilds ──────────
class Parent extends StatefulWidget {
  @override State<Parent> createState() => _ParentState();
}

class _ParentState extends State<Parent> {
  int counter = 0;

  @override Widget build(BuildContext context) {
    return Column(
      children: [
        Text('\$counter'),
        ElevatedButton(
          onPressed: () => setState(() => counter++),
          child: Text('Increment'),
        ),
        // ✗ ExpensiveChild rebuilds every time!
        ExpensiveChild(),
      ],
    );
  }
}

// ── Solution: Extract and use const ────────
class _ParentState extends State<Parent> {
  int counter = 0;

  @override Widget build(BuildContext context) {
    return Column(
      children: [
        Text('\$counter'),
        ElevatedButton(
          onPressed: () => setState(() => counter++),
          child: const Text('Increment'), // ✓ const
        ),
        // ✓ Doesn't rebuild because const
        const ExpensiveChild(),
      ],
    );
  }
}

class ExpensiveChild extends StatelessWidget {
  const ExpensiveChild({super.key});

  @override Widget build(BuildContext context) {
    print('Building ExpensiveChild'); // Won't print on parent rebuild
    return Container(/* complex UI */);
  }
}

// ── Problem: Opacity causes repaints ───────
Opacity(
  opacity: 0.5,
  child: ComplexWidget(), // ✗ Entire subtree repaints
)

// ── Solution: Use rgba or AnimatedOpacity ──
Container(
  color: Colors.black.withOpacity(0.5), // ✓ Shader-based
  child: ComplexWidget(),
)

AnimatedOpacity(
  opacity: _visible ? 1.0 : 0.0,
  duration: Duration(milliseconds: 300),
  child: ComplexWidget(), // ✓ Optimized animations
)

// ── Problem: Heavy computation blocks UI ───
void processData() {
  final result = heavyComputation(); // ✗ Blocks UI thread
  setState(() => _result = result);
}

// ── Solution: Use isolate ──────────────────
import 'dart:isolate';

Future<void> processData() async {
  final result = await Isolate.run(() {
    return heavyComputation(); // ✓ Runs on separate thread
  });
  setState(() => _result = result);
}

// ── RepaintBoundary for subtrees ───────────
Column(
  children: [
    // Frequently changing
    AnimatedWidget(),

    // Static expensive widget
    RepaintBoundary(
      child: ExpensiveStaticWidget(), // ✓ Won't repaint with parent
    ),
  ],
)

// ── Profile performance ────────────────────
// 1. Run: flutter run --profile
// 2. Open DevTools: dart devtools
// 3. Check Performance tab:
//    • Frame rendering time
//    • Identify slow builds
//    • Memory usage
// 4. Use Timeline:
//    • Record UI actions
//    • Find janky frames
//    • Trace expensive operations`),

  // ══ MORE DART BASICS ════════════════════════════════════════════════════
  q(1, 12, 'easy',
    'What are collections in Dart and what are their key differences?',
    `Dart has three main collection types:

1. List<T> — ordered, indexed, allows duplicates
   • Access by index: list[0]
   • Maintains insertion order
   • Can be fixed or growable

2. Set<T> — unordered, unique elements
   • No duplicates (automatically filtered)
   • Fast lookup (O(1) for contains)
   • No index access

3. Map<K,V> — key-value pairs
   • Keys must be unique
   • Fast lookup by key (O(1))
   • Unordered (use LinkedHashMap for order)

All support iteration, mapping, filtering with functional methods.`,
    `// ── List ──────────────────────────────────
var numbers = [1, 2, 3, 2]; // allows duplicates
numbers.add(4);
print(numbers[0]); // 1
print(numbers.length); // 5

var fixed = List.filled(3, 0); // [0, 0, 0] — fixed length
var growable = <int>[]; // can grow

// ── Set ───────────────────────────────────
var unique = {1, 2, 3, 2}; // {1, 2, 3} — duplicates removed
unique.add(4);
unique.add(2); // ignored, already exists
print(unique.contains(2)); // true — fast lookup
print(unique.length); // 4

// Convert list to set to remove duplicates
var dedupe = [1, 1, 2, 2, 3].toSet(); // {1, 2, 3}

// ── Map ───────────────────────────────────
var person = {
  'name': 'Alice',
  'age': 30,
  'city': 'NYC',
};
print(person['name']); // Alice
person['email'] = 'alice@example.com';

// Iterate
person.forEach((key, value) {
  print('\$key: \$value');
});

// Keys and values
print(person.keys);   // (name, age, city, email)
print(person.values); // (Alice, 30, NYC, alice@example.com)

// ── Common operations ─────────────────────
var list = [1, 2, 3, 4, 5];

list.map((n) => n * 2);              // [2, 4, 6, 8, 10]
list.where((n) => n > 3);            // [4, 5]
list.reduce((a, b) => a + b);        // 15
list.any((n) => n > 3);              // true
list.every((n) => n > 0);            // true
list.firstWhere((n) => n > 3);       // 4`),

  q(1, 13, 'medium',
    'What are typedef and function types in Dart?',
    `typedef creates type aliases for functions, making code more readable and reusable.

Function types:
• Functions are first-class objects
• Can be assigned to variables
• Passed as parameters
• Returned from functions

typedef benefits:
• Cleaner code
• Better documentation
• Reusable function signatures
• Type safety`,
    `// ── Function types ─────────────────────────
// Function as variable
int add(int a, int b) => a + b;
var operation = add;
print(operation(2, 3)); // 5

// Function type annotation
int Function(int, int) mathOp = add;

// Anonymous function
var multiply = (int a, int b) => a * b;

// ── typedef for function signature ─────────
typedef MathOperation = int Function(int a, int b);

MathOperation getOperation(String type) {
  switch (type) {
    case 'add': return (a, b) => a + b;
    case 'subtract': return (a, b) => a - b;
    default: return (a, b) => a * b;
  }
}

void calculate(int x, int y, MathOperation op) {
  print('Result: \${op(x, y)}');
}

calculate(10, 5, getOperation('add')); // 15

// ── Callback typedef ───────────────────────
typedef OnDataReceived<T> = void Function(T data);
typedef OnError = void Function(String error);

class ApiClient {
  void fetchData({
    required OnDataReceived<String> onSuccess,
    required OnError onError,
  }) {
    try {
      final data = 'API Response';
      onSuccess(data);
    } catch (e) {
      onError(e.toString());
    }
  }
}

ApiClient().fetchData(
  onSuccess: (data) => print('Got: \$data'),
  onError: (err) => print('Error: \$err'),
);

// ── Generic typedef ────────────────────────
typedef Parser<T> = T Function(String input);

Parser<int> intParser = (s) => int.parse(s);
Parser<double> doubleParser = (s) => double.parse(s);

print(intParser('42'));    // 42
print(doubleParser('3.14')); // 3.14

// ── Predicate typedef ──────────────────────
typedef Predicate<T> = bool Function(T value);

List<T> filter<T>(List<T> items, Predicate<T> test) {
  return items.where(test).toList();
}

var numbers = [1, 2, 3, 4, 5];
var even = filter(numbers, (n) => n % 2 == 0); // [2, 4]`),

  q(1, 14, 'easy',
    'How do named and optional parameters work in Dart?',
    `Dart supports two types of optional parameters:

1. Named parameters — {param}
   • Called by name: func(param: value)
   • Can be marked required
   • Any order when calling

2. Positional optional — [param]
   • Called by position
   • Must be at end
   • Can have defaults

Default values can be provided for both types.`,
    `// ── Named parameters ──────────────────────
void greet({String name = 'Guest', int age = 0}) {
  print('Hello \$name, age \$age');
}

greet();                        // Hello Guest, age 0
greet(name: 'Alice');           // Hello Alice, age 0
greet(age: 30, name: 'Bob');    // Any order

// ── Required named parameters ──────────────
void createUser({
  required String email,
  required String password,
  String? nickname,
}) {
  print('User: \$email');
}

createUser(
  email: 'test@example.com',
  password: 'secret',
); // ✓ OK

// createUser(); // ✗ Error: email and password required

// ── Positional optional parameters ─────────
void log(String message, [String level = 'INFO', int code = 0]) {
  print('[\$level] \$message (code: \$code)');
}

log('Server started');                    // [INFO] Server started (code: 0)
log('Error occurred', 'ERROR');           // [ERROR] Error occurred (code: 0)
log('Critical', 'FATAL', 500);            // [FATAL] Critical (code: 500)

// ── Cannot mix named and positional optional ──
// void invalid(String a, [String b], {String c}); // ✗ Error

// ── Common pattern: config objects ─────────
class Button {
  final String label;
  final Color color;
  final VoidCallback? onPressed;

  Button({
    required this.label,
    this.color = Colors.blue,
    this.onPressed,
  });
}

Button(label: 'Submit', onPressed: () => print('Clicked'));

// ── Flutter widget style ───────────────────
Widget buildCard({
  required String title,
  required String subtitle,
  Widget? trailing,
  VoidCallback? onTap,
}) {
  return ListTile(
    title: Text(title),
    subtitle: Text(subtitle),
    trailing: trailing,
    onTap: onTap,
  );
}

buildCard(
  title: 'Item',
  subtitle: 'Description',
  trailing: Icon(Icons.arrow_forward),
);`),

  // ══ MORE OOP IN DART ════════════════════════════════════════════════════
  q(2, 9, 'medium',
    'Explain mixins in Dart and when to use them.',
    `Mixins provide a way to reuse code across multiple class hierarchies without traditional inheritance.

Key features:
• Use mixin keyword (or class that can be mixed in)
• Apply with with keyword
• Can use multiple mixins
• Linear order of application (right to left)
• Cannot be instantiated directly
• Can have fields, methods, and state

Use cases:
• Share behavior across unrelated classes
• Add functionality without deep inheritance
• Implement composition over inheritance`,
    `// ── Basic mixin ────────────────────────────
mixin Swimmer {
  void swim() => print('Swimming...');
}

mixin Flyer {
  void fly() => print('Flying...');
}

mixin Walker {
  void walk() => print('Walking...');
}

// ── Using mixins ───────────────────────────
class Duck with Swimmer, Walker, Flyer {
  String name;
  Duck(this.name);
}

class Fish with Swimmer {
  String species;
  Fish(this.species);
}

var duck = Duck('Donald');
duck.swim();  // Swimming...
duck.walk();  // Walking...
duck.fly();   // Flying...

var fish = Fish('Salmon');
fish.swim();  // Swimming...
// fish.walk(); // ✗ Error: no walk method

// ── Mixin with state ───────────────────────
mixin Timestamped {
  DateTime? _createdAt;

  DateTime get createdAt => _createdAt ??= DateTime.now();

  String get age {
    final diff = DateTime.now().difference(createdAt);
    return '\${diff.inSeconds}s ago';
  }
}

class Post with Timestamped {
  String content;
  Post(this.content);
}

var post = Post('Hello');
print(post.age); // 0s ago

// ── Mixin with on constraint ───────────────
abstract class Animal {
  String get sound;
}

mixin Domesticated on Animal {
  bool trained = false;

  void train() {
    trained = true;
    print('\${sound} — I\'m trained!');
  }
}

class Dog extends Animal with Domesticated {
  @override String get sound => 'Woof';
}

var dog = Dog();
dog.train(); // Woof — I'm trained!

// ── Order matters ──────────────────────────
mixin A {
  void greet() => print('A');
}

mixin B {
  void greet() => print('B');
}

class MyClass with A, B {}

MyClass().greet(); // B — rightmost wins

// ── Real-world example: logging ────────────
mixin LoggerMixin {
  void log(String message) {
    print('[\${runtimeType}] \$message');
  }

  void logError(Object error, [StackTrace? stack]) {
    print('[\${runtimeType}] ERROR: \$error');
    if (stack != null) print(stack);
  }
}

class UserRepository with LoggerMixin {
  Future<User> getUser(String id) async {
    log('Fetching user \$id');
    // ...
    return User();
  }

  Future<void> deleteUser(String id) async {
    try {
      log('Deleting user \$id');
      // ...
    } catch (e, stack) {
      logError(e, stack);
      rethrow;
    }
  }
}

// ── Flutter example: TickerProvider ────────
class MyAnimationWidget extends StatefulWidget {
  @override State<MyAnimationWidget> createState() => _MyAnimationWidgetState();
}

class _MyAnimationWidgetState extends State<MyAnimationWidget>
    with SingleTickerProviderStateMixin {  // Mixin for animations
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this, // 'this' provides Ticker from mixin
      duration: Duration(seconds: 1),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override Widget build(BuildContext context) => Container();
}`),

  q(2, 10, 'hard',
    'What is the difference between extends, implements, and with in Dart?',
    `Three ways to relate classes in Dart:

1. extends — Inheritance
   • Single inheritance only
   • Inherits all members
   • Can override methods
   • super keyword to access parent

2. implements — Interface
   • Multiple interfaces allowed
   • Must implement ALL members
   • No code reuse
   • Type compatibility

3. with — Mixins
   • Multiple mixins allowed
   • Code reuse without inheritance
   • Applied left to right
   • Diamond problem solved

Can combine: class X extends Y with A, B implements C, D`,
    `// ── extends — Inheritance ──────────────────
class Animal {
  String name;
  Animal(this.name);

  void makeSound() => print('Some sound');
  void sleep() => print('\$name is sleeping');
}

class Dog extends Animal {
  Dog(super.name);

  @override
  void makeSound() => print('Woof!');

  void fetch() => print('\$name is fetching');
}

var dog = Dog('Rex');
dog.makeSound(); // Woof! (overridden)
dog.sleep();     // Rex is sleeping (inherited)
dog.fetch();     // Rex is fetching (new method)

// ── implements — Interface ─────────────────
abstract class Flyable {
  void fly();
  double get altitude;
}

abstract class Swimmable {
  void swim();
}

// Must implement ALL members
class Duck implements Flyable, Swimmable {
  @override
  double get altitude => 100.0;

  @override
  void fly() => print('Duck flying');

  @override
  void swim() => print('Duck swimming');
}

// Can implement concrete class as interface
class Bird {
  void chirp() => print('Chirp');
}

class Sparrow implements Bird {
  @override
  void chirp() => print('Sparrow chirp'); // Must reimplement
}

// ── with — Mixins ──────────────────────────
mixin CanFly {
  void fly() => print('Flying...');
}

mixin CanSwim {
  void swim() => print('Swimming...');
}

class Penguin with CanSwim {
  // Gets swim() for free
}

class Goose with CanFly, CanSwim {
  // Gets both fly() and swim()
}

// ── Combining all three ────────────────────
abstract class Vehicle {
  void move();
}

mixin Electric {
  int batteryLevel = 100;
  void charge() => batteryLevel = 100;
}

mixin Autonomous {
  bool selfDriving = false;
  void enableAutopilot() => selfDriving = true;
}

abstract class Drivable {
  void drive();
}

class Tesla extends Vehicle with Electric, Autonomous implements Drivable {
  @override
  void move() => print('Moving electrically');

  @override
  void drive() => print('Driving\${selfDriving ? " on autopilot" : ""}');
}

var car = Tesla();
car.charge();           // From Electric mixin
car.enableAutopilot();  // From Autonomous mixin
car.drive();            // Implemented method
car.move();             // Overridden from Vehicle

// ── Order of execution ─────────────────────
class A {
  void greet() => print('A');
}

mixin B {
  void greet() => print('B');
}

mixin C {
  void greet() => print('C');
}

class D extends A with B, C {
  @override
  void greet() {
    super.greet(); // Calls C (last mixin)
    print('D');
  }
}

D().greet();
// Output:
// C
// D

// ── Summary ────────────────────────────────
// extends  → inherits everything, single parent
// with     → reuses code, multiple mixins
// implements → contract only, multiple interfaces

class Example extends Parent with Mixin1, Mixin2 implements Interface1, Interface2 {
  // Valid syntax
}`),

  q(2, 11, 'medium',
    'What are extension methods in Dart and how do you use them?',
    `Extension methods let you add functionality to existing types without modifying them or creating subclasses.

Features:
• Add methods to any type (even built-in types)
• Static resolution (compile-time)
• Cannot override existing methods
• Can have generic type parameters
• Scoped by import

Use cases:
• Add utility methods to core types
• Domain-specific helpers
• Cleaner API design
• Flutter widget helpers`,
    `// ── Basic extension ────────────────────────
extension StringExtensions on String {
  String capitalize() {
    if (isEmpty) return this;
    return '\${this[0].toUpperCase()}\${substring(1).toLowerCase()}';
  }

  bool get isEmail => contains('@') && contains('.');

  String truncate(int maxLength) {
    if (length <= maxLength) return this;
    return '\${substring(0, maxLength)}...';
  }
}

// Usage
var name = 'alice';
print(name.capitalize()); // Alice

var email = 'test@example.com';
print(email.isEmail); // true

var long = 'This is a very long text';
print(long.truncate(10)); // This is a ...

// ── Extension on List ──────────────────────
extension ListExtensions<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
  T? get lastOrNull => isEmpty ? null : last;

  List<T> separate(T separator) {
    if (isEmpty) return [];
    return fold<List<T>>(
      [],
      (prev, element) => prev.isEmpty
        ? [element]
        : [...prev, separator, element],
    );
  }
}

var empty = <int>[];
print(empty.firstOrNull); // null

var items = ['a', 'b', 'c'];
print(items.separate('|')); // [a, |, b, |, c]

// ── Extension on DateTime ──────────────────
extension DateTimeExtensions on DateTime {
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  bool get isTomorrow {
    final tomorrow = DateTime.now().add(Duration(days: 1));
    return year == tomorrow.year &&
           month == tomorrow.month &&
           day == tomorrow.day;
  }

  String get timeAgo {
    final diff = DateTime.now().difference(this);
    if (diff.inDays > 0) return '\${diff.inDays}d ago';
    if (diff.inHours > 0) return '\${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '\${diff.inMinutes}m ago';
    return 'just now';
  }
}

var now = DateTime.now();
print(now.isToday); // true
print(now.timeAgo); // just now

// ── Extension on BuildContext (Flutter) ────
extension BuildContextExtensions on BuildContext {
  ThemeData get theme => Theme.of(this);
  TextTheme get textTheme => Theme.of(this).textTheme;
  MediaQueryData get mediaQuery => MediaQuery.of(this);
  Size get screenSize => MediaQuery.of(this).size;

  void showSnack(String message) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<T?> push<T>(Widget page) {
    return Navigator.push<T>(
      this,
      MaterialPageRoute(builder: (_) => page),
    );
  }
}

// Usage in widgets
class MyWidget extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () {
        context.showSnack('Hello!');
        context.push(NextPage());
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: context.theme.primaryColor,
      ),
      child: Text('Click', style: context.textTheme.titleLarge),
    );
  }
}

// ── Extension with type constraints ────────
extension IterableNumbers<T extends num> on Iterable<T> {
  T get sum => reduce((a, b) => (a + b) as T);
  double get average => sum / length;
}

var numbers = [1, 2, 3, 4, 5];
print(numbers.sum);     // 15
print(numbers.average); // 3.0

// ── Named extensions (for conflicts) ───────
extension IntParsing on String {
  int parseInt() => int.parse(this);
}

extension SafeIntParsing on String {
  int? tryParseInt() => int.tryParse(this);
}

'42'.parseInt();     // 42
'abc'.tryParseInt(); // null

// ── Extension on nullable types ────────────
extension NullableStringExtensions on String? {
  bool get isNullOrEmpty => this == null || this!.isEmpty;

  String get orEmpty => this ?? '';
}

String? nullable;
print(nullable.isNullOrEmpty); // true
print(nullable.orEmpty);       // ''`),

  // ══ MORE FLUTTER FUNDAMENTALS ═══════════════════════════════════════════
  q(3, 9, 'easy',
    'What is the difference between hot reload and hot restart?',
    `Hot Reload:
• Injects updated code into running Dart VM
• Preserves app state
• Fast (< 1 second)
• Works for UI changes, most code changes
• Doesn't re-run main() or initState()

Hot Restart:
• Restarts the app from scratch
• Loses all state
• Slower (few seconds)
• Re-runs main() and all initialization
• Needed for: main() changes, global variables, native code

When hot reload doesn't work:
• Changing app initialization
• Adding/removing imports
• Changing class to mixin
• Modifying const to final`,
    `// ── Hot reload works ───────────────────────
class Counter extends StatefulWidget {
  @override State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int count = 0;

  @override Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: \$count'),
        // Change this color and hot reload → state preserved
        ElevatedButton(
          onPressed: () => setState(() => count++),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue, // Change to Colors.red
          ),
          child: Text('Increment'),
        ),
      ],
    );
  }
}

// ── Hot restart needed ─────────────────────
// 1. Changing main()
void main() {
  runApp(MyApp());
  // Add logging here → needs hot restart
  debugPrint('App started');
}

// 2. Changing global variables
// var apiUrl = 'https://api.dev.com';
var apiUrl = 'https://api.prod.com'; // Hot restart needed

// 3. Changing const to final
class Config {
  // const String version = '1.0';
  final String version = '1.0'; // Hot restart needed
}

// 4. initState changes
class _MyWidgetState extends State<MyWidget> {
  late String data;

  @override
  void initState() {
    super.initState();
    data = 'Initial';
    // Add code here → hot restart to re-run
  }

  @override Widget build(BuildContext context) {
    // Changes here → hot reload works
    return Text(data);
  }
}

// ── Best practices ─────────────────────────
// • Use hot reload for rapid UI iteration
// • Use hot restart after changing state initialization
// • Full restart/rebuild after native code changes
// • Rebuild after pubspec.yaml changes`),

  q(3, 10, 'medium',
    'Explain Keys in Flutter and when they are necessary.',
    `Keys help Flutter identify widgets uniquely in the widget tree.

Types of Keys:
• ValueKey — based on value
• ObjectKey — based on object identity
• UniqueKey — always unique
• GlobalKey — access widget state anywhere
• PageStorageKey — preserve scroll position

When you NEED keys:
• Reordering stateful widgets
• Modifying collection of widgets
• Preserving state when widget moves
• Accessing widget state from outside

Flutter's diffing algorithm uses keys to match old/new widgets.`,
    `// ── Problem: Without keys ──────────────────
class StatefulTile extends StatefulWidget {
  final String title;
  const StatefulTile(this.title, {super.key});

  @override State<StatefulTile> createState() => _StatefulTileState();
}

class _StatefulTileState extends State<StatefulTile> {
  bool selected = false;

  @override Widget build(BuildContext context) {
    return ListTile(
      title: Text(widget.title),
      selected: selected,
      onTap: () => setState(() => selected = !selected),
    );
  }
}

class BadList extends StatefulWidget {
  @override State<BadList> createState() => _BadListState();
}

class _BadListState extends State<BadList> {
  List<String> items = ['A', 'B', 'C'];

  void removeFirst() {
    setState(() => items.removeAt(0));
  }

  @override Widget build(BuildContext context) {
    return Column(
      children: [
        ...items.map((item) => StatefulTile(item)), // ✗ No keys
        ElevatedButton(
          onPressed: removeFirst,
          child: Text('Remove First'),
        ),
      ],
    );
  }
}

// Problem: If you select 'B', then remove 'A',
// the selection stays on second position (now 'C')
// because Flutter matches widgets by type and position

// ── Solution: With keys ────────────────────
class _GoodListState extends State<GoodList> {
  List<String> items = ['A', 'B', 'C'];

  void removeFirst() {
    setState(() => items.removeAt(0));
  }

  @override Widget build(BuildContext context) {
    return Column(
      children: [
        ...items.map((item) =>
          StatefulTile(item, key: ValueKey(item)) // ✓ With keys
        ),
        ElevatedButton(
          onPressed: removeFirst,
          child: Text('Remove First'),
        ),
      ],
    );
  }
}

// Now Flutter correctly tracks each widget by its key

// ── ValueKey ───────────────────────────────
// Use when value uniquely identifies widget
ListView(
  children: users.map((user) =>
    UserTile(user, key: ValueKey(user.id))
  ).toList(),
)

// ── ObjectKey ──────────────────────────────
// Use when object itself is unique
ListView(
  children: items.map((item) =>
    ItemWidget(item, key: ObjectKey(item))
  ).toList(),
)

// ── UniqueKey ──────────────────────────────
// Always creates new key (forces rebuild)
Widget build(BuildContext context) {
  return Container(
    key: UniqueKey(), // New widget every build
    child: Text('Always rebuilds'),
  );
}

// ── GlobalKey ──────────────────────────────
// Access widget state from anywhere
class MyForm extends StatelessWidget {
  final formKey = GlobalKey<FormState>();

  void submit() {
    if (formKey.currentState!.validate()) {
      formKey.currentState!.save();
      print('Form is valid!');
    }
  }

  @override Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        children: [
          TextFormField(
            validator: (v) => v!.isEmpty ? 'Required' : null,
          ),
          ElevatedButton(
            onPressed: submit,
            child: Text('Submit'),
          ),
        ],
      ),
    );
  }
}

// ── PageStorageKey ─────────────────────────
// Preserve scroll position when switching tabs
ListView(
  key: PageStorageKey('my-list'),
  children: items.map((item) => ListTile(title: Text(item))).toList(),
)

// ── When NOT to use keys ───────────────────
// • Static widget trees
// • Stateless widgets that don't move
// • Performance: keys have overhead`),

  // ══ MORE BASIC WIDGETS ══════════════════════════════════════════════════
  q(4, 6, 'medium',
    'What is the difference between Expanded and Flexible widgets?',
    `Both control how children of Row/Column use available space:

Flexible:
• Child can be smaller than allocated space
• flex determines space ratio
• fit: FlexFit.loose (default) — child can shrink
• fit: FlexFit.tight — child must fill space

Expanded:
• Shorthand for Flexible with fit: FlexFit.tight
• Child MUST fill allocated space
• More common than Flexible

flex parameter (both):
• Default is 1
• Ratio of space compared to siblings
• flex: 2 gets twice the space of flex: 1`,
    `// ── Basic Expanded ─────────────────────────
Row(
  children: [
    Expanded(
      child: Container(color: Colors.red),
    ),
    Expanded(
      child: Container(color: Colors.blue),
    ),
  ],
)
// Red and blue each take 50% of width

// ── Expanded with flex ─────────────────────
Row(
  children: [
    Expanded(
      flex: 1,
      child: Container(color: Colors.red),
    ),
    Expanded(
      flex: 2,
      child: Container(color: Colors.blue),
    ),
  ],
)
// Red gets 1/3, blue gets 2/3

// ── Flexible vs Expanded ───────────────────
Row(
  children: [
    Flexible(
      child: Container(
        width: 100, // Can be smaller than allocated
        color: Colors.red,
      ),
    ),
    Expanded(
      child: Container(
        width: 100, // Ignored! Must fill allocated space
        color: Colors.blue,
      ),
    ),
  ],
)

// ── Flexible with FlexFit.tight ────────────
Row(
  children: [
    Flexible(
      fit: FlexFit.tight, // Same as Expanded
      child: Container(color: Colors.red),
    ),
    Flexible(
      fit: FlexFit.loose, // Default, can shrink
      child: Container(
        width: 100,
        color: Colors.blue,
      ),
    ),
  ],
)

// ── Common pattern: text overflow ──────────
Row(
  children: [
    Icon(Icons.person),
    SizedBox(width: 8),
    Expanded( // Prevents overflow
      child: Text(
        'Very long username that might overflow the row',
        overflow: TextOverflow.ellipsis,
      ),
    ),
    Icon(Icons.arrow_forward),
  ],
)

// ── Multiple Expanded with ratios ──────────
Column(
  children: [
    Expanded(
      flex: 2, // Header takes 2 parts
      child: Container(color: Colors.blue),
    ),
    Expanded(
      flex: 5, // Body takes 5 parts
      child: Container(color: Colors.white),
    ),
    Expanded(
      flex: 1, // Footer takes 1 part
      child: Container(color: Colors.grey),
    ),
  ],
)
// Total: 8 parts. Header=25%, Body=62.5%, Footer=12.5%

// ── Spacer (special Expanded) ──────────────
Row(
  children: [
    Text('Left'),
    Spacer(), // Expanded(child: SizedBox())
    Text('Right'),
  ],
)

// Same as:
Row(
  children: [
    Text('Left'),
    Expanded(child: SizedBox()),
    Text('Right'),
  ],
)

// ── When NOT to use ────────────────────────
// ✗ Don't use outside Row/Column/Flex
Container(
  child: Expanded(child: Text('Error!')), // Runtime error
)

// ✓ Only inside Flex widgets
Row(
  children: [
    Expanded(child: Text('OK')),
  ],
)`),

  q(4, 7, 'medium',
    'How does LayoutBuilder work and when should you use it?',
    `LayoutBuilder provides parent constraints to build child widgets responsively.

Key features:
• Receives BoxConstraints from parent
• Builds child based on available space
• Useful for responsive layouts
• Rebuilds when constraints change

Constraints:
• maxWidth, maxHeight — maximum available
• minWidth, minHeight — minimum required
• Use to build adaptive UI

Similar widgets:
• MediaQuery — entire screen size
• LayoutBuilder — parent-specific constraints
• OrientationBuilder — device orientation`,
    `// ── Basic LayoutBuilder ────────────────────
LayoutBuilder(
  builder: (context, constraints) {
    print('Max width: \${constraints.maxWidth}');
    print('Max height: \${constraints.maxHeight}');

    if (constraints.maxWidth > 600) {
      return DesktopLayout();
    } else {
      return MobileLayout();
    }
  },
)

// ── Responsive grid ────────────────────────
LayoutBuilder(
  builder: (context, constraints) {
    final width = constraints.maxWidth;
    final crossAxisCount = width > 1200 ? 4
                          : width > 800 ? 3
                          : width > 600 ? 2
                          : 1;

    return GridView.builder(
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemBuilder: (ctx, i) => ProductCard(products[i]),
      itemCount: products.length,
    );
  },
)

// ── Adaptive widget size ───────────────────
class ResponsiveCard extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 400;

        return Card(
          child: Padding(
            padding: EdgeInsets.all(compact ? 8 : 16),
            child: Column(
              children: [
                Text(
                  'Title',
                  style: TextStyle(
                    fontSize: compact ? 16 : 24,
                  ),
                ),
                if (!compact) Text('Subtitle'),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ── LayoutBuilder vs MediaQuery ────────────
class ComparisonWidget extends StatelessWidget {
  @override Widget build(BuildContext context) {
    // MediaQuery — entire screen
    final screenWidth = MediaQuery.of(context).size.width;
    print('Screen width: \$screenWidth');

    return Container(
      width: 300, // Parent sets constraints
      child: LayoutBuilder(
        builder: (context, constraints) {
          // LayoutBuilder — parent constraints
          print('Available width: \${constraints.maxWidth}'); // 300
          return Text('Width: \${constraints.maxWidth}');
        },
      ),
    );
  }
}

// ── Nested LayoutBuilder ───────────────────
Container(
  width: 800,
  child: LayoutBuilder(
    builder: (context, outerConstraints) {
      print('Outer: \${outerConstraints.maxWidth}'); // 800

      return Row(
        children: [
          Expanded(
            child: LayoutBuilder(
              builder: (context, innerConstraints) {
                print('Inner: \${innerConstraints.maxWidth}'); // ~400
                return Container(color: Colors.red);
              },
            ),
          ),
          Expanded(
            child: Container(color: Colors.blue),
          ),
        ],
      );
    },
  ),
)

// ── Responsive master-detail ───────────────
class MasterDetail extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth > 800) {
          // Side-by-side on wide screens
          return Row(
            children: [
              Expanded(
                flex: 1,
                child: MasterList(),
              ),
              VerticalDivider(width: 1),
              Expanded(
                flex: 2,
                child: DetailView(),
              ),
            ],
          );
        } else {
          // Stacked on narrow screens
          return MasterList();
        }
      },
    );
  }
}

// ── Constrained vs unconstrained ───────────
LayoutBuilder(
  builder: (context, constraints) {
    if (constraints.hasBoundedWidth) {
      print('Width is bounded: \${constraints.maxWidth}');
    } else {
      print('Width is unbounded (infinite)');
    }

    return Container(
      // Use constraints to determine size
      width: constraints.maxWidth.isFinite
        ? constraints.maxWidth * 0.8
        : 300,
      child: Text('Responsive width'),
    );
  },
)`),

  // ══ MORE STREAMS ════════════════════════════════════════════════════════
  q(8, 5, 'medium',
    'What is the difference between single-subscription and broadcast streams?',
    `Two types of streams in Dart:

1. Single-subscription stream:
   • Default type
   • Only one listener allowed
   • Stores events if no listener
   • Created with Stream() or async*

2. Broadcast stream:
   • Multiple listeners allowed
   • Doesn't store events (lose if no listener)
   • Created with StreamController.broadcast()
   • Use for events, notifications

Converting:
• asBroadcastStream() converts single → broadcast
• Cannot convert broadcast → single`,
    `// ── Single-subscription stream ─────────────
Stream<int> countStream() async* {
  for (var i = 1; i <= 5; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i;
  }
}

var stream = countStream();

// First listener
stream.listen((value) => print('Listener 1: \$value'));

// ✗ Error: stream already has a listener
// stream.listen((value) => print('Listener 2: \$value'));

// ── Broadcast stream ───────────────────────
final controller = StreamController<int>.broadcast();

// Multiple listeners OK
controller.stream.listen((value) => print('Listener 1: \$value'));
controller.stream.listen((value) => print('Listener 2: \$value'));
controller.stream.listen((value) => print('Listener 3: \$value'));

controller.add(42);
// Output:
// Listener 1: 42
// Listener 2: 42
// Listener 3: 42

controller.close();

// ── Converting to broadcast ────────────────
var singleStream = countStream();
var broadcastStream = singleStream.asBroadcastStream();

broadcastStream.listen((v) => print('A: \$v'));
broadcastStream.listen((v) => print('B: \$v'));
// Both listeners receive all events

// ── Event storage difference ───────────────
// Single-subscription: stores events
var single = StreamController<int>();
single.add(1);
single.add(2);
// Events stored, will be delivered when listener subscribes
single.stream.listen(print); // Prints: 1, 2

// Broadcast: doesn't store
var broadcast = StreamController<int>.broadcast();
broadcast.add(1);
broadcast.add(2);
// No listener, events lost
broadcast.stream.listen(print); // Prints nothing (events already gone)

// ── Real-world: event bus ──────────────────
class EventBus {
  final _controller = StreamController<AppEvent>.broadcast();

  Stream<AppEvent> get events => _controller.stream;

  void fire(AppEvent event) {
    _controller.add(event);
  }

  void dispose() {
    _controller.close();
  }
}

// Multiple widgets can listen
final eventBus = EventBus();

// Widget 1
eventBus.events.listen((event) {
  if (event is UserLoggedIn) {
    print('User logged in: \${event.username}');
  }
});

// Widget 2
eventBus.events.listen((event) {
  if (event is UserLoggedIn) {
    print('Refresh UI');
  }
});

eventBus.fire(UserLoggedIn('Alice'));

// ── StreamBuilder with broadcast ───────────
class NotificationWidget extends StatelessWidget {
  final notificationStream = StreamController<String>.broadcast();

  @override Widget build(BuildContext context) {
    return Column(
      children: [
        StreamBuilder<String>(
          stream: notificationStream.stream,
          builder: (context, snapshot) {
            if (!snapshot.hasData) return SizedBox();
            return Text(snapshot.data!);
          },
        ),
        StreamBuilder<String>(
          stream: notificationStream.stream,
          builder: (context, snapshot) {
            if (!snapshot.hasData) return SizedBox();
            return Icon(Icons.notification_important);
          },
        ),
      ],
    );
  }
}

// ── When to use each ───────────────────────
// Single-subscription:
// • File reading
// • HTTP request/response
// • One-time data sequences
// • Database queries

// Broadcast:
// • UI events (button clicks)
// • WebSocket messages
// • App-wide notifications
// • Multiple observers pattern`),

  // ══ MORE PROVIDER ═══════════════════════════════════════════════════════
  q(10, 6, 'medium',
    'What is the difference between Provider.of, Consumer, and Selector?',
    `Three ways to read data from Provider:

1. Provider.of<T>(context)
   • Direct access
   • Rebuilds widget when data changes
   • listen: false to disable rebuilds

2. Consumer<T>
   • Widget that rebuilds
   • Only child subtree rebuilds
   • More granular control

3. Selector<A, S>
   • Rebuilds only when selected value changes
   • Better performance
   • Useful for large objects

context.watch<T>() — equivalent to Provider.of
context.read<T>() — equivalent to Provider.of with listen: false`,
    `import 'package:provider/provider.dart';

class Counter with ChangeNotifier {
  int _count = 0;
  int get count => _count;

  void increment() {
    _count++;
    notifyListeners();
  }
}

// ── Provider.of ────────────────────────────
class CounterDisplay1 extends StatelessWidget {
  @override Widget build(BuildContext context) {
    // Rebuilds when counter changes
    final counter = Provider.of<Counter>(context);
    print('build() called');

    return Text('\${counter.count}');
  }
}

// With listen: false (no rebuild)
class IncrementButton extends StatelessWidget {
  @override Widget build(BuildContext context) {
    final counter = Provider.of<Counter>(context, listen: false);
    // Doesn't rebuild when counter changes

    return ElevatedButton(
      onPressed: counter.increment,
      child: Text('Increment'),
    );
  }
}

// ── context.watch / context.read ───────────
class CounterDisplay2 extends StatelessWidget {
  @override Widget build(BuildContext context) {
    final counter = context.watch<Counter>(); // Same as Provider.of
    return Text('\${counter.count}');
  }
}

class IncrementButton2 extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () {
        context.read<Counter>().increment(); // Same as Provider.of(listen: false)
      },
      child: Text('Increment'),
    );
  }
}

// ── Consumer ───────────────────────────────
class CounterDisplay3 extends StatelessWidget {
  @override Widget build(BuildContext context) {
    print('build() called once');

    return Column(
      children: [
        Text('Static text'), // Doesn't rebuild
        Consumer<Counter>(
          builder: (context, counter, child) {
            print('Consumer builder called');
            return Text('\${counter.count}'); // Only this rebuilds
          },
        ),
        Text('More static text'), // Doesn't rebuild
      ],
    );
  }
}

// Consumer with child optimization
Consumer<Counter>(
  builder: (context, counter, child) {
    return Column(
      children: [
        Text('\${counter.count}'), // Rebuilds
        child!, // Doesn't rebuild
      ],
    );
  },
  child: ExpensiveWidget(), // Built once, reused
)

// ── Selector ───────────────────────────────
class User {
  String name;
  int age;
  String email;

  User(this.name, this.age, this.email);
}

class UserProvider with ChangeNotifier {
  User _user = User('Alice', 30, 'alice@example.com');
  User get user => _user;

  void updateName(String name) {
    _user.name = name;
    notifyListeners();
  }

  void updateAge(int age) {
    _user.age = age;
    notifyListeners();
  }
}

// Without Selector: rebuilds on ANY change
class NameDisplay1 extends StatelessWidget {
  @override Widget build(BuildContext context) {
    final user = context.watch<UserProvider>().user;
    print('Rebuilding (even if only age changed)');
    return Text(user.name);
  }
}

// With Selector: rebuilds only when name changes
class NameDisplay2 extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return Selector<UserProvider, String>(
      selector: (context, provider) => provider.user.name,
      builder: (context, name, child) {
        print('Rebuilding only when name changes');
        return Text(name);
      },
    );
  }
}

// ── Selector with complex selection ────────
Selector<UserProvider, String>(
  selector: (context, provider) {
    // Only rebuild if name OR age changes
    final user = provider.user;
    return '\${user.name}-\${user.age}';
  },
  builder: (context, combined, child) {
    final parts = combined.split('-');
    return Text('\${parts[0]}, age \${parts[1]}');
  },
)

// ── Consumer2, Consumer3... ────────────────
Consumer2<UserProvider, SettingsProvider>(
  builder: (context, userProvider, settingsProvider, child) {
    return Text('\${userProvider.user.name} - \${settingsProvider.theme}');
  },
)

// ── Performance comparison ─────────────────
class PerformanceExample extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return Column(
      children: [
        // ✗ Bad: entire widget rebuilds
        Builder(
          builder: (context) {
            final counter = context.watch<Counter>();
            return ExpensiveWidget(count: counter.count);
          },
        ),

        // ✓ Good: only Text rebuilds
        Consumer<Counter>(
          builder: (context, counter, child) => Text('\${counter.count}'),
        ),

        // ✓ Best: only rebuilds if count changed
        Selector<Counter, int>(
          selector: (context, counter) => counter.count,
          builder: (context, count, child) => Text('\$count'),
        ),
      ],
    );
  }
}

// ── When to use each ───────────────────────
// Provider.of / context.watch():
// • Simple cases
// • Entire widget depends on data
// • Quick prototyping

// Consumer:
// • Part of widget depends on data
// • Expensive widgets nearby
// • Clear separation of concerns

// Selector:
// • Large objects with many properties
// • Only care about subset of data
// • Performance-critical
// • Prevent unnecessary rebuilds`),

  // ══ MORE BLOC ═══════════════════════════════════════════════════════════
  q(11, 7, 'hard',
    'What is the difference between Bloc and Cubit, and when to use each?',
    `Both are state management solutions from flutter_bloc:

Cubit:
• Simplified version of Bloc
• Uses functions instead of events
• emit() to change state
• Less boilerplate
• Better for simple cases

Bloc:
• Uses Event + State pattern
• mapEventToState or on<Event>()
• More verbose
• Better for complex logic
• Better testability
• Event sourcing support

Choose Cubit for simple state, Bloc for complex business logic.`,
    `import 'package:flutter_bloc/flutter_bloc.dart';

// ══ CUBIT EXAMPLE ══════════════════════════
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
  void reset() => emit(0);
}

// Usage
class CounterPage extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CounterCubit(),
      child: CounterView(),
    );
  }
}

class CounterView extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return Column(
      children: [
        BlocBuilder<CounterCubit, int>(
          builder: (context, count) {
            return Text('\$count');
          },
        ),
        Row(
          children: [
            ElevatedButton(
              onPressed: () => context.read<CounterCubit>().increment(),
              child: Text('+'),
            ),
            ElevatedButton(
              onPressed: () => context.read<CounterCubit>().decrement(),
              child: Text('-'),
            ),
          ],
        ),
      ],
    );
  }
}

// ══ BLOC EXAMPLE ═══════════════════════════
// 1. Define events
abstract class CounterEvent {}

class CounterIncremented extends CounterEvent {}
class CounterDecremented extends CounterEvent {}
class CounterReset extends CounterEvent {}

// 2. Define Bloc
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<CounterIncremented>((event, emit) {
      emit(state + 1);
    });

    on<CounterDecremented>((event, emit) {
      emit(state - 1);
    });

    on<CounterReset>((event, emit) {
      emit(0);
    });
  }
}

// Usage
class CounterView2 extends StatelessWidget {
  @override Widget build(BuildContext context) {
    return Column(
      children: [
        BlocBuilder<CounterBloc, int>(
          builder: (context, count) => Text('\$count'),
        ),
        Row(
          children: [
            ElevatedButton(
              onPressed: () =>
                context.read<CounterBloc>().add(CounterIncremented()),
              child: Text('+'),
            ),
            ElevatedButton(
              onPressed: () =>
                context.read<CounterBloc>().add(CounterDecremented()),
              child: Text('-'),
            ),
          ],
        ),
      ],
    );
  }
}

// ══ COMPLEX CUBIT ══════════════════════════
class TodosCubit extends Cubit<TodosState> {
  final TodoRepository repository;

  TodosCubit(this.repository) : super(TodosInitial());

  Future<void> loadTodos() async {
    emit(TodosLoading());
    try {
      final todos = await repository.getTodos();
      emit(TodosLoaded(todos));
    } catch (e) {
      emit(TodosError(e.toString()));
    }
  }

  void addTodo(Todo todo) {
    if (state is TodosLoaded) {
      final current = (state as TodosLoaded).todos;
      emit(TodosLoaded([...current, todo]));
    }
  }

  void toggleTodo(String id) {
    if (state is TodosLoaded) {
      final todos = (state as TodosLoaded).todos.map((todo) {
        return todo.id == id ? todo.copyWith(done: !todo.done) : todo;
      }).toList();
      emit(TodosLoaded(todos));
    }
  }
}

// States
abstract class TodosState {}
class TodosInitial extends TodosState {}
class TodosLoading extends TodosState {}
class TodosLoaded extends TodosState {
  final List<Todo> todos;
  TodosLoaded(this.todos);
}
class TodosError extends TodosState {
  final String message;
  TodosError(this.message);
}

// ══ COMPLEX BLOC ═══════════════════════════
// Events
abstract class TodosEvent {}
class TodosLoadRequested extends TodosEvent {}
class TodoAdded extends TodosEvent {
  final Todo todo;
  TodoAdded(this.todo);
}
class TodoToggled extends TodosEvent {
  final String id;
  TodoToggled(this.id);
}
class TodoDeleted extends TodosEvent {
  final String id;
  TodoDeleted(this.id);
}

// Bloc
class TodosBloc extends Bloc<TodosEvent, TodosState> {
  final TodoRepository repository;

  TodosBloc(this.repository) : super(TodosInitial()) {
    on<TodosLoadRequested>(_onLoadRequested);
    on<TodoAdded>(_onTodoAdded);
    on<TodoToggled>(_onTodoToggled);
    on<TodoDeleted>(_onTodoDeleted);
  }

  Future<void> _onLoadRequested(
    TodosLoadRequested event,
    Emitter<TodosState> emit,
  ) async {
    emit(TodosLoading());
    try {
      final todos = await repository.getTodos();
      emit(TodosLoaded(todos));
    } catch (e) {
      emit(TodosError(e.toString()));
    }
  }

  void _onTodoAdded(TodoAdded event, Emitter<TodosState> emit) {
    if (state is TodosLoaded) {
      final current = (state as TodosLoaded).todos;
      emit(TodosLoaded([...current, event.todo]));
    }
  }

  void _onTodoToggled(TodoToggled event, Emitter<TodosState> emit) {
    if (state is TodosLoaded) {
      final todos = (state as TodosLoaded).todos.map((todo) {
        return todo.id == event.id
            ? todo.copyWith(done: !todo.done)
            : todo;
      }).toList();
      emit(TodosLoaded(todos));
    }
  }

  void _onTodoDeleted(TodoDeleted event, Emitter<TodosState> emit) {
    if (state is TodosLoaded) {
      final todos = (state as TodosLoaded).todos
          .where((todo) => todo.id != event.id)
          .toList();
      emit(TodosLoaded(todos));
    }
  }
}

// ══ WHEN TO USE EACH ═══════════════════════
// Cubit:
// • Simple state changes
// • Direct function calls feel natural
// • Less code, faster development
// • UI-driven state (toggle, filter, etc.)

// Bloc:
// • Complex business logic
// • Need event history/logging
// • Multiple sources of events
// • Replay/undo functionality
// • Better separation of concerns
// • More testable (test events independently)

// ══ TESTING COMPARISON ═════════════════════
// Cubit test
blocTest<CounterCubit, int>(
  'emits [1] when increment is called',
  build: () => CounterCubit(),
  act: (cubit) => cubit.increment(),
  expect: () => [1],
);

// Bloc test
blocTest<CounterBloc, int>(
  'emits [1] when CounterIncremented is added',
  build: () => CounterBloc(),
  act: (bloc) => bloc.add(CounterIncremented()),
  expect: () => [1],
);`),

  // ══ MORE ARCHITECTURE ═══════════════════════════════════════════════════
  q(15, 7, 'hard',
    'Explain Clean Architecture in Flutter and its layers.',
    `Clean Architecture separates code into layers with strict dependency rules:

Layers (outer to inner):
1. Presentation — UI, widgets, BLoC/Cubit
2. Domain — business logic, entities, use cases
3. Data — repositories, data sources, models

Dependency Rule:
• Inner layers know nothing about outer layers
• Dependencies point inward only
• Domain has NO dependencies on other layers

Benefits:
• Testable (mock dependencies)
• Independent of frameworks
• Independent of UI
• Independent of database
• Separation of concerns`,
    `// ══ PROJECT STRUCTURE ══════════════════════
// lib/
//   features/
//     user/
//       domain/
//         entities/
//           user.dart
//         repositories/
//           user_repository.dart
//         usecases/
//           get_user.dart
//           update_user.dart
//       data/
//         models/
//           user_model.dart
//         repositories/
//           user_repository_impl.dart
//         datasources/
//           user_remote_datasource.dart
//           user_local_datasource.dart
//       presentation/
//         bloc/
//           user_bloc.dart
//         pages/
//           user_page.dart
//         widgets/
//           user_card.dart

// ══ DOMAIN LAYER ═══════════════════════════
// 1. Entity — pure Dart class, no dependencies
class User {
  final String id;
  final String name;
  final String email;

  User({
    required this.id,
    required this.name,
    required this.email,
  });
}

// 2. Repository interface — abstract contract
abstract class UserRepository {
  Future<User> getUser(String id);
  Future<void> updateUser(User user);
  Future<List<User>> getAllUsers();
}

// 3. Use case — single business operation
class GetUser {
  final UserRepository repository;

  GetUser(this.repository);

  Future<User> call(String id) {
    return repository.getUser(id);
  }
}

class UpdateUser {
  final UserRepository repository;

  UpdateUser(this.repository);

  Future<void> call(User user) {
    return repository.updateUser(user);
  }
}

// ══ DATA LAYER ═════════════════════════════
// 1. Model — serializable version of entity
class UserModel extends User {
  UserModel({
    required super.id,
    required super.name,
    required super.email,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      name: json['name'],
      email: json['email'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
    };
  }

  // Convert to domain entity
  User toEntity() {
    return User(id: id, name: name, email: email);
  }
}

// 2. Data source — API or local storage
abstract class UserRemoteDataSource {
  Future<UserModel> getUser(String id);
  Future<void> updateUser(UserModel user);
}

class UserRemoteDataSourceImpl implements UserRemoteDataSource {
  final http.Client client;

  UserRemoteDataSourceImpl(this.client);

  @override
  Future<UserModel> getUser(String id) async {
    final response = await client.get(
      Uri.parse('https://api.example.com/users/\$id'),
    );

    if (response.statusCode == 200) {
      return UserModel.fromJson(json.decode(response.body));
    } else {
      throw ServerException();
    }
  }

  @override
  Future<void> updateUser(UserModel user) async {
    final response = await client.put(
      Uri.parse('https://api.example.com/users/\${user.id}'),
      body: json.encode(user.toJson()),
    );

    if (response.statusCode != 200) {
      throw ServerException();
    }
  }
}

// 3. Repository implementation
class UserRepositoryImpl implements UserRepository {
  final UserRemoteDataSource remoteDataSource;
  final UserLocalDataSource localDataSource;

  UserRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<User> getUser(String id) async {
    try {
      // Try remote first
      final userModel = await remoteDataSource.getUser(id);
      // Cache locally
      await localDataSource.cacheUser(userModel);
      return userModel.toEntity();
    } on ServerException {
      // Fallback to cached data
      final userModel = await localDataSource.getUser(id);
      return userModel.toEntity();
    }
  }

  @override
  Future<void> updateUser(User user) async {
    final userModel = UserModel(
      id: user.id,
      name: user.name,
      email: user.email,
    );
    await remoteDataSource.updateUser(userModel);
    await localDataSource.cacheUser(userModel);
  }

  @override
  Future<List<User>> getAllUsers() async {
    final models = await remoteDataSource.getAllUsers();
    return models.map((m) => m.toEntity()).toList();
  }
}

// ══ PRESENTATION LAYER ═════════════════════
// 1. BLoC events and states
abstract class UserEvent {}

class GetUserEvent extends UserEvent {
  final String id;
  GetUserEvent(this.id);
}

abstract class UserState {}

class UserInitial extends UserState {}
class UserLoading extends UserState {}
class UserLoaded extends UserState {
  final User user;
  UserLoaded(this.user);
}
class UserError extends UserState {
  final String message;
  UserError(this.message);
}

// 2. BLoC — uses domain use cases
class UserBloc extends Bloc<UserEvent, UserState> {
  final GetUser getUser;
  final UpdateUser updateUser;

  UserBloc({
    required this.getUser,
    required this.updateUser,
  }) : super(UserInitial()) {
    on<GetUserEvent>(_onGetUser);
  }

  Future<void> _onGetUser(
    GetUserEvent event,
    Emitter<UserState> emit,
  ) async {
    emit(UserLoading());
    try {
      final user = await getUser(event.id);
      emit(UserLoaded(user));
    } catch (e) {
      emit(UserError(e.toString()));
    }
  }
}

// 3. UI Page
class UserPage extends StatelessWidget {
  final String userId;

  const UserPage({required this.userId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => UserBloc(
        getUser: context.read<GetUser>(),
        updateUser: context.read<UpdateUser>(),
      )..add(GetUserEvent(userId)),
      child: UserView(),
    );
  }
}

class UserView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('User Profile')),
      body: BlocBuilder<UserBloc, UserState>(
        builder: (context, state) {
          if (state is UserLoading) {
            return Center(child: CircularProgressIndicator());
          } else if (state is UserLoaded) {
            return UserCard(user: state.user);
          } else if (state is UserError) {
            return Center(child: Text('Error: \${state.message}'));
          }
          return Container();
        },
      ),
    );
  }
}

// ══ DEPENDENCY INJECTION ═══════════════════
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

void setupDependencies() {
  // Data sources
  getIt.registerLazySingleton<UserRemoteDataSource>(
    () => UserRemoteDataSourceImpl(getIt()),
  );
  getIt.registerLazySingleton<UserLocalDataSource>(
    () => UserLocalDataSourceImpl(getIt()),
  );

  // Repositories
  getIt.registerLazySingleton<UserRepository>(
    () => UserRepositoryImpl(
      remoteDataSource: getIt(),
      localDataSource: getIt(),
    ),
  );

  // Use cases
  getIt.registerLazySingleton(() => GetUser(getIt()));
  getIt.registerLazySingleton(() => UpdateUser(getIt()));

  // External
  getIt.registerLazySingleton(() => http.Client());
}

void main() {
  setupDependencies();
  runApp(MyApp());
}

// ══ TESTING ════════════════════════════════
// Domain layer is pure Dart — easy to test
void main() {
  group('GetUser', () {
    test('should return User from repository', () async {
      // Arrange
      final mockRepo = MockUserRepository();
      final useCase = GetUser(mockRepo);
      final testUser = User(id: '1', name: 'Test', email: 'test@example.com');

      when(mockRepo.getUser('1')).thenAnswer((_) async => testUser);

      // Act
      final result = await useCase('1');

      // Assert
      expect(result, testUser);
      verify(mockRepo.getUser('1'));
    });
  });
}`),

  // ══ MORE DESIGN PATTERNS ════════════════════════════════════════════════
  q(16, 7, 'medium',
    'Explain the Singleton pattern in Dart and its implementation.',
    `Singleton ensures a class has only one instance and provides global access.

Dart implementations:
1. Factory constructor with static instance
2. Static final field
3. get_it or riverpod for dependency injection

Use cases:
• Database connections
• API clients
• Configuration/settings
• Logger
• Cache manager

Caution:
• Makes testing harder (global state)
• Consider dependency injection instead
• Avoid for stateful logic`,
    `// ══ METHOD 1: Factory constructor ══════════
class Database {
  // Private static instance
  static final Database _instance = Database._internal();

  // Factory constructor returns same instance
  factory Database() {
    return _instance;
  }

  // Private named constructor
  Database._internal() {
    print('Database instance created');
  }

  void query(String sql) {
    print('Executing: \$sql');
  }
}

// Usage
var db1 = Database();
var db2 = Database();
print(identical(db1, db2)); // true — same instance

db1.query('SELECT * FROM users');

// ══ METHOD 2: Static getter ════════════════
class Logger {
  static final Logger _instance = Logger._internal();

  static Logger get instance => _instance;

  Logger._internal();

  void log(String message) {
    print('[\${DateTime.now()}] \$message');
  }
}

// Usage
Logger.instance.log('App started');
Logger.instance.log('User logged in');

// ══ METHOD 3: Lazy initialization ══════════
class ApiClient {
  static ApiClient? _instance;

  static ApiClient get instance {
    _instance ??= ApiClient._internal();
    return _instance!;
  }

  ApiClient._internal() {
    print('ApiClient initialized');
  }

  Future<void> get(String endpoint) async {
    print('GET \$endpoint');
  }
}

// Not created until first access
ApiClient.instance.get('/users');

// ══ METHOD 4: With parameters ══════════════
class AppConfig {
  final String apiUrl;
  final String apiKey;

  static AppConfig? _instance;

  AppConfig._internal({
    required this.apiUrl,
    required this.apiKey,
  });

  static void initialize({
    required String apiUrl,
    required String apiKey,
  }) {
    _instance ??= AppConfig._internal(
      apiUrl: apiUrl,
      apiKey: apiKey,
    );
  }

  static AppConfig get instance {
    if (_instance == null) {
      throw StateError('AppConfig not initialized');
    }
    return _instance!;
  }
}

// Usage
void main() {
  AppConfig.initialize(
    apiUrl: 'https://api.example.com',
    apiKey: 'secret',
  );

  runApp(MyApp());
}

// Anywhere in app
final config = AppConfig.instance;
print(config.apiUrl);

// ══ THREAD-SAFE SINGLETON ══════════════════
class ThreadSafeCache {
  static ThreadSafeCache? _instance;
  static final _lock = Object();

  final Map<String, dynamic> _cache = {};

  ThreadSafeCache._internal();

  static ThreadSafeCache get instance {
    if (_instance == null) {
      synchronized(_lock, () {
        _instance ??= ThreadSafeCache._internal();
      });
    }
    return _instance!;
  }

  void set(String key, dynamic value) {
    _cache[key] = value;
  }

  dynamic get(String key) {
    return _cache[key];
  }
}

// ══ SINGLETON WITH DISPOSAL ════════════════
class SocketManager {
  static SocketManager? _instance;
  late IOWebSocketChannel _channel;

  static SocketManager get instance {
    _instance ??= SocketManager._internal();
    return _instance!;
  }

  SocketManager._internal() {
    _connect();
  }

  void _connect() {
    _channel = IOWebSocketChannel.connect('ws://example.com');
  }

  void send(String message) {
    _channel.sink.add(message);
  }

  void dispose() {
    _channel.sink.close();
    _instance = null;
  }
}

// ══ BETTER: DEPENDENCY INJECTION ═══════════
// Instead of Singleton, use DI
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

void setupDependencies() {
  // Register as singleton
  getIt.registerLazySingleton<Database>(() => Database());
  getIt.registerLazySingleton<Logger>(() => Logger());
  getIt.registerLazySingleton<ApiClient>(() => ApiClient());
}

// Usage
final db = getIt<Database>();
final logger = getIt<Logger>();

// ══ SINGLETON IN FLUTTER ═══════════════════
// Real-world example: Theme manager
class ThemeManager {
  static final ThemeManager _instance = ThemeManager._internal();

  factory ThemeManager() => _instance;

  ThemeManager._internal();

  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  void setTheme(ThemeMode mode) {
    _themeMode = mode;
    // Persist to storage
    _saveToPrefs(mode);
  }

  Future<void> _saveToPrefs(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    prefs.setString('theme_mode', mode.name);
  }

  Future<void> loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final modeName = prefs.getString('theme_mode');
    if (modeName != null) {
      _themeMode = ThemeMode.values.firstWhere(
        (m) => m.name == modeName,
        orElse: () => ThemeMode.system,
      );
    }
  }
}

// Usage in app
class MyApp extends StatefulWidget {
  @override State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final themeManager = ThemeManager();

  @override
  void initState() {
    super.initState();
    themeManager.loadTheme();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      themeMode: themeManager.themeMode,
      theme: ThemeData.light(),
      darkTheme: ThemeData.dark(),
      home: HomePage(),
    );
  }
}`),

  ...generateBulkQuestions(110),

];

module.exports = { topics, questions };
