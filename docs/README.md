# S×S Manager 設計書

**プロジェクト名:** S×S Manager (Shift Schedule Manager)
**バージョン:** 1.0.0
**作成日:** 2025-01-09
**作成者:** Claude (AI Assistant)

---

## 📋 目次

このディレクトリには、S×S Managerアプリケーションの包括的な設計書が含まれています。

| No | ドキュメント | 説明 | ステータス |
|----|------------|------|----------|
| 01 | [データモデル設計書](01_DATA_MODEL_DESIGN.md) | エンティティ、型定義、バリデーションルール | ✅ 完成 |
| 02 | [API仕様書](02_API_SPECIFICATION.md) | REST APIエンドポイント、リクエスト/レスポンス | ✅ 完成 |
| 03 | [画面遷移図・機能一覧](03_SCREEN_FLOW_AND_FEATURES.md) | 画面フロー、UI/UX仕様 | ✅ 完成 |
| 04 | [ビジネスロジック仕様書](04_BUSINESS_LOGIC_SPECIFICATION.md) | 計算ロジック、バリデーション、競合検出 | ✅ 完成 |
| 05 | [技術アーキテクチャ設計書](05_TECHNICAL_ARCHITECTURE.md) | システム構成、技術スタック、デプロイ | ✅ 完成 |

---

## 🎯 プロジェクト概要

### アプリケーション名
**S×S Manager (Shift Schedule Manager)**

### 目的
複数のアルバイト先を掛け持ちする従業員向けのシフト管理アプリケーション

### 主要機能
1. **カレンダー選択**: 直感的な日付選択UI
2. **掛け持ち管理**: 最大4つのジョブを蛍光色で視覚的に管理
3. **時間設定**: 一括設定と個別設定の両対応
4. **競合検出**: 異なるジョブ間の時間重複を自動検出
5. **統計表示**: 勤務日数・時間の自動計算

### 対象ユーザー
- **従業員**: シフト希望を提出
- **管理者** (将来実装): シフト承認・集計・レポート

---

## 📚 ドキュメント概要

### 01. データモデル設計書

**主な内容:**
- エンティティ関連図（ER図）
- 11種類のエンティティ詳細
- TypeScript型定義
- バリデーションルール
- データフロー図

**重要エンティティ:**
- `CalendarState`: カレンダー状態管理
- `WorkDay`: 勤務日の詳細情報
- `Job`: 掛け持ちジョブ情報
- `ConflictInfo`: 時間競合情報

**参照:** [01_DATA_MODEL_DESIGN.md](01_DATA_MODEL_DESIGN.md)

---

### 02. API仕様書

**主な内容:**
- 認証API (JWT)
- 従業員API (シフト提出・取得)
- 管理者API (承認・統計・レポート)
- エラーハンドリング
- レート制限

**主要エンドポイント:**
```
POST /api/auth/login           - ログイン
POST /api/shifts               - シフト提出
GET  /api/shifts/me            - 自分のシフト取得
GET  /api/admin/shifts         - 全シフト取得 (管理者)
POST /api/admin/shifts/:id/approve - シフト承認
GET  /api/admin/statistics     - 統計データ取得
```

**参照:** [02_API_SPECIFICATION.md](02_API_SPECIFICATION.md)

---

### 03. 画面遷移図・機能一覧

**主な内容:**
- 従業員モード画面フロー
- 管理者モード画面フロー (将来)
- 5つの主要画面詳細
- 共通コンポーネント仕様

**従業員画面:**
1. ホーム → 2. カレンダー → 3. 時間登録 → 4. 確認 → 5. 履歴

**管理者画面 (将来):**
1. ダッシュボード → 2. 全シフト → 3. 承認待ち → 4. 集計 → 5. 従業員管理

**参照:** [03_SCREEN_FLOW_AND_FEATURES.md](03_SCREEN_FLOW_AND_FEATURES.md)

---

### 04. ビジネスロジック仕様書

**主な内容:**
- 日付選択ロジック (本店/掛け持ちモード)
- 時間計算ロジック (日跨ぎ対応)
- 時間競合検出アルゴリズム (O(N)最適化)
- 一括設定ロジック (曜日・週フィルター)
- ジョブ管理ロジック

**重要アルゴリズム:**
```typescript
// 時間競合検出: O(N) for日付グループ化 + O(M²) for日付内比較
function detectConflicts(workDays: WorkDay[]): ConflictInfo[]

// 勤務時間計算: 日跨ぎ対応
function calculateWorkMinutes(startTime, endTime): number

// 週番号計算: 月の第何週かを算出
function getWeekNumber(dateString): number (1-6)
```

**参照:** [04_BUSINESS_LOGIC_SPECIFICATION.md](04_BUSINESS_LOGIC_SPECIFICATION.md)

---

### 05. 技術アーキテクチャ設計書

**主な内容:**
- 現在のVue 3 + Spring Bootアーキテクチャ
- 将来のFlutter + Spring Bootアーキテクチャ
- ディレクトリ構成 (Feature-first)
- 技術スタック比較
- セキュリティ実装計画
- デプロイメント戦略

**現在の技術スタック:**
```
Frontend: Vue 3 + TypeScript + Vite + Pinia
Backend:  Spring Boot 3.5.7 + Java 21
```

**将来の技術スタック:**
```
Frontend: Flutter + Dart + Riverpod
Backend:  Spring Boot 3.5.7 + Java 21 (同じ)
```

**参照:** [05_TECHNICAL_ARCHITECTURE.md](05_TECHNICAL_ARCHITECTURE.md)

---

## 🚀 設計書の使い方

### Flutter移行時の手順

1. **データモデル設計書を参照**
   - TypeScript型定義 → Dart クラス変換
   - `CalendarState`, `WorkDay`, `Job` など

2. **ビジネスロジック仕様書を参照**
   - 既存ロジックをDartに移植
   - `calculateWorkMinutes()`, `checkTimeOverlap()` など

3. **画面遷移図を参照**
   - 画面構成とナビゲーションを実装
   - `CalendarScreen`, `TimeRegisterScreen` など

4. **API仕様書を参照**
   - DioでHTTP通信実装
   - リクエスト/レスポンスモデル作成

5. **技術アーキテクチャ設計書を参照**
   - Clean Architecture + Riverpodで構築
   - ディレクトリ構成に従う

### バックエンド実装時の手順

1. **API仕様書を参照**
   - Spring Bootコントローラー実装
   - エンドポイント・バリデーション定義

2. **データモデル設計書を参照**
   - JPA Entityクラス作成
   - データベーススキーマ設計

3. **技術アーキテクチャ設計書を参照**
   - Spring Security + JWT実装
   - レイヤー分離 (Controller → Service → Repository)

---

## 📊 プロジェクト進捗

### フェーズ1: 従業員機能（現在）

| 機能 | 実装状況 | テスト | ドキュメント |
|------|---------|-------|------------|
| カレンダー選択 | ✅ 完了 | ❌ 未実施 | ✅ 完了 |
| 時間登録 | ✅ 完了 | ❌ 未実施 | ✅ 完了 |
| 確認画面 | ✅ 完了 | ❌ 未実施 | ✅ 完了 |
| 掛け持ち管理 | ✅ 完了 | ❌ 未実施 | ✅ 完了 |
| 時間競合検出 | ✅ 完了 | ❌ 未実施 | ✅ 完了 |
| 履歴画面 | 🔶 部分実装 | ❌ 未実施 | ✅ 完了 |

### フェーズ2: バックエンド・認証（計画中）

| 機能 | 実装状況 | テスト | ドキュメント |
|------|---------|-------|------------|
| ユーザー認証 | ❌ 未実装 | ❌ 未実施 | ✅ 完了 |
| シフト提出API | ❌ 未実装 | ❌ 未実施 | ✅ 完了 |
| データベース連携 | ❌ 未実装 | ❌ 未実施 | ✅ 完了 |

### フェーズ3: 管理者機能（計画中）

| 機能 | 実装状況 | テスト | ドキュメント |
|------|---------|-------|------------|
| ダッシュボード | ❌ 未実装 | ❌ 未実施 | ✅ 完了 |
| シフト承認 | ❌ 未実装 | ❌ 未実施 | ✅ 完了 |
| 集計・統計 | ❌ 未実装 | ❌ 未実施 | ✅ 完了 |
| レポート出力 | ❌ 未実装 | ❌ 未実施 | ✅ 完了 |

### フェーズ4: Flutter移行（計画中）

| タスク | 状況 | 予定期間 |
|-------|------|---------|
| Flutter学習 | ❌ 未着手 | 2週間 |
| データモデル移植 | ❌ 未着手 | 1週間 |
| UI実装 | ❌ 未着手 | 2ヶ月 |
| テスト実装 | ❌ 未着手 | 2週間 |
| リリース準備 | ❌ 未着手 | 2週間 |

---

## 🔧 開発環境セットアップ

### 必要な環境

**現在（Vue 3）:**
- Node.js 18+
- npm 9+
- Java 21
- Maven 3.8+

**将来（Flutter）:**
- Flutter SDK 3.x+
- Dart 3.x+
- Android Studio / VS Code
- Xcode (iOS開発の場合)

### クイックスタート

**フロントエンド:**
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

**バックエンド:**
```bash
cd backend/ss
mvn clean install
mvn spring-boot:run
# http://localhost:8080
```

---

## 📝 設計書更新ガイドライン

### 更新が必要なタイミング

1. **新機能追加時**
   - 画面追加 → `03_SCREEN_FLOW_AND_FEATURES.md` 更新
   - API追加 → `02_API_SPECIFICATION.md` 更新
   - データモデル変更 → `01_DATA_MODEL_DESIGN.md` 更新

2. **技術スタック変更時**
   - `05_TECHNICAL_ARCHITECTURE.md` 更新

3. **ビジネスルール変更時**
   - `04_BUSINESS_LOGIC_SPECIFICATION.md` 更新

### 更新手順

1. 該当ドキュメントを編集
2. **最終更新日**を変更
3. **バージョン履歴**を追記（必要に応じて）
4. Git コミット

---

## 🤝 貢献

設計書の改善提案や誤字脱字の修正は、以下の手順で行ってください：

1. Issueを作成（問題点の説明）
2. Pull Requestを作成（修正内容）
3. レビュー・マージ

---

## 📄 ライセンス

このプロジェクトのライセンス情報は、ルートディレクトリの`LICENSE`ファイルを参照してください。

---

## 📞 連絡先

プロジェクトに関する質問や提案は、以下までご連絡ください：

- **プロジェクトオーナー:** [要記入]
- **開発チーム:** [要記入]
- **Email:** [要記入]

---

## 📚 参考資料

### 技術ドキュメント

**Vue 3:**
- [Vue 3公式ドキュメント](https://vuejs.org/)
- [Pinia公式ドキュメント](https://pinia.vuejs.org/)

**Flutter:**
- [Flutter公式ドキュメント](https://flutter.dev/docs)
- [Riverpod公式ドキュメント](https://riverpod.dev/)

**Spring Boot:**
- [Spring Boot公式ドキュメント](https://spring.io/projects/spring-boot)
- [Spring Security公式ドキュメント](https://spring.io/projects/spring-security)

### 設計パターン

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [MVVM Pattern](https://docs.microsoft.com/en-us/xamarin/xamarin-forms/enterprise-application-patterns/mvvm)
- [Repository Pattern](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)

---

**最終更新:** 2025-01-09
**作成者:** Claude (AI Assistant)
**レビュー状況:** 要レビュー
