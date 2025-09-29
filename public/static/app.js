/**
 * KG Search for Wikidata - 改良版
 * フロントエンド JavaScript
 */

class KGSearch {
  constructor() {
    this.currentResults = []
    this.currentOffset = 0
    this.currentQuery = ''
    this.currentMode = 'label-partial'
    this.currentLang = 'ja'
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
    }
  }

  async performSearch(offset = 0) {
    const searchInput = document.getElementById('search-input')
    const searchMode = document.getElementById('search-mode')
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
    }

    try {
      // 検索パラメータを設定
      this.currentQuery = query
      this.currentMode = searchMode?.value || 'label-partial'
      this.currentLang = searchLang?.value || 'ja'
      this.currentOffset = offset

      // API呼び出し
      const params = new URLSearchParams({
        q: this.currentQuery,
        mode: this.currentMode,
        lang: this.currentLang,
        limit: '50',
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
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-search fa-3x mb-4"></i>
          <p class="text-lg">検索結果が見つかりませんでした</p>
          <p>検索キーワードを変更してお試しください</p>
        </div>
      `
      if (pagination) pagination.innerHTML = ''
      return
    }

    // 検索結果をカード形式で表示
    const resultsHtml = results.map((result, index) => {
      const globalIndex = this.currentOffset + index + 1
      return `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-300 mb-4">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span class="text-blue-600 font-semibold">${globalIndex}</span>
            </div>
            <div class="flex-grow">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                <a href="#" onclick="kgSearch.showEntityDetails('${this.escapeHtml(result.id)}')" 
                   class="text-blue-600 hover:text-blue-800 cursor-pointer">
                  ${this.escapeHtml(result.label || result.id)}
                </a>
              </h3>
              <p class="text-gray-600 mb-2">${this.escapeHtml(result.description || '説明なし')}</p>
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                <span><i class="fas fa-tag mr-1"></i>ID: ${this.escapeHtml(result.id)}</span>
                ${result.concepturi ? `
                  <a href="${this.escapeHtml(result.concepturi)}" target="_blank" 
                     class="text-blue-500 hover:text-blue-700">
                    <i class="fas fa-external-link-alt mr-1"></i>Wikidata
                  </a>
                ` : ''}
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
          onclick="kgSearch.performSearch(${this.currentOffset + 50})"
          class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300">
          <i class="fas fa-chevron-down mr-2"></i>
          さらに読み込む
        </button>
      ` : ''
    }
  }

  async showEntityDetails(entityId) {
    try {
      const loading = document.getElementById('loading')
      loading?.classList.remove('hidden')

      const params = new URLSearchParams({
        lang: this.currentLang
      })

      const response = await fetch(`/api/entity/${entityId}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch entity details')
      }

      this.displayEntityModal(entityId, data.properties)

    } catch (error) {
      console.error('Entity details error:', error)
      this.showError('詳細情報の取得に失敗しました: ' + error.message)
    } finally {
      const loading = document.getElementById('loading')
      loading?.classList.add('hidden')
    }
  }

  displayEntityModal(entityId, properties) {
    // モーダル作成
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-info-circle mr-2"></i>
            ${this.escapeHtml(entityId)} の詳細情報
          </h2>
          <button onclick="this.closest('.fixed').remove()" 
                  class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times fa-lg"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[70vh]">
          ${this.formatEntityProperties(properties)}
        </div>
        <div class="p-6 border-t bg-gray-50">
          <button onclick="this.closest('.fixed').remove()" 
                  class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
            閉じる
          </button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // ESCキーで閉じる
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)
  }

  formatEntityProperties(properties) {
    if (!properties || properties.length === 0) {
      return '<p class="text-gray-500">プロパティ情報がありません</p>'
    }

    // プロパティをグループ化
    const groupedProps = {}
    properties.forEach(prop => {
      const propLabel = prop.propLabel?.value || prop.prop?.value || 'Unknown'
      if (!groupedProps[propLabel]) {
        groupedProps[propLabel] = []
      }
      groupedProps[propLabel].push(prop)
    })

    const propsHtml = Object.entries(groupedProps).map(([propLabel, values]) => `
      <div class="mb-4 border-b border-gray-200 pb-4">
        <h4 class="font-semibold text-gray-700 mb-2">${this.escapeHtml(propLabel)}</h4>
        <div class="pl-4">
          ${values.map(value => {
            const valueText = value.valueLabel?.value || value.value?.value || 'Unknown'
            const isUrl = value.value?.value?.startsWith('http')
            
            if (isUrl) {
              return `<p class="mb-1">
                <a href="${this.escapeHtml(value.value.value)}" target="_blank" 
                   class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-external-link-alt mr-1"></i>
                  ${this.escapeHtml(valueText)}
                </a>
              </p>`
            } else {
              return `<p class="mb-1 text-gray-700">${this.escapeHtml(valueText)}</p>`
            }
          }).join('')}
        </div>
      </div>
    `).join('')

    return propsHtml || '<p class="text-gray-500">表示できるプロパティがありません</p>'
  }

  clearResults() {
    const searchInput = document.getElementById('search-input')
    const resultsArea = document.getElementById('results-area')
    
    if (searchInput) searchInput.value = ''
    resultsArea?.classList.add('hidden')
    this.hideError()
    
    this.currentResults = []
    this.currentOffset = 0
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