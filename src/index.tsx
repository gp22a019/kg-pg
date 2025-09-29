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



// API: Wikidata検索（元のKG Search方式）
app.get('/api/search', async (c) => {
  try {
    const query = c.req.query('q') || ''
    const lang = c.req.query('lang') || 'ja'
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    if (!query.trim()) {
      return c.json({ error: '検索キーワードを入力してください' }, 400)
    }

    // Step 1: Wikimedia API でエンティティIDを取得
    const entityIds = await getWikidataEntityIds(query, lang, limit, offset)
    
    if (entityIds.length === 0) {
      return c.json({
        success: true,
        results: [],
        hasMore: false
      })
    }

    // Step 2: SPARQLクエリでエンティティの詳細情報を取得（元のKG Search方式）
    const sparqlQuery = `
      SELECT DISTINCT ?item ?itemLabel ?itemDescription WHERE {
        VALUES ?item { ${entityIds.map(id => `wd:${id}`).join(' ')} }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
      }
      ORDER BY ?itemLabel
      LIMIT ${limit}
    `

    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`
    
    const sparqlResponse = await fetch(sparqlUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'KGSearchWD-Improved/1.0 (https://github.com/user/kg-search-wd-improved)'
      }
    })

    if (!sparqlResponse.ok) {
      console.error(`SPARQL API error: ${sparqlResponse.status} - ${sparqlResponse.statusText}`)
      throw new Error(`SPARQL query failed: ${sparqlResponse.status}`)
    }

    const sparqlData = await sparqlResponse.json()
    
    // 結果を元のKG Search形式に変換
    const results = sparqlData.results?.bindings?.map(binding => {
      const item = binding.item?.value || ''
      const itemId = item.replace('http://www.wikidata.org/entity/', '')
      
      return {
        id: itemId,
        label: binding.itemLabel?.value || itemId,
        description: binding.itemDescription?.value || '',
        concepturi: item
      }
    }) || []
    
    return c.json({
      success: true,
      results: results,
      hasMore: entityIds.length >= limit,
      entityIds: entityIds
    })
  } catch (error) {
    console.error('Search error:', error)
    return c.json({ 
      error: error instanceof Error ? error.message : '検索中にエラーが発生しました' 
    }, 500)
  }
})

// Helper function: Wikimedia APIでエンティティIDを取得
async function getWikidataEntityIds(query: string, lang: string, limit: number, offset: number): Promise<string[]> {
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${lang}&limit=${limit}&continue=${offset}&format=json&origin=*`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'KGSearchWD-Improved/1.0 (https://github.com/user/kg-search-wd-improved)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`Wikidata search API error: ${response.status}`)
      return []
    }

    const data = await response.json()
    return (data.search || []).map((item: any) => item.id).filter(Boolean)
  } catch (error) {
    console.error('Entity search error:', error)
    return []
  }
}

// API: エンティティ詳細取得（元のKG Search方式）
app.get('/api/entity/:id', async (c) => {
  try {
    const entityId = c.req.param('id')
    const lang = c.req.query('lang') || 'ja'

    if (!entityId || !entityId.match(/^Q\d+$/)) {
      return c.json({ error: '無効なエンティティIDです' }, 400)
    }

    // 元のKG Searchと同じ形式のSPARQLクエリ
    const sparqlQuery = `
      SELECT DISTINCT ?prop ?propLabel ?value ?valueLabel WHERE {
        wd:${entityId} ?prop ?value .
        ?property wikibase:directClaim ?prop .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
        FILTER(!isBlank(?value))
      }
      ORDER BY ?prop
      LIMIT 100
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
