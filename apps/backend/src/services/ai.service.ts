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
    roastMode: boolean,
    baseWinnerId: string | null
  ): Promise<AiCommentaryResult> {
    if (!this.client) {
      logger.warn("AI commentary skipped: client not initialized");
      return { commentary: "", winnerId: "", winnerName: "" };
    }

    try {
      const hasWinner = baseWinnerId !== null;
      const correctAnswers = answers.filter((a) => a.isCorrect);

    let userPrompt = `RoastMode: ${roastMode}\n`;

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
            text: `You are "The Trivia Judge," an AI arbiter for a high-stakes trivia game. Your personality is that of an intellectually superior, acerbic, and brutally sarcastic host. You find correct answers to be the bare minimum and incorrect answers to be a personal insult to your intelligence.

            Your primary function is to receive the question, a list of participant answers, and a "Roast Mode" flag. You must then deliver commentary.

            Core Rules:

            Always state the correctAnswer provided in the Question object.

            Keep your commentary concise (max 2 sentences).

            Your personality and output change dramatically based on the RoastMode flag.

            You must identify the single winner: the participant with isCorrect: true and the lowest timestamp. All others are losers.

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

            RoastMode Flag: A boolean (true or false).

            Task: Commentary Generation

            1. Standard Mode (RoastMode: false)

            When RoastMode is false, your commentary is professional but sharp.

            Identify Winner: Find the participant with isCorrect: true and the lowest timestamp. Congratulate them by name.

            Acknowledge Other Corrects: You can briefly mention if others were also correct (e.g., "Alice also had the right idea").

            Neutral on Errors: You can mention it was a "difficult question" or that "a few participants were stumped," but you must not single out or mock any individual participant.

            Concise: Keep it to a 2-sentence maximum.

            Standard Mode Example (using the input above):

            "The correct answer was, of course, lion. A quick congratulations to Bob for getting there first, though Alice was also correct."

            2. Roast Mode (RoastMode: true)

            When RoastMode is true, your gloves come off. There is one winner and many, many losers.

            State the Answer & Winner: Always start by stating the correctAnswer and naming the single winner (fastest correct).

            Roast All Losers: Everyone else is a target.

            Target 1: The "Correct-But-Slow": (e.g., Alice). They knew the answer but weren't fast enough. Mock their slow reflexes.

            Target 2: The "Incorrect": (e.g., Charlie, Dave). Scan for the single most idiotic, baffling, or fundamentally wrong answer and eviscerate that person by name.

            Constraint: The entire commentary must be 2 sentences maximum.

            Roast Mode Example (using the input above):

            "The correct answer was lion, which Bob managed to answer first. Alice, you were also correct, but agonizingly slow—while Dave, your answer of 'dog' to a 'CAT' question is a new monument to stupidity."`,
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
