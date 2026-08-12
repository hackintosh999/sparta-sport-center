# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue — resolved statuses always carry their resolution date

---

## 2026-08-10

### Observation 1: Bento grid 2x column span creates asymmetrical holes when item count is 3
**Status:** OPEN
**Date:** 2026-08-10
**Session context:** Redesigning ChildBenefitsSection UI cards layout
**Skill:** frontend-ui-engineering
**Type:** open-source
**Phase/Area:** Grid layouts & responsive design

**Issue:**
When laying out 3 items in a 3-column grid, making item #1 span 2 columns (`col-span-2`) forces item #3 onto row 2 alone (`col-span-1`), leaving 2/3 of row 2 completely empty. This creates huge black voids and degrades layout compactness.

**Suggested improvement:**
For 3 items, prefer a unified 1-row 3-column layout (`grid-cols-1 lg:grid-cols-3 gap-5`), and highlight item #1 with visual styling (gradient border, glow, badge, tags) rather than grid span expansion, maintaining 100% density and zero empty space.

**Principle:**
Grid spans must match the total item count math. If `N % cols != 0`, column spanning will create empty grid holes unless filled by secondary items.

### Observation 2: Verify high-value features in source copy before emphasizing them
**Status:** OPEN
**Date:** 2026-08-10
**Session context:** Rewriting VK group description text
**Skill:** copywriting
**Type:** open-source
**Phase/Area:** Copy analysis & generation

**Issue:**
The user's original text mentioned several premium features (yoga, pool). I extracted these and made them the central Unique Selling Proposition (USP) of the new copy. The user then corrected me that they don't actually have a pool or yoga yet.

**Suggested improvement:**
When analyzing user-provided source text for a business, do not blindly elevate lists of features into core selling points without first asking the user to confirm which features are currently active and which are aspirational.

**Principle:**
Source copy from businesses often mixes current reality with future aspirations. Before anchoring a marketing rewrite on a specific high-value claim found in the source text, verify its current availability.

### Observation 3: Mobile UX optimization requires sticky action bar & responsive width bounds
**Status:** OPEN
**Date:** 2026-08-10
**Session context:** Comprehensive site audit and responsive fixes
**Skill:** frontend-ui-engineering
**Type:** open-source
**Phase/Area:** Mobile UX & CTA conversion

**Issue:**
On long landing pages with multi-step registration modals, mobile users lose sight of the primary CTA ("Записаться бесплатно"). Fixed-width card components (e.g. `w-[350px]`) cause horizontal overflow on ultra-narrow viewports (<360px).

**Suggested improvement:**
1. Always use `w-[calc(100vw-2.5rem)]` with max-width breakpoints for carousel cards to prevent mobile horizontal scroll.
2. Add a persistent `fixed bottom-4 md:hidden` floating CTA bar for key conversion goals on mobile landing pages.

**Principle:**
Mobile conversion degrades when primary action triggers require scrolling back through multiple content sections. Persistent floating CTAs and viewport-constrained card widths maintain smooth accessibility.

### Observation 4: Fullscreen modals require Escape listener, body scroll lock & dynamic dvh bounds
**Status:** OPEN
**Date:** 2026-08-10
**Session context:** Mobile and tablet modal responsiveness audit
**Skill:** frontend-ui-engineering
**Type:** open-source
**Phase/Area:** Modal accessibility & mobile viewport handling

**Issue:**
Multi-step modals using fixed percentage heights (`h-[80vh] min-h-[600px]`) become clipped and unscrollable on mobile devices with virtual keyboard overlays. Missing close buttons and Escape key handlers create user trapping.

**Suggested improvement:**
1. Use `max-h-[100dvh]` with `overflow-y-auto` to handle dynamic mobile viewports and keyboard popups smoothly.
2. Implement body scroll locking (`document.body.style.overflow = 'hidden'`) and `Escape` key event listeners on all modal dialogs.
3. Always supply a prominent close (X) button in wizard headers.

**Principle:**
Modal overlays on mobile devices must use dynamic viewport units (`dvh`) and scroll locking to avoid UI clipping during virtual keyboard activation.

### Observation 5: Multi-layer gradient borders and gradient masks elevate card UI from generic templates to premium tier
**Status:** OPEN
**Date:** 2026-08-12
**Session context:** Redesigning tariff cards in LandingPage.tsx
**Skill:** frontend-ui-engineering
**Type:** open-source
**Phase/Area:** Visual UI aesthetics & Card component design

**Issue:**
Standard dark cards with simple flat borders (`border-white/10`) look template-like and fail to highlight flagship tiers ("ХИТ ПРОДАЖ"), reducing visual contrast and premium perception.

**Suggested improvement:**
1. Wrap flagship tier cards in a `p-[1.5px] rounded-[28px] bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-600 shadow-[0_0_45px_rgba(245,158,11,0.35)] scale-[1.03]` container to create an animated multi-layered glowing border.
2. Apply a bottom gradient mask (`bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent`) over top card images to seamlessly blend photos into the dark glassmorphic card body.

**Principle:**
Card hierarchy requires distinct border and glow treatments across tiers. Applying gradient masks over images and multi-layered glowing borders to featured tiers removes the "boxed thumbnail" look and delivers a cohesive premium aesthetic.

### Observation 6: Reassuring checkout UX replaces aggressive legal disclaimers with care badges & trust anchors
**Status:** OPEN
**Date:** 2026-08-12
**Session context:** Redesigning MembershipModal.tsx payment window
**Skill:** ui-ux-pro-max
**Type:** open-source
**Phase/Area:** Checkout UX & Conversion Optimization

**Issue:**
Payment modals often use high-anxiety legal warning boxes ("Возврату не подлежат") and harsh CTA buttons ("Продолжить к оплате"), creating buyer hesitation and friction.

**Suggested improvement:**
1. Replace negative refund warnings with positive "Sparta Care" badges (Free pause/freeze on illness, personal mentor onboarding, 256-bit SSL encryption).
2. Soften CTA copy from transactional mandates to reassuring steps ("Перейти к выбору способа оплаты" + "Без скрытых комиссий").
3. Add visual payment security seals (SBP, Mir, Bank Cards) to lower perceived purchase risk.

**Principle:**
A premium checkout experience replaces aggressive urgency and legal disclaimers with transparent value breakdowns, empathetic flexibility guarantees, and high-trust payment badges.

