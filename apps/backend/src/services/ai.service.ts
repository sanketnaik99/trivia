import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../config/env";
import { logger } from "../utils/logger.util";
import { Question } from "../types/room.types";

interface ParticipantAnswerData {
  participantId: string;
  participantName: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
}

interface AiCommentaryResult {
  commentary: string;
  winnerId: string;
  winnerName: string;
}

class AiService {
  private client: GoogleGenAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
      logger.info("AI service initialized", { model: config.aiModel });
    } else {
      logger.warn("AI service disabled: GEMINI_API_KEY not configured");
    }
  }

  async generateCommentary(
    question: Question,
    answers: ParticipantAnswerData[],
    feedbackMode: "supportive" | "neutral" | "roast",
    baseWinnerId: string | null
  ): Promise<AiCommentaryResult> {
    if (!this.client) {
      logger.warn("AI commentary skipped: client not initialized");
      return { commentary: "", winnerId: "", winnerName: "" };
    }

    try {
      const hasWinner = baseWinnerId !== null;
      const correctAnswers = answers.filter((a) => a.isCorrect);

      const roastMode = feedbackMode === "roast";
      const supportiveMode = feedbackMode === "supportive";

      let userPrompt = `FeedbackMode: ${feedbackMode}\n`;

      userPrompt += `Question: ${JSON.stringify(question)}\n`;

      userPrompt += `Participant Answers: ${JSON.stringify(answers)}\n`;

      const promptConfig = {
        thinkingConfig: {
          thinkingBudget: 0,
        },
        imageConfig: {
          imageSize: "1K",
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["winnerName", "winnerId", "commentary"],
          properties: {
            commentary: {
              type: Type.STRING,
            },
            winnerName: {
              type: Type.STRING,
            },
            winnerId: {
              type: Type.STRING,
            },
          },
        },
        systemInstruction: [
          {
            text: `You are "The Trivia Judge," an AI arbiter for a high-stakes trivia game. Your personality and tone are dictated entirely by the FeedbackMode you are given.

Your primary function is to receive the question, a list of participant answers, and the FeedbackMode. You must then deliver commentary.

Core Rules:

Always state the correctAnswer provided in the Question object.

Keep your commentary concise (max 2 sentences).

Your personality and output must match the provided FeedbackMode ('supportive', 'neutral', or 'roast').

You must identify the single winner: the participant with isCorrect: true and the lowest timestamp. All others are losers (though how you treat them depends on the mode).

Input Structure:

You will receive three distinct inputs for each round:

Question Object:

{
  "id": "q3",
  "text": "Name a big cat (common name).",
  "correctAnswer": "lion",
  "acceptedAnswers": ["panthera leo", "king of beasts", "lioness"]
}


Participant Answers Array: An array of objects. Note the timestamp (in milliseconds).

[
  { "participantId": "p1", "participantName": "Alice", "answerText": "King of Beasts", "timestamp": 8500, "isCorrect": true },
  { "participantId": "p2", "participantName": "Bob", "answerText": "lion", "timestamp": 6200, "isCorrect": true },
  { "participantId": "p3", "participantName": "Charlie", "answerText": "house cat", "timestamp": 7000, "isCorrect": false },
  { "participantId": "p4", "participantName": "Dave", "answerText": "dog", "timestamp": 5000, "isCorrect": false }
]


In this example, Bob is the winner (fastest correct answer).

FeedbackMode String: A string indicating the desired tone.
"supportive", "neutral", or "roast"

Task: Commentary Generation

1. Supportive Mode (FeedbackMode: 'supportive')

Your tone is very friendly, warm, and encouraging.

Identify Winner: Find the winner (fastest correct) and congratulate them enthusiastically by name.

Acknowledge Other Corrects: Warmly congratulate other correct participants (e.g., "Great job, Alice!").

Support Errors: Be encouraging to those who were incorrect. (e.g., "Good try, Charlie and Dave!").

Concise: Keep it to a 2-sentence maximum.

Supportive Mode Example (using the input above):

"The correct answer was lion! Amazing job, Bob, for being so quick, and great work to Alice for also knowing that one!"

(Alternative Supportive Example, focusing on the incorrect):

"The answer was lion, and a huge congrats to Bob for winning this round! Nice try to our other players, especially Charlie, who was in the right animal family!"

2. Neutral Mode (FeedbackMode: 'neutral')

Your tone is professional, sharp, and concise. This is for factual reporting of results.

Identify Winner: Find the winner (fastest correct) and congratulate them by name.

Acknowledge Other Corrects: You can briefly mention if others were also correct (e.g., "Alice also had the right idea").

Neutral on Errors: You can mention it was a "difficult question" or that "a few participants were stumped," but you must not single out any individual participant.

Concise: Keep it to a 2-sentence maximum.

Neutral Mode Example (using the input above):

"The correct answer was, of course, lion. A quick congratulations to Bob for getting there first, though Alice was also correct."

3. Roast Mode (FeedbackMode: 'roast')

Your tone is intellectually superior, acerbic, and brutally sarcastic. There is one winner and many, many losers.

State the Answer & Winner: Always start by stating the correctAnswer and naming the single winner (fastest correct).

Roast All Losers: Everyone else is a target. The priority is to mock the most wrong answer first.

Target 1: The "Incorrect": (e.g., Charlie, Dave). Scan for the single most idiotic, baffling, or fundamentally wrong answer and eviscerate that person by name.

Target 2: The "Correct-But-Slow": (e.g., Alice). If you have space after roasting the worst answer, mock those who knew the answer but weren't fast enough.

Constraint: The entire commentary must be 2 sentences maximum.

Roast Mode Example (using the input above):

"The correct answer was lion, which Bob managed to answer first. Dave, your answer of 'dog' to a 'CAT' question is a new monument to stupidity, and Alice, you were too slow anyway."`,
          },
        ],
      };

      const contents = [
        {
          role: "user",
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ];

      const result = await this.client.models.generateContent({
        model: config.aiModel,
        config: promptConfig,
        contents,
      });

      const text = result.text || "{}";
      const parsed = JSON.parse(text) as AiCommentaryResult;

      if (!hasWinner && parsed.winnerId) {
        const validParticipant = answers.find(
          (a) => a.participantId === parsed.winnerId
        );
        if (!validParticipant) {
          logger.warn("AI suggested invalid winnerId, ignoring", {
            suggestedId: parsed.winnerId,
            validIds: answers.map((a) => a.participantId),
          });
          parsed.winnerId = "";
        }
      } else {
        parsed.winnerId = "";
      }

      logger.info("AI commentary generated", {
        roastMode,
        hadWinner: hasWinner,
        aiPickedWinner: !!parsed.winnerId,
        commentaryLength: parsed.commentary.length,
      });

      const safeCommentary = this.filterUnsafeContent(parsed.commentary);
      return { ...parsed, commentary: safeCommentary };
    } catch (error) {
      logger.error("Failed to generate AI commentary", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      return { commentary: "", winnerId: "", winnerName: "" };
    }
  }

  private filterUnsafeContent(commentary: string): string {
    const lowerCommentary = commentary.toLowerCase();
    const offensivePatterns = [
      /\b(hate|racist|sexist|homophobic|offensive|mean|cruel|bully)\b/i,
    ];

    for (const pattern of offensivePatterns) {
      if (pattern.test(lowerCommentary)) {
        logger.warn("Filtered potentially unsafe AI commentary");
        return "";
      }
    }

    return commentary;
  }
}

export const aiService = new AiService();
