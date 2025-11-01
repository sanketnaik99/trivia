# Feature Specification: Express + Socket.IO Migration with Score Tracking

**Feature Branch**: `002-express-socketio-migration`  
**Created**: 2025-11-01  
**Status**: Draft  
**Input**: User description: "migration to express - this project uses turborepo and is a monorepo. It currently has a folder called #file:workers which is the durable object backend for this trivia app. We need to migrate this to use an express app with socket.io while maintaining the existing functionality as well as adding more functionality. The new feature is to keep track of the score in a room. People should also be able to join the room using the link for the room and add a share link button as well"

## Clarifications

### Session 2025-11-01

- Q: What is the scoring system for winners vs non-winners in each round? → A: There can only be 1 winner each round. They will get 1 point for winning. Other players receive 0 points regardless of whether they answered correctly.
- Q: How long should a room remain active when no players are connected before being automatically cleaned up? → A: 5 minutes - Short timeout, aggressive cleanup to prevent resource leaks.
- Q: What port should the Express server listen on? → A: Port 3001 (adjacent to frontend on 3000, easy to remember).
- Q: What should happen to players when the server restarts and their room state is lost? → A: Players see "Session lost" error message and are redirected to homepage to create/join a new room.
- Q: When two players have the same total score, what should be the tie-breaking rule for leaderboard ranking? → A: Most recent round winner ranks higher (recency-based tie-breaking).
- Q: Should there be a maximum limit on concurrent rooms the server will maintain? → A: 100 rooms maximum.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend Migration Preserves Existing Functionality (Priority: P1)

The existing trivia game functionality (create rooms, join rooms, ready up, answer questions, view results, continue to next round) continues to work exactly as before, but now powered by Express and Socket.IO instead of Cloudflare Durable Objects. All existing WebSocket messages and game flow remain unchanged from the user's perspective.

**Why this priority**: This is the foundational migration work. Without a functioning Express + Socket.IO backend that replicates existing behavior, no other features can be added. This ensures zero regression for existing users.

**Independent Test**: Can be tested by running through all existing game scenarios (create room, join, ready up, answer questions, view results, next round) and verifying they work identically to the current implementation. All existing acceptance scenarios from spec 001 should pass unchanged. Delivers continuity of service.

**Acceptance Scenarios**:

1. **Given** the Express backend is running, **When** a user creates a room, **Then** they receive a unique room code and can access the room lobby
2. **Given** a room exists, **When** users join via room code, **Then** all participants see each other in real-time via Socket.IO
3. **Given** all participants are ready, **When** the countdown completes, **Then** the game starts and all players see the same question simultaneously
4. **Given** a game is active, **When** players submit answers, **Then** all participants see answer count updates in real-time
5. **Given** all players have answered or time expires, **When** the round ends, **Then** results are displayed showing correct answer and winner
6. **Given** results are displayed, **When** all players ready up again, **Then** a new round starts with a different question
7. **Given** the Express server uses Socket.IO, **When** any state change occurs, **Then** updates are broadcast to all connected clients within 1 second
8. **Given** a player disconnects, **When** they reconnect within 30 seconds, **Then** they rejoin the same room with their previous state restored

---

### User Story 2 - Score Tracking Across Rounds (Priority: P2)

Players accumulate points across multiple rounds in a room session. The winner of each round (fastest correct answer) earns 1 point. A live leaderboard shows cumulative scores throughout the game session. At the end of the session, the overall winner is the player with the highest total score.

**Why this priority**: This adds the primary new feature requested - score tracking. It builds on P1 (working backend) and provides competitive progression that wasn't possible with single-round gameplay.

**Independent Test**: Can be tested by playing multiple rounds with 2-3 players where different players win each round, then verifying that scores accumulate correctly (1 point per win) and the leaderboard updates after each round. The overall winner should be correctly identified based on cumulative points. Delivers competitive progression and session continuity.

**Acceptance Scenarios**:

1. **Given** a room has been created, **When** players join, **Then** all players start with 0 points displayed next to their names
2. **Given** a round ends with a winner, **When** results are calculated, **Then** the winner receives 1 point and all other players receive 0 points
3. **Given** a round ends with no correct answers, **When** results are shown, **Then** no points are awarded to any player
4. **Given** multiple rounds have been played, **When** viewing the room lobby or results, **Then** all players see an updated leaderboard showing current scores sorted by points (highest first)
5. **Given** scores have been tracked across rounds, **When** players view the leaderboard, **Then** they see each player's name, total score, and ranking position
6. **Given** a player joins mid-session, **When** they enter the room, **Then** they start with 0 points while existing players retain their accumulated scores
7. **Given** a round has just ended, **When** results are displayed, **Then** players see the round winner highlighted with +1 point awarded

---

### User Story 3 - Join Room via Shareable Link (Priority: P3)

Instead of manually typing a room code, users can join a trivia room by clicking a shareable URL (e.g., `https://trivia.app/room/A3B7K9`). When they visit this link, they are prompted to enter their name and automatically join that specific room. The URL includes the room code, eliminating the need to type it separately.

**Why this priority**: This improves user experience by making room joining faster and less error-prone, especially on mobile devices where typing codes is cumbersome. It builds on P1 (working backend) and makes sharing rooms more convenient.

**Independent Test**: Can be tested by creating a room, copying the shareable URL, opening it in a new browser or device, entering a name, and verifying automatic entry into the correct room without needing to type the room code. Delivers streamlined joining experience.

**Acceptance Scenarios**:

1. **Given** a user creates a room, **When** the room is created, **Then** the room lobby displays a shareable link in the format `https://[domain]/room/[CODE]`
2. **Given** a user has a shareable room link, **When** they click or visit the URL, **Then** they land on a page pre-populated with the room code and only need to enter their name to join
3. **Given** a user visits a room link, **When** the room code in the URL is valid and joinable, **Then** they are taken to the join page with the code already filled in
4. **Given** a user visits a room link, **When** the room code is invalid or the room is full, **Then** they see an appropriate error message (room not found, room full, or game in progress)
5. **Given** a room exists with multiple participants, **When** new users join via the shareable link, **Then** they successfully enter the room and all existing participants see them join in real-time
6. **Given** the frontend routes are configured, **When** a user navigates to `/room/[CODE]`, **Then** Next.js renders the appropriate join page with the code parameter extracted from the URL

---

### User Story 4 - Share Room Link Button (Priority: P4)

Users in a room lobby see a "Share Link" button that provides easy access to the shareable room URL. Clicking this button either copies the link to clipboard (with visual feedback) or opens a native share dialog on mobile devices. This makes it effortless for the room creator to invite friends.

**Why this priority**: This is a convenience enhancement that makes sharing rooms easier, but it's optional compared to having the link visible (P3). It adds polish to the user experience.

**Independent Test**: Can be tested by creating a room, clicking the "Share Link" button, and verifying that the correct URL is copied to clipboard (or share dialog opens on mobile). Then paste the link elsewhere to confirm it's the correct shareable URL. Delivers convenient sharing mechanism.

**Acceptance Scenarios**:

1. **Given** a user is in a room lobby, **When** they view the room interface, **Then** they see a clearly labeled "Share Link" button next to or below the room code
2. **Given** a user clicks "Share Link" on a desktop browser, **When** the copy action completes, **Then** the room URL is copied to their clipboard and they see a temporary success message (e.g., "Link copied!")
3. **Given** a user clicks "Share Link" on a mobile device with share support, **When** the button is clicked, **Then** the native share dialog opens with the room URL pre-filled for sharing via apps (Messages, WhatsApp, etc.)
4. **Given** a user clicks "Share Link", **When** the copy/share fails (e.g., browser permissions), **Then** they see a fallback message showing the URL to manually copy
5. **Given** the shareable link includes the full URL, **When** a user shares it, **Then** recipients can click the link directly without needing to navigate to the homepage first

---

### Edge Cases

- What happens when the Express server restarts while games are active? → Players see "Session lost" error and are redirected to homepage
- What happens if a player's score calculation fails or results in invalid values?
- What happens when someone shares a room link but the room has already ended (all players left)?
- What happens if two players accumulate the exact same score across multiple rounds? → Most recent round winner ranks higher on the leaderboard
- What happens when a user tries to join via URL but uses an expired or malformed room code?
- What happens if the share button is clicked but clipboard permissions are denied?
- What happens when scores exceed display limits (e.g., 999,999+ points)?
- What happens if Socket.IO connection fails during score updates?
- What happens when a room has been inactive for hours but the link is still shared? → Room is automatically deleted after 5 minutes of inactivity
- What happens if someone tries to manipulate the shareable URL to access restricted rooms?
- What happens when players join via link while a round is already in progress?

## Requirements *(mandatory)*

### Functional Requirements

**Backend Architecture**

- **FR-001**: System MUST migrate from Cloudflare Durable Objects to a standalone Express application running as a separate service in the monorepo
- **FR-002**: System MUST use Socket.IO for bidirectional real-time communication between clients and server
- **FR-003**: System MUST preserve all existing WebSocket message types and payloads defined in the 001-trivia-room-system spec
- **FR-004**: System MUST maintain room state in-memory on the Express server (persistent storage can be added in future iterations)
- **FR-005**: System MUST handle WebSocket connection, disconnection, and reconnection logic identical to the existing Durable Objects implementation
- **FR-006**: System MUST support the same room lifecycle (create, join, ready, game start, answer, round end, results, next round) as the existing implementation
- **FR-007**: Express backend MUST expose HTTP endpoints for room creation and validation while Socket.IO handles real-time game communication
- **FR-017**: System MUST automatically clean up and delete rooms that have had no connected players for 5 minutes
- **FR-042**: System MUST enforce a maximum limit of 100 concurrent rooms to prevent resource exhaustion
- **FR-043**: System MUST return an appropriate error when attempting to create a room when the 100-room limit is reached

**Score Tracking**

- **FR-008**: System MUST track cumulative scores for each participant throughout their session in a room
- **FR-009**: System MUST award 1 point to the round winner (fastest correct answer)
- **FR-010**: System MUST award 0 points to all other participants (whether they answered correctly or not)
- **FR-011**: System MUST maintain a leaderboard showing all participants sorted by total score (highest to lowest)
- **FR-012**: System MUST display current scores next to participant names in the room lobby and results screens
- **FR-013**: System MUST include score information in relevant Socket.IO messages (ROOM_STATE, ROUND_END, etc.)
- **FR-014**: System MUST reset scores to 0 when a room is created or when all players leave and new players join
- **FR-015**: System MUST handle score updates atomically to prevent race conditions when multiple rounds complete
- **FR-016**: System MUST persist scores across reconnections within the same session (player rejoins within 30 seconds)
- **FR-041**: System MUST break ties in leaderboard ranking by recency (most recent round winner ranks higher when players have equal scores)

**Shareable Room Links**

- **FR-018**: System MUST generate shareable URLs in the format `https://[domain]/room/[ROOM_CODE]` for each room
- **FR-019**: Frontend MUST implement a Next.js dynamic route `/room/[code]` that extracts the room code from the URL
- **FR-020**: System MUST display the shareable link prominently in the room lobby interface
- **FR-021**: System MUST validate room codes from URLs against existing active rooms on the backend
- **FR-022**: System MUST automatically populate the room code field when users visit `/room/[code]` URLs
- **FR-023**: System MUST redirect users to an error page or show an appropriate message when visiting invalid room URLs
- **FR-024**: System MUST handle room code extraction from URLs case-insensitively (e.g., `/room/ABC123` and `/room/abc123` should both work)

**Share Link Button**

- **FR-025**: UI MUST display a "Share Link" or "Copy Link" button in the room lobby visible to all participants
- **FR-026**: System MUST copy the shareable room URL to the user's clipboard when the share button is clicked on desktop/tablet
- **FR-027**: System MUST trigger the native share dialog on mobile devices that support the Web Share API
- **FR-028**: System MUST show visual feedback (e.g., "Link copied!" message) after successful clipboard copy
- **FR-029**: System MUST provide a fallback display of the URL when clipboard or share functionality is unavailable
- **FR-030**: UI MUST ensure the share button is easily accessible and clearly labeled on all device sizes (mobile, tablet, desktop)

**Cross-Cutting Requirements**

- **FR-031**: System MUST maintain backward compatibility with existing frontend WebSocket message handlers
- **FR-032**: Implementation MUST organize the Express backend as a new workspace/app within the Turborepo monorepo structure
- **FR-033**: System MUST support concurrent rooms with isolated state (room A's scores don't affect room B)
- **FR-034**: UI MUST remain simple, elegant, and intuitive per project constitution
- **FR-035**: UI MUST be fully responsive and work on mobile (320px+), tablet (768px+), and desktop (1024px+) devices
- **FR-036**: Implementation MUST continue using Next.js, React, Tailwind CSS, and shadcn/ui for the frontend per project constitution
- **FR-037**: Express backend MUST use TypeScript with proper type definitions for all Socket.IO events and room state
- **FR-038**: System MUST log connection events, errors, and critical state changes for debugging
- **FR-039**: System MUST handle CORS appropriately to allow frontend-backend communication in development and production
- **FR-040**: System MUST display "Session lost" error and redirect players to homepage when server restarts and room state is lost

### Key Entities

- **Room**: Represents a game session; attributes include unique room code, list of participants with scores, current game state (lobby/active/results), current question if active, current round, used question IDs, creation timestamp, and shareable URL
- **Participant**: Represents a user in a room; attributes include ID, display name, ready status, current answer (if in active round), answer submission time, connection status, and **cumulative score** (sum of points earned across all rounds in the session)
- **Question**: Represents a trivia question; attributes include question text, correct answer, accepted answer variations, category, difficulty level
- **Round**: Represents one question cycle; attributes include question reference, start time, timer duration (3 minutes), participant answers with timestamps, round winner ID, and points awarded to each participant in this round
- **Score**: Represents points earned; attributes include participant ID, points earned in current round, cumulative total points, and leaderboard ranking
- **Leaderboard**: An ordered view of participants; attributes include participant name, total score, ranking position (1st, 2nd, 3rd, etc.), and rounds won count

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Migration Success**

- **SC-001**: All existing game flows from spec 001 (create, join, ready, answer, results, next round) work identically on the new Express + Socket.IO backend
- **SC-002**: Real-time state synchronization occurs within 1 second across all connected clients
- **SC-003**: Backend migration is completed without any breaking changes to the frontend WebSocket message contract
- **SC-004**: Express server handles at least 8 concurrent players per room with responsive performance (state updates under 500ms)
- **SC-005**: The Express backend successfully runs as an independent workspace within the Turborepo monorepo structure

**Score Tracking Success**

- **SC-006**: Scores are correctly calculated and displayed after every round for all participants
- **SC-007**: The leaderboard accurately reflects player rankings based on cumulative scores in 100% of test cases
- **SC-008**: Score updates are visible to all players within 1 second of round completion
- **SC-009**: Players can complete multiple rounds (at least 5) and see their scores accumulate correctly without errors
- **SC-010**: The overall session winner is correctly identified as the player with the highest cumulative score at any point

**Shareable Links Success**

- **SC-011**: Users can create a room, copy the shareable link, and use it to join the room in under 30 seconds
- **SC-012**: Users visiting `/room/[CODE]` URLs automatically have the room code populated and only need to enter their name to join
- **SC-013**: Invalid room codes in URLs result in clear error messages within 2 seconds of page load
- **SC-014**: 95% of users successfully join rooms via shareable links on their first attempt without errors
- **SC-015**: Shareable links work correctly on mobile, tablet, and desktop devices across different browsers

**Share Button Success**

- **SC-016**: The "Share Link" button successfully copies the room URL to clipboard on desktop/tablet with visual confirmation
- **SC-017**: The "Share Link" button opens the native share dialog on mobile devices that support the Web Share API
- **SC-018**: Users can share room links and recipients can successfully join by clicking those links in 95% of cases
- **SC-019**: The share button is clearly visible and accessible on all screen sizes (320px to 2560px width)
- **SC-020**: Users understand how to share the room link within 5 seconds of viewing the lobby interface

**Overall Quality**

- **SC-021**: All code adheres to clean code standards per project constitution
- **SC-022**: The UI remains simple, elegant, and intuitive with the new features integrated
- **SC-023**: Initial page load for room pages completes in under 3 seconds on 4G connection
- **SC-024**: No existing functionality is lost or degraded compared to the Durable Objects implementation
- **SC-025**: The system supports at least 10 concurrent rooms with 8 players each without performance degradation
- **SC-026**: The system gracefully handles the 100-room limit by displaying clear error messages to users attempting to create additional rooms

### Assumptions

- Express server will run as a separate process (can be deployed independently or alongside the Next.js frontend)
- Express server will listen on port 3001 in development (configurable via environment variable for production)
- In-memory room state is acceptable for MVP; rooms expire when all players leave or after 5 minutes of inactivity (no connected players)
- Maximum of 100 concurrent rooms can exist at any time to prevent resource exhaustion
- Socket.IO default configuration is sufficient for real-time needs (no custom transports or adapters required initially)
- Only the round winner (fastest correct answer) receives 1 point; all other players receive 0 points regardless of correctness
- Shareable links use HTTP/HTTPS protocol (no custom URL schemes for mobile apps)
- Users have modern browsers with clipboard API and Web Share API support (graceful degradation for unsupported browsers)
- Room codes remain 6 characters as defined in spec 001
- The monorepo structure allows adding a new Express app/workspace without affecting existing apps
- No authentication or user accounts are required; participants are identified by name and session ID only
- Score persistence beyond room session is not required (scores reset if room is recreated with same code)
- The domain for shareable links will be configured via environment variables for different deployment environments
- CORS settings will allow the Next.js frontend to communicate with the Express backend (both in dev and production)
- Leaderboard tie-breaking uses recency: when players have equal scores, the most recent round winner ranks higher
- The existing questions.json file can be loaded and used by the Express backend
- Socket.IO rooms feature will be used to isolate communication between participants in different trivia rooms
