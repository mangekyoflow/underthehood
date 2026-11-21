export type Language = 'en' | 'es' | 'ja' | 'de' | 'fr';

export interface Translations {
  // Brand & Global
  courseTitle: string;
  courseSubtitle: string;
  badgeInteractive: string;
  courseIndex: string;
  modulesCount: string;
  allModulesCount: string;
  searchPlaceholder: string;
  searchShortcut: string;
  searchButton: string;
  themeToggle: string;
  close: string;

  // Navigation Suite Tabs
  tabSecurity: string;
  tabRoute: string;
  tabQuery: string;
  tabActuate: string;
  tabSilicon: string;
  tabHome: string;

  // Track Titles & Subtitles
  trackAuth: string;
  trackExploits: string;
  trackArch: string;
  trackCrypto: string;
  trackRouteTitle: string;
  trackRouteSubtitle: string;
  trackQueryTitle: string;
  trackQuerySubtitle: string;
  trackActuateTitle: string;
  trackActuateSubtitle: string;
  trackTapeoutTitle: string;
  trackTapeoutSubtitle: string;

  // Audio & Reference Controls
  referenceManual: string;
  tactileSound: string;
  enableSound: string;
  muteSound: string;

  // Levels & Steps Controls
  levelBeginner: string;
  levelIntermediate: string;
  levelAdvanced: string;
  stepOf: string;
  prevStep: string;
  nextStep: string;
  resetStep: string;
  autoPlay: string;
  pause: string;
  keyboardHint: string;

  // Deep Dive Tabs & Editorial Content
  tabStep: string;
  tabCve: string;
  tabHardening: string;
  tabFaqs: string;
  wireProtocolAction: string;
  coreArchitecturalRule: string;
  codeImplementation: string;
  copyCode: string;
  copied: string;
  mandatoryControls: string;
  targetOrganization: string;
  blastRadius: string;
  incidentBreakdown: string;
  rootCauseTakeaway: string;
  engineeringInquiries: string;

  // Threat Modeling
  threatModelTitle: string;
  threatActor: string;
  threatGoal: string;
  threatVuln: string;
  threatDefense: string;
  keyConceptsTitle: string;

  // Challenges
  challengesTitle: string;
  challengesSolved: string;
  challengeVerify: string;
  challengeHint: string;
  challengeHideHint: string;
  challengeSolvedBadge: string;

  // Search Modal
  searchModalTitle: string;
  searchModalSubtitle: string;
  noResults: string;
  navigateKey: string;
  selectKey: string;
  modulesIndexed: string;

  // Hardware / Structure Viewers
  structureInspector: string;
  switchModule: string;
  viewStructure: string;

  // Footer
  footerTitle: string;
  footerTagline: string;
  builtForSystems: string;

  // PWA & Offline
  installApp: string;
  appInstalled: string;
  offlineMode: string;
  updateAvailable: string;
  reload: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    courseTitle: 'Designed to Secure',
    courseSubtitle: 'Web Security, Identity & Applied Cryptography',
    badgeInteractive: 'interactive',
    courseIndex: 'Course Index',
    modulesCount: '23 Modules',
    allModulesCount: '35 Interactive Modules',
    searchPlaceholder: 'Search attacks, protocols, CVEs, or systems engines...',
    searchShortcut: '⌘K',
    searchButton: 'Search',
    themeToggle: 'Toggle color theme',
    close: 'Close',
    tabSecurity: 'Security',
    tabRoute: 'Route',
    tabQuery: 'Query',
    tabActuate: 'Actuate',
    tabSilicon: 'Silicon',
    tabHome: 'Home',
    trackAuth: '1. Identity & Auth',
    trackExploits: '2. Web Exploits',
    trackArch: '3. Cloud & Zero Trust',
    trackCrypto: '4. Cryptography & Data',
    trackRouteTitle: 'Designed to Route',
    trackRouteSubtitle: 'Networking, Packet Plumbing & Capacity',
    trackQueryTitle: 'Designed to Query',
    trackQuerySubtitle: 'Database Internals & Storage Engines',
    trackActuateTitle: 'Designed to Actuate',
    trackActuateSubtitle: 'Robotics, Physical AI & Real-Time Control',
    trackTapeoutTitle: 'Designed to Tapeout',
    trackTapeoutSubtitle: 'VLSI, Design Verification & Pre-Silicon Emulation',
    referenceManual: 'Reference',
    tactileSound: 'Tactile Audio',
    enableSound: 'Enable Tactile Audio',
    muteSound: 'Mute Tactile Audio',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediate',
    levelAdvanced: 'Advanced',
    stepOf: 'Step {current} of {total}',
    prevStep: 'Previous',
    nextStep: 'Next Step',
    resetStep: 'Reset',
    autoPlay: 'Auto-Play',
    pause: 'Pause',
    keyboardHint: 'Use [←] and [→] arrow keys',
    tabStep: 'Step Walkthrough',
    tabCve: 'CVE Case Study',
    tabHardening: 'Production Hardening',
    tabFaqs: 'Security FAQs',
    wireProtocolAction: 'Wire Protocol Action',
    coreArchitecturalRule: 'Core Architectural Rule',
    codeImplementation: 'Code Implementation',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    mandatoryControls: 'Mandatory Production Controls',
    targetOrganization: 'Target Organization',
    blastRadius: 'Blast Radius / Damage',
    incidentBreakdown: 'Incident Breakdown & Exploit Anatomy',
    rootCauseTakeaway: 'Root Cause & Engineering Takeaway',
    engineeringInquiries: 'Frequently Asked Questions & Nuances',
    threatModelTitle: 'Threat Model & Security Boundary',
    threatActor: 'Threat Actor',
    threatGoal: 'Adversary Goal',
    threatVuln: 'Target Vulnerability',
    threatDefense: 'Architectural Defense',
    keyConceptsTitle: 'Key Concepts Mastered in this Module',
    challengesTitle: 'Interactive Security Challenges',
    challengesSolved: '{solved} / {total} Solved',
    challengeVerify: 'Verify',
    challengeHint: 'Hint',
    challengeHideHint: 'Hide Hint',
    challengeSolvedBadge: 'SOLVED',
    searchModalTitle: 'Search Curriculum & Security Concepts',
    searchModalSubtitle: 'Quickly find attacks, defenses, RFC protocols, and case studies',
    noResults: 'No matching lessons or concepts found.',
    navigateKey: 'Navigate',
    selectKey: 'Select',
    modulesIndexed: '35 Modules Indexed (23 Security + 12 Systems)',
    structureInspector: 'Physical Structure & Topology Inspector',
    switchModule: 'Modules',
    viewStructure: 'Hardware View',
    footerTitle: 'Designed to Scale Unified Suite',
    footerTagline: '35 Explorable Modules across Security, Networking, Storage, Robotics & Silicon',
    builtForSystems: 'Built for tactile systems engineering and security comprehension.',
    installApp: 'Install App',
    appInstalled: 'Installed',
    offlineMode: 'Offline Mode',
    updateAvailable: 'New version available',
    reload: 'Reload',
  },
  es: {
    courseTitle: 'Diseñado para Asegurar',
    courseSubtitle: 'Seguridad Web, Identidad y Criptografía Aplicada',
    badgeInteractive: 'interactivo',
    courseIndex: 'Índice del Curso',
    modulesCount: '23 Módulos',
    allModulesCount: '35 Módulos Interactivos',
    searchPlaceholder: 'Buscar ataques, protocolos, CVEs o motores de sistemas...',
    searchShortcut: '⌘K',
    searchButton: 'Buscar',
    themeToggle: 'Cambiar tema de color',
    close: 'Cerrar',
    tabSecurity: 'Seguridad',
    tabRoute: 'Enrutamiento',
    tabQuery: 'Consultas',
    tabActuate: 'Actuación',
    tabSilicon: 'Silicio',
    tabHome: 'Inicio',
    trackAuth: '1. Identidad y Auth',
    trackExploits: '2. Exploits Web',
    trackArch: '3. Nube y Zero Trust',
    trackCrypto: '4. Criptografía y Datos',
    trackRouteTitle: 'Diseñado para Enrutar',
    trackRouteSubtitle: 'Redes, Flujo de Paquetes y Capacidad',
    trackQueryTitle: 'Diseñado para Consultar',
    trackQuerySubtitle: 'Motores de Almacenamiento e Internos de BD',
    trackActuateTitle: 'Diseñado para Actuar',
    trackActuateSubtitle: 'Robótica, IA Física y Control en Tiempo Real',
    trackTapeoutTitle: 'Diseñado para Tapeout',
    trackTapeoutSubtitle: 'VLSI, Verificación de Diseño y Emulación Pre-Silicio',
    referenceManual: 'Referencia',
    tactileSound: 'Audio Táctil',
    enableSound: 'Activar Audio Táctil',
    muteSound: 'Silenciar Audio Táctil',
    levelBeginner: 'Principiante',
    levelIntermediate: 'Intermedio',
    levelAdvanced: 'Avanzado',
    stepOf: 'Paso {current} de {total}',
    prevStep: 'Anterior',
    nextStep: 'Siguiente',
    resetStep: 'Reiniciar',
    autoPlay: 'Auto-Reproducir',
    pause: 'Pausar',
    keyboardHint: 'Usa las teclas de flecha [←] y [→]',
    tabStep: 'Paso a Paso',
    tabCve: 'Caso de Estudio CVE',
    tabHardening: 'Fortalecimiento Productivo',
    tabFaqs: 'Preguntas Frecuentes',
    wireProtocolAction: 'Acción del Protocolo de Red',
    coreArchitecturalRule: 'Regla Arquitectónica Central',
    codeImplementation: 'Implementación de Código',
    copyCode: 'Copiar Código',
    copied: '¡Copiado!',
    mandatoryControls: 'Controles Obligatorios de Producción',
    targetOrganization: 'Organización Objetivo',
    blastRadius: 'Radio de Impacto / Daño',
    incidentBreakdown: 'Desglose del Incidente y Anatomía del Exploit',
    rootCauseTakeaway: 'Causa Raíz y Lección de Ingeniería',
    engineeringInquiries: 'Preguntas Frecuentes y Matices Técnicos',
    threatModelTitle: 'Modelo de Amenazas y Límites de Seguridad',
    threatActor: 'Actor de Amenaza',
    threatGoal: 'Objetivo del Adversario',
    threatVuln: 'Vulnerabilidad Objetivo',
    threatDefense: 'Defensa Arquitectónica',
    keyConceptsTitle: 'Conceptos Clave Dominados en este Módulo',
    challengesTitle: 'Desafíos Interactivos de Seguridad',
    challengesSolved: '{solved} / {total} Resueltos',
    challengeVerify: 'Verificar',
    challengeHint: 'Pista',
    challengeHideHint: 'Ocultar Pista',
    challengeSolvedBadge: 'RESUELTO',
    searchModalTitle: 'Buscar Currículo y Conceptos de Seguridad',
    searchModalSubtitle: 'Encuentra rápidamente ataques, defensas, protocolos y casos de estudio',
    noResults: 'No se encontraron lecciones o conceptos coincidentes.',
    navigateKey: 'Navegar',
    selectKey: 'Seleccionar',
    modulesIndexed: '35 Módulos Indexados (23 Seguridad + 12 Sistemas)',
    structureInspector: 'Inspector de Estructura Física y Topología',
    switchModule: 'Módulos',
    viewStructure: 'Vista de Hardware',
    footerTitle: 'Suite Unificada Designed to Scale',
    footerTagline: '35 Módulos Explorables en Seguridad, Redes, Almacenamiento, Robótica y Silicio',
    builtForSystems:
      'Diseñado para la ingeniería de sistemas táctil y la comprensión de seguridad.',
    installApp: 'Instalar App',
    appInstalled: 'Instalada',
    offlineMode: 'Modo sin conexión',
    updateAvailable: 'Nueva versión disponible',
    reload: 'Recargar',
  },
  ja: {
    courseTitle: 'Designed to Secure',
    courseSubtitle: 'Webセキュリティ、アイデンティティ、応用暗号学',
    badgeInteractive: 'インタラクティブ',
    courseIndex: 'コース目次',
    modulesCount: '23モジュール',
    allModulesCount: '35体験型モジュール',
    searchPlaceholder: '攻撃手法、プロトコル、CVE、システムエンジンを検索...',
    searchShortcut: '⌘K',
    searchButton: '検索',
    themeToggle: 'テーマ切り替え',
    close: '閉じる',
    tabSecurity: 'セキュリティ',
    tabRoute: 'ルーティング',
    tabQuery: 'クエリ',
    tabActuate: 'アクチュエーション',
    tabSilicon: 'シリコン',
    tabHome: 'ホーム',
    trackAuth: '1. 認証とアイデンティティ',
    trackExploits: '2. Web脆弱性と防御',
    trackArch: '3. クラウドとゼロトラスト',
    trackCrypto: '4. 暗号とデータ保護',
    trackRouteTitle: 'Designed to Route',
    trackRouteSubtitle: 'ネットワーキング、パケット配信、キャパシティ設計',
    trackQueryTitle: 'Designed to Query',
    trackQuerySubtitle: 'データベース内部構造とストレージエンジン',
    trackActuateTitle: 'Designed to Actuate',
    trackActuateSubtitle: 'ロボティクス、物理AI、リアルタイム制御',
    trackTapeoutTitle: 'Designed to Tapeout',
    trackTapeoutSubtitle: 'VLSI、設計検証、プリシリコンエミュレーション',
    referenceManual: 'リファレンス',
    tactileSound: '触覚サウンド',
    enableSound: 'サウンドを有効化',
    muteSound: 'サウンドをミュート',
    levelBeginner: '初級',
    levelIntermediate: '中級',
    levelAdvanced: '上級',
    stepOf: 'ステップ {current} / {total}',
    prevStep: '前へ',
    nextStep: '次へ',
    resetStep: 'リセット',
    autoPlay: '自動再生',
    pause: '一時停止',
    keyboardHint: '[←] と [→] キーで移動',
    tabStep: 'ステップ解説',
    tabCve: 'CVE事例研究',
    tabHardening: '本番環境の堅牢化',
    tabFaqs: 'セキュリティFAQ',
    wireProtocolAction: '通信プロトコル動作',
    coreArchitecturalRule: 'アーキテクチャ中核原則',
    codeImplementation: 'コード実装',
    copyCode: 'コードをコピー',
    copied: 'コピー完了！',
    mandatoryControls: '本番必須コントロール',
    targetOrganization: '対象組織',
    blastRadius: '被害規模 / 影響範囲',
    incidentBreakdown: 'インシデント分析とエクスプロイト解剖',
    rootCauseTakeaway: '根本原因とエンジニアリングの教訓',
    engineeringInquiries: 'よくある質問と技術的ニュアンス',
    threatModelTitle: '脅威モデルとセキュリティ境界',
    threatActor: '攻撃者',
    threatGoal: '攻撃目標',
    threatVuln: '対象の脆弱性',
    threatDefense: 'アーキテクチャ防御',
    keyConceptsTitle: 'このモジュールで習得する主要概念',
    challengesTitle: '体験型セキュリティ・チャレンジ',
    challengesSolved: '{solved} / {total} 完了',
    challengeVerify: '検証',
    challengeHint: 'ヒント',
    challengeHideHint: 'ヒントを隠す',
    challengeSolvedBadge: '達成',
    searchModalTitle: 'カリキュラムとセキュリティ概念の検索',
    searchModalSubtitle: '攻撃手法、防御策、RFCプロトコル、事例を素早く検索',
    noResults: '該当するレッスンまたは概念が見つかりません。',
    navigateKey: '移動',
    selectKey: '選択',
    modulesIndexed: '35モジュールをインデックス化 (セキュリティ23 + システム12)',
    structureInspector: '物理構造およびトポロジー・インスペクター',
    switchModule: 'モジュール',
    viewStructure: 'ハードウェア構造',
    footerTitle: 'Designed to Scale 統合スイート',
    footerTagline:
      'セキュリティ、ネットワーク、ストレージ、ロボティクス、シリコンにわたる35の体験型モジュール',
    builtForSystems: '触覚的システム工学と直感的なセキュリティ理解のために設計。',
    installApp: 'アプリをインストール',
    appInstalled: 'インストール済み',
    offlineMode: 'オフラインモード',
    updateAvailable: '新しいバージョンがあります',
    reload: '再読み込み',
  },
  de: {
    courseTitle: 'Designed to Secure',
    courseSubtitle: 'Websicherheit, Identität & Angewandte Kryptographie',
    badgeInteractive: 'interaktiv',
    courseIndex: 'Kursübersicht',
    modulesCount: '23 Module',
    allModulesCount: '35 interaktive Module',
    searchPlaceholder: 'Angriffe, Protokolle, CVEs oder Speicher-Engines durchsuchen...',
    searchShortcut: '⌘K',
    searchButton: 'Suchen',
    themeToggle: 'Farbthema wechseln',
    close: 'Schließen',
    tabSecurity: 'Sicherheit',
    tabRoute: 'Routing',
    tabQuery: 'Datenbank',
    tabActuate: 'Robotik',
    tabSilicon: 'Halbleiter',
    tabHome: 'Startseite',
    trackAuth: '1. Identität & Authentifizierung',
    trackExploits: '2. Web-Exploits & Schutz',
    trackArch: '3. Cloud & Zero Trust',
    trackCrypto: '4. Kryptographie & Daten',
    trackRouteTitle: 'Designed to Route',
    trackRouteSubtitle: 'Netzwerktechnik, Paketfluss & Kapazitätsplanung',
    trackQueryTitle: 'Designed to Query',
    trackQuerySubtitle: 'Datenbank-Interna & Storage-Engines',
    trackActuateTitle: 'Designed to Actuate',
    trackActuateSubtitle: 'Robotik, Physische KI & Echtzeit-Steuerung',
    trackTapeoutTitle: 'Designed to Tapeout',
    trackTapeoutSubtitle: 'VLSI, Design-Verifikation & Pre-Silicon-Emulation',
    referenceManual: 'Referenz',
    tactileSound: 'Haptischer Ton',
    enableSound: 'Ton aktivieren',
    muteSound: 'Ton stummschalten',
    levelBeginner: 'Anfänger',
    levelIntermediate: 'Mittelstufe',
    levelAdvanced: 'Fortgeschritten',
    stepOf: 'Schritt {current} von {total}',
    prevStep: 'Zurück',
    nextStep: 'Weiter',
    resetStep: 'Zurücksetzen',
    autoPlay: 'Autoplay',
    pause: 'Pause',
    keyboardHint: 'Pfeiltasten [←] und [→] nutzen',
    tabStep: 'Schritt-Analyse',
    tabCve: 'CVE Fallstudie',
    tabHardening: 'Produktions-Hardening',
    tabFaqs: 'Sicherheits-FAQs',
    wireProtocolAction: 'Protokoll-Aktion',
    coreArchitecturalRule: 'Zentrales Architektur-Prinzip',
    codeImplementation: 'Code-Implementierung',
    copyCode: 'Code kopieren',
    copied: 'Kopiert!',
    mandatoryControls: 'Pflichtkontrollen für Produktion',
    targetOrganization: 'Betroffene Organisation',
    blastRadius: 'Schadensausmaß / Schadensradius',
    incidentBreakdown: 'Analyse des Vorfalls & Exploit-Anatomie',
    rootCauseTakeaway: 'Ursache & Erkenntnisse für die Entwicklung',
    engineeringInquiries: 'Häufige Fragen & Technische Nuancen',
    threatModelTitle: 'Bedrohungsmodell & Sicherheitsgrenzen',
    threatActor: 'Angreifer',
    threatGoal: 'Ziel des Angreifers',
    threatVuln: 'Sicherheitslücke',
    threatDefense: 'Architektur-Verteidigung',
    keyConceptsTitle: 'Kernkonzepte dieses Moduls',
    challengesTitle: 'Interaktive Sicherheits-Herausforderungen',
    challengesSolved: '{solved} / {total} Gelöst',
    challengeVerify: 'Überprüfen',
    challengeHint: 'Hinweis',
    challengeHideHint: 'Hinweis verbergen',
    challengeSolvedBadge: 'GELÖST',
    searchModalTitle: 'Lehrplan & Sicherheitskonzepte durchsuchen',
    searchModalSubtitle: 'Schnell nach Angriffen, Abwehrmaßnahmen und Protokollen suchen',
    noResults: 'Keine passenden Lektionen oder Konzepte gefunden.',
    navigateKey: 'Navigieren',
    selectKey: 'Auswählen',
    modulesIndexed: '35 Module indexiert (23 Sicherheit + 12 Systeme)',
    structureInspector: 'Inspektor für physische Struktur & Topologie',
    switchModule: 'Module',
    viewStructure: 'Hardware-Ansicht',
    footerTitle: 'Designed to Scale Gesamtsuite',
    footerTagline:
      '35 interaktive Module für Sicherheit, Netzwerke, Storage, Robotik und Halbleiter',
    builtForSystems:
      'Entwickelt für greifbare Systemtechnik und intuitives Sicherheitsverständnis.',
    installApp: 'App installieren',
    appInstalled: 'Installiert',
    offlineMode: 'Offline-Modus',
    updateAvailable: 'Neue Version verfügbar',
    reload: 'Neu laden',
  },
  fr: {
    courseTitle: 'Designed to Secure',
    courseSubtitle: 'Sécurité Web, Identité et Cryptographie Appliquée',
    badgeInteractive: 'interactif',
    courseIndex: 'Index du cours',
    modulesCount: '23 Modules',
    allModulesCount: '35 modules interactifs',
    searchPlaceholder: 'Rechercher attaques, protocoles, CVE ou moteurs système...',
    searchShortcut: '⌘K',
    searchButton: 'Rechercher',
    themeToggle: 'Changer de thème',
    close: 'Fermer',
    tabSecurity: 'Sécurité',
    tabRoute: 'Routage',
    tabQuery: 'Requêtes',
    tabActuate: 'Robotique',
    tabSilicon: 'Silicium',
    tabHome: 'Accueil',
    trackAuth: '1. Identité & Authentification',
    trackExploits: '2. Exploits Web & Défenses',
    trackArch: '3. Cloud & Zero Trust',
    trackCrypto: '4. Cryptographie & Données',
    trackRouteTitle: 'Designed to Route',
    trackRouteSubtitle: 'Réseaux, Acheminement de Paquets & Dimensionnement',
    trackQueryTitle: 'Designed to Query',
    trackQuerySubtitle: 'Moteurs de Stockage & Internes de Base de Données',
    trackActuateTitle: 'Designed to Actuate',
    trackActuateSubtitle: 'Robotique, IA Physique & Contrôle Temps Réel',
    trackTapeoutTitle: 'Designed to Tapeout',
    trackTapeoutSubtitle: 'VLSI, Vérification de Conception & Émulation Pré-Silicium',
    referenceManual: 'Référence',
    tactileSound: 'Son Tactile',
    enableSound: 'Activer le son tactile',
    muteSound: 'Couper le son tactile',
    levelBeginner: 'Débutant',
    levelIntermediate: 'Intermédiaire',
    levelAdvanced: 'Avancé',
    stepOf: 'Étape {current} sur {total}',
    prevStep: 'Précédent',
    nextStep: 'Suivant',
    resetStep: 'Réinitialiser',
    autoPlay: 'Lecture auto',
    pause: 'Pause',
    keyboardHint: 'Touches fléchées [←] et [→]',
    tabStep: 'Explication Étape',
    tabCve: 'Étude de cas CVE',
    tabHardening: 'Durcissement Production',
    tabFaqs: 'FAQ Sécurité',
    wireProtocolAction: 'Action Protocole Réseau',
    coreArchitecturalRule: 'Règle Architecturale Fondamentale',
    codeImplementation: 'Implémentation du Code',
    copyCode: 'Copier le code',
    copied: 'Copié !',
    mandatoryControls: 'Contrôles Obligatoires en Production',
    targetOrganization: 'Organisation Cible',
    blastRadius: "Rayon d'Impact / Dommages",
    incidentBreakdown: "Anatomie de l'Incident & Détail de l'Exploit",
    rootCauseTakeaway: 'Cause Racine & Enseignement Ingénierie',
    engineeringInquiries: 'Foire Aux Questions & Subtilités Techniques',
    threatModelTitle: 'Modèle de Menaces & Frontières',
    threatActor: 'Acteur de la Menace',
    threatGoal: "Objectif de l'Adversaire",
    threatVuln: 'Vulnérabilité Ciblée',
    threatDefense: 'Défense Architecturale',
    keyConceptsTitle: 'Concepts Clés Maîtrisés dans ce Module',
    challengesTitle: 'Défis de Sécurité Interactifs',
    challengesSolved: '{solved} / {total} Résolus',
    challengeVerify: 'Vérifier',
    challengeHint: 'Indice',
    challengeHideHint: "Masquer l'indice",
    challengeSolvedBadge: 'RÉSOLU',
    searchModalTitle: 'Rechercher dans le Programme & Lexique',
    searchModalSubtitle: 'Trouvez rapidement attaques, défenses, protocoles et études de cas',
    noResults: 'Aucune leçon ou concept correspondant trouvé.',
    navigateKey: 'Naviguer',
    selectKey: 'Sélectionner',
    modulesIndexed: '35 modules indexés (23 Sécurité + 12 Systèmes)',
    structureInspector: 'Inspecteur de Structure Physique & Topologie',
    switchModule: 'Modules',
    viewStructure: 'Vue Matérielle',
    footerTitle: 'Suite Unifiée Designed to Scale',
    footerTagline:
      '35 modules interactifs à travers la Sécurité, les Réseaux, le Stockage, la Robotique et le Silicium',
    builtForSystems:
      "Conçu pour l'ingénierie des systèmes tactile et la compréhension de la sécurité.",
    installApp: "Installer l'app",
    appInstalled: 'Installée',
    offlineMode: 'Mode hors ligne',
    updateAvailable: 'Nouvelle version disponible',
    reload: 'Recharger',
  },
};
