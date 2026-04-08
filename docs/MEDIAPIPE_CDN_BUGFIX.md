# MediaPipe CDN Load Failure: Technical Summary and Fix Documentation

## Overview

This document explains the production fix for the mobile PWA startup error:

> `Could not start: MediaPipe failed to load from CDN`

The issue prevented users from starting workout sessions because pose detection never initialized.

## Affected Component

- `mobile_app/app.js` (MediaPipe bootstrap and runtime initialization)
- `mobile_app/index.html` (initial MediaPipe script source)

## Root Cause Analysis

1. **Pinned to an older package version (`0.10.12`)**  
   The app depended on CDN availability for this version and had limited resilience during transient CDN issues.

2. **Insufficient fallback strategy**  
   Only two CDN origins were tried, reducing startup reliability under regional outages or edge cache failures.

3. **No timeout on dynamic script fetches**  
   Script injection relied on browser events only; some failure modes can hang without load/error firing promptly.

4. **Low observability during bootstrap**  
   Debugging was difficult due to minimal runtime logs when fallbacks were attempted.

5. **Version coupling concerns**  
   Bundle and WASM paths were hardcoded separately. This increases drift risk over time if only one URL is updated.

## Fix Summary

### 1) Standardized versioning and upgraded MediaPipe

Added constants in `mobile_app/app.js`:

- `MEDIAPIPE_VERSION = '0.10.14'`
- `MEDIAPIPE_CDN_TIMEOUT_MS = 8000`

This centralizes version updates and reduces mismatch risk.

### 2) Expanded fallback CDN list

`MEDIAPIPE_BUNDLES` now includes three sources:

1. jsDelivr
2. unpkg
3. fastly.jsdelivr.net

The loader iterates through each until one succeeds.

### 3) Added timeout-protected script loading

`loadScript(src, timeoutMs)` now rejects with an explicit timeout error if script load stalls.

### 4) Added structured runtime logging

`ensureMediaPipeLoaded()` now logs:

- whether bundle is already present,
- each attempted CDN,
- successful source,
- and failure details for each fallback.

### 5) Kept WASM URL aligned with bundle version

`FilesetResolver.forVisionTasks(...)` now uses `MEDIAPIPE_VERSION`, ensuring bundle and WASM stay synchronized.

### 6) Updated static bootstrap script in HTML

`mobile_app/index.html` now references:

`@mediapipe/tasks-vision@0.10.14/vision_bundle.js`

This improves first-load behavior even before fallback logic runs.

### 7) Added runtime backend fallback to legacy MediaPipe Pose

If Tasks Vision initialization fails (bundle, WASM, model, or delegate/device issues), the app now
falls back to `@mediapipe/pose` legacy JS runtime so users can still start workouts instead of
hard failing at startup.

## Validation Checklist

- JavaScript syntax check:
  - `node --check mobile_app/app.js`
- Regression tests:
  - `pytest -q`
- Manual validation in browser:
  - Open app
  - Tap **Start Workout**
  - Confirm no MediaPipe load popup
  - Confirm pose overlays appear with camera feed

## Risk / Compatibility Notes

- The third CDN is still part of jsDelivr infrastructure (`fastly.jsdelivr.net`) and mainly improves route diversity.
- Startup now fails faster and more clearly in hard-failure scenarios due to timeout protection.
- Console output is more verbose for troubleshooting; this is intentional for client-side diagnostics.

## Rollback Plan

If an emergency rollback is needed:

1. Revert `mobile_app/app.js` MediaPipe loader changes.
2. Revert `mobile_app/index.html` script version.
3. Redeploy.

Note: rollback re-introduces lower resiliency and limited diagnostics.
