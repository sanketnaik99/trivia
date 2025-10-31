# Feature Specification: Trivia Room System

**Feature Branch**: `001-trivia-room-system`  
**Created**: 2025-10-30  
**Status**: Draft  
**Input**: User description: "initial trivia setup. This application is a trivia app. It should allow users to create and join rooms. Once users have joined a room, they can ready up and the trivia will begin. All users will be shown the same question and they will have 3 minutes to answer it. Once all users have answered the question or when the 3 minutes end, the winner will be chosen. If there is no winner, a new question will shown to the users once they ready up again"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Join Rooms (Priority: P1)

Users can create a new trivia room or join an existing room using a room code. This allows players to gather before starting a game session. A user creates a room and receives a unique room code to share with friends. Other users can enter this code to join the same room and see who else is in the room.

**Why this priority**: This is the foundational capability - users must be able to gather in rooms before any trivia gameplay can occur. Without this, no other features can function.

**Independent Test**: Can be fully tested by creating a room, copying the room code, opening the app in another browser/device, joining with that code, and verifying both users see each other in the room. Delivers the core value of bringing players together.

**Acceptance Scenarios**:

1. **Given** a user is on the home page, **When** they click "Create Room", **Then** a new room is created and they see a unique room code displayed
2. **Given** a user has a room code, **When** they enter it and click "Join Room", **Then** they are taken to that room and see the list of current participants
3. **Given** multiple users are in the same room, **When** a new user joins, **Then** all existing users see the new participant added to the list in real-time
4. **Given** a user is in a room, **When** they view the room, **Then** they see their own name highlighted or marked as "You" in the participant list

---

### User Story 2 - Ready Up and Start Game (Priority: P2)

Once users are in a room, they can indicate they're ready to begin. When all participants mark themselves as ready, the trivia game automatically starts and the first question appears to all players simultaneously.

**Why this priority**: This enables the transition from lobby to gameplay. Once users can gather (P1), this is the next critical step to begin the actual trivia experience.

**Independent Test**: Can be tested independently by having 2-3 users in a room, each clicking "Ready", and verifying that once all are ready, the question appears simultaneously for all players. Delivers the value of synchronized game start.

**Acceptance Scenarios**:

1. **Given** a user is in a room with other participants, **When** they click "Ready", **Then** their status changes to "Ready" and all other participants see this status update
2. **Given** all participants in a room are ready, **When** the last person marks ready, **Then** the trivia game automatically starts within 3 seconds and all players see the first question
3. **Given** some participants are ready and others are not, **When** a ready participant changes their mind, **Then** they can click "Unready" and their status updates for all participants
4. **Given** a game has not started, **When** a participant leaves the room, **Then** remaining participants see the updated participant list

---

### User Story 3 - Answer Questions with Timer (Priority: P3)

During an active game, all players see the same trivia question with multiple choice answers. A 3-minute countdown timer is visible to all players. Players can select their answer at any time before the timer expires. Once a player submits an answer, they wait for others to finish or for the timer to expire.

**Why this priority**: This is the core gameplay mechanic. It builds on P1 (rooms) and P2 (starting) to deliver the actual trivia experience.

**Independent Test**: Can be tested by starting a game with multiple users, verifying all see the same question and countdown timer, submitting answers at different times, and confirming the question ends when time expires or all have answered. Delivers the core trivia gameplay value.

**Acceptance Scenarios**:

1. **Given** a trivia game has started, **When** the question appears, **Then** all players see the same question text, answer options, and a 3-minute countdown timer
2. **Given** a player is viewing a question, **When** they select an answer and click "Submit", **Then** they see a "Waiting for others" state and can see how many players have answered vs. still answering
3. **Given** the 3-minute timer is running, **When** it reaches zero, **Then** the question automatically ends for all players regardless of who has answered
4. **Given** all players have submitted answers, **When** the last player submits, **Then** the question immediately ends for all players without waiting for the timer
5. **Given** a player has submitted their answer, **When** waiting for others, **Then** they cannot change their answer

---

### User Story 4 - Determine Round Winner (Priority: P4)

After all players have answered or time expires, the system reveals the correct answer and determines who answered correctly. If multiple players answered correctly, the fastest correct answer wins the round. Players see the results including who won, the correct answer, and their own performance.

**Why this priority**: This provides feedback and determines round outcome, completing the game loop. It's important but depends on P3 (answering) being complete first.

**Independent Test**: Can be tested by completing a question round with mixed correct/incorrect answers at different speeds, then verifying the winner is correctly identified as the fastest correct answer, and all players see appropriate feedback. Delivers competitive outcome and learning value.

**Acceptance Scenarios**:

1. **Given** a question round has ended, **When** results are calculated, **Then** all players see the correct answer highlighted and which players answered correctly vs. incorrectly
2. **Given** multiple players answered correctly, **When** determining the winner, **Then** the player with the fastest correct answer time wins the round and all players see "Winner: [Name]"
3. **Given** only one player answered correctly, **When** results are shown, **Then** that player is declared the winner regardless of time
4. **Given** no players answered correctly, **When** results are shown, **Then** players see "No Winner This Round" and the correct answer is still displayed
5. **Given** results are displayed, **When** players review them, **Then** each player sees their own answer marked (correct/incorrect) with their response time

---

### User Story 5 - Continue or End Game (Priority: P5)

After viewing round results, players can ready up again to continue to the next question, or they can leave the room to end their participation. The room persists as long as at least one player remains. When starting a new round, a different question is presented.

**Why this priority**: This enables continuous gameplay and graceful session ending. It's lower priority as it enhances the experience but isn't required for a minimal viable game (which could be single-round).

**Independent Test**: Can be tested by completing one round, having all players ready up again, verifying a new different question appears, then having one player leave and confirming the room continues for remaining players. Delivers replayability and session management value.

**Acceptance Scenarios**:

1. **Given** players are viewing round results, **When** they click "Ready for Next Round", **Then** their ready status is updated and visible to all players
2. **Given** all players have readied up after results, **When** the last player marks ready, **Then** a new question (different from previous) is shown to all players with a fresh 3-minute timer
3. **Given** a player is in a room, **When** they click "Leave Room", **Then** they are removed from the room and returned to the home page, and remaining players see the updated participant list
4. **Given** all players leave a room, **When** the last player exits, **Then** the room is automatically closed and the room code becomes invalid
5. **Given** at least one player remains, **When** others leave between rounds, **Then** the room continues to exist and remaining players can wait for others to join or start with fewer players

---

### Edge Cases

- What happens when a user loses internet connection during an active question?
- What happens if a player creates a room but no one joins before they close the browser?
- What happens when two players submit correct answers at exactly the same millisecond?
- What happens if a player tries to join a room that doesn't exist or has ended?
- What happens if a room creator leaves before the game starts?
- What happens when players are in different timezones (are timestamps synchronized)?
- What happens if a user opens multiple tabs and tries to join the same room twice?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a new trivia room and receive a unique shareable room code
- **FR-002**: System MUST allow users to join an existing room using a valid room code
- **FR-003**: System MUST display all participants currently in a room to each participant in real-time
- **FR-004**: System MUST allow users to toggle their ready status before a game starts
- **FR-005**: System MUST automatically start the game when all participants in a room are marked as ready
- **FR-006**: System MUST display the same question and answer options to all players simultaneously when a round begins
- **FR-007**: System MUST display a synchronized 3-minute countdown timer visible to all players during a question
- **FR-008**: System MUST allow players to select and submit one answer per question
- **FR-009**: System MUST prevent players from changing their answer after submission
- **FR-010**: System MUST end a question round when all players have submitted answers OR when the 3-minute timer expires, whichever comes first
- **FR-011**: System MUST determine and display the correct answer after each round ends
- **FR-012**: System MUST identify the round winner as the player with the fastest correct answer, or indicate "No Winner" if no correct answers
- **FR-013**: System MUST display round results including winner, correct answer, and each player's answer and response time
- **FR-014**: System MUST allow players to ready up for the next round after viewing results
- **FR-015**: System MUST present a different question for each new round (no immediate repeats)
- **FR-016**: System MUST allow players to leave a room at any time
- **FR-017**: System MUST update participant lists in real-time when players join or leave
- **FR-018**: System MUST close a room when all participants have left
- **FR-019**: UI MUST be simple, elegant, and intuitive per project constitution
- **FR-020**: UI MUST be fully responsive and work on mobile (320px+), tablet (768px+), and desktop (1024px+) devices
- **FR-021**: Implementation MUST use Next.js, Tailwind CSS, and shadcn/ui per project constitution
- **FR-022**: System MUST use WebSockets for real-time bidirectional communication to synchronize game state across all players in a room
- **FR-023**: System MUST store room state in Durable Objects for fast access and real-time updates (database can be added later for persistence)
- **FR-024**: System MUST use a hardcoded array of 10 trivia questions for MVP (sufficient for testing core mechanics)

*Note: Per constitution, no testing requirements should be included. Quality is assured through code review and manual testing.*

### Key Entities

- **Room**: Represents a game session; attributes include unique room code, list of participants, current game state (lobby/active/results), current question if active, and creation timestamp
- **Participant**: Represents a user in a room; attributes include display name, ready status, current answer (if in active round), answer submission time, and connection status
- **Question**: Represents a trivia question; attributes include question text, multiple answer options (typically 4), correct answer indicator, category, and difficulty level
- **Round**: Represents one question cycle; attributes include question reference, start time, timer duration (3 minutes), participant answers with timestamps, and round winner

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a room and share the code with others in under 30 seconds
- **SC-002**: Users can join an existing room using a code in under 20 seconds
- **SC-003**: All participants see real-time updates (joins, ready status, answers) within 2 seconds across all devices
- **SC-004**: The game starts automatically within 3 seconds after all players mark ready
- **SC-005**: All players see the same question simultaneously with timestamp variance under 1 second
- **SC-006**: The 3-minute countdown timer displays consistently across all player devices with drift under 2 seconds
- **SC-007**: Question rounds end immediately when all players answer or when timer reaches zero
- **SC-008**: Round winners are correctly identified in 100% of cases based on fastest correct answer
- **SC-009**: UI functions correctly and is fully usable on screens from 320px to 2560px width
- **SC-010**: Users can complete a full game cycle (create/join, ready, answer, view results, next round) intuitively without instructions
- **SC-011**: 90% of users successfully create or join a room on their first attempt
- **SC-012**: All code adheres to clean code standards per project constitution
- **SC-013**: System supports at least 2-8 players per room simultaneously
- **SC-014**: Initial page load completes in under 3 seconds on 4G connection

### Assumptions

- Users will have unique display names (either auto-generated or user-provided)
- Internet connection is stable during gameplay (disconnection handling is edge case, not primary flow)
- Questions will be multiple choice with 4 options
- Room codes will be short enough to easily share verbally or via text (6-8 characters)
- Only one game can be active in a room at a time (no concurrent games in same room)
- Players must have JavaScript enabled and use a modern browser
- Scoring is per-round (fastest correct answer) not cumulative across multiple rounds in this MVP
- WebSockets with Durable Objects provide sufficient real-time synchronization for MVP
- 10 hardcoded questions are sufficient to validate core game mechanics before adding more content
- Room state in Durable Objects is acceptable for MVP; database persistence can be added in future iteration
