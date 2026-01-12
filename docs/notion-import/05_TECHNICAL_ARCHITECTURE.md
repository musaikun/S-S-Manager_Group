# 技術アーキテクチャ設計書

**プロジェクト:** S×S Manager (Shift Schedule Manager)
**バージョン:** 1.0.0
**作成日:** 2025-01-09
**最終更新:** 2026-01-09

---

## 目次

1. [概要](#概要)
2. [現在のアーキテクチャ](#現在のアーキテクチャ)
3. [将来のアーキテクチャ（Flutter移行）](#将来のアーキテクチャflutter移行)
4. [ディレクトリ構成](#ディレクトリ構成)
5. [技術スタック](#技術スタック)
6. [状態管理](#状態管理)
7. [データフロー](#データフロー)
8. [セキュリティ](#セキュリティ)
9. [デプロイメント](#デプロイメント)

---

## 概要

S×S Managerは、フロントエンドとバックエンドを分離したSPA (Single Page Application) アーキテクチャを採用しています。
現在はVue 3で実装されていますが、将来的にFlutterへ移行して、Web/Android/iOS/Desktopのマルチプラットフォーム対応を目指します。

### アーキテクチャの原則

1. **関心の分離**: UI、ビジネスロジック、データアクセスを明確に分離
2. **スケーラビリティ**: 将来の機能拡張に対応可能な設計
3. **保守性**: コードの可読性と再利用性を重視
4. **パフォーマンス**: 高速なレスポンスとスムーズなアニメーション
5. **セキュリティ**: データ保護と認証・認可の徹底

---

## 現在のアーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────┐
│              Client (Browser)                   │
│  ┌───────────────────────────────────────────┐  │
│  │         Vue 3 + TypeScript + Vite         │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Presentation Layer                 │  │  │
│  │  │  - Views (HomeView, CalendarView)   │  │  │
│  │  │  - Components (JobManager, etc)     │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Business Logic Layer               │  │  │
│  │  │  - Composables (useCalendar, etc)   │  │  │
│  │  │  - Utils (dateUtils, etc)           │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  State Management (Pinia)           │  │  │
│  │  │  - calendar.ts                      │  │  │
│  │  │  - timeRegister.ts                  │  │  │
│  │  │  - navigation.ts                    │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Data Layer                         │  │  │
│  │  │  - LocalStorage                     │  │  │
│  │  │  - Axios (HTTP Client)              │  │  │
│  │  │  - Holidays API (External)          │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                        ↕ HTTP/REST
┌─────────────────────────────────────────────────┐
│            Server (Spring Boot)                 │
│  ┌───────────────────────────────────────────┐  │
│  │        Spring Boot 3.5.7 + Java 21        │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Controller Layer                   │  │  │
│  │  │  - TestController (現在)            │  │  │
│  │  │  - AuthController (将来)            │  │  │
│  │  │  - ShiftController (将来)           │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Service Layer (将来)               │  │  │
│  │  │  - AuthService                      │  │  │
│  │  │  - ShiftService                     │  │  │
│  │  │  - UserService                      │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Repository Layer (将来)            │  │  │
│  │  │  - UserRepository                   │  │  │
│  │  │  - ShiftRepository                  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Security (将来)                    │  │  │
│  │  │  - Spring Security + JWT            │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────┐
│         Database (将来実装)                     │
│         PostgreSQL / MySQL                      │
└─────────────────────────────────────────────────┘
```

---

## 将来のアーキテクチャ（Flutter移行）

### マルチプラットフォーム構成図

```
┌─────────────────────────────────────────────────┐
│                 Flutter App                     │
│  ┌───────────────────────────────────────────┐  │
│  │         Presentation Layer                │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Screens                            │  │  │
│  │  │  - HomeScreen                       │  │  │
│  │  │  - CalendarScreen                   │  │  │
│  │  │  - TimeRegisterScreen               │  │  │
│  │  │  - ConfirmScreen                    │  │  │
│  │  │  - ManagerDashboardScreen           │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Widgets (Components)               │  │  │
│  │  │  - JobManagerWidget                 │  │  │
│  │  │  - CalendarWidget                   │  │  │
│  │  │  - TimePickerWidget                 │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │         Business Logic Layer              │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  State Management (Riverpod)        │  │  │
│  │  │  - CalendarNotifier                 │  │  │
│  │  │  - TimeRegisterNotifier             │  │  │
│  │  │  - AuthNotifier                     │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Use Cases                          │  │  │
│  │  │  - SelectDateUseCase                │  │  │
│  │  │  - SubmitShiftUseCase               │  │  │
│  │  │  - DetectConflictUseCase            │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │         Data Layer                        │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Repositories                       │  │  │
│  │  │  - ShiftRepository                  │  │  │
│  │  │  - UserRepository                   │  │  │
│  │  │  - HolidayRepository                │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Data Sources                       │  │  │
│  │  │  - Remote (API Client - Dio)        │  │  │
│  │  │  - Local (Drift/Isar)               │  │  │
│  │  │  - SharedPreferences                │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Platforms: Android, iOS, Web, Desktop          │
└─────────────────────────────────────────────────┘
                        ↕ HTTP/REST
┌─────────────────────────────────────────────────┐
│            Backend (同じ)                       │
│         Spring Boot 3.5.7 + Java 21             │
└─────────────────────────────────────────────────┘
```

### アーキテクチャパターン

**Clean Architecture + MVVM**

```
┌────────────────────────────────────────────┐
│  Presentation (UI Layer)                   │
│  - Screens (StatelessWidget/StatefulWidget)│
│  - Widgets                                 │
│  - ViewModels (Notifiers)                  │
└───────────────┬────────────────────────────┘
                │
                ↓
┌────────────────────────────────────────────┐
│  Domain (Business Logic Layer)             │
│  - Entities (Models)                       │
│  - Use Cases                               │
│  - Repository Interfaces                   │
└───────────────┬────────────────────────────┘
                │
                ↓
┌────────────────────────────────────────────┐
│  Data (Data Access Layer)                  │
│  - Repository Implementations              │
│  - Data Sources (Remote, Local)            │
│  - DTOs (Data Transfer Objects)            │
└────────────────────────────────────────────┘
```

**依存関係ルール:**
- 内側のレイヤーは外側のレイヤーに依存しない
- Domainレイヤーは最も内側で、他のレイヤーに依存しない
- DataレイヤーはDomainレイヤーのインターフェースを実装

---

## ディレクトリ構成

### 現在のVue 3プロジェクト

```
frontend/
├── src/
│   ├── views/                  # 画面コンポーネント
│   │   ├── HomeView.vue
│   │   ├── CalendarView.vue
│   │   ├── TimeRegisterView.vue
│   │   ├── ConfirmView.vue
│   │   └── HistoryView.vue
│   │
│   ├── components/             # 再利用可能なコンポーネント
│   │   ├── PageSlider.vue
│   │   ├── ProgressIndicator.vue
│   │   ├── JobManager.vue
│   │   ├── SettingsModal.vue
│   │   ├── MainStoreSetupModal.vue
│   │   └── SwipeTutorial.vue
│   │
│   ├── stores/                 # Piniaストア（状態管理）
│   │   ├── calendar.ts
│   │   ├── timeRegister.ts
│   │   └── navigation.ts
│   │
│   ├── composables/            # Composition API
│   │   ├── useCalendar.ts
│   │   ├── useHolidays.ts
│   │   ├── useTimeCalculation.ts
│   │   ├── useTimeFormat.ts
│   │   └── useProgress.ts
│   │
│   ├── types/                  # TypeScript型定義
│   │   ├── calendar.ts
│   │   └── timeRegister.ts
│   │
│   ├── utils/                  # ユーティリティ関数
│   │   └── dateUtils.ts
│   │
│   ├── router/                 # Vue Routerルーティング
│   │   └── index.ts
│   │
│   ├── assets/                 # 静的アセット（CSS、画像）
│   │
│   ├── App.vue                 # ルートコンポーネント
│   └── main.ts                 # エントリーポイント
│
├── public/                     # 公開ディレクトリ
├── package.json                # 依存関係
├── vite.config.ts              # Vite設定
└── tsconfig.json               # TypeScript設定

backend/ss/
├── src/main/java/com/example/ss/
│   ├── controller/             # REST APIエンドポイント
│   │   └── TestController.java
│   │
│   ├── config/                 # Spring設定
│   │   └── WebConfig.java
│   │
│   └── SsApplication.java      # Spring Bootメインクラス
│
├── src/main/resources/
│   └── application.properties  # アプリケーション設定
│
└── pom.xml                     # Maven設定
```

### 将来のFlutterプロジェクト（推奨）

```
lib/
├── main.dart                   # エントリーポイント
│
├── core/                       # コアモジュール
│   ├── constants/              # 定数
│   │   ├── colors.dart         # カラー定義（蛍光色など）
│   │   └── strings.dart        # 文字列定数
│   │
│   ├── themes/                 # テーマ
│   │   ├── app_theme.dart
│   │   └── colors.dart
│   │
│   ├── utils/                  # ユーティリティ
│   │   ├── date_utils.dart
│   │   └── time_utils.dart
│   │
│   └── errors/                 # エラーハンドリング
│       └── failures.dart
│
├── features/                   # 機能モジュール（Feature-first）
│   │
│   ├── calendar/               # カレンダー機能
│   │   ├── presentation/
│   │   │   ├── screens/
│   │   │   │   └── calendar_screen.dart
│   │   │   ├── widgets/
│   │   │   │   ├── calendar_grid.dart
│   │   │   │   └── job_manager_widget.dart
│   │   │   └── providers/
│   │   │       └── calendar_provider.dart
│   │   │
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── calendar_state.dart
│   │   │   │   └── job.dart
│   │   │   ├── usecases/
│   │   │   │   ├── toggle_date.dart
│   │   │   │   └── add_job.dart
│   │   │   └── repositories/
│   │   │       └── calendar_repository.dart (interface)
│   │   │
│   │   └── data/
│   │       ├── models/
│   │       │   ├── calendar_model.dart
│   │       │   └── job_model.dart
│   │       ├── repositories/
│   │       │   └── calendar_repository_impl.dart
│   │       └── datasources/
│   │           ├── calendar_local_datasource.dart
│   │           └── calendar_remote_datasource.dart
│   │
│   ├── time_register/          # 時間登録機能
│   │   ├── presentation/
│   │   ├── domain/
│   │   └── data/
│   │
│   ├── auth/                   # 認証機能（将来）
│   │   ├── presentation/
│   │   ├── domain/
│   │   └── data/
│   │
│   └── admin/                  # 管理者機能（将来）
│       ├── presentation/
│       ├── domain/
│       └── data/
│
└── shared/                     # 共有モジュール
    ├── widgets/                # 共通ウィジェット
    │   ├── custom_button.dart
    │   └── loading_indicator.dart
    │
    ├── models/                 # 共通モデル
    │   └── api_response.dart
    │
    └── services/               # 共通サービス
        ├── api_client.dart     # Dio HTTP Client
        ├── storage_service.dart # SharedPreferences
        └── database_service.dart # Drift/Isar
```

---

## 技術スタック

### 現在（Vue 3）

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| **フロントエンド** | | | |
| フレームワーク | Vue.js | 3.5.22 | UIフレームワーク |
| 言語 | TypeScript | 5.9.3 | 型安全な開発 |
| ビルドツール | Vite | 7.1.7 | 高速ビルド |
| 状態管理 | Pinia | 2.3.0 | リアクティブ状態管理 |
| ルーティング | Vue Router | 4.5.0 | SPAルーティング |
| HTTP Client | Axios | 1.13.2 | REST API通信 |
| **バックエンド** | | | |
| フレームワーク | Spring Boot | 3.5.7 | REST APIサーバー |
| 言語 | Java | 21 | サーバーサイド言語 |
| ビルドツール | Maven | - | 依存関係管理 |
| ボイラープレート削減 | Lombok | - | アノテーションによるコード生成 |
| バリデーション | Bean Validation | - | 入力検証 |
| **開発ツール** | | | |
| 開発サーバー | DevTools | - | ライブリロード |
| パッケージマネージャ | npm | - | フロントエンド依存管理 |

### 将来（Flutter）

| カテゴリ | 技術 | 推奨バージョン | 用途 |
|---------|------|---------------|------|
| **フロントエンド** | | | |
| フレームワーク | Flutter | 最新Stable | マルチプラットフォームUI |
| 言語 | Dart | 3.x | アプリ開発言語 |
| 状態管理 | Riverpod | 2.x | 型安全な状態管理 |
| ルーティング | go_router | 最新 | 宣言的ルーティング |
| HTTP Client | Dio | 5.x | REST API通信 |
| ローカルDB | Drift | 2.x | SQLiteベースDB |
| Key-Value Store | SharedPreferences | 2.x | 軽量データ保存 |
| 日付処理 | intl | 最新 | 国際化・日付フォーマット |
| 広告 | google_mobile_ads | 最新 | AdMob統合 |
| **開発ツール** | | | |
| Linter | flutter_lints | 最新 | コード品質チェック |
| テスト | flutter_test | SDK同梱 | ユニット・ウィジェットテスト |
| Code Generation | freezed | 最新 | Immutableクラス生成 |
| Code Generation | json_serializable | 最新 | JSON変換 |

---

## 状態管理

### 現在（Pinia）

**特徴:**
- Vue 3公式推奨
- TypeScript完全対応
- Composition API風のAPI
- DevToolsサポート

**ストア構成:**

```typescript
// stores/calendar.ts
export const useCalendarStore = defineStore('calendar', {
  state: () => ({
    currentYear: number,
    currentMonth: number,
    selectedDates: Set<DateString>,
    jobs: Job[],
    currentJobId: JobId | null
  }),

  getters: {
    selectedDatesArray: (state) => Array.from(state.selectedDates),
    isDateSelected: (state) => (date: DateString) => boolean
  },

  actions: {
    toggleDate(dateString: DateString) { ... },
    addJob(name: string) { ... }
  }
})
```

**使用例:**
```vue
<script setup lang="ts">
import { useCalendarStore } from '@/stores/calendar'

const store = useCalendarStore()

function handleDateClick(date: DateString) {
  store.toggleDate(date)
}
</script>
```

### 将来（Riverpod）

**特徴:**
- コンパイル時の安全性
- プロバイダーの自動破棄
- テストしやすい設計
- Dartのみで動作（Flutter不要）

**プロバイダー構成:**

```dart
// providers/calendar_provider.dart
@riverpod
class CalendarNotifier extends _$CalendarNotifier {
  @override
  CalendarState build() {
    return CalendarState(
      currentYear: DateTime.now().year,
      currentMonth: DateTime.now().month,
      selectedDates: {},
      jobs: [],
      currentJobId: null,
    );
  }

  void toggleDate(String dateString) {
    state = state.copyWith(
      selectedDates: state.selectedDates.contains(dateString)
        ? state.selectedDates.difference({dateString})
        : state.selectedDates.union({dateString}),
    );
  }

  void addJob(String name) {
    final nextId = state.jobs.length + 1;
    final newJob = Job(
      id: nextId,
      name: name,
      color: JOB_COLORS[nextId - 1],
      isActive: true,
    );

    state = state.copyWith(
      jobs: [...state.jobs, newJob],
    );
  }
}
```

**使用例:**
```dart
class CalendarScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final calendarState = ref.watch(calendarNotifierProvider);
    final notifier = ref.read(calendarNotifierProvider.notifier);

    return GestureDetector(
      onTap: () => notifier.toggleDate(dateString),
      child: ...,
    );
  }
}
```

---

## データフロー

### 現在のデータフロー

```
┌──────────────┐
│ User Action  │ (例: 日付クリック)
└──────┬───────┘
       ↓
┌──────────────┐
│ Component    │ @click="handleDateClick(date)"
└──────┬───────┘
       ↓
┌──────────────┐
│ Composable   │ function handleDateClick(date) { store.toggleDate(date) }
└──────┬───────┘
       ↓
┌──────────────┐
│ Pinia Store  │ toggleDate(dateString) { selectedDates.add(dateString) }
└──────┬───────┘
       ↓
┌──────────────┐
│ LocalStorage │ localStorage.setItem('selectedDates', ...)
└──────────────┘
       ↓
┌──────────────┐
│ UI Update    │ リアクティブに自動更新（Vue 3のreactivity）
└──────────────┘
```

### 将来のデータフロー（Flutter + Riverpod）

```
┌──────────────┐
│ User Action  │ (例: 日付タップ)
└──────┬───────┘
       ↓
┌──────────────┐
│ Widget       │ onTap: () => ref.read(provider.notifier).toggleDate(date)
└──────┬───────┘
       ↓
┌──────────────┐
│ Notifier     │ toggleDate(date) → Use Case呼び出し
└──────┬───────┘
       ↓
┌──────────────┐
│ Use Case     │ ToggleDateUseCase.call(date)
└──────┬───────┘
       ↓
┌──────────────┐
│ Repository   │ saveSelectedDates(dates)
└──────┬───────┘
       ↓
┌──────────────┐
│ Data Source  │ Local: SharedPreferences, Remote: API Client
└──────────────┘
       ↓
┌──────────────┐
│ Notifier     │ state = state.copyWith(selectedDates: newDates)
└──────┬───────┘
       ↓
┌──────────────┐
│ UI Update    │ ref.watch() により自動rebuild
└──────────────┘
```

---

## セキュリティ

### 現在の課題

1. **認証なし**: ユーザー認証未実装
2. **LocalStorageの平文保存**: 暗号化されていない
3. **CORS設定が開発環境専用**: 本番環境未対応
4. **入力バリデーション不足**: フロントエンドのみ

### 将来の実装（セキュリティ強化）

#### 1. 認証・認可

**Spring Security + JWT**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .cors()
            .and()
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("MANAGER")
                .anyRequest().authenticated()
            )
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

**Flutter側（トークン管理）**

```dart
// services/auth_service.dart
class AuthService {
  final FlutterSecureStorage _storage = FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'access_token');
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: 'access_token');
  }
}

// HTTP Interceptor
class AuthInterceptor extends Interceptor {
  final AuthService _authService;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _authService.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
```

#### 2. データ暗号化

**Flutter Secure Storage**

```dart
// LocalStorageの代わり
final storage = FlutterSecureStorage();

// 保存
await storage.write(key: 'jobs', value: jsonEncode(jobs));

// 読み込み
final jobsJson = await storage.read(key: 'jobs');
final jobs = jsonDecode(jobsJson);
```

#### 3. HTTPS必須化

**本番環境:**
- SSL証明書（Let's Encrypt推奨）
- HSTS有効化
- すべてのHTTPをHTTPSにリダイレクト

**Spring Boot設定:**
```yaml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_PASSWORD}
    key-store-type: PKCS12
```

#### 4. 入力バリデーション

**バックエンド（Bean Validation）**
```java
public class ShiftRequest {
    @NotNull
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
    private String date;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String startTime;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String endTime;
}
```

**フロントエンド（Flutter）**
```dart
String? validateTime(String? value) {
  if (value == null || value.isEmpty) {
    return '時刻を入力してください';
  }
  final regex = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');
  if (!regex.hasMatch(value)) {
    return '正しい時刻形式で入力してください (HH:mm)';
  }
  return null;
}
```

---

## デプロイメント

### 現在（開発環境）

**フロントエンド:**
```bash
cd frontend
npm run dev
# http://localhost:5173
```

**バックエンド:**
```bash
cd backend/ss
mvn spring-boot:run
# http://localhost:8080
```

### 将来（本番環境）

#### フロントエンド（Vue Web）

**Netlify / Vercel**
```bash
npm run build
# dist/ をデプロイ
```

#### フロントエンド（Flutter）

**Android:**
```bash
flutter build apk --release
# build/app/outputs/flutter-apk/app-release.apk
# → Google Play Console にアップロード
```

**iOS:**
```bash
flutter build ipa --release
# build/ios/archive/Runner.xcarchive
# → App Store Connect にアップロード
```

**Web:**
```bash
flutter build web --release
# build/web/ をFirebase Hosting / Netlifyにデプロイ
```

#### バックエンド

**AWS / GCP / Heroku**

**Dockerコンテナ化:**
```dockerfile
FROM eclipse-temurin:21-jre
COPY target/ss-0.0.1-SNAPSHOT.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**Docker Compose（開発環境）:**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend/ss
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/ssmanager
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ssmanager
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### CI/CD

**GitHub Actions**
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter test

  build-android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build apk --release
      - uses: actions/upload-artifact@v3
        with:
          name: apk
          path: build/app/outputs/flutter-apk/app-release.apk
```

---

## パフォーマンス最適化

### フロントエンド

**Vue 3:**
- Lazy Loading（ルートベース）
- Virtual Scrolling（大量データ表示時）
- Memoization（算出プロパティ）

**Flutter:**
- `const` コンストラクタ活用
- `ListView.builder` による遅延レンダリング
- Image Caching
- Code Splitting（Deferred Loading）

### バックエンド

**Spring Boot:**
- データベースインデックス最適化
- キャッシング（Redis）
- ページネーション
- 非同期処理（`@Async`）

---

## モニタリング・ログ

### ログ管理

**Spring Boot:**
```java
@Slf4j
@RestController
public class ShiftController {
    public ResponseEntity<?> submitShift(@RequestBody ShiftRequest request) {
        log.info("Shift submitted: userId={}, date={}", userId, request.getDate());
        // ...
    }
}
```

**Flutter:**
```dart
import 'package:logger/logger.dart';

final logger = Logger();

void submitShift() {
  logger.i('Submitting shift: $shiftData');
  // ...
}
```

### エラートラッキング

**Sentry / Firebase Crashlytics**
```dart
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'YOUR_DSN';
    },
    appRunner: () => runApp(MyApp()),
  );
}
```

---

## 補足事項

### ブラウザ/OSサポート

**現在（Vue 3）:**
- Chrome, Firefox, Safari, Edge（最新版）
- iOS Safari, Android Chrome
- IE11非対応

**将来（Flutter）:**
- Android 5.0+ (API Level 21+)
- iOS 12.0+
- Web: 全モダンブラウザ
- Desktop: Windows 10+, macOS 10.14+, Linux

### 開発環境セットアップ

**現在:**
```bash
# フロントエンド
cd frontend
npm install
npm run dev

# バックエンド
cd backend/ss
mvn clean install
mvn spring-boot:run
```

**将来（Flutter）:**
```bash
flutter pub get
flutter run -d chrome  # Web
flutter run -d android # Android
flutter run -d ios     # iOS
```

---

**作成者:** Claude (AI Assistant)
**レビュー状況:** 要レビュー
**次回更新予定:** Flutter移行開始時
