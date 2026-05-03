# Inmigreat App · Emotional Intelligence redesign

This repo is a redesign of the Inmigreat consumer mobile app
([github.com/MyNotir/Inmigreat-App](https://github.com/MyNotir/Inmigreat-App))
applying the Emotional Intelligence (EI) design system used on the
Inmigreat Pro web stack. Same React Native + Expo + Cognito + GraphQL
foundation; new visual language, new tone system, new escalation
patterns specifically tuned to immigration's emotional load.

## Why EI design

Immigration is one of the 3-4 most emotionally charged contexts in
software (alongside healthcare, finance, and grief). A user opens the
app scared, often in mid-crisis. Every screen is an emotional
decision. The original UI is competent, glassmorphic, blue-heavy —
and emotionally cold. The EI redesign keeps the data architecture and
shifts the surface to **warm minimalism + tone-aware interactions**
the way 2026 design trend work is converging.

References that fed this redesign:

- Don Norman, *Emotional Design* (2004) — 3-level model: visceral,
  behavioral, reflective.
- UX Collective 2026 trends roundup — calm interfaces, transparent
  AI, emotionally intelligent UX.
- Tubik 2026 UI trends — warm minimalism replacing Instagram-grey
  performative minimalism.
- Free the Birds, "aesthetics of feeling" 2026 brand trends.

## What changed

### 1. Palette extended with warm EI tones

`src/styles/theme.ts` now has the same Pro brand spine (navy
`#153480`, purple `#634ECC`, gold `#C97A00`) plus a warm minimalism
overlay used in stress contexts:

| Token | Hex | Where it shows up |
|---|---|---|
| `warm.cream` | `#FBF6EE` | Empathetic surface bg (RFE banner, support pill, denial card) |
| `warm.sand` | `#EDE4D3` | Secondary warm surface (`WarmCard` gradient end) |
| `warm.peach` | `#F4D8C8` | Acute-stress accent (denial, ICE, deportation flows) |
| `warm.clay` | `#C99B7E` | Earth-tone borders, headings on warm cards |
| `warm.sage` | `#B8C9B9` | Calm "on-track" success on warm cards |
| `warm.ink` | `#3B2E2A` | Primary text on warm cards |

A new `StressLevel` type (`'calm' | 'elevated' | 'acute'`) drives
which surface/treatment to render. Cool blues stay for routine state.
Warm tones take over in stress.

### 2. Three new EI primitives

- **`<WarmCard intensity="calm|elevated|acute">`** —
  cream→sand vertical gradient, soft clay border, embedded paper
  grain SVG overlay, generous internal padding. The base surface for
  any panel in a stress context. `intensity="acute"` switches to a
  cream→peach gradient and strengthens the border.
  Path: `src/components/common/WarmCard.tsx`.
- **`<SupportPill />`** — persistent floating off-ramp (bottom-right
  on every screen). Tap opens a warm bottom sheet offering free Lexi
  chat, verified human attorney, plus an inline AILA hotline link
  (`1-800-954-0254`) for actual immigration emergencies (ICE
  detention, imminent deportation). Never gated, never sold.
  Path: `src/components/common/SupportPill.tsx`.
- **`<StressBanner level="elevated|acute">`** — context-aware
  acknowledgement that headlines RFE / hearing-day / denial events
  with the user's emotion FIRST, action second. Routes to support if
  needed.
  Path: `src/components/common/StressBanner.tsx`.

### 3. Tone-aware Lexi

`<ToneAwareMessageBubble />` replaces the original `MessageBubble`. It
inspects the user's most recent message and shifts Lexi's reply
treatment based on detected stress keywords:

- **Neutral**: "ELO 3 días", "qué llevo a la entrevista". Standard
  cool bubble.
- **Elevated** (keywords: *miedo*, *perdid*, *abrumad*, *scared*,
  *anxious*): warm-cream bubble, opens with `"Sé que esto da miedo.
  Estoy aquí."` before the answer.
- **Acute** (keywords: *ICE*, *deport*, *detained*, *negaron*,
  *removal*, *emergencia*): warm-peach bubble, opens with `"Te oigo.
  Vamos paso a paso."`, generous spacing, and inline "Hablar con un
  humano →" CTA that escalates out of AI.

This is the most important EI move of the redesign: Lexi never gives
information *before* validating the emotion in actual crisis turns.
Path: `src/components/common/ToneAwareMessageBubble.tsx`.

## Application map

| Screen | EI treatment |
|---|---|
| `CaseDetailScreen` | `<StressBanner>` for RFE / hearing / denial. `<WarmCard intensity="acute">` for the active-action panel. Timeline events recolor: `warm.sage` for completed, `warm.clay` for action required, `warm.peach` for urgent. |
| `ChatScreen` | `<ToneAwareMessageBubble>` everywhere. SupportPill always visible. Suggested questions in clay accent. |
| `CasesScreen` | Case cards swap glass for `<WarmCard intensity="elevated">` when status is RFE/denial/hearing-soon. Status badges use `status.*Warm` palette. |
| Onboarding | Cool gradient stays — first impression is calm and trustworthy, not stressed. |
| Community | Cool default. Posts flagged `support` (auto-detected by AILA keywords) get a `<StressBanner>` overlay. |

## Implementation status

### Foundation

- ✅ Theme tokens (palette + StressLevel type)
- ✅ Warm gradient as `AnimatedBackground` default — every screen still
  using AnimatedBackground inherits the cream→sand→cream→peach cycle
- ✅ `glassmorphism.ts` — `createGlassBackground` flipped to cream tint,
  `createGlassBorder` flipped to clay. Every `GlassCard` system-wide is
  now warm by default without per-component edits

### Primitives

- ✅ `<WarmCard intensity="calm|elevated|acute">` — paper-grain SVG, three
  stress treatments
- ✅ `<WarmButton>` — primary / secondary / ghost × default / urgent / sage
  tones × sm / md / lg sizes, soft press feedback (scale + opacity)
- ✅ `<WarmInput>` — cream surface, clay focus ring, urgentWarm error
- ✅ `<WarmScreen>` — full-screen warm gradient wrapper with default /
  acute / calm presets and safe-area handling
- ✅ `<WarmListItem>` — list row with attention prop for peach-tinted
  flagged rows
- ✅ `<WarmHeader>` — compact warm screen header with optional acute
  underline accent
- ✅ `<WarmDivider>`, `<WarmSectionLabel>` — tertiary scaffolding
- ✅ `<SupportPill>` — floating crisis off-ramp, mounted at root nav so
  it shows on every authenticated screen, auto-hides with keyboard
- ✅ `<StressBanner>` — context-aware emotion-first banner, used by
  `CasesScreen` to surface acute / elevated cases at the top
- ✅ `<ToneAwareMessageBubble>` — keyword-driven tone shifting

### Screens deep-rebuilt (full warm rewrite, EI copy, primitives)

- ✅ `SplashScreen` — warm gradient hero, 3 reassurance bullets
- ✅ `LanguageScreen` — WarmListItem rows with flag medallions
- ✅ `NameScreen` — WarmCard form, sage notice strip
- ✅ `LoginScreen` — WarmCard with WarmInput stack + WarmButton, sand
  pill toggle for login/register, social buttons preserved
- ✅ `ForgotPasswordScreen` — 'Le pasa a todos. Te lo recuperamos.'
- ✅ `ConfirmRegistrationScreen` — sand-tinted email chip + WarmInput
  6-digit code + WarmInput password, sage 'código reenviado' notice
- ✅ `ResetPasswordScreen` — 3-WarmInput form
- ✅ `BiometricScreen` — 'Tu cara, tu llave' calm reframe
- ✅ `ChatScreen` — warm header (sage online dot, clay typing dot),
  warm context chips, sage memory badge, full-bleed warm welcome
- ✅ `CasesScreen` — eyebrow / warm header / StressBanner-at-top
  surfacing the first acute or elevated case
- ✅ `EIPreviewScreen` — primitives showcase, accessible from Splash
  without auth

### Components deep-rebuilt

- ✅ `ChatInput`, `MessageBubble` (tone-aware), `TypingIndicator`,
  `SuggestedQuestions`
- ✅ `CasesEmptyState` — 'Empezar puede dar miedo. Aquí lo hacemos juntos.'
- ✅ `CaseTimeline` polish — sage done dots, cream future dots, clay border

### Screens with palette swap (structure preserved, colors warm)

- ✅ `CaseDetailScreen` — text/border/error tokens swapped warm
- ✅ `CommunityScreen` — wrapped with `WarmScreen`, EI eyebrow + warmer
  copy in header, clay 'Crear' button
- ✅ `ResourcesScreen` — wrapped with `WarmScreen`, EI eyebrow + warmer
  subtitle, GlassCard surfaces inherit cream via the foundational tweak
- ✅ `GroupDetailScreen`, `ThreadViewScreen` (palette swap)
- ✅ All Pro tabs: `ForecastTab`, `IntelligenceTab`, `AcceleratorsTab`,
  `AlertsTab`
- ✅ `AddCaseSheet`, `EoirCaptchaModal`, `LoadingPreviewScreen`
- ✅ Community: `PostCard`, `GroupRow`, `ThreadView`, `ComposeSheet`,
  `CreateGroupSheet`, `ReportContentSheet`
- ✅ `ProfileSheet`, `PremiumPaywallModal`
- ✅ `FloatingTabBar` — palette flipped to warm-ink shelf with cream
  active chip
- ✅ All common surfaces: `IconPill`, `StatusPill`, `AppAlertModal`,
  `PushToast`, `OfflineIndicator`, `BrandedLoadingState`,
  `PlatformBottomSheet`

### Followups (next pass)

- Deep-rebuild `CaseDetailScreen` with WarmCard sections for case state
  (RFE / hearing / denial trigger acute surface)
- Deep-rebuild `GroupDetailScreen` (4400 lines — careful split into
  warm WarmCard sections)
- Wire StressBanner into `ChatScreen` (acute keyword detected → banner
  with 'Hablar con un humano' CTA)
- Auto-detect support keywords in community posts and overlay
  `<StressBanner>`
- Stress-aware empty states across the app ('No hay nada por ahora,
  eso es buena señal')

## Don't

- Don't apply warm cards to routine state. Cool blue stays for
  "everything's fine". Warm = emotional weight only.
- Don't sell anything inside `<SupportPill>`. The pill is for crisis
  moments; commercial framing breaks trust.
- Don't write user-facing AI copy like "I detected you are anxious".
  The acknowledgement should sound human ("Sé que esto da miedo").
- Don't gate AILA hotline behind paywall, account, or login.
