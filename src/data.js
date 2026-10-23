/** Category metadata only — published articles live in content/posts/<id>/*.md. `color` tints the generated covers; `artCovers` keeps a post's own `cover` image on list cards. */
export const categories = [
  { id: 'methods', cn: '设计方法', en: 'DESIGN METHODS', color: '#bbcba1', intro: '从一个「如果」开始，到一次有意义的选择。', items: [] },
  { id: 'breakdowns', cn: '游戏拆解', en: 'GAME BREAKDOWNS', color: '#85c7ed', artCovers: true, intro: '带着玩家的好奇心，去看设计师的每一个决定。', items: [] },
  { id: 'picks', cn: '精选推荐', en: 'CURATED FINDS', color: '#e6bd68', intro: '收集那些让我停下来、重新思考游戏的灵感。', items: [] },
  { id: 'devlog', cn: '个人游戏开发历程', en: 'DEV JOURNEY', color: '#b99ae9', intro: '把拆解里学到的，一点点变成自己的游戏。', items: [] },
];
