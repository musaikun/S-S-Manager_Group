# Flutter カレンダー日付選択機能 - 再現仕様書

## 📋 目次
1. [機能概要](#機能概要)
2. [UI/UX仕様](#uiux仕様)
3. [データ構造](#データ構造)
4. [状態管理](#状態管理)
5. [主要機能](#主要機能)
6. [Flutter実装推奨パッケージ](#flutter実装推奨パッケージ)
7. [実装優先順位](#実装優先順位)

---

## 機能概要

### システム概要
シフト管理用のカレンダー日付選択システム。本店に加えて最大4つの掛け持ち先を同時管理できる高機能カレンダーコンポーネント。

### 主要機能
- ✅ 7x6グリッド形式の月次カレンダー表示
- ✅ 複数日付の選択/解除（トグル）
- ✅ 一括選択機能（全日、平日のみ、曜日別）
- ✅ 掛け持ち店舗管理（最大4店舗 + 本店）
- ✅ 祝日自動判定と表示
- ✅ 過去日付の選択制限
- ✅ 前月データのコピー機能
- ✅ テンプレート保存/読込
- ✅ LocalStorage永続化

---

## UI/UX仕様

### 画面レイアウト構成

```
┌─────────────────────────────────────────┐
│  【選択中のジョブバナー】                  │ ← Sticky固定
│  🟨 蛍光色表示 + ジョブ名                  │
├─────────────────────────────────────────┤
│  [今月] [来月]  月選択ボタン              │
├─────────────────────────────────────────┤
│  ▼ 掛け持ち店舗管理                       │ ← アコーディオン
│    [本店] [店舗1] [店舗2] [店舗3] [店舗4]  │
├─────────────────────────────────────────┤
│  [全日選択] [平日全選択] [クリア]         │ ← 一括操作
├─────────────────────────────────────────┤
│  [日] [月] [火] [水] [木] [金] [土]       │ ← 曜日別選択
├─────────────────────────────────────────┤
│                                         │
│   日  月  火  水  木  金  土              │
│  ┌───┬───┬───┬───┬───┬───┬───┐   │
│  │   │   │ 1 │ 2 │ 3 │ 4 │ 5 │   │
│  ├───┼───┼───┼───┼───┼───┼───┤   │
│  │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │   │ ← 7x6グリッド
│  ├───┼───┼───┼───┼───┼───┼───┤   │
│  │13 │14 │15 │16 │17 │18 │19 │   │
│  ├───┼───┼───┼───┼───┼───┼───┤   │
│  │20 │21 │22 │23 │24 │25 │26 │   │
│  ├───┼───┼───┼───┼───┼───┼───┤   │
│  │27 │28 │29 │30 │31 │   │   │   │
│  └───┴───┴───┴───┴───┴───┴───┘   │
│                                         │
├─────────────────────────────────────────┤
│  📊 選択日数: 15日                        │ ← 統計情報
│  （平日: 10日 / 休日: 5日）              │
└─────────────────────────────────────────┘
```

### セルの状態表示

#### カラースキーム

| 状態 | 背景色 | 文字色 | 備考 |
|------|--------|--------|------|
| **デフォルト** | `#1A1A1A` | `#FFFFFF` | 未選択の当月日付 |
| **選択済み** | `linear-gradient(135deg, #10B981, #059669)` | `#FFFFFF` | 選択された日付 |
| **今日** | 境界線 `#8B5CF6` (紫) 3px | `#FFFFFF` | 本日 |
| **過去** | `#2D2D2D` | `#6B7280` | 選択不可、クリック無効 |
| **他の月** | `#0F0F0F` | `#4B5563` | 前月/翌月の日付 |
| **祝日** | 背景色そのまま | `#EF4444` (赤) | 祝日名を下部に表示 |
| **土曜日** | 背景色そのまま | `#60A5FA` (水色) | - |
| **日曜日** | 背景色そのまま | `#EF4444` (赤) | - |
| **カスタム時間** | `#FCD34D` (黄色) | `#000000` | 個別時間設定済み |
| **一括設定** | `#60A5FA` (青) | `#000000` | 一括時間設定済み |

#### ジョブドット表示

```
┌─────────────┐
│     15      │ ← 日付
│  ● ● ● ●   │ ← ジョブドット（最大4個）
│   +本店      │ ← 本店マーク（選択時）
└─────────────┘
```

- **ドット配置**: セル下部に水平配置
- **ドット色**: 各ジョブの蛍光色
  - Job 1: `#FFFF00` (蛍光黄色)
  - Job 2: `#39FF14` (蛍光緑)
  - Job 3: `#FF10F0` (蛍光ピンク)
  - Job 4: `#00FFFF` (蛍光水色)
- **ドットサイズ**: 直径8px
- **本店表示**: 小さなテキスト「本店」または専用アイコン

### インタラクション

#### タップ動作
- **通常セル**: タップで選択/解除をトグル
- **過去日付**: タップ無効、半透明表示
- **長押し**: 日付詳細ダイアログ表示（オプション）

#### フィードバック
- **タップ時**: リップル効果
- **選択時**: 0.2秒のアニメーション（スケール＆フェード）
- **一括選択時**: 連続アニメーション（上から下へ順次）

#### 確認ダイアログ
以下の操作時にモーダル確認:
- 全日クリア
- 時間設定済み日付の削除

---

## データ構造

### 1. CalendarState（状態管理のコア）

```dart
class CalendarState {
  // 年月管理
  int currentYear;           // 現在の年
  int currentMonth;          // 現在の月 (1-12)

  // 日付選択管理
  Set<String> selectedDates;      // 本店の選択日付 Set (ISO 8601)
  Map<String, Set<int>> dateJobMap;  // ジョブ別日付マッピング

  // ジョブ管理
  List<Job> jobs;                 // 掛け持ち店舗リスト（最大4つ）
  int? currentJobId;              // 選択中のジョブID (null=本店)
  String mainStoreName;           // 本店名

  // 祝日データ
  Map<String, String> holidays;   // 日付 => 祝日名
  DateTime? holidaysCacheDate;    // キャッシュ取得日時

  // テンプレート
  CalendarTemplate? savedTemplate;
  List<String>? previousMonthData;

  // デフォルト時間設定（オプション）
  TimeSettings? defaultTimes;
}
```

### 2. Job（掛け持ち店舗）

```dart
class Job {
  final int id;              // 1-4
  String name;               // 店舗名（14文字まで）
  Color color;               // 蛍光色（固定）
  bool isActive;             // アクティブ状態

  Job({
    required this.id,
    required this.name,
    required this.color,
    this.isActive = true,
  });
}

// 蛍光色の固定マッピング
const Map<int, Color> jobColors = {
  1: Color(0xFFFFFF00),  // 蛍光黄色
  2: Color(0xFF39FF14),  // 蛍光緑
  3: Color(0xFFFF10F0),  // 蛍光ピンク
  4: Color(0xFF00FFFF),  // 蛍光水色
};
```

### 3. CalendarCell（セル情報）

```dart
class CalendarCell {
  final DateTime date;           // Dateオブジェクト
  final String dateString;       // 'YYYY-MM-DD'形式
  final int dayOfWeek;           // 1(月)〜7(日) ※Dart基準
  final bool isCurrentMonth;     // 当月フラグ
  final bool isToday;            // 本日フラグ
  final bool isPast;             // 過去フラグ
  final bool isHoliday;          // 祝日フラグ
  final String? holidayName;     // 祝日名

  // 選択状態（計算プロパティ）
  bool isSelected;               // 選択フラグ
  Set<int> jobIds;               // このセルに設定されたジョブID群
  bool hasMainStore;             // 本店選択フラグ

  CalendarCell({
    required this.date,
    required this.dateString,
    required this.dayOfWeek,
    required this.isCurrentMonth,
    required this.isToday,
    required this.isPast,
    required this.isHoliday,
    this.holidayName,
    this.isSelected = false,
    Set<int>? jobIds,
    this.hasMainStore = false,
  }) : jobIds = jobIds ?? {};
}
```

### 4. CalendarTemplate（テンプレート）

```dart
class CalendarTemplate {
  final String name;                   // テンプレート名
  final List<String> selectedDates;    // 本店の選択パターン
  final Map<String, Set<int>> dateJobMap;  // ジョブのパターン
  final DateTime createdAt;            // 作成日時

  CalendarTemplate({
    required this.name,
    required this.selectedDates,
    required this.dateJobMap,
    required this.createdAt,
  });
}
```

### 5. 日付形式

```dart
// ISO 8601形式を使用
String dateString = '2026-01-18';

// 変換ヘルパー
String formatDateString(DateTime date) {
  return '${date.year.toString().padLeft(4, '0')}-'
         '${date.month.toString().padLeft(2, '0')}-'
         '${date.day.toString().padLeft(2, '0')}';
}

DateTime parseDateString(String str) {
  return DateTime.parse(str);
}
```

---

## 状態管理

### 推奨アプローチ: Riverpod または Provider

```dart
// 状態管理プロバイダーの構成例（Riverpod）

// CalendarStateNotifierProvider
final calendarProvider = StateNotifierProvider<CalendarNotifier, CalendarState>((ref) {
  return CalendarNotifier(ref);
});

// 計算済みプロパティプロバイダー
final calendarCellsProvider = Provider<List<CalendarCell>>((ref) {
  final state = ref.watch(calendarProvider);
  return generateCalendarCells(state);
});

final selectedCountProvider = Provider<int>((ref) {
  final state = ref.watch(calendarProvider);
  return state.selectedDates.length;
});

final weekdayCountProvider = Provider<int>((ref) {
  final cells = ref.watch(calendarCellsProvider);
  return cells.where((c) => c.dayOfWeek >= 1 && c.dayOfWeek <= 5).length;
});
```

### LocalStorage永続化

```dart
// SharedPreferences または Hive を使用

class CalendarRepository {
  static const String _selectedDatesKey = 'selectedDates';
  static const String _jobsKey = 'jobs';
  static const String _dateJobMapKey = 'dateJobMap';
  static const String _mainStoreNameKey = 'mainStoreName';
  static const String _holidaysCacheKey = 'holidays_cache';
  static const String _templateKey = 'calendarTemplate';

  Future<void> saveState(CalendarState state) async {
    final prefs = await SharedPreferences.getInstance();

    // selectedDatesをJSON配列として保存
    await prefs.setString(_selectedDatesKey,
      jsonEncode(state.selectedDates.toList()));

    // jobsをJSON配列として保存
    await prefs.setString(_jobsKey,
      jsonEncode(state.jobs.map((j) => j.toJson()).toList()));

    // dateJobMapをJSON保存
    await prefs.setString(_dateJobMapKey,
      jsonEncode(state.dateJobMap));

    // その他の値
    await prefs.setString(_mainStoreNameKey, state.mainStoreName);
  }

  Future<CalendarState?> loadState() async {
    final prefs = await SharedPreferences.getInstance();

    // 読み込みロジック...
  }
}
```

---

## 主要機能

### 1. 日付選択/解除（toggleDate）

```dart
void toggleDate(String dateString) {
  if (currentJobId == null) {
    // 本店モード
    if (selectedDates.contains(dateString)) {
      // 時間設定済みなら確認ダイアログ
      if (hasTimeSettings(dateString)) {
        showConfirmDialog(() {
          selectedDates.remove(dateString);
          removeTimeSettings(dateString);
        });
      } else {
        selectedDates.remove(dateString);
      }
    } else {
      selectedDates.add(dateString);
    }
  } else {
    // 掛け持ちモード
    dateJobMap.putIfAbsent(dateString, () => {});

    if (dateJobMap[dateString]!.contains(currentJobId)) {
      dateJobMap[dateString]!.remove(currentJobId);
      if (dateJobMap[dateString]!.isEmpty) {
        dateJobMap.remove(dateString);
      }
    } else {
      dateJobMap[dateString]!.add(currentJobId!);
    }
  }

  saveToLocalStorage();
  notifyListeners();
}
```

### 2. 一括選択機能

#### 全日選択
```dart
void selectAll() {
  showConfirmDialog(() {
    final cells = getCurrentMonthCells();

    for (final cell in cells) {
      if (!cell.isPast && cell.isCurrentMonth) {
        if (currentJobId == null) {
          selectedDates.add(cell.dateString);
        } else {
          dateJobMap.putIfAbsent(cell.dateString, () => {});
          dateJobMap[cell.dateString]!.add(currentJobId!);
        }
      }
    }

    saveToLocalStorage();
    notifyListeners();
  });
}
```

#### 平日のみ選択
```dart
void selectWeekdaysOnly() {
  final cells = getCurrentMonthCells();

  for (final cell in cells) {
    final isWeekday = cell.dayOfWeek >= 1 && cell.dayOfWeek <= 5;

    if (!cell.isPast && cell.isCurrentMonth && isWeekday && !cell.isHoliday) {
      if (currentJobId == null) {
        selectedDates.add(cell.dateString);
      } else {
        dateJobMap.putIfAbsent(cell.dateString, () => {});
        dateJobMap[cell.dateString]!.add(currentJobId!);
      }
    }
  }

  saveToLocalStorage();
  notifyListeners();
}
```

#### 曜日別選択
```dart
void selectByWeekday(int weekday) {
  // weekday: 1(月)〜7(日)
  final cells = getCurrentMonthCells();
  final targetCells = cells.where((c) =>
    c.dayOfWeek == weekday &&
    c.isCurrentMonth &&
    !c.isPast
  ).toList();

  // すべて選択済みならトグルで解除
  final allSelected = targetCells.every((c) => isDateSelected(c.dateString));

  for (final cell in targetCells) {
    if (allSelected) {
      removeDate(cell.dateString);
    } else {
      addDate(cell.dateString);
    }
  }

  saveToLocalStorage();
  notifyListeners();
}
```

#### 全クリア
```dart
void clearAll() {
  showConfirmDialog(() {
    if (currentJobId == null) {
      selectedDates.clear();
    } else {
      // 現在のジョブIDをすべての日付から削除
      for (final entry in dateJobMap.entries) {
        entry.value.remove(currentJobId);
      }
      // 空になったエントリを削除
      dateJobMap.removeWhere((key, value) => value.isEmpty);
    }

    saveToLocalStorage();
    notifyListeners();
  });
}
```

### 3. 掛け持ち店舗管理

```dart
class JobManager {
  List<Job> jobs = [];

  // ジョブ追加（最大4つ）
  Job? addJob(String name) {
    if (jobs.length >= 4) return null;

    final id = jobs.length + 1;
    final job = Job(
      id: id,
      name: name.substring(0, min(14, name.length)),
      color: jobColors[id]!,
    );

    jobs.add(job);
    saveToLocalStorage();
    return job;
  }

  // ジョブ削除
  void removeJob(int jobId) {
    showConfirmDialog(() {
      jobs.removeWhere((j) => j.id == jobId);

      // dateJobMapから該当ジョブを削除
      for (final entry in dateJobMap.entries) {
        entry.value.remove(jobId);
      }
      dateJobMap.removeWhere((key, value) => value.isEmpty);

      saveToLocalStorage();
      notifyListeners();
    });
  }

  // ジョブ名変更
  void renameJob(int jobId, String newName) {
    final job = jobs.firstWhere((j) => j.id == jobId);
    job.name = newName.substring(0, min(14, newName.length));

    saveToLocalStorage();
    notifyListeners();
  }

  // ジョブ切り替え
  void switchJob(int? jobId) {
    currentJobId = jobId;
    notifyListeners();
  }
}
```

### 4. 祝日管理

```dart
class HolidayService {
  static const String apiUrl = 'https://holidays-jp.github.io/api/v1/date.json';
  static const Duration cacheExpiry = Duration(days: 7);

  Future<Map<String, String>> fetchHolidaysWithCache() async {
    final prefs = await SharedPreferences.getInstance();

    // キャッシュチェック
    final cacheDate = prefs.getString('holidays_cache_date');
    final cacheData = prefs.getString('holidays_cache');

    if (cacheDate != null && cacheData != null) {
      final cached = DateTime.parse(cacheDate);
      if (DateTime.now().difference(cached) < cacheExpiry) {
        return Map<String, String>.from(jsonDecode(cacheData));
      }
    }

    // API取得
    try {
      final response = await http.get(Uri.parse(apiUrl));
      if (response.statusCode == 200) {
        final data = Map<String, String>.from(jsonDecode(response.body));

        // キャッシュ保存
        await prefs.setString('holidays_cache_date', DateTime.now().toIso8601String());
        await prefs.setString('holidays_cache', jsonEncode(data));

        return data;
      }
    } catch (e) {
      print('Failed to fetch holidays: $e');
    }

    return {};
  }

  bool isHoliday(String dateString, Map<String, String> holidays) {
    return holidays.containsKey(dateString);
  }

  String? getHolidayName(String dateString, Map<String, String> holidays) {
    return holidays[dateString];
  }
}
```

### 5. 月の切り替え

```dart
void changeMonth(int delta) {
  currentMonth += delta;

  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  } else if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  }

  notifyListeners();
}

void goToThisMonth() {
  final now = DateTime.now();
  currentYear = now.year;
  currentMonth = now.month;
  notifyListeners();
}

void goToNextMonth() {
  changeMonth(1);
}

void goToPreviousMonth() {
  changeMonth(-1);
}
```

### 6. カレンダーセル生成

```dart
List<CalendarCell> generateCalendarCells(CalendarState state) {
  final firstDay = DateTime(state.currentYear, state.currentMonth, 1);
  final lastDay = DateTime(state.currentYear, state.currentMonth + 1, 0);

  // 月の最初の日の曜日（1=月, 7=日）
  int firstWeekday = firstDay.weekday;

  // グリッドの開始日（前月の日付を含む）
  final startDate = firstDay.subtract(Duration(days: firstWeekday - 1));

  // 7x6=42セル生成
  List<CalendarCell> cells = [];
  for (int i = 0; i < 42; i++) {
    final date = startDate.add(Duration(days: i));
    final dateString = formatDateString(date);

    cells.add(CalendarCell(
      date: date,
      dateString: dateString,
      dayOfWeek: date.weekday,
      isCurrentMonth: date.month == state.currentMonth,
      isToday: isSameDay(date, DateTime.now()),
      isPast: date.isBefore(DateTime.now()) && !isSameDay(date, DateTime.now()),
      isHoliday: state.holidays.containsKey(dateString),
      holidayName: state.holidays[dateString],
      isSelected: isDateSelected(state, dateString),
      jobIds: state.dateJobMap[dateString]?.toSet() ?? {},
      hasMainStore: state.selectedDates.contains(dateString),
    ));
  }

  return cells;
}

bool isSameDay(DateTime a, DateTime b) {
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

bool isDateSelected(CalendarState state, String dateString) {
  if (state.currentJobId == null) {
    return state.selectedDates.contains(dateString);
  } else {
    return state.dateJobMap[dateString]?.contains(state.currentJobId) ?? false;
  }
}
```

### 7. 前月データコピー

```dart
void copyPreviousMonth() {
  if (previousMonthData == null || previousMonthData!.isEmpty) {
    showSnackBar('前月のデータがありません');
    return;
  }

  // 前月の選択パターンを取得
  final prevDates = previousMonthData!.map((d) => parseDateString(d)).toList();

  // 日付を現在の月にマッピング
  final currentMonthDays = DateTime(currentYear, currentMonth + 1, 0).day;

  for (final prevDate in prevDates) {
    final day = prevDate.day;

    // 現在の月に該当日が存在する場合のみ追加
    if (day <= currentMonthDays) {
      final newDate = DateTime(currentYear, currentMonth, day);
      final dateString = formatDateString(newDate);

      if (!newDate.isBefore(DateTime.now())) {
        if (currentJobId == null) {
          selectedDates.add(dateString);
        } else {
          dateJobMap.putIfAbsent(dateString, () => {});
          dateJobMap[dateString]!.add(currentJobId!);
        }
      }
    }
  }

  saveToLocalStorage();
  notifyListeners();
  showSnackBar('前月のパターンを適用しました');
}

// 月末に前月データを保存
void saveCurrentMonthAsTemplate() {
  if (currentJobId == null) {
    previousMonthData = selectedDates.toList();
  } else {
    // ジョブモードの場合は現在のジョブの選択のみ
    previousMonthData = dateJobMap.entries
      .where((e) => e.value.contains(currentJobId))
      .map((e) => e.key)
      .toList();
  }

  saveToLocalStorage();
}
```

---

## Flutter実装推奨パッケージ

### 必須パッケージ

```yaml
dependencies:
  flutter:
    sdk: flutter

  # 状態管理
  flutter_riverpod: ^2.4.0          # または provider: ^6.1.0

  # ローカルストレージ
  shared_preferences: ^2.2.0        # または hive: ^2.2.3

  # HTTP通信
  http: ^1.1.0                      # または dio: ^5.3.0

  # 日付処理
  intl: ^0.18.0                     # 日付フォーマット

  # UI拡張
  flutter_hooks: ^0.20.0            # (オプション) UIロジック簡素化

dev_dependencies:
  # テスト
  flutter_test:
    sdk: flutter
  mockito: ^5.4.0

  # コード生成
  build_runner: ^2.4.0
  freezed: ^2.4.0                   # (オプション) Immutableクラス生成
  json_serializable: ^6.7.0         # JSON自動変換
```

### カレンダーグリッドUIの実装方法

```dart
// GridViewを使った実装例
Widget buildCalendarGrid(List<CalendarCell> cells) {
  return GridView.builder(
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 7,
      childAspectRatio: 1.0,
      crossAxisSpacing: 4,
      mainAxisSpacing: 4,
    ),
    itemCount: 42,
    itemBuilder: (context, index) {
      return CalendarCellWidget(cell: cells[index]);
    },
  );
}
```

---

## 実装優先順位

### フェーズ1: 基本カレンダー（MVP）
**目標**: 単一ジョブの日付選択機能

- [x] データ構造の定義（CalendarState, CalendarCell）
- [x] 状態管理の実装（Riverpod/Provider）
- [x] 7x6グリッドカレンダーUI
- [x] 日付選択/解除（toggleDate）
- [x] 今日の強調表示
- [x] 過去日付の制限
- [x] LocalStorage保存/読込
- [x] 月の切り替え

**成果物**: 基本的な日付選択カレンダー

---

### フェーズ2: 一括操作機能
**目標**: UXの向上

- [x] 全日選択
- [x] 平日のみ選択
- [x] 曜日別選択（7つのボタン）
- [x] 全クリア（確認ダイアログ付き）
- [x] 選択日数の統計表示
- [x] アニメーション効果

**成果物**: 実用的な一括操作機能

---

### フェーズ3: 祝日対応
**目標**: 日本の祝日への対応

- [x] 祝日API統合
- [x] キャッシュ機能（7日間）
- [x] 祝日表示（赤文字 + 名称）
- [x] 平日選択時の祝日除外

**成果物**: 祝日対応カレンダー

---

### フェーズ4: 掛け持ち機能（高度）
**目標**: 複数店舗の同時管理

- [x] Jobデータ構造
- [x] 掛け持ち店舗管理UI（JobManager）
- [x] dateJobMapによる管理
- [x] ジョブドット表示
- [x] ジョブ切り替え機能
- [x] 蛍光色バナー

**成果物**: 掛け持ち対応カレンダー

---

### フェーズ5: テンプレート機能（オプション）
**目標**: 繰り返し入力の効率化

- [x] 前月データコピー
- [x] テンプレート保存/読込
- [x] テンプレート管理UI

**成果物**: テンプレート機能付きカレンダー

---

## 実装時の注意点

### パフォーマンス最適化
1. **Riverpodの選択的監視**: 必要な部分のみ `watch` する
2. **メモ化**: `useMemoized` や `select` を活用
3. **不要な再描画防止**: `ConsumerWidget` より `Consumer` を局所的に使用

### アクセシビリティ
1. **Semanticsラベル**: 日付セルに適切なラベルを付与
2. **タップターゲットサイズ**: 最小44x44ピクセル
3. **カラーコントラスト**: WCAG AAレベル準拠

### テスト戦略
1. **単体テスト**: 状態管理ロジック（toggleDate, selectAllなど）
2. **ウィジェットテスト**: カレンダーUI、タップ動作
3. **統合テスト**: LocalStorage永続化、祝日API

### エラーハンドリング
1. **祝日API失敗**: キャッシュフォールバック
2. **LocalStorage失敗**: インメモリ動作継続
3. **不正な日付**: バリデーション

---

## 参考: 元プロジェクトのファイル構成

```
frontend/src/
├── views/
│   ├── CalendarView.vue              (シフト入力用メインカレンダー)
│   └── ShiftCalendarView.vue         (シフト確認用カレンダー)
├── components/
│   └── JobManager.vue                (掛け持ち店舗管理)
├── stores/
│   ├── calendar.ts                   (Piniaストア: 日付+ジョブ管理)
│   └── timeRegister.ts               (Piniaストア: 時間管理)
├── composables/
│   ├── useCalendar.ts                (カレンダーロジック)
│   └── useHolidays.ts                (祝日管理)
├── types/
│   ├── calendar.ts                   (型定義)
│   └── timeRegister.ts               (型定義)
└── utils/
    └── dateUtils.ts                  (日付ユーティリティ)
```

**対応するFlutter構成案:**

```
lib/
├── features/
│   └── calendar/
│       ├── presentation/
│       │   ├── pages/
│       │   │   └── calendar_page.dart
│       │   ├── widgets/
│       │   │   ├── calendar_grid.dart
│       │   │   ├── calendar_cell.dart
│       │   │   ├── job_selector.dart
│       │   │   └── action_buttons.dart
│       │   └── providers/
│       │       └── calendar_provider.dart
│       ├── domain/
│       │   ├── models/
│       │   │   ├── calendar_state.dart
│       │   │   ├── calendar_cell.dart
│       │   │   └── job.dart
│       │   └── repositories/
│       │       └── calendar_repository.dart
│       └── data/
│           ├── repositories/
│           │   └── calendar_repository_impl.dart
│           └── services/
│               ├── holiday_service.dart
│               └── local_storage_service.dart
└── core/
    └── utils/
        └── date_utils.dart
```

---

## まとめ

この仕様書は、既存のVue 3プロジェクトから抽出したカレンダー日付選択機能の完全な再現ガイドです。

**主要な実装ポイント:**
1. ✅ 7x6グリッドの月次カレンダー
2. ✅ 本店 + 最大4掛け持ち先の同時管理
3. ✅ 祝日自動判定（API + キャッシュ）
4. ✅ 一括選択機能（全日/平日/曜日別）
5. ✅ LocalStorage永続化
6. ✅ 過去日付の選択制限

**推奨実装順序:**
フェーズ1（基本）→ フェーズ2（一括操作）→ フェーズ3（祝日）→ フェーズ4（掛け持ち）→ フェーズ5（テンプレート）

別セッションで実装する際は、このドキュメントを参照しながら各フェーズを順次実装してください。
