import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>KG Search for Wikidata - 改良版</title>
        
        {/* TailwindCSS CDN */}
        <script src="https://cdn.tailwindcss.com"></script>
        
        {/* Font Awesome */}
        <link 
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" 
          rel="stylesheet" 
        />
        
        {/* カスタムスタイル */}
        <link href="/static/style.css" rel="stylesheet" />
        
        {/* メタ情報 */}
        <meta name="description" content="Wikidataを使った知識グラフ検索システム - Hono + Cloudflare Pages実装" />
        <meta name="keywords" content="Wikidata, SPARQL, 知識グラフ, 検索, Hono, Cloudflare" />
      </head>
      <body class="font-sans">
        {children}
        
        {/* JavaScript */}
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
