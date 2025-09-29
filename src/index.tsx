import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

const app = new Hono()

// CORS設定（API呼び出し用）
app.use('/api/*', cors())

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// レンダリング設定
app.use(renderer)

// メインページ
app.get('/', (c) => {
  return c.render(
    <div>
      <div class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
          <div class="max-w-6xl mx-auto">
            <header class="text-center mb-8">
              <h1 class="text-4xl font-bold text-gray-800 mb-4">
                <i class="fas fa-search mr-3"></i>
                KG Search for Wikidata - 改良版
              </h1>
              <p class="text-gray-600 text-lg">
                Wikidataを使った知識グラフ検索システム（モダン実装版）
              </p>
            </header>

            <div class="grid md:grid-cols-2 gap-6 mb-8">
              <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold mb-4 text-blue-600">
                  <i class="fas fa-rocket mr-2"></i>
                  主な改良点
                </h2>
                <ul class="space-y-2 text-gray-700">
                  <li><i class="fas fa-check text-green-500 mr-2"></i>Hono + TypeScript によるモダンな実装</li>
                  <li><i class="fas fa-check text-green-500 mr-2"></i>Cloudflare Pages対応（エッジデプロイ）</li>
                  <li><i class="fas fa-check text-green-500 mr-2"></i>TailwindCSSによるレスポンシブUI</li>
                  <li><i class="fas fa-check text-green-500 mr-2"></i>セキュリティ強化（XSS対策等）</li>
                  <li><i class="fas fa-check text-green-500 mr-2"></i>パフォーマンス最適化</li>
                </ul>
              </div>

              <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold mb-4 text-green-600">
                  <i class="fas fa-cogs mr-2"></i>
                  技術スタック
                </h2>
                <ul class="space-y-2 text-gray-700">
                  <li><strong>バックエンド:</strong> Hono Framework</li>
                  <li><strong>フロントエンド:</strong> Vanilla JS + TailwindCSS</li>
                  <li><strong>デプロイ:</strong> Cloudflare Pages</li>
                  <li><strong>データソース:</strong> Wikidata SPARQL</li>
                  <li><strong>API:</strong> Wikimedia API + SPARQL</li>
                </ul>
              </div>
            </div>

            <div class="text-center">
              <a href="/search" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 text-lg">
                <i class="fas fa-search mr-2"></i>
                検索を開始する
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// 検索ページ
app.get('/search', (c) => {
  return c.render(
    <div id="search-app">
      <div class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
          <div class="max-w-6xl mx-auto">
            <header class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-800 mb-4">
                <a href="/" class="text-blue-600 hover:text-blue-700">
                  <i class="fas fa-search mr-2"></i>
                  KG Search for Wikidata
                </a>
              </h1>
            </header>

            {/* 検索フォーム */}
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
              <div class="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">検索キーワード</label>
                  <input
                    type="text"
                    id="search-input"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例：日本、アインシュタイン"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">検索モード</label>
                  <select id="search-mode" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="label-full">完全一致</option>
                    <option value="label-partial">部分一致</option>
                    <option value="label-forward">前方一致</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">言語</label>
                  <select id="search-lang" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div class="flex flex-wrap gap-4 items-end">
                <button
                  id="search-btn"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition duration-300"
                >
                  <i class="fas fa-search mr-2"></i>
                  検索実行
                </button>
                <button
                  id="clear-btn"
                  class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition duration-300"
                >
                  <i class="fas fa-eraser mr-2"></i>
                  クリア
                </button>
                <div id="loading" class="hidden flex items-center text-blue-600">
                  <i class="fas fa-spinner fa-spin mr-2"></i>
                  検索中...
                </div>
              </div>
            </div>

            {/* 検索結果エリア */}
            <div id="results-area" class="bg-white rounded-lg shadow-md p-6 hidden">
              <h2 class="text-xl font-semibold mb-4 text-gray-800">
                <i class="fas fa-list mr-2"></i>
                検索結果
              </h2>
              <div id="results-content"></div>
              <div id="pagination" class="mt-4 flex justify-center"></div>
            </div>

            {/* エラー表示エリア */}
            <div id="error-area" class="bg-red-50 border border-red-200 rounded-lg p-4 hidden">
              <div class="flex items-center">
                <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                <span class="text-red-700 font-medium">エラー</span>
              </div>
              <div id="error-message" class="text-red-600 mt-2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// API: Wikidata検索
app.get('/api/search', async (c) => {
  try {
    const query = c.req.query('q') || ''
    const mode = c.req.query('mode') || 'label-partial'
    const lang = c.req.query('lang') || 'ja'
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    if (!query.trim()) {
      return c.json({ error: '検索キーワードを入力してください' }, 400)
    }

    // Wikimedia API を使用してエンティティを検索
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${lang}&limit=${limit}&continue=${offset}&format=json&origin=*`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'KGSearchWD-Improved/1.0 (https://github.com/user/kg-search-wd-improved)',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`Wikidata API error: ${response.status} - ${response.statusText}`)
      throw new Error(`Wikidata API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    return c.json({
      success: true,
      results: data.search || [],
      hasMore: data.search && data.search.length >= limit
    })
  } catch (error) {
    console.error('Search error:', error)
    return c.json({ 
      error: error instanceof Error ? error.message : '検索中にエラーが発生しました' 
    }, 500)
  }
})

// API: エンティティ詳細取得
app.get('/api/entity/:id', async (c) => {
  try {
    const entityId = c.req.param('id')
    const lang = c.req.query('lang') || 'ja'

    if (!entityId || !entityId.match(/^Q\d+$/)) {
      return c.json({ error: '無効なエンティティIDです' }, 400)
    }

    // SPARQL クエリでエンティティの詳細情報を取得
    const sparqlQuery = `
      SELECT DISTINCT ?prop ?propLabel ?value ?valueLabel WHERE {
        wd:${entityId} ?prop ?value .
        ?property wikibase:directClaim ?prop .
        ?property rdfs:label ?propLabel .
        FILTER(LANG(?propLabel) = "${lang}" || LANG(?propLabel) = "en")
        OPTIONAL {
          ?value rdfs:label ?valueLabel .
          FILTER(LANG(?valueLabel) = "${lang}" || LANG(?valueLabel) = "en")
        }
        FILTER(!isBlank(?value))
      }
      LIMIT 50
    `

    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`
    
    const response = await fetch(sparqlUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'KGSearchWD-Improved/1.0 (https://github.com/user/kg-search-wd-improved)'
      }
    })

    if (!response.ok) {
      console.error(`SPARQL API error: ${response.status} - ${response.statusText}`)
      throw new Error(`SPARQL query failed: ${response.status}`)
    }

    const data = await response.json()
    
    return c.json({
      success: true,
      entityId,
      properties: data.results?.bindings || []
    })
  } catch (error) {
    console.error('Entity fetch error:', error)
    return c.json({ 
      error: error instanceof Error ? error.message : '詳細情報の取得中にエラーが発生しました' 
    }, 500)
  }
})

export default app
