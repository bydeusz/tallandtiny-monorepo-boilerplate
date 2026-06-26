// Top-level barrel for @repo/ui.
// Prefer the per-layer entry points (`@repo/ui/atoms`, `@repo/ui/molecules`,
// `@repo/ui/organisms`) so bundlers only pull in the layer you use; this
// aggregate exists for convenience.
export * from "./atoms";
export * from "./molecules";
export * from "./organisms";
