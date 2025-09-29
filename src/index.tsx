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

            {/* 詳細検索リンク */}
            <div class="text-center mt-4">
              <a 
                href="/advanced"
                class="text-blue-600 hover:text-blue-800 text-sm transition duration-200"
              >
                <i class="fas fa-cogs mr-1"></i>
                詳細検索
              </a>
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

// 詳細検索ページ
app.get('/advanced', (c) => {
  return c.render(
    <div id="advanced-search-app">
      <div class="bg-gray-50 min-h-screen">
        <div class="container mx-auto px-4">
          {/* ヘッダー */}
          <header class="pt-8 pb-6">
            <div class="flex items-center justify-between">
              <h1 class="text-3xl font-normal text-gray-800">
                Wikidata詳細検索
              </h1>
              <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">
                <i class="fas fa-arrow-left mr-2"></i>
                簡単検索に戻る
              </a>
            </div>
            <p class="text-sm text-gray-500 mt-2">
              高度な検索条件で知識グラフを探索
            </p>
          </header>

          {/* 詳細検索フォーム */}
          <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 class="text-lg font-medium text-gray-800 mb-4">
                <i class="fas fa-search-plus mr-2"></i>
                検索条件
              </h2>
              
              {/* 基本検索条件 */}
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    検索キーワード
                  </label>
                  <input
                    type="text"
                    id="advanced-search-input"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例：大阪電気通信大学"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    検索タイプ
                  </label>
                  <select id="search-type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="fuzzy">あいまい検索（推奨）</option>
                    <option value="prefix">前方一致</option>
                    <option value="exact">完全一致</option>
                    <option value="contains">部分一致</option>
                  </select>
                </div>
              </div>

              {/* フィルター条件 */}
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    言語
                  </label>
                  <select id="advanced-search-lang" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                    <option value="ko">한국어</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    エンティティタイプ
                  </label>
                  <select id="entity-type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">全て</option>
                    <option value="Q5">人物</option>
                    <option value="Q43229">組織</option>
                    <option value="Q3918">大学</option>
                    <option value="Q515">都市</option>
                    <option value="Q6256">国</option>
                    <option value="Q571">本</option>
                    <option value="Q11424">映画</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    結果件数
                  </label>
                  <select id="result-limit" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="10">10件</option>
                    <option value="20">20件</option>
                    <option value="50">50件</option>
                    <option value="100">100件</option>
                  </select>
                </div>
              </div>

              {/* プロパティ検索（上級者向け） */}
              <div class="border-t border-gray-200 pt-4 mb-6">
                <h3 class="text-md font-medium text-gray-700 mb-3">
                  <i class="fas fa-cogs mr-2"></i>
                  プロパティ検索（上級者向け）
                </h3>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      プロパティID（例：P31, P17）
                    </label>
                    <input
                      type="text"
                      id="property-id"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例：P31（分類を検索）"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      プロパティ値
                    </label>
                    <input
                      type="text"
                      id="property-value"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例：Q3918（大学）"
                    />
                  </div>
                </div>
              </div>

              {/* 検索ボタン */}
              <div class="flex justify-between items-center">
                <button
                  id="advanced-search-btn"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition duration-200"
                >
                  <i class="fas fa-search mr-2"></i>
                  詳細検索実行
                </button>

                <div class="flex space-x-3">
                  <button
                    id="show-query-btn"
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm transition duration-200"
                  >
                    <i class="fas fa-code mr-2"></i>
                    クエリ表示
                  </button>
                  
                  <button
                    id="advanced-clear-btn"
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm transition duration-200"
                  >
                    <i class="fas fa-times mr-2"></i>
                    クリア
                  </button>
                </div>
              </div>
            </div>

            {/* SPARQLクエリ表示エリア */}
            <div id="query-display" class="hidden mt-4 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <div class="flex justify-between items-center mb-2">
                <span class="text-yellow-400 font-medium">実行されるSPARQLクエリ:</span>
                <button id="copy-query-btn" class="text-blue-400 hover:text-blue-300 text-xs">
                  <i class="fas fa-copy mr-1"></i>
                  コピー
                </button>
              </div>
              <pre id="query-content" class="whitespace-pre-wrap overflow-x-auto"></pre>
            </div>

            {/* ローディング表示 */}
            <div id="advanced-loading" class="hidden text-center mt-6">
              <div class="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                <i class="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
                <span class="text-blue-600">詳細検索実行中...</span>
              </div>
            </div>

            {/* 検索結果エリア */}
            <div id="advanced-results-area" class="mt-6 hidden">
              <div class="mb-4">
                <h2 class="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
                  検索結果
                </h2>
              </div>
              <div id="advanced-results-content"></div>
              <div id="advanced-pagination" class="mt-6 text-center"></div>
            </div>

            {/* エラー表示エリア */}
            <div id="advanced-error-area" class="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4 mt-6 hidden">
              <div class="flex items-center">
                <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                <span class="text-red-700 font-medium">エラー</span>
              </div>
              <div id="advanced-error-message" class="text-red-600 mt-2"></div>
            </div>
          </div>

          {/* フッター */}
          <footer class="text-center py-8 text-xs text-gray-400">
            <div class="space-x-4">
              <span>Advanced Search powered by Wikidata SPARQL</span>
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
    let entityIds = await getWikidataEntityIds(query, lang, limit, offset)
    
    // 結果が少ない場合は英語でも検索（オリジナルKG Searchの動作を模倣）
    if (entityIds.length < 5 && lang !== 'en') {
      const enEntityIds = await getWikidataEntityIds(query, 'en', limit - entityIds.length, offset)
      // 重複を避けて追加
      const uniqueEnIds = enEntityIds.filter(id => !entityIds.includes(id))
      entityIds = [...entityIds, ...uniqueEnIds]
    }
    
    if (entityIds.length === 0) {
      return c.json({
        success: true,
        results: [],
        hasMore: false
      })
    }

    // Step 2: SPARQLクエリでエンティティの詳細情報を取得（関連度順を維持）
    const sparqlQuery = `
      SELECT DISTINCT ?item ?itemLabel ?itemDescription WHERE {
        VALUES ?item { ${entityIds.map(id => `wd:${id}`).join(' ')} }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
      }
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
    
    // SPARQLレスポンスをマップに変換（高速検索用）
    const sparqlResultsMap = new Map()
    sparqlData.results?.bindings?.forEach(binding => {
      const item = binding.item?.value || ''
      const itemId = item.replace('http://www.wikidata.org/entity/', '')
      
      sparqlResultsMap.set(itemId, {
        id: itemId,
        label: binding.itemLabel?.value || itemId,
        description: binding.itemDescription?.value || '',
        concepturi: item
      })
    })
    
    // 元のエンティティID順序を維持して結果を構築（関連度順を保持）
    const results = entityIds
      .map(id => sparqlResultsMap.get(id))
      .filter(Boolean)
    
    return c.json({
      success: true,
      results: results,
      hasMore: entityIds.length >= limit,
      totalFound: results.length,
      entityIds: entityIds,
      // デバッグ情報（開発環境でのみ表示）
      debug: {
        originalQuery: query,
        language: lang,
        entityIdsCount: entityIds.length,
        sparqlResultsCount: sparqlData.results?.bindings?.length || 0,
        finalResultsCount: results.length
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return c.json({ 
      error: error instanceof Error ? error.message : '検索中にエラーが発生しました' 
    }, 500)
  }
})

// Helper function: Wikimedia APIでエンティティIDを取得（オリジナルKG Search準拠）
async function getWikidataEntityIds(query: string, lang: string, limit: number, offset: number): Promise<string[]> {
  try {
    // オリジナルKG Searchと同じパラメータを使用
    const params = new URLSearchParams({
      action: 'wbsearchentities',
      search: query,
      language: lang,
      limit: limit.toString(),
      continue: offset.toString(),
      format: 'json',
      origin: '*',
      type: 'item',        // アイテムのみに限定
      strictlanguage: 'false'  // 厳密な言語マッチングを無効化（より多くの結果を取得）
    })

    const searchUrl = `https://www.wikidata.org/w/api.php?${params.toString()}`
    
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
    
    // 検索結果の関連度順序を維持
    return (data.search || [])
      .map((item: any) => item.id)
      .filter(Boolean)
      .slice(0, limit)  // 念のためlimitを再適用
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

// API: 詳細検索
app.get('/api/advanced-search', async (c) => {
  try {
    const query = c.req.query('q') || ''
    const searchType = c.req.query('type') || 'fuzzy'
    const lang = c.req.query('lang') || 'ja'
    const entityType = c.req.query('entity_type') || ''
    const propertyId = c.req.query('property_id') || ''
    const propertyValue = c.req.query('property_value') || ''
    const limit = parseInt(c.req.query('limit') || '20')
    const showQuery = c.req.query('show_query') === 'true'

    if (!query.trim() && !propertyId.trim()) {
      return c.json({ error: '検索キーワードまたはプロパティIDを入力してください' }, 400)
    }

    let sparqlQuery = ''
    let searchResults: any[] = []

    // プロパティベース検索
    if (propertyId.trim() && propertyValue.trim()) {
      sparqlQuery = buildPropertySearchQuery(propertyId, propertyValue, lang, limit, entityType)
    } else if (query.trim()) {
      // テキストベース詳細検索
      const entityIds = await getAdvancedWikidataEntityIds(query, searchType, lang, limit)
      
      if (entityIds.length === 0) {
        return c.json({
          success: true,
          results: [],
          hasMore: false,
          query: showQuery ? sparqlQuery : undefined
        })
      }

      sparqlQuery = buildAdvancedSearchQuery(entityIds, lang, limit, entityType)
    } else {
      return c.json({ error: '無効な検索条件です' }, 400)
    }

    // SPARQLクエリ実行
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`
    
    const response = await fetch(sparqlUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'KGSearchWD-Advanced/1.0'
      }
    })

    if (!response.ok) {
      console.error(`SPARQL API error: ${response.status}`)
      throw new Error(`SPARQL query failed: ${response.status}`)
    }

    const data = await response.json()
    
    const results = data.results?.bindings?.map(binding => {
      const item = binding.item?.value || ''
      const itemId = item.replace('http://www.wikidata.org/entity/', '')
      
      return {
        id: itemId,
        label: binding.itemLabel?.value || itemId,
        description: binding.itemDescription?.value || '',
        concepturi: item,
        // 追加情報があれば含める
        typeLabel: binding.typeLabel?.value || '',
        score: binding.score?.value || ''
      }
    }) || []
    
    return c.json({
      success: true,
      results: results,
      hasMore: results.length >= limit,
      totalFound: results.length,
      searchType: searchType,
      query: showQuery ? sparqlQuery : undefined,
      debug: {
        originalQuery: query,
        searchType: searchType,
        language: lang,
        entityType: entityType,
        propertySearch: !!(propertyId && propertyValue)
      }
    })
  } catch (error) {
    console.error('Advanced search error:', error)
    return c.json({ 
      error: error instanceof Error ? error.message : '詳細検索中にエラーが発生しました' 
    }, 500)
  }
})

// 詳細検索用のヘルパー関数
async function getAdvancedWikidataEntityIds(query: string, searchType: string, lang: string, limit: number): Promise<string[]> {
  try {
    let searchQuery = query
    
    // 検索タイプに応じてクエリを調整
    switch (searchType) {
      case 'prefix':
        searchQuery = query + '*'
        break
      case 'exact':
        searchQuery = `"${query}"`
        break
      case 'contains':
        searchQuery = `*${query}*`
        break
      case 'fuzzy':
      default:
        // デフォルトはあいまい検索（そのまま）
        break
    }

    const params = new URLSearchParams({
      action: 'wbsearchentities',
      search: searchQuery,
      language: lang,
      limit: limit.toString(),
      format: 'json',
      origin: '*',
      type: 'item',
      strictlanguage: 'false'
    })

    const searchUrl = `https://www.wikidata.org/w/api.php?${params.toString()}`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'KGSearchWD-Advanced/1.0',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`Wikidata search API error: ${response.status}`)
      return []
    }

    const data = await response.json()
    
    return (data.search || [])
      .map((item: any) => item.id)
      .filter(Boolean)
      .slice(0, limit)
  } catch (error) {
    console.error('Advanced entity search error:', error)
    return []
  }
}

function buildAdvancedSearchQuery(entityIds: string[], lang: string, limit: number, entityType: string): string {
  let typeFilter = ''
  if (entityType) {
    typeFilter = `?item wdt:P31/wdt:P279* wd:${entityType} .`
  }

  return `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?typeLabel WHERE {
      VALUES ?item { ${entityIds.map(id => `wd:${id}`).join(' ')} }
      ${typeFilter}
      OPTIONAL { ?item wdt:P31 ?type . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
    }
    LIMIT ${limit}
  `.trim()
}

function buildPropertySearchQuery(propertyId: string, propertyValue: string, lang: string, limit: number, entityType: string): string {
  let typeFilter = ''
  if (entityType) {
    typeFilter = `?item wdt:P31/wdt:P279* wd:${entityType} .`
  }

  // プロパティ値がQIDかどうかを判定
  const isQId = propertyValue.match(/^Q\d+$/)
  const valuePattern = isQId ? `wd:${propertyValue}` : `"${propertyValue}"`

  return `
    SELECT DISTINCT ?item ?itemLabel ?itemDescription ?typeLabel WHERE {
      ?item wdt:${propertyId} ${valuePattern} .
      ${typeFilter}
      OPTIONAL { ?item wdt:P31 ?type . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang},en". }
    }
    ORDER BY ?itemLabel
    LIMIT ${limit}
  `.trim()
}

export default app
