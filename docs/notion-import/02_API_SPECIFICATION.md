# API仕様書

**プロジェクト:** S×S Manager (Shift Schedule Manager)
**バージョン:** 1.0.0
**作成日:** 2025-01-09
**最終更新:** 2026-01-09

---

## 目次

1. [概要](#概要)
2. [認証](#認証)
3. [エンドポイント一覧](#エンドポイント一覧)
4. [認証API](#認証api)
5. [従業員API](#従業員api)
6. [管理者API](#管理者api)
7. [共通API](#共通api)
8. [エラーハンドリング](#エラーハンドリング)
9. [レート制限](#レート制限)

---

## 概要

### ベースURL

```
開発環境: http://localhost:8080/api
本番環境: https://api.ss-manager.com/api (未定)
```

### データフォーマット

- **リクエスト:** JSON (Content-Type: application/json)
- **レスポンス:** JSON
- **日付形式:** ISO 8601 (`YYYY-MM-DD`)
- **時刻形式:** HH:mm (24時間制)
- **文字コード:** UTF-8

### HTTPメソッド

- `GET` - データ取得
- `POST` - データ作成
- `PUT` - データ更新（全体）
- `PATCH` - データ更新（部分）
- `DELETE` - データ削除

### ステータスコード

| コード | 意味 | 説明 |
|-------|------|------|
| 200 | OK | 成功 |
| 201 | Created | 作成成功 |
| 204 | No Content | 削除成功 |
| 400 | Bad Request | リクエストが不正 |
| 401 | Unauthorized | 認証が必要 |
| 403 | Forbidden | 権限不足 |
| 404 | Not Found | リソースが存在しない |
| 409 | Conflict | データ競合 |
| 422 | Unprocessable Entity | バリデーションエラー |
| 500 | Internal Server Error | サーバーエラー |

---

## 認証

### 認証方式

**JWT (JSON Web Token) ベース認証**

```
Authorization: Bearer <access_token>
```

### トークン構成

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### トークンリフレッシュ

- Access Token: 1時間有効
- Refresh Token: 30日有効
- リフレッシュエンドポイント: `POST /api/auth/refresh`

---

## エンドポイント一覧

### 認証API

| メソッド | エンドポイント | 説明 | 認証 |
|---------|---------------|------|------|
| POST | `/auth/register` | 新規登録 | 不要 |
| POST | `/auth/login` | ログイン | 不要 |
| POST | `/auth/logout` | ログアウト | 必要 |
| POST | `/auth/refresh` | トークンリフレッシュ | 不要 |
| POST | `/auth/password/reset` | パスワードリセット | 不要 |

### 従業員API

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/shifts/me` | 自分のシフト一覧取得 | EMPLOYEE |
| POST | `/shifts` | シフト提出 | EMPLOYEE |
| PUT | `/shifts/{id}` | シフト更新 | EMPLOYEE |
| DELETE | `/shifts/{id}` | シフト削除 | EMPLOYEE |
| GET | `/shifts/me/history` | シフト履歴取得 | EMPLOYEE |
| GET | `/shifts/me/conflicts` | 自分の時間競合取得 | EMPLOYEE |

### 管理者API

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/admin/shifts` | 全シフト取得 | MANAGER |
| GET | `/admin/shifts/pending` | 承認待ちシフト取得 | MANAGER |
| POST | `/admin/shifts/{id}/approve` | シフト承認 | MANAGER |
| POST | `/admin/shifts/{id}/reject` | シフト却下 | MANAGER |
| GET | `/admin/employees` | 従業員一覧取得 | MANAGER |
| POST | `/admin/employees` | 従業員追加 | MANAGER |
| PUT | `/admin/employees/{id}` | 従業員更新 | MANAGER |
| DELETE | `/admin/employees/{id}` | 従業員削除 | MANAGER |
| GET | `/admin/statistics` | 統計データ取得 | MANAGER |
| GET | `/admin/reports` | レポート取得 | MANAGER |
| POST | `/admin/reports/export` | レポートCSV出力 | MANAGER |

### 共通API

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/stores` | 店舗一覧取得 | ALL |
| GET | `/stores/{id}` | 店舗詳細取得 | ALL |
| GET | `/holidays` | 祝日データ取得 | ALL |
| GET | `/users/me` | 自分のプロフィール取得 | ALL |
| PUT | `/users/me` | プロフィール更新 | ALL |

---

## 認証API

### POST /auth/register - 新規登録

**リクエスト:**
```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "SecurePass123!",
  "role": "employee",
  "mainStoreId": "store_001"
}
```

**バリデーション:**
- `name`: 1-50文字
- `email`: 有効なメールアドレス形式
- `password`: 8文字以上、英数字記号混在
- `role`: "employee" または "manager"

**レスポンス (201 Created):**
```json
{
  "user": {
    "id": "user_001",
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "employee",
    "mainStoreId": "store_001",
    "createdAt": "2025-01-09T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

**エラーレスポンス (422):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "入力内容に誤りがあります",
  "details": [
    {
      "field": "email",
      "message": "このメールアドレスは既に登録されています"
    }
  ]
}
```

---

### POST /auth/login - ログイン

**リクエスト:**
```json
{
  "email": "yamada@example.com",
  "password": "SecurePass123!"
}
```

**レスポンス (200 OK):**
```json
{
  "user": {
    "id": "user_001",
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "employee",
    "mainStoreId": "store_001"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

**エラーレスポンス (401):**
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "メールアドレスまたはパスワードが間違っています"
}
```

---

### POST /auth/refresh - トークンリフレッシュ

**リクエスト:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**レスポンス (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

---

## 従業員API

### GET /shifts/me - 自分のシフト一覧取得

**クエリパラメータ:**
- `startDate` (optional): 開始日 (YYYY-MM-DD)
- `endDate` (optional): 終了日 (YYYY-MM-DD)
- `status` (optional): submitted, approved, rejected
- `storeId` (optional): 店舗ID

**リクエスト例:**
```
GET /api/shifts/me?startDate=2025-01-01&endDate=2025-01-31&status=approved
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**レスポンス (200 OK):**
```json
{
  "shifts": [
    {
      "id": "shift_001",
      "userId": "user_001",
      "storeId": "store_001",
      "storeName": "メイン店舗",
      "date": "2025-01-15",
      "dayOfWeek": 3,
      "startTime": "09:00",
      "endTime": "18:00",
      "workMinutes": 540,
      "breakMinutes": 60,
      "actualWorkMinutes": 480,
      "status": "approved",
      "jobId": null,
      "managerComment": null,
      "createdAt": "2025-01-09T10:00:00Z",
      "updatedAt": "2025-01-10T14:00:00Z"
    },
    {
      "id": "shift_002",
      "userId": "user_001",
      "storeId": "store_002",
      "storeName": "掛け持ち先A",
      "date": "2025-01-15",
      "dayOfWeek": 3,
      "startTime": "19:00",
      "endTime": "23:00",
      "workMinutes": 240,
      "breakMinutes": 0,
      "actualWorkMinutes": 240,
      "status": "submitted",
      "jobId": 1,
      "managerComment": null,
      "createdAt": "2025-01-09T10:05:00Z",
      "updatedAt": "2025-01-09T10:05:00Z"
    }
  ],
  "summary": {
    "totalShifts": 2,
    "totalWorkDays": 1,
    "totalWorkMinutes": 780,
    "totalActualWorkMinutes": 720,
    "totalBreakMinutes": 60
  }
}
```

---

### POST /shifts - シフト提出

**リクエスト:**
```json
{
  "shifts": [
    {
      "storeId": "store_001",
      "date": "2025-01-15",
      "startTime": "09:00",
      "endTime": "18:00",
      "jobId": null,
      "remarks": "通常勤務"
    },
    {
      "storeId": "store_002",
      "date": "2025-01-15",
      "startTime": "19:00",
      "endTime": "23:00",
      "jobId": 1,
      "remarks": null
    }
  ],
  "remarks": "今月は平日のみ希望"
}
```

**バリデーション:**
- 同じ日付・店舗の重複チェック
- 時間競合チェック（警告のみ、提出は可能）
- 過去日付のチェック（前日まで許可）

**レスポンス (201 Created):**
```json
{
  "message": "シフトを提出しました",
  "shifts": [
    {
      "id": "shift_001",
      "date": "2025-01-15",
      "storeId": "store_001",
      "status": "submitted"
    },
    {
      "id": "shift_002",
      "date": "2025-01-15",
      "storeId": "store_002",
      "status": "submitted"
    }
  ],
  "conflicts": [
    {
      "date": "2025-01-15",
      "message": "店舗間で時間が近接しています (18:00-19:00は移動可能か確認してください)"
    }
  ]
}
```

**エラーレスポンス (422):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "シフトデータが不正です",
  "details": [
    {
      "field": "shifts[0].date",
      "message": "過去の日付には提出できません"
    },
    {
      "field": "shifts[1].startTime",
      "message": "開始時刻が終了時刻より後です"
    }
  ]
}
```

---

### GET /shifts/me/conflicts - 時間競合取得

**クエリパラメータ:**
- `month` (optional): 対象月 (YYYY-MM)

**レスポンス (200 OK):**
```json
{
  "conflicts": [
    {
      "date": "2025-01-15",
      "shift1": {
        "id": "shift_001",
        "storeId": "store_001",
        "storeName": "メイン店舗",
        "startTime": "09:00",
        "endTime": "18:00"
      },
      "shift2": {
        "id": "shift_002",
        "storeId": "store_002",
        "storeName": "掛け持ち先A",
        "startTime": "17:00",
        "endTime": "23:00"
      },
      "overlap": {
        "startTime": "17:00",
        "endTime": "18:00",
        "durationMinutes": 60
      }
    }
  ]
}
```

---

## 管理者API

### GET /admin/shifts - 全シフト取得

**クエリパラメータ:**
- `storeId` (required): 店舗ID
- `startDate` (required): 開始日
- `endDate` (required): 終了日
- `status` (optional): submitted, approved, rejected
- `userId` (optional): 特定ユーザーのシフトのみ

**レスポンス (200 OK):**
```json
{
  "shifts": [
    {
      "id": "shift_001",
      "user": {
        "id": "user_001",
        "name": "山田太郎"
      },
      "storeId": "store_001",
      "date": "2025-01-15",
      "dayOfWeek": 3,
      "startTime": "09:00",
      "endTime": "18:00",
      "workMinutes": 540,
      "status": "submitted",
      "createdAt": "2025-01-09T10:00:00Z"
    }
  ],
  "summary": {
    "totalShifts": 50,
    "byStatus": {
      "submitted": 15,
      "approved": 30,
      "rejected": 5
    },
    "byDate": {
      "2025-01-15": {
        "employeeCount": 8,
        "totalWorkHours": 64
      }
    }
  }
}
```

---

### POST /admin/shifts/{id}/approve - シフト承認

**リクエスト:**
```json
{
  "comment": "承認しました"
}
```

**レスポンス (200 OK):**
```json
{
  "shift": {
    "id": "shift_001",
    "status": "approved",
    "approvedBy": "manager_001",
    "approvedAt": "2025-01-10T14:00:00Z",
    "managerComment": "承認しました"
  }
}
```

---

### POST /admin/shifts/{id}/reject - シフト却下

**リクエスト:**
```json
{
  "comment": "その日は人員が充足しているため不可",
  "reason": "overstaffed"
}
```

**レスポンス (200 OK):**
```json
{
  "shift": {
    "id": "shift_001",
    "status": "rejected",
    "rejectedBy": "manager_001",
    "rejectedAt": "2025-01-10T14:00:00Z",
    "managerComment": "その日は人員が充足しているため不可",
    "rejectionReason": "overstaffed"
  }
}
```

---

### GET /admin/statistics - 統計データ取得

**クエリパラメータ:**
- `storeId` (required): 店舗ID
- `month` (required): 対象月 (YYYY-MM)

**レスポンス (200 OK):**
```json
{
  "period": {
    "year": 2025,
    "month": 1,
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  },
  "overall": {
    "totalShifts": 150,
    "totalEmployees": 20,
    "totalWorkHours": 1200,
    "averageWorkHoursPerEmployee": 60,
    "approvalRate": 0.85
  },
  "byDate": [
    {
      "date": "2025-01-15",
      "dayOfWeek": 3,
      "employeeCount": 8,
      "totalWorkHours": 64,
      "shiftsSubmitted": 8,
      "shiftsApproved": 7,
      "shiftsRejected": 1
    }
  ],
  "byEmployee": [
    {
      "userId": "user_001",
      "userName": "山田太郎",
      "totalShifts": 15,
      "totalWorkHours": 120,
      "approvedShifts": 14,
      "rejectedShifts": 1
    }
  ],
  "byDayOfWeek": {
    "monday": { "averageEmployees": 7, "averageWorkHours": 56 },
    "tuesday": { "averageEmployees": 6, "averageWorkHours": 48 },
    "wednesday": { "averageEmployees": 8, "averageWorkHours": 64 }
  }
}
```

---

### POST /admin/reports/export - レポートCSV出力

**リクエスト:**
```json
{
  "storeId": "store_001",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "format": "csv",
  "includeFields": [
    "date",
    "employeeName",
    "startTime",
    "endTime",
    "workHours",
    "status"
  ]
}
```

**レスポンス (200 OK):**
```json
{
  "downloadUrl": "https://api.ss-manager.com/downloads/report_20250109_abc123.csv",
  "expiresAt": "2025-01-10T10:00:00Z",
  "fileSize": 15360
}
```

**CSVフォーマット例:**
```csv
日付,従業員名,開始時刻,終了時刻,勤務時間,ステータス
2025-01-15,山田太郎,09:00,18:00,8.0,承認済み
2025-01-15,佐藤花子,10:00,19:00,8.0,承認済み
```

---

## 共通API

### GET /stores - 店舗一覧取得

**レスポンス (200 OK):**
```json
{
  "stores": [
    {
      "id": "store_001",
      "name": "メイン店舗",
      "address": "東京都渋谷区...",
      "managerIds": ["manager_001"],
      "employeeCount": 15
    },
    {
      "id": "store_002",
      "name": "掛け持ち先A",
      "address": "東京都新宿区...",
      "managerIds": ["manager_002"],
      "employeeCount": 10
    }
  ]
}
```

---

### GET /holidays - 祝日データ取得

**クエリパラメータ:**
- `year` (optional): 対象年 (デフォルト: 現在年)

**レスポンス (200 OK):**
```json
{
  "year": 2025,
  "holidays": {
    "2025-01-01": "元日",
    "2025-01-13": "成人の日",
    "2025-02-11": "建国記念の日",
    "2025-02-23": "天皇誕生日"
  },
  "cachedAt": "2025-01-01T00:00:00Z"
}
```

---

### GET /users/me - 自分のプロフィール取得

**レスポンス (200 OK):**
```json
{
  "user": {
    "id": "user_001",
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "employee",
    "mainStoreId": "store_001",
    "mainStoreName": "メイン店舗",
    "jobs": [
      {
        "id": 1,
        "name": "掛け持ち先A",
        "storeId": "store_002",
        "color": "#FFFF00",
        "isActive": true
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-09T10:00:00Z"
  }
}
```

---

### PUT /users/me - プロフィール更新

**リクエスト:**
```json
{
  "name": "山田太郎",
  "mainStoreName": "本店（更新）",
  "jobs": [
    {
      "id": 1,
      "name": "掛け持ち先A（更新）",
      "isActive": true
    },
    {
      "id": 2,
      "name": "新しい掛け持ち先",
      "isActive": true
    }
  ]
}
```

**レスポンス (200 OK):**
```json
{
  "user": {
    "id": "user_001",
    "name": "山田太郎",
    "mainStoreName": "本店（更新）",
    "jobs": [
      {
        "id": 1,
        "name": "掛け持ち先A（更新）",
        "color": "#FFFF00",
        "isActive": true
      },
      {
        "id": 2,
        "name": "新しい掛け持ち先",
        "color": "#39FF14",
        "isActive": true
      }
    ],
    "updatedAt": "2025-01-09T11:00:00Z"
  }
}
```

---

## エラーハンドリング

### 標準エラーレスポンス

```json
{
  "error": "ERROR_CODE",
  "message": "人間が読める日本語メッセージ",
  "details": [],
  "timestamp": "2025-01-09T10:00:00Z",
  "path": "/api/shifts"
}
```

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|-------|---------------|------|
| `VALIDATION_ERROR` | 422 | バリデーションエラー |
| `INVALID_CREDENTIALS` | 401 | 認証情報が不正 |
| `TOKEN_EXPIRED` | 401 | トークンの有効期限切れ |
| `FORBIDDEN` | 403 | アクセス権限なし |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `CONFLICT` | 409 | データ競合（同時更新など） |
| `SHIFT_CONFLICT` | 422 | シフト時間の競合 |
| `ALREADY_APPROVED` | 409 | 既に承認済み |
| `ALREADY_REJECTED` | 409 | 既に却下済み |
| `INTERNAL_ERROR` | 500 | サーバー内部エラー |

### バリデーションエラーの詳細形式

```json
{
  "error": "VALIDATION_ERROR",
  "message": "入力内容に誤りがあります",
  "details": [
    {
      "field": "shifts[0].startTime",
      "message": "開始時刻の形式が不正です",
      "code": "INVALID_FORMAT",
      "value": "25:00"
    },
    {
      "field": "shifts[1].date",
      "message": "過去の日付は指定できません",
      "code": "PAST_DATE",
      "value": "2025-01-01"
    }
  ]
}
```

---

## レート制限

### 制限値

| エンドポイント | 制限 | 期間 |
|---------------|------|------|
| `/auth/login` | 5回 | 15分 |
| `/auth/register` | 3回 | 1時間 |
| その他認証不要 | 100回 | 1時間 |
| 認証済みAPI | 1000回 | 1時間 |

### レスポンスヘッダー

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1641729600
```

### 制限超過時のレスポンス (429)

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "リクエスト数が制限を超えました。しばらく時間をおいて再試行してください。",
  "retryAfter": 3600
}
```

---

## WebSocket (将来実装予定)

### リアルタイム通知

```
wss://api.ss-manager.com/ws
```

**イベント:**
- `shift.approved` - シフト承認通知
- `shift.rejected` - シフト却下通知
- `shift.submitted` - 新規シフト提出（管理者向け）
- `shift.updated` - シフト更新

**メッセージ形式:**
```json
{
  "event": "shift.approved",
  "data": {
    "shiftId": "shift_001",
    "date": "2025-01-15",
    "approvedBy": "manager_001",
    "approvedAt": "2025-01-10T14:00:00Z"
  },
  "timestamp": "2025-01-10T14:00:01Z"
}
```

---

## 補足事項

### CORS設定

```
Access-Control-Allow-Origin: https://ss-manager.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### セキュリティヘッダー

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### ページネーション

大量データ取得時は以下のクエリパラメータで対応:

```
?page=1&limit=50&sort=date&order=desc
```

**レスポンス:**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 500,
    "itemsPerPage": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

**作成者:** Claude (AI Assistant)
**レビュー状況:** 要レビュー
**次回更新予定:** バックエンド実装開始時
