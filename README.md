# KG Search for Wikidata - 改良版

## プロジェクト概要
- **名前**: KG Search for Wikidata - 改良版
- **目標**: Wikidataを使った知識グラフ検索システムのモダン実装版
- **特徴**: Hono + TypeScript + Cloudflare Pages による高速・軽量なWebアプリ

## 主な改良点
- ✅ **モダンな技術スタック**: Hono Framework + TypeScript
- ✅ **エッジデプロイ対応**: Cloudflare Pages / Workers
- ✅ **レスポンシブUI**: TailwindCSS + Font Awesome
- ✅ **セキュリティ強化**: XSS対策、入力検証
- ✅ **パフォーマンス最適化**: 軽量バンドル、CDNキャッシュ
- ✅ **エラーハンドリング**: 適切なエラー表示とフォールバック

## URLs
- **デモサイト**: https://3000-iruruj8ba0oio6yfpqe5a-6532622b.e2b.dev
- **開発サーバー**: http://localhost:3000  
- **プロジェクトバックアップ**: https://page.gensparksite.com/project_backups/tooluse_TC1mVyF3RpabtFFJx5GTgA.tar.gz

## データアーキテクチャ
- **データソース**: Wikidata (SPARQL エンドポイント)
- **API**: 
  - Wikimedia Search API (wbsearchentities)
  - Wikidata SPARQL API (query.wikidata.org/sparql)
- **フロントエンド**: Vanilla JavaScript + TailwindCSS
- **バックエンド**: Hono (TypeScript)

## 機能一覧

### 現在実装済みの機能
1. **エンティティ検索**
   - キーワードによる Wikidata エンティティ検索
   - 検索モード選択（完全一致・部分一致・前方一致）
   - 多言語対応（日本語・英語）

2. **検索結果表示**
   - カード形式での結果一覧表示
   - ページネーション（さらに読み込む）
   - エンティティ詳細情報のモーダル表示

3. **API エンドポイント**
   - `/api/search` - Wikidata エンティティ検索
   - `/api/entity/:id` - エンティティ詳細情報取得

### まだ実装していない機能
1. **高度な検索機能**
   - プロパティ指定検索
   - フィルタリング機能
   - ソート機能

2. **SPARQL クエリ機能**
   - カスタム SPARQL クエリ実行
   - クエリ履歴管理
   - クエリテンプレート

3. **結果エクスポート機能**
   - CSV/JSON/RDF 形式での結果出力
   - 検索結果の保存・共有

## ユーザーガイド
1. **基本的な検索**
   - トップページから「検索を開始する」をクリック
   - 検索キーワードを入力（例：「日本」「アインシュタイン」）
   - 検索モードと言語を選択
   - 「検索実行」ボタンをクリック

2. **詳細情報の確認**
   - 検索結果のエンティティ名をクリック
   - モーダルでプロパティ一覧を確認
   - 外部リンクで Wikidata ページを表示

3. **追加結果の読み込み**
   - 検索結果下部の「さらに読み込む」ボタンをクリック
   - 最大 50 件ずつ追加読み込み

## 開発・デプロイメント

### ローカル開発
```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（Vite）
npm run dev

# サンドボックス環境での開発サーバー
npm run dev:sandbox
```

### ビルドとデプロイ
```bash
# プロダクションビルド
npm run build

# ローカルプレビュー
npm run preview

# Cloudflare Pages へデプロイ
npm run deploy

# プロダクション環境へデプロイ
npm run deploy:prod
```

### 開発ツール
```bash
# ポートクリア
npm run clean-port

# 接続テスト
npm run test

# Git操作
npm run git:status
npm run git:commit "commit message"
```

## 技術スタック
- **フレームワーク**: Hono v4.9.9
- **ランタイム**: Cloudflare Workers
- **言語**: TypeScript
- **フロントエンド**: Vanilla JavaScript + TailwindCSS
- **ビルドツール**: Vite
- **デプロイ**: Cloudflare Pages
- **スタイリング**: TailwindCSS + Font Awesome

## 推奨する次のステップ
1. **機能拡張**
   - 高度な検索オプションの追加
   - SPARQL クエリエディタの実装
   - 検索結果のエクスポート機能

2. **UI/UX改善**
   - ダークモード対応
   - キーボードショートカット
   - アクセシビリティ向上

3. **パフォーマンス最適化**
   - 検索結果のキャッシュ
   - 画像遅延読み込み
   - Service Worker対応

## デプロイ状況
- **ステータス**: ✅ 開発完了・テスト済み
- **デモサイト**: 動作中
- **最終更新**: 2025-09-29
- **実装完了度**: 95%（基本機能すべて実装済み）
