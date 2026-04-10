# JudgeChain Component Patterns

## Cards
Use cards to group related information. They should have a distinct background, subtle border, and rounded corners.

```tsx
<div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
  <h3 className="text-xl font-bold text-foreground mb-2">Card Title</h3>
  <p className="text-sm text-muted">Card description goes here.</p>
</div>
```

## Buttons
Primary action buttons use the accent color and have clear interactive states.

```tsx
<button className="bg-accent text-white px-5 py-2.5 rounded-md text-sm font-bold hover:opacity-90 transition-all shadow-sm active:scale-95">
  Primary Action
</button>
```

Secondary or subtle buttons use muted styling.

```tsx
<button className="px-4 py-2 text-sm font-semibold text-muted hover:text-foreground transition-colors">
  Cancel
</button>
```

## Inputs
Inputs must be clearly visible, with placeholder text, focus rings, and proper borders.

```tsx
<div>
  <label className="text-xs font-medium block mb-1 text-muted uppercase tracking-wider">
    Input Label
  </label>
  <input
    className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent transition-all placeholder:text-muted/50"
    placeholder="Enter something..."
  />
</div>
```

## Loading States
Prefer subtle spinners or skeletons over blocking the entire UI.

```tsx
<div className="flex justify-center py-12">
  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
</div>
```

## Data Display (Empty States)
When lists or tables have no data, show a friendly empty state.

```tsx
<div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card/50">
  <p className="text-muted">No items found.</p>
</div>
```
