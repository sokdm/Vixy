# Vidu quality-test branch

Branch `test/vidu-pro-quality` implements Pro using Vidu S2-Editing. App version stays at 2.5.9; no release tag is created. Live output quality has not yet been verified with a camera session.

## Implemented

- Session creation sends the selected reference image and `subject_replacement` to `/live/s_editing/realtime`, with the documented bare server-side Authorization header.
- Browser signaling uses Vidu's short-lived `client_secret`. The permanent API key never goes to the browser. Responses missing scoped credentials fail explicitly.
- The pinned AliRTC 7.1.9 SDK publishes a clone of the selected camera track, disables microphone publishing and plays only the generated stream from `render_uid`.
- Initialization, NOT_READY retries, reference-image updates, provider disconnects, startup cancellation and hangup are implemented. Stop sends hangup before waiting on wallet requests.
- The client ends quality-test sessions after at most 120 seconds (or the shorter returned provider/session limit). This browser timer is not server-enforced credit protection. Provider lifetime also depends on Vidu's returned `live_duration`.
- Session creation retries explicit rate limits only. Ambiguous server failures/timeouts are not automatically retried because creation is not documented as idempotent.

Protocol reference: [Vidu S2-Editing parameters](https://platform.vidu.com/vidu-stream/doc/s2-editing/parameters) and [official browser demo](https://platform.vidu.com/live-doc/files/s2-editing/quick-start/index.html).

## Testing quality

Use the Vercel preview for this branch, sign in, select Pro, upload a PNG/JPEG/WebP reference under 2 MB, and start the camera. Pro currently uses image-based subject replacement; text/background prompt controls do not change Vidu output. Stop the session after comparing the generated output. Start a new session after the test timer expires.

The server environment needs a Vidu API key with S2-Editing access and working Supabase credentials. The downloaded source's local `.env` files contained placeholder Supabase browser credentials. Keep all real credentials outside Git. Mock credentials cannot evaluate Vidu quality and are rejected by the RTC client.

Automated checks exercise session credentials and payloads, renderer selection, prompt signaling, initialization retry, timeouts, cancellation and hangup. They mock the provider and RTC engine; they do not establish real Vidu media connectivity.

## Separate deployment fixes and limitations

Web builds use their own deployment's `/api`; configured remote API URLs remain supported in packaged desktop builds. Hosted voice controls explain that MorphlyVC requires the desktop app instead of calling desktop-only routes.

Production logs on September 16 showed wallet requests reaching the 30-second function timeout, including user upserts taking 13-17 seconds. That database latency is separate from the Vidu RTC integration and is not resolved here.
