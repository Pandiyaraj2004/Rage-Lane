# RAGE LANE

A playable top-down city combat racer. React + Vite + TypeScript, Phaser 3, Tailwind CSS, Express and Socket.IO. Graphics are generated in code; no external art or paid services are required.

## Run

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:5173. Play Solo runs the same simulation locally with five rivals and needs no server or account. Quick Match finds or creates an open public lobby; its host starts after everyone marks ready. Create Room makes a private room on the server on port 3001. Share the six-character room code; all humans must mark ready, then the host starts. Two browser tabs can test multiplayer. Up to eight humans; fewer than four total players are filled with bots.

```sh
npm test
npm run build
npm start
```

Production serves the built client and WebSocket server together at http://localhost:3001. Deploy the Dockerfile to any Node/container host with WebSockets. Set PORT as required by the host. For separate frontend hosting, set VITE_SERVER_URL before building and CLIENT_ORIGIN on the backend. Copy .env.example to .env if needed and launch with `node --env-file=.env --import tsx server/index.ts`; Vite reads its own .env automatically. Never put DATABASE_URL in VITE_ variables.

## Play

Arrow keys accelerate, reverse and steer. Shift nitro; Space handbrake; Ctrl fires. A aims right, W up, S down, D left (diagonal combinations work). 1 machine gun, 2 rockets, 3 oil. E leaves a car or enters a nearby available car. M toggles the map. Mobile has circular movement and independent aim/fire sticks, plus one-tap weapon, nitro and enter/exit buttons. Settings lets players reposition each control using horizontal/vertical sliders with a layout preview; positions persist on the device.

Five crates are revealed on the map from the start. A carrier gets a gold Wanted ring and gold map marker. Cars have 150 durability; losing a car puts its driver on foot with 100 health. Elimination spills all treasure, awards a kill and respawns the player after three seconds. Green health, blue repair and purple ammunition respawn periodically. Parked cars allow re-entry.

Matches last eight minutes. Score = held treasures × 1,000 + eliminations × 250. Treasure is only worth points while held. Equal scores are ties (display order is stable). Results award reputation equal to score and record local leaderboard entries.

## Performance and tuning

Normal vehicle speed is 270 units/s, nitro is 420, and on-foot speed is 125. Acceleration is 650 units/s² (vehicle) and 900 (on foot), braking is 1500. Guns fire 900 units/s and rockets 620. Tuning lives in `shared/game.ts`. Both server and solo simulate at 60 Hz, network snapshots at 30 Hz, with interpolated remote rendering. Static city art is cached in 800px tiles; rendering skips off-screen effects. Emoji textures are created once, and the React minimap terrain is memoized. The engine is loaded separately from the homepage.

Treasure icons pulse on both the world and district map. Tap the minimap or press M for the full map; it displays glowing diamond caches and labeled locations.

Tests cover 8 live clients: matchmaking, private room codes, capacity limits, readiness/host checks, synchronized movement and timeline, actual combat, treasure collection, treasure drops on disconnect, host migration and room cleanup. PostgreSQL remains optional and needs a configured database for integration verification.

## Architecture and persistence

- `shared/game.ts`: deterministic rules, city geometry, bot decisions, collision, scoring and state types.
- `server/index.ts`: authoritative fixed-step simulation, validated input, room readiness, disconnect handling and shared timeline. Clients send controls only, never positions or scores.
- `client/src/game.ts`: Phaser procedural world, interpolated positions, camera and input.
- `client/src/main.tsx`: home, lobby, HUD, mobile controls and results.
- `server/persistence.ts`: optional PostgreSQL match results. DATABASE_URL enables table creation and match saving. GET /api/leaderboard exposes recent persisted matches. Guests always work without it.

## Limits

Guest identities are ephemeral; persistent login/accounts are not implemented. The visible leaderboard is device-local; PostgreSQL history is available through the API. Rooms are in memory and require a single backend instance (no Redis clustering). Refreshing disconnects a participant; reconnecting to an in-progress match is not supported. Bots use basic road navigation. There are no player-to-player body collisions or latency prediction; static obstacles block movement and projectiles. This is an initial playable implementation, not a hardened public competitive service.

All original code and procedural graphics in this project are released under MIT; dependencies retain their own licenses.
