# Komari Butterfly Design Notes

## Direction

Butterfly translates the reference dashboard into a restrained WinUI-style monitoring surface rather than reproducing it literally. The interface keeps the reference image's recognizable composition—sidebar, command bar, KPI ribbon, network hero, latency panel, node grid, and alert surface—while reducing decorative noise and preserving Komari's real data semantics.

## Visual system

- **Mica hierarchy:** the page background carries the atmospheric gradient; navigation uses a translucent Mica layer; cards use clearer acrylic-like surfaces; dialogs use the strongest surface.
- **Tonal dark mode:** dark surfaces stay within a narrow navy range. Search fields, toolbar controls, node cards, panels, and dialogs use related dark tones rather than bright acrylic fills.
- **Fluent depth:** borders and one-pixel highlights define most separation. Shadows are reserved for elevated navigation, hovered cards, toasts, the node drawer, and the globe dialog.
- **Accent discipline:** indigo is the default. Teal communicates healthy connectivity, amber indicates attention, and red is reserved for high-risk states.
- **Geometry:** 11–20 px radii, compact 8–18 px spacing, and Segoe UI Variable when available.
- **Motion:** short 140–260 ms transitions, animated network arcs, chart entrances, globe rotation, and a complete `prefers-reduced-motion` fallback.

## Information architecture

1. **Sidebar:** stable destinations and account/admin access.
2. **Command bar:** page context, global search, refresh, appearance, alerts, and admin entry.
3. **KPI ribbon:** time, availability, coverage, cumulative transfer, and current rate.
4. **Hero + latency:** geographic/network identity paired with an immediately actionable quality distribution.
5. **Global node globe:** the hero action opens a focused geographic surface instead of navigating away. Regions are aggregated, status lights remain selectable, and the selected region exposes its exact nodes.
6. **Node workspace:** filters and sorting remain attached to the cards they control.
7. **Alerts:** locally derived resource and offline alerts sit below the node workspace. The redundant performance ranking was removed.
8. **Drawer:** preserves dashboard context while exposing history and exact node fields.

## Globe semantics

The globe follows the interaction pattern used by established Komari globe themes: a rotatable sphere, one marker per geographic cluster, visible status lighting, and selection-driven focus. Butterfly implements the renderer locally with Canvas so the theme does not download a mapping library at runtime.

- A node is mapped only when `region` is an exact ISO 3166-1 alpha-2 code or begins with a two-codepoint flag emoji.
- Nodes sharing the same region code are aggregated into one marker.
- Green means every node in the region is online, amber means mixed status, and red means all are offline.
- Selecting a marker rotates the globe toward the region centroid and updates the adjacent node list.
- The bundled centroid data is country/region-level; the interface does not infer a city coordinate from node names, remarks, providers, IP addresses, or groups.
- The land point cloud, centroids, renderer, styles, and interaction code are all included in `dist/assets`.

## Data integrity

The UI does not invent live values after an API error. Demo data is isolated behind `?demo=1` and `file://`. Live mode uses Komari JSON-RPC 2.0 methods and exact public/node/status fields. Node history accepts the array and UUID-keyed record forms used by Komari. TCP is displayed as total reported connections minus reported UDP connections.

## Responsive behavior

- **Desktop:** fixed sidebar, five-card KPI ribbon, hero/latency split, four-column node grid, and a compact alert row below it. The globe opens as a two-column dialog with a large stage and region fleet.
- **Medium screens:** two-column cards and supporting panels move below the grid; the globe stage and region fleet stack.
- **Phone portrait:** compact command bar, horizontally snapping KPI cards, shorter hero, latency summary tiles, sticky filters, single-column node cards, and a safe-area-aware five-item bottom navigation. The navigation moves below the viewport while scrolling down, returns on upward motion or at page boundaries, and remains hidden behind search, input/select focus, the on-screen keyboard, and modal surfaces. The overview exposes the first four nodes and a direct all-nodes action instead of rendering the entire fleet before the footer.
- **Phone search and details:** expanding search moves directly into the node workspace and suppresses its duplicate toolbar field. Live refreshes retain the active search selection, horizontal control positions, and node-sheet scroll position. Node details use a swipe-to-dismiss bottom sheet with a tappable handle, sticky header, four-column metric strip, two-column hardware grid, compact charts, and bottom safe-area padding.
- **Phone globe:** full-screen stage, horizontal snap region cards, automatic centering of the selected region, touch-sized rows, momentum-based drag rotation, and a 30 FPS / reduced-DPR rendering profile.
- **Short portrait:** reduced navigation, KPI, chart, and globe heights keep controls and regional fleet information reachable. At 320 × 568-class dimensions, only the large hero is omitted; the KPI ribbon remains and the first node clears the floating navigation.
- **Short landscape:** one-row KPI cards, side-by-side hero and latency surfaces, two-column nodes, and a full-screen two-pane globe keep the short vertical viewport usable.
