```markdown
# The Industrial Precision Design System

## 1. Overview & Creative North Star: "The Machined Monolith"
This design system is built to reflect the high-stakes precision of additive manufacturing. The "Creative North Star" is **The Machined Monolith**—a visual language that treats digital space like a slab of anodized titanium. It moves beyond the "standard dark mode" by utilizing extreme contrast, brutalist geometry, and light-emissive accents that mimic the laser-focus of a 3D printer’s nozzle.

We break the "template" look by rejecting soft corners and generic grids. Every element is hard-edged, intentional, and high-contrast. We use **asymmetrical layouts** where technical data (using mono-spaced fonts) overlaps high-end product photography, creating a layered, editorial feel that feels more like an engineering blueprint than a storefront.

---

## 2. Colors: Tonal Depth & Thermal Accents
The palette is rooted in deep blacks and obsidian greys, punctuated by high-energy thermal oranges.

### The Palette (Material Logic)
*   **Background (`#080808`):** The absolute void. All work begins here.
*   **Surface / Surface-Low (`#111111`):** For primary sectioning.
*   **Surface-Container-High (`#161616`):** For cards and interactive modules.
*   **Primary Accent (`#ff5500`):** The "Heat." Used for action and vital focus.
*   **Primary-Container (`#ff7733`):** The "Glow." Used for hover states and active indicators.

### The "No-Line" Rule
Prohibit the use of 1px solid borders for general sectioning. Boundaries must be defined by shifts in background value—for example, a `#161616` card sitting on a `#080808` background. The only exception is the **Signature Divider**: a 1px horizontal line using a linear gradient (`transparent -> #ff5500 -> transparent`) used sparingly to separate major content groups.

### Signature Textures
To achieve the "Dbrand" tactile feel, apply a global **CSS Grain/Noise overlay** at 3% opacity. This eliminates "banding" in dark gradients and gives the interface a physical, matte-finish quality.

---

## 3. Typography: Technical Authority
We use three distinct typefaces to categorize information and create a hierarchy of technicality.

*   **Display & Headline (Bebas Neue):** Bold, all-caps, and industrial. These are the "stampings" on the machine. Use for H1–H3 to convey raw power and brand presence.
*   **Title & Body (DM Sans):** The "User Manual." DM Sans provides high legibility for product descriptions and navigation. It balances the aggression of Bebas Neue with modern sophistication.
*   **Technical Details (Space Mono):** The "Data Stream." Every technical spec, coordinate, or price point must use Space Mono. This signals precision and engineering accuracy.

---

## 4. Elevation & Depth: The Stacking Principle
In this system, depth is not achieved through shadows, but through **Tonal Layering** and **Material State.**

*   **The Layering Principle:** Place `surface-container-highest` elements on `background` to create a "lifted" effect. The interface should feel like stacked plates of machined metal.
*   **Ambient Glows (The Heat Map):** Traditional shadows are forbidden. Instead, use "Glows." On hover, an element should emit a diffused `primary` (`#ff5500`) glow (`box-shadow: 0 0 20px rgba(255, 85, 0, 0.3)`). This mimics the light of a heated filament or laser.
*   **The Glassmorphism Exception:** For floating HUDs or sticky navigation, use a semi-transparent `#111111` with a `20px backdrop-blur`. This allows the "Machined Monolith" below to remain visible while providing a clear focus area.

---

## 5. Components: Machined Modules

### Buttons (The Parallelogram)
Buttons do not have border-radii (`0px`).
*   **Primary:** A hard-angled `clip-path: polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)`. Filled with `#ff5500` and `Bebas Neue` text.
*   **Secondary:** The same angled shape but as an outline (`outline-variant`) with a subtle `10%` opacity fill.

### Cards & Lists (The Block System)
*   **Cards:** Use `surface-container-high` (`#161616`). No borders. Separation is achieved through 24px–40px of vertical space. 
*   **Dividers:** Only use the "Signature Divider" (orange gradient) between distinct product categories. Never use grey dividers.

### Input Fields
*   **State:** Rectangular, `#111111` background, with a 1px bottom-border only (`#2a2a2a`). 
*   **Focus:** The bottom border transforms into a `primary` (`#ff5500`) glow. Technical labels above the field use `Space Mono` at `label-sm`.

### Chips (The Status Bits)
Small, rectangular tags using `Space Mono`. For status (e.g., "In Stock"), use a `10%` primary orange background with a solid `#ff5500` 2px vertical "notch" on the left side.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place a product image off-center and let the `Space Mono` technical specs overlap its edge.
*   **Embrace the Dark:** Keep 90% of the UI in the `#080808` to `#161616` range.
*   **Respect the "Hard Edge":** Every corner must be `0px`. Roundness is a failure of precision.

### Don't:
*   **Don't use standard shadows:** If it doesn't look like it's glowing from heat, don't use it.
*   **Don't use 100% opaque grey borders:** They clutter the "monolith" look. Use background shifts instead.
*   **Don't mix fonts:** Never use `Bebas Neue` for body copy or `DM Sans` for technical data. The roles are non-negotiable.

---

## 7. Editorial Note for Junior Designers
This system is about **restraint.** The orange is "The Heat"—if you use it everywhere, the interface "melts." Use the orange only where the user's eye needs to be directed with surgical precision. The rest of the experience should feel cool, dark, and industrial. 

*Precision isn't just a vibe; it's the rule.*```