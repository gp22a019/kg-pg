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

// メインページ（Googleライクな検索画面）
app.get('/', (c) => {
  return c.render(
    <div id="search-app">
      <div class="bg-gray-50 min-h-screen">
        <div class="container mx-auto px-4">
          {/* ヘッダー */}
          <header class="pt-8 pb-6 text-center">
            <h1 class="text-3xl font-normal text-gray-800 mb-2">
              Wikidata検索
            </h1>
            <p class="text-sm text-gray-500">
              知識グラフから情報を検索
            </p>
          </header>

          {/* 検索フォーム（中央配置・Google風） */}
          <div class="max-w-2xl mx-auto mb-8">
            <div class="bg-white rounded-full border border-gray-200 hover:shadow-md transition duration-200 p-3">
              <div class="flex items-center">
                <i class="fas fa-search text-gray-400 ml-4 mr-3"></i>
                <input
                  type="text"
                  id="search-input"
                  class="flex-grow px-2 py-2 border-0 outline-none text-lg"
                  placeholder="検索キーワードを入力（例：大阪電気通信大学、アインシュタイン）"
                  autocomplete="off"
                />
                <div class="flex items-center space-x-2 mr-2">
                  <select id="search-lang" class="px-3 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 検索ボタン */}
            <div class="flex justify-center mt-6 space-x-3">
              <button
                id="search-btn"
                class="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-6 py-2 rounded text-sm transition duration-200"
              >
                Wikidata検索
              </button>
              <button
                id="clear-btn"
                class="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-6 py-2 rounded text-sm transition duration-200"
              >
                クリア
              </button>
            </div>

            {/* ローディング表示 */}
            <div id="loading" class="hidden text-center mt-6">
              <div class="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                <i class="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
                <span class="text-blue-600">検索中...</span>
              </div>
            </div>
          </div>

          {/* 検索結果エリア */}
          <div id="results-area" class="max-w-4xl mx-auto hidden">
            <div class="mb-4">
              <h2 class="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
                検索結果
              </h2>
            </div>
            <div id="results-content"></div>
            <div id="pagination" class="mt-6 text-center"></div>
          </div>

          {/* エラー表示エリア */}
          <div id="error-area" class="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4 hidden">
            <div class="flex items-center">
              <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
              <span class="text-red-700 font-medium">エラー</span>
            </div>
            <div id="error-message" class="text-red-600 mt-2"></div>
          </div>

          {/* フッター */}
          <footer class="text-center py-8 text-xs text-gray-400">
            <div class="space-x-4">
              <span>Powered by Wikidata</span>
              <span>•</span>
              <span>Built with Hono + Cloudflare</span>
            </div>
          </footer>
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

// API: エンティティ詳細取得（日本語ラベル優先）
app.get('/api/entity/:id', async (c) => {
  try {
    const entityId = c.req.param('id')
    const lang = c.req.query('lang') || 'ja'

    if (!entityId || !entityId.match(/^Q\d+$/)) {
      return c.json({ error: '無効なエンティティIDです' }, 400)
    }

    // 基本情報と主要プロパティを取得するSPARQLクエリ
    const sparqlQuery = `
      SELECT DISTINCT ?prop ?propLabel ?propJaLabel ?value ?valueLabel ?valueJaLabel ?valueDescription WHERE {
        wd:${entityId} ?prop ?value .
        ?property wikibase:directClaim ?prop .
        
        # プロパティラベル（日本語優先）
        OPTIONAL { ?property rdfs:label ?propJaLabel . FILTER(LANG(?propJaLabel) = "ja") }
        OPTIONAL { ?property rdfs:label ?propLabel . FILTER(LANG(?propLabel) = "en") }
        
        # 値のラベル（日本語優先）
        OPTIONAL { ?value rdfs:label ?valueJaLabel . FILTER(LANG(?valueJaLabel) = "ja") }
        OPTIONAL { ?value rdfs:label ?valueLabel . FILTER(LANG(?valueLabel) = "en") }
        OPTIONAL { ?value schema:description ?valueDescription . FILTER(LANG(?valueDescription) = "ja") }
        
        # 重要なプロパティに絞る
        FILTER(?prop IN (
          wdt:P31,    # instance of (分類)
          wdt:P279,   # subclass of (上位クラス)
          wdt:P17,    # country (国)
          wdt:P131,   # located in (所在地)
          wdt:P19,    # place of birth (出生地)
          wdt:P20,    # place of death (死去地)
          wdt:P27,    # country of citizenship (国籍)
          wdt:P106,   # occupation (職業)
          wdt:P569,   # date of birth (生年月日)
          wdt:P570,   # date of death (没年月日)
          wdt:P18,    # image (画像)
          wdt:P154,   # logo image (ロゴ)
          wdt:P625,   # coordinate location (座標)
          wdt:P856,   # official website (公式サイト)
          wdt:P571,   # inception (設立年)
          wdt:P576,   # dissolved (解散年)
          wdt:P1416,  # affiliation (所属)
          wdt:P108    # employer (雇用者)
        ))
        FILTER(!isBlank(?value))
      }
      ORDER BY ?prop
      LIMIT 30
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
