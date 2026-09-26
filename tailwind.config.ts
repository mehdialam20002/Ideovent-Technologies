
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '1.5rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			// Sora (display) + Inter (body) + Instrument Serif (the accent, italic only).
			// Sora and Inter are the two families _assets/brand.css already prints with,
			// so the website and the document set set type the same way.
			//
			// INSTRUMENT SERIF IS BACK, AND ONLY FOR `.accent-italic`. Space Grotesk, the
			// old display face, stays gone. _assets/DESIGN-DIRECTION.md §1: one family
			// added, used in one role, which is not the three-family sprawl the Phase 5
			// pass cut. Only the italic face is fetched (`ital@1`), because the only
			// selector that names this stack also sets `font-style: italic`.
			//
			// The webfonts load without blocking the first paint (see index.html), so every
			// stack below has to be readable on its own for the first few hundred ms. These
			// are full system stacks, not a bare `sans-serif`: a visitor on Windows gets
			// Segoe UI, on macOS/iOS the San Francisco system face, on Android Roboto.
			fontFamily: {
				sans: [
					'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont',
					'"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif',
					'"Apple Color Emoji"', '"Segoe UI Emoji"',
				],
				// "Sora Fallback" is a metric-matched local face declared in
				// src/index.css: Arial, scaled and with its line box overridden so it
				// occupies exactly the space Sora will. It sits second so it is only
				// ever painted before the webfont lands. See the measured note there.
				display: [
					'Sora', '"Sora Fallback"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
					'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif',
				],
				// The accent face. `.accent-italic` in index.css is the ONLY consumer,
				// and it sets `font-style: italic`, so every name in this stack is only
				// ever asked for its italic. The fallbacks are device faces with real
				// italics (Georgia and Times both ship one), so the accent word still
				// reads as a serif italic in the frame before the webfont lands rather
				// than as a slanted sans.
				serif: [
					'"Instrument Serif"', '"Instrument Serif Fallback"', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif',
				],
				mono: [
					'ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas',
					'"Liberation Mono"', '"Courier New"', 'monospace',
				],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				success: 'hsl(var(--success))',
				warning: 'hsl(var(--warning))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(10px)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'scale-out': {
					from: { transform: 'scale(1)', opacity: '1' },
					to: { transform: 'scale(0.95)', opacity: '0' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-in-bottom': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' }
				},
				'shimmer': {
					'100%': { transform: 'translateX(100%)' }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'fade-out': 'fade-out 0.5s ease-out',
				'scale-in': 'scale-in 0.4s ease-out',
				'scale-out': 'scale-out 0.4s ease-out',
				'slide-in-right': 'slide-in-right 0.5s ease-out',
				'slide-out-right': 'slide-out-right 0.5s ease-out',
				'slide-in-left': 'slide-in-left 0.5s ease-out',
				'slide-in-bottom': 'slide-in-bottom 0.5s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
			},
			transitionTimingFunction: {
				/*
				  ONE CURVE, INCLUDING THE CSS HALF OF THE SITE.

				  src/lib/motion.ts exports EASE = [0.22, 1, 0.36, 1] and main.tsx
				  hands it to every framer-motion animation through <MotionConfig>,
				  so all the ENTRANCE motion already shared one curve. Every HOVER
				  and PRESS on the site is a plain CSS transition, and a grep for
				  `ease-` across src/ returns six results in total: everything else
				  was running on Tailwind's stock DEFAULT, cubic-bezier(0.4, 0, 0.2,
				  1). So the page had two curves, split by implementation rather than
				  by intent, and the seam is visible where the two meet: a card that
				  enters on one curve and then lifts under the pointer on another.

				  DEFAULT is now the same cubic-bezier as EASE, which makes "one
				  easing curve throughout" true by construction for the ~70
				  `transition-*` classes in src/ that name no easing. It is a
				  fast-out curve that spends most of its time settling, which is what
				  keeps a 200ms hover from reading as a jump cut.

				  IF YOU CHANGE THIS, CHANGE EASE IN src/lib/motion.ts TO MATCH.
				  The two values are the same curve written in two syntaxes; there is
				  no import that can keep them in step, so they are commented at both
				  ends instead.
				*/
				DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
				/* Overshoot curves. Nothing in src/ uses either (grepped 25 Sep
				   2026); kept because they are the documented escape hatch for a
				   deliberate bounce, and a theme entry with no consumer emits no
				   CSS. */
				'bounce-in': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
				'bounce-out': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
			},
			backdropBlur: {
				xs: '2px',
				'2xl': '40px',
				'3xl': '60px',
			},
			maxWidth: {
				'8xl': '88rem',
				'9xl': '96rem',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
