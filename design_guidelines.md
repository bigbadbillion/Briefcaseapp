# Briefcase: Design Guidelines

## Brand Identity

**Purpose**: Briefcase empowers sophisticated investors to manage diverse portfolios with AI-driven clarity—replacing scattered spreadsheets with intelligent, unified insights.

**Aesthetic Direction**: **Editorial/Financial Premium**
- Think Bloomberg Terminal meets Swiss design—data-dense yet breathable
- Typographic hierarchy as the hero (numbers and metrics are the content)
- Restrained elegance with intentional color accents
- Precision over decoration; every element earns its space

**Memorable Element**: Portfolio value changes with **subtle kinetic typography**—numbers smoothly animate when updating, creating a sense of living data without feeling gamified.

## Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs) with Floating Action Button
- **Home**: Portfolio overview, total value, allocation charts
- **Holdings**: List of all assets, searchable/filterable
- **Insights**: AI analysis, risk metrics, recommendations
- **Profile**: Settings, preferences, account

**Floating Action Button**: Centered above tab bar—"Add Holding" (primary action)

**Modal Screens**: 
- Add/Edit Holding (full-screen modal)
- Chat with AI (slides up from bottom, 85% height)
- Asset Detail (pushed onto stack from Holdings)

## Screen-by-Screen Specifications

### 1. Home (Dashboard)
**Purpose**: At-a-glance portfolio health and performance
**Layout**:
- **Header**: Transparent, no title, right button: theme toggle icon
- **Root View**: ScrollView with top inset: headerHeight + Spacing.xl, bottom inset: tabBarHeight + Spacing.xl
- **Content**:
  - Portfolio value card (total worth, 24h change %, animated numbers)
  - Allocation pie chart (by asset type: stocks, crypto, real estate, etc.)
  - Performance line chart (7D/1M/3M/1Y/ALL tabs)
  - Quick stats grid (4 metrics: Best Performer, Worst Performer, Total Gain/Loss, Diversification Score)
  - Recent alerts list (3 most recent)
**Components**: Animated value displays, interactive charts, stat cards with subtle gradients

### 2. Holdings
**Purpose**: Browse and search all portfolio assets
**Layout**:
- **Header**: Default navigation, title: "Holdings", right button: filter icon, search bar below title
- **Root View**: FlatList with top inset: Spacing.xl, bottom inset: tabBarHeight + Spacing.xl
- **Content**: Grouped list by asset type (expandable sections)
  - Each item: Asset name, ticker/symbol, quantity, current value, % change (color-coded)
- **Empty State**: Illustration (empty-portfolio.png) with "Add your first holding" CTA
**Components**: Search bar, filter modal, swipeable list items (swipe right for quick edit)

### 3. Insights
**Purpose**: AI-driven portfolio analysis and recommendations
**Layout**:
- **Header**: Transparent, title: "AI Insights", right button: chat icon (opens AI chat modal)
- **Root View**: ScrollView with top inset: headerHeight + Spacing.xl, bottom inset: tabBarHeight + Spacing.xl
- **Content**:
  - Risk score gauge (circular progress)
  - Diversification breakdown (horizontal bar chart by sector/geography)
  - AI-generated insight cards (3-5 actionable recommendations)
  - Concentration risks (list of over-weighted positions)
**Components**: Gauge charts, horizontal bar charts, recommendation cards with icons

### 4. Profile
**Purpose**: Account settings and preferences
**Layout**:
- **Header**: Default navigation, title: "Profile"
- **Root View**: ScrollView with top inset: Spacing.xl, bottom inset: tabBarHeight + Spacing.xl
- **Content**:
  - User avatar (generated, customizable)
  - Display name
  - Theme toggle (Light/Dark)
  - Alert preferences
  - Settings > Account > Delete Account (nested)
  - Log out button (destructive style)
**Components**: Avatar picker, toggle switches, destructive buttons

### 5. Add/Edit Holding (Modal)
**Purpose**: Input asset details
**Layout**:
- **Header**: Default navigation, left: Cancel, title: "Add Holding", right: Save (disabled until valid)
- **Root View**: Scrollable form with top inset: Spacing.xl, bottom inset: Spacing.xl
- **Form Fields**: Asset name, ticker/symbol, asset type (picker), quantity, purchase price, purchase date
**Components**: Text inputs, picker, date picker, validation feedback

### 6. Asset Detail
**Purpose**: Detailed view of single holding
**Layout**:
- **Header**: Default navigation with back button, title: asset name
- **Root View**: ScrollView with top inset: Spacing.xl, bottom inset: Spacing.xl
- **Content**: Current value, price chart (interactive), purchase details, alerts for this asset, edit button
**Components**: Candlestick chart, stats grid, alert configuration

### 7. AI Chat (Modal)
**Purpose**: Natural language portfolio queries
**Layout**:
- **Header**: Custom header with drag indicator, title: "Ask AI", close button
- **Root View**: 85% screen height, chat messages FlatList + text input at bottom
**Components**: Message bubbles, typing indicator, input with send button

## Color Palette

**Primary**: Deep Forest (#1B4332) - trustworthy, sophisticated
**Accent**: Amber (#F4A259) - highlights gains, CTAs
**Background Light**: Off-White (#FAFAFA)
**Background Dark**: Charcoal (#1A1D23)
**Surface Light**: White (#FFFFFF)
**Surface Dark**: Slate (#252932)
**Text Primary Light**: Charcoal (#2B2D35)
**Text Primary Dark**: Soft White (#E8E9ED)
**Text Secondary Light**: Gray (#6B7280)
**Text Secondary Dark**: Light Gray (#9CA3AF)
**Success**: Forest Green (#059669)
**Error**: Brick Red (#DC2626)
**Warning**: Amber (reuse accent)

## Typography

**Font**: **IBM Plex Sans** (professional, legible, distinctive)
- **Display**: Bold, 32pt (portfolio value)
- **H1**: SemiBold, 24pt (screen titles)
- **H2**: SemiBold, 18pt (section headers)
- **Body**: Regular, 16pt (descriptions, list items)
- **Caption**: Regular, 14pt (labels, metadata)
- **Number Display**: Mono variant, 28pt (for financial values)

## Visual Design

**Icons**: Feather icon set from @expo/vector-icons
**Shadows**: Floating buttons only—shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
**Touchable Feedback**: Opacity change (0.7) and subtle scale (0.98) on press
**Chart Style**: Line charts with gradient fills below line, candlesticks with red/green, pie charts with distinct segment colors

## Assets to Generate

1. **icon.png** - App icon: Briefcase with subtle chart graph inside, Forest green and Amber color scheme
2. **splash-icon.png** - Simplified briefcase silhouette for splash screen
3. **empty-portfolio.png** - Minimalist illustration: open briefcase with upward trending arrow, WHERE USED: Holdings empty state
4. **empty-insights.png** - Abstract geometric shapes forming a lightbulb, WHERE USED: Insights screen when insufficient data
5. **chart-placeholder.png** - Subtle grid pattern with placeholder bars, WHERE USED: Charts loading state
6. **avatar-default-1.png** - Professional silhouette avatar option 1
7. **avatar-default-2.png** - Professional silhouette avatar option 2
8. **onboarding-welcome.png** - Briefcase opening with papers flying into organized charts, WHERE USED: First launch welcome screen