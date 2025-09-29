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

    // 検索結果を元のKGSearch風のテーブル形式で表示
    const resultsHtml = results.map((result, index) => {
      const globalIndex = this.currentOffset + index + 1
      return `
        <div class="result-item border-b border-gray-100 last:border-b-0" id="item-${result.id}">
          <div class="py-3 hover:bg-gray-50 transition duration-200">
            <div class="flex items-center justify-between">
              <div class="flex-grow">
                <div class="flex items-start space-x-3">
                  <div class="text-blue-600 font-mono text-sm min-w-0 flex-shrink-0">
                    ${this.escapeHtml(result.id)}
                  </div>
                  <div class="min-w-0 flex-grow">
                    <div class="font-medium text-gray-900 mb-1">
                      ${this.escapeHtml(result.label || result.id)}
                    </div>
                    <div class="text-sm text-gray-600">
                      ${this.escapeHtml(result.description || '')}
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2 flex-shrink-0">
                <button 
                  onclick="kgSearch.toggleEntityDetails('${result.id}')"
                  class="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition duration-200"
                >
                  <i class="fas fa-chevron-down mr-1" id="chevron-${result.id}"></i>
                  詳細
                </button>
                ${result.concepturi ? `
                  <a href="${this.escapeHtml(result.concepturi)}" target="_blank" 
                     class="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 transition duration-200">
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                ` : ''}
              </div>
            </div>
            
            <!-- 詳細情報表示エリア -->
            <div id="details-${result.id}" class="hidden mt-4 ml-6 pl-4 border-l-2 border-blue-200 bg-blue-50 rounded-r-lg">
              <div class="py-3">
                <div class="flex items-center mb-2">
                  <i class="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
                  <span class="text-blue-600 text-sm">詳細情報を読み込み中...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }).join('')

    if (isAppend) {
      resultsContent.insertAdjacentHTML('beforeend', resultsHtml)
    } else {
      resultsContent.innerHTML = resultsHtml
    }

    // ページネーション
    if (pagination) {
      pagination.innerHTML = hasMore ? `
        <button 
          onclick="kgSearch.performSearch(${this.currentOffset + 20})"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded text-sm transition duration-200">
          <i class="fas fa-chevron-down mr-2"></i>
          さらに読み込む（20件）
        </button>
      ` : ''
    }
  }

  async toggleEntityDetails(entityId) {
    const detailsElement = document.getElementById(`details-${entityId}`)
    const chevronElement = document.getElementById(`chevron-${entityId}`)
    
    if (!detailsElement) return
    
    if (this.expandedItems.has(entityId)) {
      // 閉じる
      detailsElement.classList.add('hidden')
      chevronElement?.classList.remove('fa-chevron-up')
      chevronElement?.classList.add('fa-chevron-down')
      this.expandedItems.delete(entityId)
    } else {
      // 開く
      detailsElement.classList.remove('hidden')
      chevronElement?.classList.remove('fa-chevron-down')
      chevronElement?.classList.add('fa-chevron-up')
      this.expandedItems.add(entityId)
      
      // まだ詳細情報を取得していない場合は取得
      if (!detailsElement.dataset.loaded) {
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
      const valuesList = values.map(value => {
        // 日本語ラベル -> 英語ラベル -> 元の値の優先順
        let valueText = value.valueJaLabel?.value || value.valueLabel?.value || value.value?.value || 'Unknown'
        let valueDescription = value.valueDescription?.value || ''
        
        const isUrl = value.value?.value?.startsWith('http')
        const isImage = isUrl && (value.value.value.includes('.jpg') || value.value.value.includes('.png') || value.value.value.includes('.jpeg'))
        
        if (isImage) {
          return `
            <div class="mb-2">
              <img src="${this.escapeHtml(value.value.value)}" alt="${this.escapeHtml(valueText)}" 
                   class="max-w-32 max-h-24 object-cover rounded border">
            </div>
          `
        } else if (isUrl) {
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