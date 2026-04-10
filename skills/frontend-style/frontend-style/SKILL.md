---
name: frontend-style
description: Enforces the JudgeChain design system, Tailwind CSS 4 styling guidelines, and UI component standards across the ecosystem. Use when creating or modifying frontend components.
---

# JudgeChain Frontend Style Guide

This skill ensures all UI components in the JudgeChain ecosystem share a consistent, modern, and high-quality aesthetic.

## Core Styling Principles

1. **Tailwind CSS 4 Only**: Never use inline styles (`style={{ ... }}`). Always use utility classes.
2. **Semantic Colors**: Use the custom theme variables configured in `globals.css`.
   - `bg-background` / `text-foreground`: Primary page backgrounds and text.
   - `bg-card` / `border-card-border`: For elevated surfaces like cards, panels, and modals.
   - `text-muted`: For secondary text, descriptions, and empty states.
   - `bg-accent` / `text-accent`: For primary buttons, active links, and highlights.
   - `border-border`: For generic dividers and subtle outlines.
3. **Interactive States**: Every interactive element MUST have hover and active states.
   - Example: `hover:opacity-90 active:scale-95 transition-all`
4. **Feedback & Notifications**: Use the `sonner` library for all toast notifications. Do not use custom alerts or native `alert()`.

## Notifications (`sonner`)

All async actions and form submissions MUST use toast notifications:

```tsx
import { toast } from "sonner";

// Success
toast.success("Action completed successfully!");

// Error
toast.error("Something went wrong.");

// Loading with update
const toastId = toast.loading("Processing...");
try {
  await doSomething();
  toast.success("Done!", { id: toastId });
} catch (error) {
  toast.error(error.message, { id: toastId });
}
```

## Component Patterns

See `references/components.md` for specific UI patterns like Cards, Buttons, and Inputs.
