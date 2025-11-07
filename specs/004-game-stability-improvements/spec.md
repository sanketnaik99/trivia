# Feature Specification: Game Stability and Customization Improvements

**Feature Branch**: `004-game-stability-improvements`  
**Created**: November 6, 2025  
**Status**: Draft  
**Input**: User description: "the goal of this task is to make the trivia system more stable and reliable. Right now, if someone leaves the room the others can't continue playing and if someone refreshes, they see a blank screen. The goal is to fix issues like this while also making improvements like allowing people to join in the middle of the game and allowing people to vote to end the game. Additionally, allow users to choose the category of questions when creating a group room, and add multiple AI feedback modes: 'Supportive', 'Neutral', & 'Roast Me'."

## Clarifications

### Session 2025-11-06

- Q: How long should empty rooms remain available before automatic cleanup? → A: 5 minutes
- Q: What specific question categories should be available for selection? → A: Use existing categories from current question database
- Q: What is the minimum number of questions required in a category to allow it to be selected? → A: 10 questions minimum
- Q: Should reconnected players who missed rounds be able to resume active play or remain spectators? → A: Spectator for remainder of current round only, rejoin as active player in next round
- Q: What should be the maximum number of active players allowed in a room? → A: 16 players (increased from current 8)
- Q: When should players be able to vote to end the game? → A: On the results page between rounds, not during active answering



## User Scenarios & Testing *(mandatory)*

### User Story 1 - Graceful Player Disconnection Handling (Priority: P1)

When a player loses connection or leaves during an active game, the remaining players can continue playing without interruption. The game automatically adjusts to handle the missing player's absence and continues to the next round.

**Why this priority**: This is the most critical stability issue. Currently, the game breaks when someone leaves, preventing all other players from continuing. This fixes the core blocking issue.

**Independent Test**: Can be fully tested by starting a game with 3+ players, having one player disconnect mid-round, and verifying the remaining players can complete the round and continue to subsequent rounds without errors or interruptions.

**Acceptance Scenarios**:

1. **Given** an active game with 3 players in the middle of a round, **When** one player closes their browser, **Then** the remaining 2 players see a notification that the player disconnected and can continue answering the current question
2. **Given** an active game with 2 players and the round timer expires, **When** only one player has answered, **Then** the round completes normally showing results for the player who answered
3. **Given** a game in lobby state with 4 ready players, **When** one player disconnects before the game starts, **Then** the remaining 3 players can still start the game once all remaining players are ready
4. **Given** an active game with multiple players in the middle of a round, **When** a disconnected player reconnects, **Then** they rejoin as a spectator for the remainder of the current round and see the current game state
5. **Given** a player who reconnected as a spectator mid-round, **When** the round ends and the next round begins, **Then** they automatically become an active player again and can participate normally

---

### User Story 2 - Seamless Page Refresh Recovery (Priority: P1)

When a player refreshes their browser during a game, they immediately rejoin the game in its current state without seeing a blank screen or error. They can continue participating from where they left off.

**Why this priority**: This is the second critical stability issue causing blank screens. Users expect to be able to refresh without losing their game state, which is standard behavior for modern web applications.

**Independent Test**: Can be fully tested by joining a game, refreshing the browser at various game states (lobby, active round, results), and verifying the player rejoins automatically with the correct state displayed.

**Acceptance Scenarios**:

1. **Given** a player is in an active game room, **When** they refresh their browser, **Then** they immediately see the current game state (current question, time remaining, their score) without needing to rejoin
2. **Given** a player is viewing round results, **When** they refresh their browser, **Then** they see the same results screen with leaderboard and can mark themselves ready for the next round
3. **Given** a player is in the lobby waiting for others to ready up, **When** they refresh their browser, **Then** they rejoin the lobby with their previous ready status preserved
4. **Given** an authenticated user in a game, **When** they refresh, **Then** the system recognizes them by their user ID and reconnects them to their existing participant slot

---

### User Story 3 - Mid-Game Joining as Spectator (Priority: P2)

When a player joins a room while a game is already in progress, they can watch the current game as a spectator. They see the current question, leaderboard, and game progress in real-time. When the current game ends and returns to lobby, they can mark themselves ready to participate in the next game.

**Why this priority**: This enhances the social aspect and allows players to join friends without disrupting ongoing games. It's not critical for stability but significantly improves user experience.

**Independent Test**: Can be fully tested by starting a game with 2 players, having a third player join mid-game, and verifying they can watch the game and then participate in the next round.

**Acceptance Scenarios**:

1. **Given** a game is active with multiple rounds remaining, **When** a new player joins the room, **Then** they see a spectator view with the current question, timer, and leaderboard
2. **Given** a spectator is watching an active game, **When** the round ends and results are shown, **Then** the spectator sees the results and leaderboard but cannot mark themselves ready until the game returns to lobby
3. **Given** a spectator has been watching a game, **When** the game completes and returns to lobby state, **Then** the spectator becomes a full participant and can mark themselves ready for the next game
4. **Given** multiple spectators join during an active game, **When** the game returns to lobby, **Then** all spectators can participate in the next game

---

### User Story 4 - Question Category Selection (Priority: P2)

When creating a group room, the room creator can select a specific question category to focus the trivia game on topics of interest. All questions in that game session come from the selected category, allowing themed trivia experiences.

**Why this priority**: This significantly enhances the customization and appeal of group games by allowing players to focus on topics they're interested in or knowledgeable about. It's important for engagement but not critical for stability.

**Independent Test**: Can be fully tested by creating a group room, selecting a specific category (e.g., "Science"), starting the game, and verifying all questions presented are from the Science category.

**Acceptance Scenarios**:

1. **Given** a user is creating a group room, **When** they view the room creation form, **Then** they see a dropdown or selection menu with available question categories
2. **Given** a user has selected a specific category when creating a room, **When** the room is created, **Then** the selected category is displayed in the room lobby for all participants to see
3. **Given** a game starts in a room with a selected category, **When** questions are presented, **Then** all questions belong to the chosen category
4. **Given** a user creates a room without selecting a category, **When** the game starts, **Then** questions are drawn from all available categories (mixed mode)
5. **Given** a room with a selected category completes a game, **When** players ready up for another round, **Then** the same category remains selected for subsequent games

---

### User Story 5 - AI Feedback Modes (Priority: P2)

When creating a group room, the room creator can choose an AI feedback mode that determines the tone and style of feedback players receive on their answers. Three modes are available: Supportive (encouraging), Neutral (factual), and Roast Me (humorous and sarcastic).

**Why this priority**: This adds personality and variety to the game experience, making it more engaging and fun. Different groups may prefer different feedback styles, and this customization enhances the social gaming experience.

**Independent Test**: Can be fully tested by creating three separate rooms with different feedback modes, submitting answers in each, and verifying the AI feedback tone matches the selected mode.

**Acceptance Scenarios**:

1. **Given** a user is creating a group room, **When** they view the room creation form, **Then** they see three AI feedback mode options: "Supportive", "Neutral", and "Roast Me"
2. **Given** a user selects "Supportive" mode, **When** a player submits an incorrect answer, **Then** they receive encouraging feedback that acknowledges effort and provides gentle guidance
3. **Given** a user selects "Neutral" mode, **When** a player submits an answer, **Then** they receive straightforward, factual feedback without emotional tone
4. **Given** a user selects "Roast Me" mode, **When** a player submits an incorrect answer, **Then** they receive humorous, playfully sarcastic feedback that entertains while correcting
5. **Given** a room has been created with a specific feedback mode, **When** the game progresses through multiple rounds, **Then** the feedback mode remains consistent throughout all rounds
6. **Given** a room displays in the lobby, **When** participants view the room settings, **Then** they can see which AI feedback mode is active for that room

---

### User Story 6 - Vote to End Game (Priority: P3)

During the results phase between rounds, any player can initiate a vote to end the current game early and return to the lobby. When a majority of active players vote to end, the game immediately ends, shows final results, and returns everyone to the lobby state.

**Why this priority**: This provides players with control over game flow when situations arise where continuing doesn't make sense (e.g., most players left, question set is too hard/easy, technical issues). It's a quality-of-life improvement rather than a stability fix.

**Independent Test**: Can be fully tested by starting a game with 3 players, completing a round, and having 2 of them vote to end on the results page, verifying the game ends and returns all players to lobby with final results displayed.

**Acceptance Scenarios**:

1. **Given** players are viewing results after completing a round, **When** one player clicks the "Vote to End Game" button, **Then** all players see a notification showing "1/4 players voted to end the game"
2. **Given** players are on the results page where 1 has already voted, **When** a second player votes (reaching majority with 2/3), **Then** the game immediately ends, final results are displayed, and all players return to lobby state
3. **Given** a vote to end game is in progress on the results page, **When** players ready up for the next round before majority is reached, **Then** the vote is cleared and the next round begins normally
4. **Given** a player has voted to end the game on the results page, **When** they change their mind before majority is reached, **Then** they can click the button again to remove their vote
5. **Given** multiple players have voted to end on the results page, **When** players disconnect causing the remaining players to be below the vote threshold, **Then** the vote requirement recalculates based on remaining active players
6. **Given** players are actively answering a question, **When** they view the UI, **Then** the vote-to-end-game button is not available (only visible on results page)

---

### Edge Cases

- What happens when the last remaining player in an active game disconnects? The game should end immediately and clean up the room after 5 minutes if no one reconnects.
- What happens when a player refreshes multiple times in rapid succession? The system should handle duplicate reconnection attempts gracefully without creating multiple participant entries.
- What happens when a spectator refreshes during the game? They should rejoin as a spectator in the same state.
- What happens when all players disconnect during an active round? The room should remain available for 5 minutes, then clean up if no one reconnects.
- What happens when a vote to end game reaches majority on the results page exactly as players ready up for the next round? The system should handle whichever event completes first and ignore the second.
- What happens when network issues cause a player to appear disconnected but they're still trying to participate? The system should show clear connection status indicators to all players.
- What happens when an authenticated user tries to join a room where they're already a participant on another device? The new connection should take over and the old one should be marked as disconnected.
- What happens when a spectator count is very high (10+ spectators)? The system should handle broadcasting game state updates efficiently without performance degradation.
- What happens when 16 active players are already in a room and another player tries to join? They should join as a spectator and can become an active player when the game returns to lobby if a slot is available.
- What happens when a selected question category has fewer questions than needed for a complete game? The system validates that categories have at least 10 questions before allowing selection, preventing this scenario.
- What happens when a user tries to create a room with an invalid or non-existent category? The system validates category selection and shows an appropriate error message.
- What happens when the AI feedback service is unavailable or times out? Players should still see basic feedback or a fallback message indicating the service is temporarily unavailable.
- What happens if different players have different expectations about the feedback mode? The selected mode is clearly displayed in the lobby so players can decide whether to participate.

## Requirements *(mandatory)*

### Functional Requirements

**Disconnection Handling:**
- **FR-001**: System MUST detect when a player's connection is lost and update their status to disconnected within 5 seconds
- **FR-002**: System MUST allow games to continue when one or more players disconnect, as long as at least one active player remains
- **FR-003**: System MUST broadcast player disconnection events to all remaining players in the room
- **FR-004**: System MUST exclude disconnected players from round completion requirements (game doesn't wait for them to answer)
- **FR-005**: System MUST preserve disconnected players' scores and game data in case they reconnect

**Reconnection & Refresh Handling:**
- **FR-006**: System MUST recognize returning players by their user ID (for authenticated users) or participant ID and restore their session
- **FR-007**: System MUST send complete current game state to reconnecting players including current question, timer, scores, and leaderboard
- **FR-008**: System MUST restore a reconnected player to spectator status if they reconnect during an active round, then automatically convert them to active player status at the start of the next round
- **FR-009**: System MUST prevent duplicate participant entries when the same user refreshes or reconnects multiple times
- **FR-010**: System MUST maintain consistent participant identity across disconnections and reconnections within a single game session

**Spectator Mode:**
- **FR-011**: System MUST allow new players to join active games as spectators without disrupting gameplay
- **FR-012**: System MUST show spectators the current question, timer, leaderboard, and game progress in real-time
- **FR-013**: System MUST prevent spectators from answering questions or affecting game state during active rounds
- **FR-014**: System MUST automatically convert spectators to full participants when the game returns to lobby state
- **FR-015**: System MUST clearly distinguish spectators from active players in the UI for all participants
- **FR-016**: System MUST broadcast game state updates to spectators in the same manner as active players

**Vote to End Game:**
- **FR-017**: System MUST provide a vote-to-end-game button to all active players on the results page between rounds
- **FR-018**: System MUST NOT display the vote-to-end-game button during active answering phases
- **FR-019**: System MUST calculate vote threshold as majority of currently active (connected) players
- **FR-020**: System MUST broadcast vote count updates to all players when someone votes
- **FR-021**: System MUST allow players to toggle their vote on/off before majority is reached
- **FR-022**: System MUST immediately end the game and show final results when vote threshold is reached on the results page
- **FR-023**: System MUST clear all votes when players ready up for the next round or when game ends
- **FR-024**: System MUST recalculate vote threshold dynamically as players connect or disconnect
- **FR-025**: System MUST not allow spectators to vote to end the game

**Question Category Selection:**
- **FR-026**: System MUST provide a list of available question categories from the existing question database when creating a group room
- **FR-027**: System MUST allow room creators to select a specific category or choose mixed/all categories
- **FR-028**: System MUST display the selected category in the room lobby for all participants to see
- **FR-029**: System MUST ensure all questions in a game come from the selected category when specified
- **FR-030**: System MUST persist the category selection across multiple game rounds within the same room session
- **FR-031**: System MUST validate that the selected category has at least 10 questions available before allowing selection

**AI Feedback Modes:**
- **FR-032**: System MUST offer three AI feedback modes during room creation: Supportive, Neutral, and Roast Me
- **FR-033**: System MUST send the selected feedback mode to the AI service with each answer evaluation request
- **FR-034**: System MUST apply the selected feedback mode consistently to all answer feedback throughout the game
- **FR-035**: System MUST display the active feedback mode in the room lobby for participant awareness
- **FR-036**: System MUST handle AI service failures gracefully with appropriate fallback messages

**General Stability:**
- **FR-037**: System MUST handle race conditions between player actions and disconnection events gracefully
- **FR-038**: System MUST provide clear visual indicators of each player's connection status to all participants
- **FR-039**: System MUST clean up empty rooms after 5 minutes of inactivity to free resources
- **FR-040**: System MUST log all connection state changes for debugging and monitoring purposes
- **FR-041**: System MUST support a maximum of 16 active players per room
- **FR-042**: System MUST prevent additional players from joining as active participants when the 16-player limit is reached (they may join as spectators)

### Key Entities

- **Participant**: Represents a player in the room with attributes including ID, name, connection status (connected/disconnected), score, ready state, join timestamp, and user ID (for authenticated users). Connection status is now a critical attribute that determines whether the player is actively participating.

- **Spectator Role**: A temporary state for participants who join during an active game. Spectators have read-only access to game state and convert to full participants when the game returns to lobby.

- **Vote State**: Tracks the current vote-to-end-game status including which participants have voted, total votes, and required threshold. Exists only on the results page between rounds and is cleared when players ready up for the next round or when the game ends.

- **Game Session**: Represents the continuity of a game across player disconnections and reconnections. Maintains participant identity and game state to support seamless recovery from connection issues.

- **Question Category**: Represents a thematic grouping of questions from the existing question database. Categories have a name, description, and contain multiple questions. Rooms can be configured to draw questions from a specific category or from all categories. Available categories are determined by what exists in the current question database.

- **AI Feedback Mode**: Configuration setting for a room that determines the tone and style of AI-generated feedback. Three modes exist: Supportive (encouraging and positive), Neutral (factual and straightforward), and Roast Me (humorous and sarcastic). The selected mode is sent to the AI service to guide its response generation. The mode applies to all feedback throughout the game session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of games with player disconnections complete successfully without requiring remaining players to create a new room
- **SC-002**: Players who refresh their browser during any game state (lobby, active, results) rejoin successfully within 3 seconds with correct state displayed
- **SC-003**: Spectators joining mid-game receive real-time game updates with no more than 1 second delay compared to active players
- **SC-004**: Vote to end game reaches majority and completes within 2 seconds of the threshold being met
- **SC-005**: Zero duplicate participant entries occur when players refresh or reconnect to the same room
- **SC-006**: Connection status indicators update within 5 seconds of actual connection state changes
- **SC-007**: Games with up to 16 active players plus spectators maintain smooth performance with no noticeable lag
- **SC-008**: 90% of users report improved game reliability and fewer disruptions in post-implementation feedback
- **SC-009**: 100% of questions presented in category-specific games belong to the selected category
- **SC-010**: AI feedback is delivered within 2 seconds of answer submission for 95% of responses
- **SC-011**: Feedback tone accurately reflects the selected mode (Supportive/Neutral/Roast Me) as verified by user perception surveys
- **SC-012**: Category selection and feedback mode settings persist correctly across multiple game rounds within the same room session
- **SC-013**: Rooms correctly enforce the 16 active player limit, redirecting additional joiners to spectator mode
