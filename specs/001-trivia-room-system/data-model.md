# Data Model: Trivia Room System

**Feature**: 001-trivia-room-system  
**Date**: 2025-10-30  
**Status**: Complete

## Overview

This document defines the data structures for the Trivia Room System. All entities are stored in Cloudflare Durable Objects (in-memory with automatic persistence).

---

## Entity: Room

Represents a game session where players gather, play trivia, and see results.

### Attributes

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `code` | string | Yes | Unique 6-character room identifier | Uppercase alphanumeric, length = 6 |
| `participants` | Participant[] | Yes | List of players in the room | Min 2, Max 8 |
| `gameState` | 'lobby' \| 'active' \| 'results' | Yes | Current room state | One of three values |
| `currentQuestion` | Question \| null | No | Active question if game is running | Required when gameState = 'active' |
| `currentRound` | Round \| null | No | Current round data | Required when gameState = 'active' or 'results' |
| `usedQuestionIds` | string[] | Yes | IDs of questions already shown | Prevents repeats |
| `createdAt` | number | Yes | Unix timestamp of room creation | Positive integer |

### State Transitions

```
lobby → active    (all participants ready)
active → results  (all answered OR timer expired)
results → lobby   (all participants ready again)
results → CLOSED  (all participants leave)
```

### Relationships

- **Has many** Participants (2-8)
- **Has one** Question (when active)
- **Has one** Round (when active or showing results)

### Example

```json
{
  "code": "A3B7K9",
  "participants": [
    { "id": "p1", "name": "Alice", "isReady": true, "connectionStatus": "connected" },
    { "id": "p2", "name": "Bob", "isReady": false, "connectionStatus": "connected" }
  ],
  "gameState": "lobby",
  "currentQuestion": null,
  "currentRound": null,
  "usedQuestionIds": [],
  "createdAt": 1698624000000
}
```

---

## Entity: Participant

Represents a player in a room.

### Attributes

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `id` | string | Yes | Unique participant identifier | UUID v4 |
| `name` | string | Yes | Display name | Length 1-20 characters |
| `isReady` | boolean | Yes | Ready status for game start | true or false |
| `currentAnswer` | string \| null | No | Selected answer ID for current round | Must match answer ID from question |
| `answerTimestamp` | number \| null | No | When answer was submitted (ms) | Positive integer, relative to round start |
| `connectionStatus` | 'connected' \| 'disconnected' | Yes | WebSocket connection state | One of two values |

### Validation Rules

- Name must be unique within a room
- Cannot change answer after submission (`currentAnswer` is immutable once set)
- `answerTimestamp` only valid when `currentAnswer` is not null
- Cannot set `isReady = true` if `connectionStatus = 'disconnected'`

### Relationships

- **Belongs to** Room
- **Has one** Answer per Round

### Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice",
  "isReady": true,
  "currentAnswer": null,
  "answerTimestamp": null,
  "connectionStatus": "connected"
}
```

---

## Entity: Question

Represents a trivia question where users type their answer.

### Attributes

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `id` | string | Yes | Unique question identifier | Format: "q1", "q2", etc. |
| `text` | string | Yes | Question text | Length 10-200 characters |
| `correctAnswer` | string | Yes | The correct answer text | Length 1-100 characters |
| `acceptedAnswers` | string[] | No | Alternative acceptable answers (case-insensitive) | Array of strings |
| `category` | string | No | Question category | Optional, for future filtering |
| `difficulty` | 'easy' \| 'medium' \| 'hard' | No | Difficulty level | Optional, for future balancing |

### Validation Rules

- `correctAnswer` must not be empty
- `acceptedAnswers` can include variations (e.g., "USA", "United States", "United States of America")
- Answer matching is case-insensitive and trims whitespace
- Partial matches not accepted (must be exact after normalization)

### Relationships

- **Belongs to** Room (when active)

### Example

```json
{
  "id": "q1",
  "text": "What is the capital of France?",
  "correctAnswer": "Paris",
  "acceptedAnswers": ["Paris"],
  "category": "Geography",
  "difficulty": "easy"
}
```

---

## Entity: ParticipantAnswer

Represents a participant's typed answer for a specific round.

---

## Entity: Answer

Represents a single answer option for a question.

### Attributes

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `id` | string | Yes | Unique answer identifier within question | Format: "a1", "a2", "a3", "a4" |
| `text` | string | Yes | Answer text | Length 1-100 characters |

### Validation Rules

- ID must be unique within parent question
- Text must not be empty

### Relationships

- **Belongs to** Question

### Example

```json
{
  "id": "a2",
  "text": "Paris"
}
```

---

## Entity: Round

Represents one question cycle with player answers and results.

### Attributes

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `questionId` | string | Yes | ID of the question for this round | Must reference valid Question |
| `startTime` | number | Yes | Unix timestamp when round started (ms) | Positive integer |
| `duration` | number | Yes | Round duration in milliseconds | Always 180000 (3 minutes) |
| `participantAnswers` | ParticipantAnswer[] | Yes | Array of player answers | One entry per participant |
| `winnerId` | string \| null | No | ID of round winner | Must match participant ID or null |
| `endTime` | number \| null | No | When round ended (ms) | Set when round completes |

### Validation Rules

- `duration` is always 180000ms (3 minutes) for MVP
- `winnerId` can be null if no correct answers
- `endTime` must be >= `startTime`
- `participantAnswers` length must equal participants in room

### Relationships

- **Belongs to** Room
- **References** Question
- **Has many** ParticipantAnswers

### Example

```json
{
  "questionId": "q1",
  "startTime": 1698624100000,
  "duration": 180000,
  "participantAnswers": [
    {
      "participantId": "p1",
      "answerId": "a2",
      "timestamp": 5420,
      "isCorrect": true
    },
    {
      "participantId": "p2",
      "answerId": "a1",
      "timestamp": 7830,
      "isCorrect": false
    }
  ],
  "winnerId": "p1",
  "endTime": 1698624107830
}
```

---

## Entity: ParticipantAnswer

Represents a participant's answer for a specific round.

### Attributes

| Attribute | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `participantId` | string | Yes | ID of participant who answered | Must match participant in room |
| `answerText` | string \| null | Yes | User's typed answer | Length 0-100 characters, or null if no answer |
| `timestamp` | number \| null | Yes | Time to answer (ms from round start) | 0-180000, or null if no answer |
| `isCorrect` | boolean | Yes | Whether answer was correct | Computed by comparing normalized answerText with correctAnswer |

### Validation Rules

- If `answerText` is null, `timestamp` must be null (no answer submitted)
- If `answerText` is not null, `timestamp` must be 0-180000
- `isCorrect` computed: normalize and compare `answerText` with `question.correctAnswer` or `question.acceptedAnswers`
- Answer normalization: trim whitespace, convert to lowercase
- Cannot modify after submission

### Relationships

- **Belongs to** Round
- **References** Participant

### Example

```json
{
  "participantId": "550e8400-e29b-41d4-a716-446655440000",
  "answerText": "Paris",
  "timestamp": 5420,
  "isCorrect": true
}
```

---

## Derived Data

### Winner Calculation

**Algorithm**: Find the participant with the fastest correct answer

```typescript
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

function isAnswerCorrect(userAnswer: string, question: Question): boolean {
  const normalized = normalizeAnswer(userAnswer);
  const correctNormalized = normalizeAnswer(question.correctAnswer);
  
  if (normalized === correctNormalized) return true;
  
  // Check accepted alternatives
  if (question.acceptedAnswers) {
    return question.acceptedAnswers.some(
      accepted => normalizeAnswer(accepted) === normalized
    );
  }
  
  return false;
}

function calculateWinner(round: Round, question: Question): string | null {
  const correctAnswers = round.participantAnswers
    .filter(pa => pa.isCorrect)
    .sort((a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity));
  
  return correctAnswers.length > 0 ? correctAnswers[0].participantId : null;
}
```

**Rules**:
- Only correct answers are considered
- Fastest (lowest timestamp) wins
- If no correct answers, winner is null
- If multiple same-speed correct answers (tie), first to arrive wins
- Answer matching is case-insensitive with whitespace trimming

---

## Hardcoded Questions (MVP)

The 10 hardcoded questions for MVP with typed answers:

```typescript
export const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "What is the capital of France?",
    correctAnswer: "Paris",
    acceptedAnswers: ["Paris"],
    category: "Geography",
    difficulty: "easy"
  },
  {
    id: "q2",
    text: "Which planet is known as the Red Planet?",
    correctAnswer: "Mars",
    acceptedAnswers: ["Mars"],
    category: "Science",
    difficulty: "easy"
  },
  {
    id: "q3",
    text: "Who painted the Mona Lisa? (First and Last Name)",
    correctAnswer: "Leonardo da Vinci",
    acceptedAnswers: ["Leonardo da Vinci", "Leonardo Di Ser Piero Da Vinci", "Da Vinci"],
    category: "Art",
    difficulty: "easy"
  },
  {
    id: "q4",
    text: "What is the largest ocean on Earth?",
    correctAnswer: "Pacific Ocean",
    acceptedAnswers: ["Pacific Ocean", "Pacific", "The Pacific"],
    category: "Geography",
    difficulty: "easy"
  },
  {
    id: "q5",
    text: "In what year did World War II end?",
    correctAnswer: "1945",
    acceptedAnswers: ["1945"],
    category: "History",
    difficulty: "medium"
  },
  {
    id: "q6",
    text: "What is the smallest prime number?",
    correctAnswer: "2",
    acceptedAnswers: ["2", "two"],
    category: "Mathematics",
    difficulty: "easy"
  },
  {
    id: "q7",
    text: "Which element has the chemical symbol 'Au'?",
    correctAnswer: "Gold",
    acceptedAnswers: ["Gold"],
    category: "Science",
    difficulty: "medium"
  },
  {
    id: "q8",
    text: "Who wrote 'Romeo and Juliet'? (First and Last Name)",
    correctAnswer: "William Shakespeare",
    acceptedAnswers: ["William Shakespeare", "Shakespeare"],
    category: "Literature",
    difficulty: "easy"
  },
  {
    id: "q9",
    text: "What is the speed of light in a vacuum? (Answer in km/s)",
    correctAnswer: "299792",
    acceptedAnswers: ["299792", "299,792", "299792 km/s", "300000", "300,000"],
    category: "Science",
    difficulty: "hard"
  },
  {
    id: "q10",
    text: "Which country has won the most FIFA World Cups?",
    correctAnswer: "Brazil",
    acceptedAnswers: ["Brazil"],
    category: "Sports",
    difficulty: "medium"
  }
];
```

---

## Storage Strategy

### Cloudflare Durable Objects Storage

**In-Memory** (fast access, reset on restart):
- Active WebSocket connections
- Current timer countdowns
- Temporary UI state

**Persistent Storage** (`state.storage`, survives restarts):
- Room metadata (code, createdAt)
- Participant list
- Current game state
- Round history (for potential score tracking later)

**Not Stored** (computed on demand):
- Winner (calculated from round data)
- Time remaining (calculated from startTime + duration)
- Connection counts (derived from WebSocket array)

---

## Type Definitions (TypeScript)

```typescript
// Room
export interface Room {
  code: string;
  participants: Participant[];
  gameState: 'lobby' | 'active' | 'results';
  currentQuestion: Question | null;
  currentRound: Round | null;
  usedQuestionIds: string[];
  createdAt: number;
}

// Participant
export interface Participant {
  id: string;
  name: string;
  isReady: boolean;
  currentAnswer: string | null;
  answerTimestamp: number | null;
  connectionStatus: 'connected' | 'disconnected';
}

// Question
export interface Question {
  id: string;
  text: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Round
export interface Round {
  questionId: string;
  startTime: number;
  duration: number;
  participantAnswers: ParticipantAnswer[];
  winnerId: string | null;
  endTime: number | null;
}

// ParticipantAnswer
export interface ParticipantAnswer {
  participantId: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
}
```

---

## Summary

Data model complete with 5 core entities:
- ✅ Room (game session container)
- ✅ Participant (player in room)
- ✅ Question (trivia question with typed answers)
- ✅ Round (question cycle with typed answers)
- ✅ ParticipantAnswer (player's typed answer)

All validation rules defined, relationships documented, and 10 hardcoded questions ready for MVP with typed answer format.

**Ready for**: Contract definition (API and WebSocket message protocols)
