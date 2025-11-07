# HTTP API Contract: Game Stability and Customization Improvements

**Feature**: 004-game-stability-improvements  
**Date**: November 6, 2025  
**Base URL**: `http://localhost:4000` (development)

## Overview

HTTP API changes for this feature are minimal - most real-time functionality uses Socket.IO. The primary HTTP addition is fetching available question categories for room creation.

## New Endpoints

### GET /api/questions/categories

**Purpose**: Retrieve list of available question categories with sufficient questions (>=10)

**Authentication**: Optional (Clerk JWT in Authorization header)

**Request**:
```http
GET /api/questions/categories HTTP/1.1
Host: localhost:4000
Authorization: Bearer <clerk_jwt_token>  # Optional
```

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "categories": [
    {
      "name": "Science",
      "questionCount": 45
    },
    {
      "name": "History",
      "questionCount": 38
    },
    {
      "name": "Geography",
      "questionCount": 52
    },
    {
      "name": "Sports",
      "questionCount": 28
    },
    {
      "name": "Entertainment",
      "questionCount": 41
    }
  ]
}
```

**Response Fields**:
- `categories`: Array of category objects
  - `name`: String, category name (unique)
  - `questionCount`: Number, total questions in category (always >= 10)

**Error Responses**:

```json
// 500 Internal Server Error
{
  "error": "Failed to fetch categories",
  "message": "Database connection error"
}
```

**Usage Example**:
```typescript
// Frontend usage
async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('http://localhost:4000/api/questions/categories');
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  const data = await response.json();
  return data.categories;
}
```

## Modified Endpoints

### POST /api/rooms (Modified - Internal, called via Socket.IO)

**Changes**: Room creation now accepts additional options

**Note**: This is typically called internally via Socket.IO `CREATE_ROOM` event, but documenting for completeness

**Request Body** (New fields):
```json
{
  "groupId": "group-uuid",  // Existing
  "roastMode": false,       // DEPRECATED: Use feedbackMode
  "selectedCategory": "Science",  // NEW: Optional category filter
  "feedbackMode": "neutral"       // NEW: 'supportive' | 'neutral' | 'roast'
}
```

**New Fields**:
- `selectedCategory`: Optional string, must be a valid category name with >=10 questions
- `feedbackMode`: Optional string, one of: 'supportive', 'neutral', 'roast' (default: 'neutral')

**Validation**:
- If `selectedCategory` provided, must exist in database with >=10 questions
- If `feedbackMode` provided, must be one of the three allowed values
- `roastMode: true` maps to `feedbackMode: 'roast'` for backwards compatibility

**Response** (200 OK):
```json
{
  "code": "ABC123",
  "groupId": "group-uuid",
  "groupName": "My Group",
  "selectedCategory": "Science",
  "feedbackMode": "neutral",
  "maxActivePlayers": 16
}
```

**Error Responses**:

```json
// 400 Bad Request - Invalid category
{
  "error": "INVALID_CATEGORY",
  "message": "Category 'InvalidCat' not found or has fewer than 10 questions"
}

// 400 Bad Request - Invalid feedback mode
{
  "error": "INVALID_FEEDBACK_MODE",
  "message": "Feedback mode must be one of: supportive, neutral, roast"
}
```

## No Changes to Existing Endpoints

The following endpoints remain unchanged:
- `GET /api/rooms/:code` - Room details
- `POST /api/groups` - Group creation
- `GET /api/groups/:id` - Group details
- All webhook endpoints

## Authentication

- **Clerk JWT**: Used for authenticated requests
- **Anonymous Access**: Allowed for category fetching and room joining
- **Authorization**: Room creator permissions apply for room configuration

## Rate Limiting

- **Categories endpoint**: Standard rate limit (100 req/min per IP)
- **Room creation**: Existing limits apply (10 rooms/hour per user)

## CORS

All endpoints support CORS for frontend origin:
```
Access-Control-Allow-Origin: http://localhost:3000 (dev)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

## Error Handling

Standard error response format:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

**Common Error Codes**:
- `INVALID_CATEGORY`: Selected category invalid or insufficient questions
- `INVALID_FEEDBACK_MODE`: Feedback mode not in allowed set
- `UNAUTHORIZED`: Authentication required but not provided
- `INTERNAL_ERROR`: Server-side error

## Testing Scenarios

1. **Fetch categories successfully**:
   ```bash
   curl http://localhost:4000/api/questions/categories
   ```

2. **Create room with category**:
   ```bash
   curl -X POST http://localhost:4000/api/rooms \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"groupId":"abc","selectedCategory":"Science","feedbackMode":"neutral"}'
   ```

3. **Invalid category error**:
   ```bash
   curl -X POST http://localhost:4000/api/rooms \
     -H "Content-Type: application/json" \
     -d '{"selectedCategory":"NonExistent"}'
   ```

## Implementation Notes

- Categories endpoint should cache results for 5 minutes to reduce database load
- Category validation must happen server-side (never trust client)
- Backwards compatibility maintained via `roastMode` → `feedbackMode` mapping
- All new fields are optional with sensible defaults

## Summary

HTTP API changes are minimal:
- **1 new endpoint**: GET /api/questions/categories
- **1 modified endpoint**: POST /api/rooms (new optional fields)
- **0 breaking changes**: All additions are backwards compatible

Primary functionality delivered via Socket.IO (see socketio-events.md).
