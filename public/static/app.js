/**
 * KG Search for Wikidata - 改良版
 * フロントエンド JavaScript
 */

class KGSearch {
  constructor() {
    this.currentResults = []
    this.currentOffset = 0
    this.currentQuery = ''
    this.currentLang = 'ja'
    this.expandedItems = new Set()
    this.init()
  }

  init() {
    // 検索ページでのみイベントリスナーを設定
    if (document.getElementById('search-app')) {
      this.setupEventListeners()
    }
  }

  setupEventListeners() {
    const searchBtn = document.getElementById('search-btn')
    const clearBtn = document.getElementById('clear-btn')
    const searchInput = document.getElementById('search-input')

    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.performSearch())
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearResults())
    }

    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch()
        }
      })
      
      // 検索候補のための入力監視（将来の機能）
      searchInput.addEventListener('input', (e) => {
        // 将来的にリアルタイム候補表示を追加可能
      })
    }
  }

  // プロパティ名の日本語マッピング
  getPropertyLabel(propertyId) {
    const propertyLabels = {
      'P31': '分類',
      'P279': '上位クラス', 
      'P17': '国',
      'P131': '所在地',
      'P19': '出生地',
      'P20': '死去地',
      'P27': '国籍',
      'P106': '職業',
      'P569': '生年月日',
      'P570': '没年月日',
      'P18': '画像',
      'P154': 'ロゴ',
      'P625': '座標',
      'P856': '公式サイト',
      'P571': '設立年',
      'P576': '解散年',
      'P1416': '所属',
      'P108': '雇用者'
    }
    
    // URIからプロパティIDを抽出
    const match = propertyId.match(/P\d+$/)
    if (match) {
      const pid = match[0]
      return propertyLabels[pid] || pid
    }
    
    return propertyId
  }

  async performSearch(offset = 0) {
    const searchInput = document.getElementById('search-input')
    const searchLang = document.getElementById('search-lang')
    const loading = document.getElementById('loading')
    const resultsArea = document.getElementById('results-area')
    const errorArea = document.getElementById('error-area')

    const query = searchInput?.value?.trim()
    if (!query) {
      this.showError('検索キーワードを入力してください')
      return
    }

    // UI状態を更新
    this.hideError()
    loading?.classList.remove('hidden')
    if (offset === 0) {
      resultsArea?.classList.add('hidden')
      this.expandedItems.clear()
    }

    try {
      // 検索パラメータを設定
      this.currentQuery = query
      this.currentLang = searchLang?.value || 'ja'
      this.currentOffset = offset

      // API呼び出し
      const params = new URLSearchParams({
        q: this.currentQuery,
        lang: this.currentLang,
        limit: '20',
        offset: offset.toString()
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }

      if (data.success) {
        if (offset === 0) {
          this.currentResults = data.results
        } else {
          this.currentResults = [...this.currentResults, ...data.results]
        }
        
        this.displayResults(data.results, data.hasMore, offset > 0)
      } else {
        throw new Error(data.error || '検索に失敗しました')
      }

    } catch (error) {
      console.error('Search error:', error)
      this.showError(error.message || '検索中にエラーが発生しました')
    } finally {
      loading?.classList.add('hidden')
    }
  }

  displayResults(results, hasMore, isAppend = false) {
    const resultsArea = document.getElementById('results-area')
    const resultsContent = document.getElementById('results-content')
    const pagination = document.getElementById('pagination')

    if (!resultsArea || !resultsContent) return

    resultsArea.classList.remove('hidden')

    if (!isAppend) {
      resultsContent.innerHTML = ''
    }

    if (results.length === 0 && !isAppend) {
      resultsContent.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-search text-gray-300 text-4xl mb-4"></i>
          <p class="text-gray-500 text-lg mb-2">検索結果が見つかりませんでした</p>
          <p class="text-gray-400 text-sm">検索キーワードを変更してお試しください</p>
        </div>
      `
      if (pagination) pagination.innerHTML = ''
      return
    }

    // 元のKG Searchと同じテーブル形式で表示
    const tableHeader = !isAppend ? `
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                QID
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ラベル
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                詳細
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
    ` : ''

    const tableFooter = !isAppend ? `
          </tbody>
        </table>
      </div>
    ` : ''

    const resultsRows = results.map((result, index) => {
      const globalIndex = this.currentOffset + index + 1
      return `
        <tr class="hover:bg-gray-50 transition duration-200" id="item-${result.id}">
          <td class="px-4 py-3 text-sm font-mono text-blue-600 border-r border-gray-200">
            <a href="${this.escapeHtml(result.concepturi || '#')}" target="_blank" 
               class="hover:text-blue-800">
              ${this.escapeHtml(result.id)}
            </a>
          </td>
          <td class="px-4 py-3">
            <div class="text-sm font-medium text-gray-900">
              ${this.escapeHtml(result.label || result.id)}
            </div>
            <div class="text-sm text-gray-500">
              ${this.escapeHtml(result.description || '')}
            </div>
          </td>
          <td class="px-4 py-3 text-right">
            <button 
              onclick="kgSearch.toggleEntityDetails('${result.id}')"
              class="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition duration-200"
            >
              詳細
              <i class="fas fa-chevron-down ml-1" id="chevron-${result.id}"></i>
            </button>
          </td>
        </tr>
        <tr id="details-row-${result.id}" class="hidden">
          <td colspan="3" class="px-0 py-0">
            <div id="details-${result.id}" class="bg-blue-50 border-t border-gray-200">
              <div class="px-6 py-4">
                <div class="flex items-center mb-2">
                  <i class="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
                  <span class="text-blue-600 text-sm">詳細情報を読み込み中...</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `
    }).join('')

    if (isAppend) {
      // 既存のテーブルに行を追加
      const tbody = resultsContent.querySelector('tbody')
      if (tbody) {
        tbody.insertAdjacentHTML('beforeend', resultsRows)
      }
    } else {
      resultsContent.innerHTML = tableHeader + resultsRows + tableFooter
    }

    // ページネーション
    if (pagination) {
      pagination.innerHTML = hasMore ? `
        <button 
          onclick="kgSearch.performSearch(${this.currentOffset + 20})"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition duration-200">
          <i class="fas fa-chevron-down mr-2"></i>
          さらに読み込む（20件）
        </button>
      ` : ''
    }
  }

  async toggleEntityDetails(entityId) {
    const detailsRow = document.getElementById(`details-row-${entityId}`)
    const chevronElement = document.getElementById(`chevron-${entityId}`)
    
    if (!detailsRow) return
    
    if (this.expandedItems.has(entityId)) {
      // 閉じる
      detailsRow.classList.add('hidden')
      chevronElement?.classList.remove('fa-chevron-up')
      chevronElement?.classList.add('fa-chevron-down')
      this.expandedItems.delete(entityId)
    } else {
      // 開く
      detailsRow.classList.remove('hidden')
      chevronElement?.classList.remove('fa-chevron-down')
      chevronElement?.classList.add('fa-chevron-up')
      this.expandedItems.add(entityId)
      
      // まだ詳細情報を取得していない場合は取得
      const detailsElement = document.getElementById(`details-${entityId}`)
      if (detailsElement && !detailsElement.dataset.loaded) {
        await this.loadEntityDetails(entityId)
      }
    }
  }
  
  async loadEntityDetails(entityId) {
    const detailsElement = document.getElementById(`details-${entityId}`)
    if (!detailsElement) return
    
    try {
      const params = new URLSearchParams({
        lang: this.currentLang
      })

      const response = await fetch(`/api/entity/${entityId}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch entity details')
      }

      this.displayEntityDetails(entityId, data.properties)
      detailsElement.dataset.loaded = 'true'

    } catch (error) {
      console.error('Entity details error:', error)
      detailsElement.innerHTML = `
        <div class="py-3 text-red-600">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          詳細情報の取得に失敗しました: ${error.message}
        </div>
      `
    }
  }

  displayEntityDetails(entityId, properties) {
    const detailsElement = document.getElementById(`details-${entityId}`)
    if (!detailsElement) return
    
    const formattedProperties = this.formatEntityPropertiesInline(properties)
    
    detailsElement.innerHTML = `
      <div class="py-3">
        <div class="text-sm font-medium text-gray-700 mb-3">
          <i class="fas fa-info-circle mr-1"></i>
          ${entityId} の詳細情報
        </div>
        ${formattedProperties}
      </div>
    `
  }

  formatEntityPropertiesInline(properties) {
    if (!properties || properties.length === 0) {
      return '<div class="text-sm text-gray-500">詳細情報がありません</div>'
    }

    // プロパティをグループ化（日本語ラベル優先）
    const groupedProps = {}
    properties.forEach(prop => {
      // 日本語ラベル -> 英語ラベル -> プロパティIDの優先順
      let propLabel = prop.propJaLabel?.value || prop.propLabel?.value
      
      // プロパティIDから日本語名を取得
      if (!propLabel || propLabel.startsWith('http')) {
        const propId = this.extractPropertyId(prop.prop?.value)
        propLabel = propId ? this.getPropertyLabel(propId) : 'その他'
      }
      
      if (!groupedProps[propLabel]) {
        groupedProps[propLabel] = []
      }
      groupedProps[propLabel].push(prop)
    })

    // テーブル形式で表示
    const rows = Object.entries(groupedProps).map(([propLabel, values]) => {
      const valuesList = values.map((value, valueIndex) => {
        // 日本語ラベル -> 英語ラベル -> 元の値の優先順
        let valueText = value.valueJaLabel?.value || value.valueLabel?.value || value.value?.value || 'Unknown'
        let valueDescription = value.valueDescription?.value || ''
        
        const isUrl = value.value?.value?.startsWith('http')
        const isImage = isUrl && (value.value.value.includes('.jpg') || value.value.value.includes('.png') || value.value.value.includes('.jpeg'))
        const isWikidataEntity = this.isWikidataEntity(value.value?.value)
        
        if (isImage) {
          return `
            <div class="mb-2">
              <img src="${this.escapeHtml(value.value.value)}" alt="${this.escapeHtml(valueText)}" 
                   class="max-w-32 max-h-24 object-cover rounded border">
            </div>
          `
        } else if (isWikidataEntity) {
          // Wikidataエンティティの場合、インライン展開可能なリンクとして表示
          const entityId = this.extractEntityId(value.value.value)
          const uniqueId = `inline-entity-${entityId}-${Date.now()}-${valueIndex}`
          
          return `
            <div class="mb-1">
              <button 
                onclick="kgSearch.toggleInlineEntity('${entityId}', '${uniqueId}')"
                class="inline-entity-btn text-blue-600 hover:text-blue-800 text-sm underline cursor-pointer focus:outline-none">
                <i class="fas fa-search mr-1"></i>
                ${this.escapeHtml(valueText)}
              </button>
              ${valueDescription ? `<span class="text-gray-500 text-xs ml-2">(${this.escapeHtml(valueDescription)})</span>` : ''}
              <div id="${uniqueId}" class="hidden inline-entity-expand mt-2 ml-4 p-3 bg-gray-50 border-l-4 border-blue-400 rounded shadow-sm">
                <div class="flex items-center mb-2">
                  <i class="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
                  <span class="text-blue-600 text-xs">詳細情報を読み込み中...</span>
                </div>
              </div>
            </div>
          `
        } else if (isUrl) {
          // 外部URLの場合は従来通り新しいタブで開く
          return `
            <div class="mb-1">
              <a href="${this.escapeHtml(value.value.value)}" target="_blank" 
                 class="text-blue-600 hover:text-blue-800 text-sm">
                <i class="fas fa-external-link-alt mr-1"></i>
                ${this.escapeHtml(valueText)}
              </a>
            </div>
          `
        } else {
          return `
            <div class="mb-1 text-sm">
              ${this.escapeHtml(valueText)}
              ${valueDescription ? `<span class="text-gray-500 text-xs ml-2">(${this.escapeHtml(valueDescription)})</span>` : ''}
            </div>
          `
        }
      }).join('')
      
      return `
        <tr class="border-b border-gray-100">
          <td class="py-2 pr-4 text-sm font-medium text-gray-700 align-top min-w-0 w-24">
            ${this.escapeHtml(propLabel)}
          </td>
          <td class="py-2 text-sm text-gray-600">
            ${valuesList}
          </td>
        </tr>
      `
    }).join('')

    return `
      <div class="overflow-hidden">
        <table class="w-full text-left">
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `
  }

  extractPropertyId(propertyUri) {
    if (!propertyUri) return null
    const match = propertyUri.match(/P\d+$/)
    return match ? match[0] : null
  }

  // Wikidataエンティティかどうかを判定
  isWikidataEntity(uri) {
    if (!uri || typeof uri !== 'string') return false
    return uri.startsWith('http://www.wikidata.org/entity/Q') || uri.match(/^Q\d+$/)
  }

  // エンティティIDを抽出
  extractEntityId(uri) {
    if (!uri) return null
    if (uri.match(/^Q\d+$/)) return uri
    const match = uri.match(/\/entity\/(Q\d+)/)
    return match ? match[1] : null
  }

  // インライン展開でエンティティ詳細を表示
  async toggleInlineEntity(entityId, containerId) {
    const container = document.getElementById(containerId)
    if (!container) return

    if (container.classList.contains('hidden')) {
      // 表示
      container.classList.remove('hidden')
      
      // まだ詳細情報を取得していない場合は取得
      if (!container.dataset.loaded) {
        await this.loadInlineEntityDetails(entityId, containerId)
      }
    } else {
      // 非表示
      container.classList.add('hidden')
    }
  }

  // インライン表示用にエンティティ詳細を取得
  async loadInlineEntityDetails(entityId, containerId) {
    const container = document.getElementById(containerId)
    if (!container) return
    
    try {
      const params = new URLSearchParams({
        lang: this.currentLang
      })

      const response = await fetch(`/api/entity/${entityId}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch entity details')
      }

      this.displayInlineEntityDetails(entityId, data.properties, containerId)
      container.dataset.loaded = 'true'

    } catch (error) {
      console.error('Inline entity details error:', error)
      container.innerHTML = `
        <div class="py-2 text-red-600 text-xs">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          詳細情報の取得に失敗しました: ${error.message}
        </div>
      `
    }
  }

  // インライン表示用に詳細情報をフォーマット
  displayInlineEntityDetails(entityId, properties, containerId) {
    const container = document.getElementById(containerId)
    if (!container) return
    
    // 重要なプロパティのみを表示（スペース節約のため）
    const importantProperties = this.filterImportantProperties(properties)
    const formattedProperties = this.formatInlineProperties(importantProperties)
    
    container.innerHTML = `
      <div class="text-xs">
        <div class="font-medium text-gray-700 mb-2">
          <i class="fas fa-info-circle mr-1"></i>
          ${entityId} の詳細情報
        </div>
        ${formattedProperties}
        <div class="mt-2 pt-2 border-t border-gray-200">
          <a href="https://www.wikidata.org/wiki/${entityId}" target="_blank" 
             class="text-blue-500 hover:text-blue-700 text-xs">
            <i class="fas fa-external-link-alt mr-1"></i>
            Wikidataで詳細を見る
          </a>
        </div>
      </div>
    `
  }

  // 重要なプロパティをフィルタリング（インライン表示用）
  filterImportantProperties(properties) {
    if (!properties || properties.length === 0) return []
    
    // 表示優先度の高いプロパティID
    const importantPropIds = ['P31', 'P279', 'P17', 'P131', 'P19', 'P20', 'P27', 'P106', 'P569', 'P570']
    
    const importantProps = properties.filter(prop => {
      const propId = this.extractPropertyId(prop.prop?.value)
      return propId && importantPropIds.includes(propId)
    })
    
    // 最大5件まで表示
    return importantProps.slice(0, 5)
  }

  // インライン表示用の簡潔なフォーマット
  formatInlineProperties(properties) {
    if (!properties || properties.length === 0) {
      return '<div class="text-xs text-gray-500">基本情報がありません</div>'
    }

    const rows = properties.map(prop => {
      // プロパティラベルを取得
      let propLabel = prop.propJaLabel?.value || prop.propLabel?.value
      if (!propLabel || propLabel.startsWith('http')) {
        const propId = this.extractPropertyId(prop.prop?.value)
        propLabel = propId ? this.getPropertyLabel(propId) : 'その他'
      }

      // 値を取得（日本語優先）
      let valueText = prop.valueJaLabel?.value || prop.valueLabel?.value || prop.value?.value || 'Unknown'
      
      // URLの場合は短縮表示
      if (valueText.startsWith('http')) {
        valueText = valueText.length > 30 ? valueText.substring(0, 27) + '...' : valueText
      }

      return `
        <div class="flex justify-between items-start py-1 text-xs">
          <span class="text-gray-600 font-medium min-w-0 w-16 mr-2">${this.escapeHtml(propLabel)}</span>
          <span class="text-gray-800 flex-1">${this.escapeHtml(valueText)}</span>
        </div>
      `
    }).join('')

    return `<div class="space-y-1">${rows}</div>`
  }

  clearResults() {
    const searchInput = document.getElementById('search-input')
    const resultsArea = document.getElementById('results-area')
    
    if (searchInput) searchInput.value = ''
    resultsArea?.classList.add('hidden')
    this.hideError()
    
    this.currentResults = []
    this.currentOffset = 0
    this.expandedItems.clear()
  }

  showError(message) {
    const errorArea = document.getElementById('error-area')
    const errorMessage = document.getElementById('error-message')
    
    if (errorArea && errorMessage) {
      errorMessage.textContent = message
      errorArea.classList.remove('hidden')
    } else {
      alert(message) // フォールバック
    }
  }

  hideError() {
    const errorArea = document.getElementById('error-area')
    if (errorArea) {
      errorArea.classList.add('hidden')
    }
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return ''
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// グローバルインスタンス作成
const kgSearch = new KGSearch()

// DOMContentLoadedイベント
document.addEventListener('DOMContentLoaded', () => {
  console.log('KG Search for Wikidata - 改良版 loaded')
})