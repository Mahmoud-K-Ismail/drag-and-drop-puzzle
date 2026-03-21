# Challenges and Decisions

This document records the major challenges encountered during implementation and the decisions taken to resolve them. It includes architecture, API, UX, drag-and-drop behavior, tooling, and workflow governance.

## 1) Project and Workflow Foundations

### Challenge
Need a progressive, professor-review-friendly repository history rather than one large implementation drop.

### Decision
Adopt incremental commits with a strict commit format.

### What Was Implemented
- Repository initialized with minimal baseline first.
- Commit governance added with message template and commit-msg checks.
- Commit body standard used consistently:
  - Why
  - AI usage

### Tradeoff
Slightly slower iteration, but much stronger auditability and rubric defensibility.

## 2) Architecture Direction

### Challenge
Need modular code structure that stays maintainable as gameplay features grow.

### Decision
Use a modular UI/domain structure with feature-oriented stores and shared API contracts.

### What Was Implemented
- App/page/widget structure separated from feature logic.
- Zustand stores used for setup, puzzle, and history behavior.
- Shared request/response schemas (Zod) used across client and server.

### Tradeoff
Some additional boilerplate up front, but fewer regressions while adding game mechanics.

## 3) API Runtime Confusion in Local Development

### Challenge
Vite-only development did not serve serverless API routes, causing generation failures.

### Decision
Use fullstack local runtime for frontend + API integration testing.

### What Was Implemented
- Clarified local testing around serverless route execution.
- Runtime setup verified with Vercel local workflow.

### Tradeoff
One extra runtime command, but accurate parity for API behavior.

## 4) Generation Reliability and Error Transparency

### Challenge
Model responses were occasionally malformed or too slow, and fallback behavior could hide real problems.

### Decision
Use a two-stage generation pipeline and remove fallback masking.

### What Was Implemented
- Stage 1: fast code generation endpoint returns line blocks quickly.
- Stage 2: explanation endpoint runs separately and updates explanations asynchronously.
- Fallback puzzle generation removed by policy.
- Errors surfaced clearly to UI and user.

### Tradeoff
More moving parts than a single endpoint, but significantly better perceived performance and debugging clarity.

## 5) Validation Correctness and Gameplay Completion

### Challenge
Need complete game loop: checking, wrong-line feedback, success state, hints, cooldown, and history controls.

### Decision
Implement validation and gameplay state centrally in the puzzle store.

### What Was Implemented
- Check Solution action.
- Incorrect highlighting for wrong blocks.
- Solved modal confirmation.
- Duplicate-line tolerance logic in validator.
- Hint generation with cooldown window.
- Undo/Redo stack with keyboard shortcuts.

### Tradeoff
Store complexity increased, but gameplay behavior became predictable and testable.

## 6) Drag-and-Drop Interaction Stability

### Challenge
Cross-lane behavior and visual feedback felt inconsistent. Dragging sometimes looked stuck in one lane.

### Decisions
- Improve collision strategy for lane targeting.
- Add global drag overlay so active item appears above both panels.
- Tune drag rendering behavior to avoid duplicate/ghost confusion.

### What Was Implemented
- Pointer-oriented collision handling.
- Global overlay rendering for active dragged block.
- In-card dragging visibility tuned to reduce visual conflict.

### Tradeoff
More drag configuration logic, but much clearer movement semantics.

## 7) Monaco Editor Instability Inside Draggable Cards → Resolved with `colorize` API

### Challenge
The initial implementation embedded full `@monaco-editor/react` `Editor` instances inside each draggable card. When dnd-kit unmounted/remounted components during drag operations, Monaco's internal disposal lifecycle triggered runtime errors, crashing the UI.

### Decision (Iteration 1 — Reverted)
Remove per-card Monaco editors and use `highlight.js` for lightweight syntax highlighting. This stabilised drag but deviated from the spec requirement to "use the Monaco code editor."

### Decision (Iteration 2 — Current)
Use Monaco's static `colorize()` API (`monaco.editor.colorize(code, lang, opts)`) instead of instantiating editor widgets. `colorize` tokenises code using Monaco's grammar engine and returns an HTML string with inline `style` attributes — no editor instances, no disposal lifecycle, no DOM widgets. A custom `puzzle-light` theme is defined via `defineTheme` + `setTheme` before the first `colorize` call so the inline colours match the project's design tokens.

### What Was Implemented
- `@monaco-editor/react`'s `loader.init()` eagerly loads Monaco at module evaluation time.
- A module-level `colorizeCache` (`Map<string, string>`) avoids redundant tokenisation.
- Custom React hook `useMonacoColorize(code, language)` resolves the async `colorize` promise into a state string; plain escaped text is shown as fallback until Monaco finishes loading.
- `DragOverlay` reads from the same cache (the block was already rendered, so the entry exists).
- `highlight.js` dependency removed; all hljs CSS token rules replaced by Monaco's inline styles.

### Tradeoff
Monaco's CDN bundle (~800 KB gzipped) is loaded on first visit, but subsequent visits hit the browser cache. No editor features (autocomplete, minimap, etc.) are exposed — only the tokeniser is used — so the runtime overhead is minimal.

## 8) Code Readability and IDE-Like Representation

### Challenge
Plain text rendering reduced readability; users needed clearer token-level syntax cues.

### Decision
Use Monaco's tokeniser with a custom `puzzle-light` theme that defines IDE-like colour tokens for keywords, strings, numbers, comments, delimiters, identifiers, and operators.

### What Was Implemented
- Custom Monaco theme registered via `defineTheme` with rules covering all major token scopes.
- Colours match the original project palette (keywords #1f4bd8, strings #bb2d2d, numbers #0f766e, comments #5f6d84, etc.).
- Compact card typography tuned for scanning; Monaco's `colorize` output inherits `line-height` and `background: transparent` from the card's `.codeText` styles.

### Tradeoff
Slight CDN dependency for Monaco, but syntax highlighting is now produced by the same engine the spec requires.

## 9) Cursor-to-Block Alignment During Drag

### Challenge
Users observed cursor and dragged block offset, especially during cross-lane movement.

### Root Cause Found
The `.active .rightPane` CSS rule applied `transform: translateY(0) scale(1)` — visually an identity transform, but it creates a new CSS containing block. Since `DragOverlay` from dnd-kit uses `position: fixed`, it became relative to the rightPane instead of the viewport, causing the offset.

### Earlier Iterations (Insufficient)
- Iterated overlay sizing and drag-ghost behavior.
- Tried alignment strategies, kept what remained stable, and rolled back unstable attempts quickly.
- These did not resolve the issue because the root cause was in the parent page layout, not the drag components themselves.

### Final Decision
Remove the identity transform from `.active .rightPane`. The entry animation still works because the browser interpolates from `translateY(18px) scale(0.985)` to `none` (the CSS default, equivalent to the identity).

### What Was Implemented
- Removed `transform: translateY(0) scale(1)` from `.active .rightPane` in `PlaygroundPage.module.css`.
- DragOverlay now positions correctly relative to the viewport.

### Tradeoff
None meaningful — the visual result is identical since the transform was already an identity.

## 10) UI Design Direction

### Challenge
Initial UI was functional but visually flat and not aligned with professor expectations for color utilization and clarity.

### Decision
Adopt stronger visual hierarchy with lane contrast and action color variety while keeping existing structure.

### What Was Implemented
- Distinct visual treatment for Code Bank and Solution Area.
- Color-varied action buttons (undo/redo/hint/check).
- Compact code cards and cleaner spacing.
- Mobile-safe adjustments retained.

### Tradeoff
More custom styles to maintain, but interface became easier to scan and more intentional.

## 11) Lint and Environment Notes

### Challenge
Some lint warnings persisted in non-UI files during UI-focused iteration windows.

### Decision
Prioritize active feature stability and compile correctness first, then close remaining lint items in a cleanup pass.

### What Was Implemented
- Continuous build verification after major patches.
- Incremental lint follow-up identified as cleanup step.

### Tradeoff
Faster feature delivery, with known technical debt tracked for cleanup.

## 12) Drop Animation and Drag Smoothness

### Challenge
The default dnd-kit drop animation caused the dragged block to "fly" from the release point to its final slot in the list, creating a jarring visual.

### Decision
Remove the drop animation entirely (`dropAnimation={null}`) so the block settles instantly. Since the sortable context already shifts other items to make room during the drag, the dropped block simply appears in its slot with no animation gap.

### What Was Implemented
- `dropAnimation={null}` on `DragOverlay`.
- `activationConstraint: { distance: 5 }` on `PointerSensor` to prevent accidental drags.
- Custom sortable transition easing (`cubic-bezier(0.25, 1, 0.5, 1)`, 250ms) for snappier item rearrangement.
- `cursor: grab` / `cursor: grabbing` feedback on cards and overlay.

### Tradeoff
No smooth drop-return animation, but the interaction feels more direct and responsive.

## 13) Indentation Jumping When Crossing Lanes

### Challenge
When dragging a block from the Code Bank to the Solution Area, the indentation jumped to the maximum. `event.delta.x` captures the total horizontal pointer movement from drag start, which includes the full distance from the left panel to the right panel — hundreds of pixels that got divided by `INDENT_STEP` (24px), producing a huge indent.

### Decisions and Iterations

**First attempt (not right):** Changed the condition from `activeContainer === 'target' || overContainer === 'target'` to `activeContainer === 'target' && overContainer === 'target'` — only adjusting indent for same-container reorders. This fixed the overflow but forced all cross-container drops to indent 0, requiring manual adjustment after dropping.

**Final decision:** Compute indentation from the block's absolute drop position relative to the target lane body. This uses `event.active.rect.current.initial.left + event.delta.x` (the overlay's left edge at release) minus the target lane body's left content edge, divided by `INDENT_STEP`. Works identically for both cross-container and same-container drops.

### What Was Implemented
- Added `bodyRef` to the target Lane component for measuring its bounding rect.
- Indentation derived from absolute pixel offset instead of relative delta.

### Tradeoff
Requires a DOM measurement at drop time, but indentation now matches where the user visually placed the block.

## 14) Free Positional Dropping in the Solution Area

### Challenge
Users could not drop a block at the end of the Solution Area. The collision detection (`pointerWithin`) only reports which specific block the pointer is over, and `moveLine` inserted before that block. To append at the end, users had to aim for the tiny empty space below all blocks — practically impossible.

### Decisions and Iterations

**First attempt (not right):** Modified `moveLine` to handle `null` overId in same-container moves by appending to the end, and added `flex: 1` to the lane body for more droppable space. This helped with the empty-space target but still relied on the collision detection to distinguish "over a block" from "over the lane," which was unreliable — the sortable items' bounding rects covered most of the lane area.

**Final decision:** Bypass the collision detection for positioning entirely. Compute the insertion index from the pointer's Y coordinate by comparing against each block's vertical midpoint. Pointer above a midpoint → insert before that block. Pointer below all midpoints → append to end. The collision detection is still used to determine which *lane* (source vs target), but position within the lane is purely Y-based.

### What Was Implemented
- Added `data-block-id` attributes to block articles for DOM querying.
- `handleDragEnd` computes `insertIndex` by iterating target blocks' midpoints.
- The dragged block's own DOM element is filtered out for same-container reorders.
- `moveLine` store action extended with optional `insertIndex` parameter.
- When `insertIndex` is provided, it takes priority over `overId`-based positioning.

### Tradeoff
Position computation happens in the component (DOM reads at drop time) rather than purely through the dnd-kit abstraction layer, but the user gets full freedom to drop a block at any position — beginning, between any two blocks, or at the end.

## 15) Equal Lane Sizing

### Challenge
The Code Bank and Solution Area had unequal widths (`0.95fr` / `1.05fr`) and different heights (`align-items: start`), making the layout feel unbalanced.

### Decision
Use equal `1fr / 1fr` columns with `align-items: stretch` so both lanes always match in width and height.

### What Was Implemented
- `grid-template-columns: 1fr 1fr` on `.lanesGrid`.
- `align-items: stretch` so both lanes fill the grid row.
- Lane set to `display: flex; flex-direction: column` with `flex: 1` on the body, so the droppable area fills all remaining vertical space.

### Tradeoff
None meaningful — the previous asymmetry was unintentional.

## 16) Fixed-Slot Model for Unrestricted Placement Order

### Challenge
The free-form list approach only let users place blocks at positions 0 through N (where N = currently placed blocks). With 0 blocks placed, there was only 1 drop position. Users wanted N positions available from the start, so they could fill any slot in any order — not just sequentially.

### Decisions and Iterations

**First attempt (not right):** Made gap slots invisible (`display: none`) when not dragging, only appearing as thin indicator lines during drag. This caused a jarring layout shift when dragging started (N gap elements suddenly appearing and pushing blocks down), and the UX felt disorienting since positions were hidden until you started moving.

**Final decision:** Adopt a fixed-slot model where `targetIds` is always N elements long. Each element is either a real block ID or a gap placeholder ID. Gap slots render as visible dashed boxes at all times. Users see all N positions and can drop into any one, in any order.

### What Was Implemented
- Store rewritten: `setLines` creates N gap IDs in `targetIds`. `moveLine` accepts a `slotIndex` into the fixed array. Dropping on a gap fills it; dropping on a filled block swaps them (displaced block returns to source for cross-container, or positions swap for within-target).
- `isGapId()` / `createGapId()` utilities exported from store.
- Component renders all N slots: gaps as styled `<div>` elements, blocks as `SortableBlock`.
- `computeSlotFromPointer` iterates all `[data-slot-index]` elements by Y midpoint to find the target slot.
- `validatePuzzle` filters out gap IDs before checking solution correctness.
- `requestHint` filters out gap IDs before comparing placed order.
- Removed `isExplaining` background message (unnecessary UX noise).

### Tradeoff
Solution area always shows N slots (including empties), which takes more vertical space. But users get full placement freedom and clear visual affordance for every available position.

## 17) Drop-Target Feedback on Filled Blocks and Same-Slot Return

### Challenge
After implementing the slot model, two usability gaps remained: (1) no visual feedback when hovering over a filled block during drag, so users didn't know they could swap; (2) dragging a block from the target and trying to return it to the same slot didn't work — the pointer detection excluded the active block's element, so the slot was unreachable.

### Decision
- Highlight both gaps and filled blocks when they're the hover target during drag.
- Stop excluding the dragged block from `computeSlotFromPointer` so its own slot is always reachable.
- Bias the slot detection threshold to 65% of element height (instead of 50%) so the pointer has to move further down before switching to the next slot — feels more natural.

### What Was Implemented
- `handleDragMove` highlights any slot (gap or block), not just gaps.
- `SortableBlock` accepts `isDropTarget` prop; applies `.cardDropTarget` class (blue border + glow).
- `computeSlotFromPointer` no longer takes an `excludeBlockId` parameter — all slots are always considered.
- Midpoint threshold changed from `height / 2` to `height * 0.65`.

### Tradeoff
Same-slot drops are now a no-op (block snaps back) which is the expected behavior. Swap feedback makes the interaction discoverable.

## 18) Horizontal Indent Snapping and Visual Feedback

### Challenge
The spec requires "a visual and a snapping effect for both horizontal and vertical positions." Vertical snapping was handled by the fixed-slot system (highlighted slots), but there was no horizontal feedback — users couldn't see which indent level they'd get until after dropping.

### Decisions and Iterations

**First attempt (not right):** Built a full snap modifier on the DragOverlay that locked the block's X position to indent grid columns, plus full-height vertical guide lines across the target lane. The guide lines were visually noisy and the snap modifier felt over-engineered.

**Second attempt (not right):** Replaced guide lines with small indent-tick rectangles (ruler), but cached the target lane position at drag start. When the ruler element appeared during drag (changing the layout), the cached position became stale, breaking indentation — all blocks landed at wrong indent levels.

**Final decision:** Keep the indent ruler (a row of small rectangles, one per indent level, appearing during drag) with fresh position computation on every drag move and drop. The active indent level highlights as the user drags left/right. No snap modifier — the overlay follows the cursor freely, and indent rounds to the nearest discrete level on drop.

### What Was Implemented
- `previewIndent` state tracks the indent level during drag.
- `computeIndent` computes indent from fresh DOM measurements (no caching).
- Indent ruler rendered at the top of the target lane during drag: 9 small rectangles (indent 0–8), the active one highlighted blue.
- On drop, indent snaps to the nearest level via `Math.round`.

### Tradeoff
The dragged block doesn't visually snap during movement (follows cursor freely), but the ruler clearly communicates which indent level will be applied. Fresh DOM reads on every frame are slightly more expensive than caching, but avoid stale-layout bugs.

## 19) High-Impact Decisions Summary

- Progressive commit discipline over large one-shot changes.
- Modular architecture over ad hoc coupling.
- Two-stage generation over single slow endpoint.
- No silent fallback behavior; explicit error surfacing.
- Store-centered gameplay logic for predictability.
- Stability-first drag rendering over heavyweight editors in cards.
- Iterative UI tuning based on usability feedback and rubric alignment.
- Root-cause fix for cursor alignment (ancestor CSS transform creating containing block).
- Y-position-based insertion over collision-detection-based positioning for full drop freedom.
- Absolute-position indentation over delta-based indentation for cross-lane accuracy.
- Fixed-slot model (N visible positions) over free-form list for unrestricted placement order.
- Visible dashed gap slots over invisible/hidden gaps for clear spatial affordance.
- Drop-target highlighting on both gaps and filled blocks for discoverable swap interaction.
- Indent ruler with per-level tick marks over snap modifier for horizontal feedback (simpler, avoids cached-layout bugs).
- Visual block highlighting on hint over text-only hints for faster block identification.

## 20) Hint System — Visual Highlighting and Slot-Aware Logic

### Challenge
The original hint system was text-only: clicking "Hint" showed a message like "Move X up in the solution order," but the user had to visually scan the board to find which block X was. Additionally, the hint logic compared placed blocks sequentially (filtering out gaps) rather than checking each block's actual slot against its expected position, which could give misleading "move up/down" directions in the fixed-slot model.

### Decisions and Iterations

**First attempt (small badge arrows):** Added `hintDirection` and rendered small 28px green circle badges with Unicode arrows (↑↓←→) positioned at the edge of the hinted block. These were barely visible against the green glow and didn't convey *where* the block should move to — only the direction.

**Final decision (SVG arrow overlay pointing to target slot):** Per the spec ("display arrows towards the direction that it needs to be moved to") and `hint_flow_v2.svg` (`calcDirectionArrows()` → `setHint({targetId, arrows})`), the hint now:
1. Highlights the source block with a pulsing green border.
2. Highlights the **target slot** (where the block should go) with a green pulsing dashed border.
3. Draws an **SVG curved arrow** from the source block to the target slot — a fixed-position overlay with animated dashed stroke and arrowhead.
4. Picks a **random** incorrect block (spec: "one random block that is placed incorrectly").
5. **Disables** the Hint button for 10 seconds (spec: "hint button should then become inactive for 10 seconds").

### What Was Implemented
- `hintLineId`, `hintDirection`, `hintTargetSlot` in puzzle state.
- `requestHint` collects all errors (wrong slot, wrong indent, missing) into an array and picks one randomly via `Math.random()`.
- `HintArrowOverlay` component: measures source block and target slot DOM positions, draws a quadratic bezier SVG path with `markerEnd` arrowhead. Curves outward for same-lane arrows (up/down in solution), upward for cross-lane arrows (Code Bank → Solution Area). Re-measures on scroll/resize.
- Target slot highlighted via `.gapSlotHintTarget` (green pulsing dashed border).
- Source block highlighted via `.cardHinted` (green pulsing glow).
- SVG arrow animated via `hintDash` keyframe (flowing dash offset).
- Hint button disabled during cooldown via `hintOnCooldown` state driven by `hintCooldownUntil` timer.
- Auto-dismiss after 8s; clickable hint text bar with "dismiss" label; auto-scroll to hinted block.

### Tradeoff
The SVG overlay requires fresh DOM measurements and recomputes on scroll/resize, but makes the hint unmistakably clear — the user sees exactly which block to move and where. Random selection means repeated hints may show different blocks, which helps the user discover multiple issues.

## 21) Indentation Mismatch — estimateIndent Dividing by 2

### Challenge
The `estimateIndent` function in `api/generate.ts` divided total leading whitespace by 2, assuming 2-space indent per level. Python uses 4 spaces, so a function body at 4 spaces was assigned `targetIndent: 2`. The UI (24px per indent step) required the user to drag to indent level 2 (48px) to match — but visually one indent level (24px) looked correct, causing puzzles to be unsolvable even with correct-looking placement.

### Decision
Auto-detect the indent unit from the generated code: find the smallest non-zero indentation across all lines and use that as the base unit. Each line's indent level = `Math.round(rawSpaces / baseUnit)`. This works for any language or editor tab width.

### What Was Implemented
- Replaced `estimateIndent(line)` with `countLeadingWhitespace(line)` (returns raw spaces; tabs count as 4 spaces).
- `normalizeGeneratedPuzzle` collects raw whitespace for all lines, finds `baseUnit = Math.min(...nonZeroIndents)`, then divides each line's raw spaces by `baseUnit`.
- Python 4-space indent → `baseUnit=4`, each body line → `targetIndent=1`. JS 2-space → `baseUnit=2`, each indent → `targetIndent=1`.

## 22) Slot Detection Triggering Too Far From Blocks

### Challenge
`computeSlotFromPointer` always returned a slot — even when the pointer was far above or below all slot elements. This caused blocks to swap when the user was dragging in empty space within the target lane, far from any actual block.

### Decision
Add a proximity guard: if the pointer is more than 40px above the first slot or below the last slot, return `null` (no slot). Callers (`handleDragMove`, `handleDragEnd`) now skip slot-based logic when `null` is returned.

### What Was Implemented
- `computeSlotFromPointer` returns `number | null` instead of `number`.
- Proximity check: `if (pointerY < first.top - 40 || pointerY > last.bottom + 40) return null`.
- `handleDragMove` clears preview if no slot detected; `handleDragEnd` skips move if no slot.

## 23) Vercel Deployment

### Challenge
The spec requires deployment on Vercel. The project has Vite for the client build and serverless API routes (`/api/generate`, `/api/explain`) that use `@vercel/node`.

### Decision
Add a `vercel.json` config that sets the build command, output directory, and SPA rewrites. The `/api/*` routes are handled by Vercel Serverless Functions (already in the correct `/api` directory convention).

### What Was Implemented
- `vercel.json` with `buildCommand`, `outputDirectory`, and `rewrites` (API pass-through + SPA fallback).
- `@vercel/node` added as a dev dependency for type safety.
- `highlight.js` removed (replaced by Monaco in section 7).
- Production deployment via `vercel --prod`.

## 24) Open Follow-Ups

- Resolve remaining lint issues in puzzle store strings/escaping.
- Optional: add automated tests around validation, hint cooldown, and history transitions.
- Optional: add a short QA checklist document for repeatable demo validation.
