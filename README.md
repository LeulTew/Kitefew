# BOLD. // SLICE

An immersive, computer vision-powered precision slicing experience built for the modern web.

---

## Contents

- [Introduction](#introduction)
- [Gameplay Architecture](#gameplay-architecture)
- [Dynamic Atmospheric Systems](#dynamic-atmospheric-systems)
- [The Blade Repository](#the-blade-repository)
- [Technical Foundation](#technical-foundation)
- [System Integration](#system-integration)
- [Deployment Protocol](#deployment-protocol)

---

## Introduction

BOLD. // SLICE is a high-performance, browser-based action game that leverages advanced hand-tracking technology to transform physical gestures into lethal precision. Inspired by classic arcade mechanics and elevated through modern web standards, it offers a visceral flow-state experience where every motion is translated into a fluid, animated trail of destruction.

---

## Gameplay Architecture

### Gesture Precision
The core loop centers on real-time hand tracking. Utilizing MediaPipe's industry-leading vision models, the system maps skeletal hand data to a virtual workspace at high frequency, ensuring that the distance between physical intent and digital execution is negligible.

### Scoring Dynamics
- **Standard Slices**: Baseline points earned for each successful fruit intersection.
- **Combo System**: Critical multiplier bonuses awarded for slicing multiple targets within narrow temporal windows.
- **Streak Integration**: Sustained precision increases global score multipliers, rewarding consistency and flow.

### Hazard Management
Precision is not merely about speed but discretion. Interaction with explosive hazards results in immediate failure, while missed targets deplete the internal vitality system.

---

## Dynamic Atmospheric Systems

The environment reacts to every motion through a sophisticated real-time atmospheric engine:
- **Projected Ambient Lighting**: Each blade stroke emits localized light that dynamically illuminates the surrounding spatial volume.
- **Material Particle Physics**: High-fidelity debris profiles tailored to target properties, featuring individualized gravity, drag, and rotation mechanics.
- **Volumetric Feedback**: Multi-layered visual cues including prismatic chromatic aberration and custom haptic-visual synchronization.

---

## The Blade Repository

The armory houses ten high-concept aesthetic configurations, each meticulously engineered with unique kinetic profiles and particle signatures.

- **Classic**: A high-luminance trail featuring precision-timed luminescence flickers.
- **Star Fall**: Celestial kinetic trails utilizing gravitationally-influenced stellar remnants.
- **Inferno**: High-intensity thermal profiles with ascending ember dispersal and flicker-harmonic lighting.
- **Frostbite**: Cryogenic discharge patterns featuring crystalline shard generation and localized freezing mist.
- **Neon Rush**: A high-frequency cyberpunk aesthetic utilizing harmonic wave trails and dual-spectrum luminescence.
- **Shadow**: Obsidian-density kinetic paths with light-dampening atmospheric effects.
- **Prismatic**: A full-spectrum chromatic displacement engine that cycles through the visible light range in real-time.
- **Thunder**: High-voltage electrical arcing with multi-segment randomized lightning generation.
- **Cosmic**: Deep-space atmospheric signatures featuring distant stellar parallax and nebular glows.
- **Luxe**: An elite gold-gilded kinetic signature with premium shimmer profiles.

---

## Technical Foundation

The architecture is built upon a stack of optimized modern technologies:
- **Core Intelligence**: MediaPipe Hands for skeletal tracking.
- **View Layer**: React 18 with high-frequency state synchronization.
- **Rendering Engine**: Optimized HTML5 Canvas with custom physics and particle orchestration.
- **Data Persistence**: IndexedDB for localized high scores and user preferences.
- **Backend Architecture**: Vercel Serverless Functions paired with Vercel KV for global leaderboard synchronization.
- **Runtime**: Built with Vite and managed through Bun for maximum developer velocity.

---

## System Integration

### Global Leaderboards
Achievements are synchronized across a global architecture, allowing users to benchmark their performance against the worldwide collective. 

### Cross-Platform Readiness
The codebase is designed for responsiveness, transitioning seamlessly from desktop browser environments to mobile PWA deployments and Android APK distributions via Capacitor integration.

---

## Deployment Protocol

### Local Development
To initialize the development environment:
1. Ensure the Bun runtime is installed.
2. Clone the repository.
3. Install dependencies: `bun install`
4. Launch the development cluster: `bun run dev`

### Production Build
Execute the optimization pipeline:
`bun run build`

The resulting static assets are optimized for deployment on Vercel or any high-performance edge network.

---

## Back to top
[Return to Contents](#contents)
