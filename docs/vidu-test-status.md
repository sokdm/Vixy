# Vidu migration test snapshot

This branch preserves the in-progress Decart-to-Vidu Pro engine migration. It is not a release or a working Vidu quality test. Package version stays at 2.5.9; no tag is created.

## Remaining integration work

- Implement AliRTC camera publishing and subscription to Vidu's `render_uid`. The current video client only clones the camera stream. That loopback is now restricted to development with mock credentials; real connections fail explicitly.
- Implement authenticated server-side WebSocket signaling, including initialization, prompt updates and hangup, without exposing the permanent Vidu key to the browser.
- Align REST paths, authorization and payloads with the current [Vidu S2-Editing documentation](https://platform.vidu.com/vidu-stream/doc/s2-editing/parameters). The existing `Token` authorization prefix does not match that documentation.
- Forward the selected reference image correctly, enforce session limits and ensure provider billing stops when Morphly ends the session.

## Local configuration

The downloaded workspace's `.env` files contain placeholder Supabase browser credentials. Replace `VITE_SUPABASE_ANON_KEY` with the project's actual publishable/anon key and configure the server credentials for authenticated testing. Do not commit `.env` files. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Offline preview must explicitly use `NODE_ENV=development`, `LOCAL_PREVIEW=true`, `VITE_LOCAL_PREVIEW=true` and mock provider credentials. Server preview bypasses accept only direct loopback requests and are disabled on Vercel and in production. Preview output cannot be used to evaluate Vidu quality.

The review removed permanent-key response fallbacks and the fallback from Vidu to Decart credentials. Provider failures now remain failures in the preview route. A response without a safe client credential is rejected until server-side signaling is implemented.
