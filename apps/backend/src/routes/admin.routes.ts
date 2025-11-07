import express from 'express'
import prisma from '../config/prisma'

const router = express.Router()

// Simple admin auth: requires Authorization: Bearer <ADMIN_API_KEY>
const isAdminRequest = (req: express.Request) => {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) return false
  const auth = req.header('authorization') || req.header('Authorization')
  if (!auth) return false
  return auth === `Bearer ${adminKey}`
}

// POST /api/admin/questions/upload
// Body: JSON array of question objects matching existing JSON format
router.post('/questions/upload', express.json({ limit: '10mb' }), async (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const payload = req.body
  if (!Array.isArray(payload)) {
    return res.status(400).json({ error: 'expected an array of questions' })
  }

  console.log(`Admin uploading ${payload.length} questions`)

  try {
    // Basic validation: ensure each item has id (string or number) and text
    const valid = payload.every((q: any) => q && (typeof q.id === 'string' || typeof q.id === 'number') && typeof q.text === 'string')
    if (!valid) return res.status(400).json({ error: 'each question must include id and text' })
    // Always upsert into DB (no JSON file writes anymore)
    let inserted = 0
    let updated = 0

    for (const q of payload) {
      // Coerce numeric ids to strings to match DB primary key type and ensure consistency
      const id = String(q.id)
      
      // Normalize acceptedAnswers to always be a string array
      let acceptedAnswers = null
      if (q.acceptedAnswers !== null && q.acceptedAnswers !== undefined) {
        if (typeof q.acceptedAnswers === 'string') {
          acceptedAnswers = [q.acceptedAnswers]
        } else if (Array.isArray(q.acceptedAnswers)) {
          acceptedAnswers = q.acceptedAnswers
        }
      }
      
      const exists = await (prisma as any).question.findUnique({ where: { id } })
      if (exists) {
        await (prisma as any).question.update({
          where: { id },
          data: {
            text: q.text,
            correctAnswer: q.correctAnswer ?? null,
            acceptedAnswers,
            category: q.category ?? null,
            meta: q,
          },
        })
        updated += 1
      } else {
        await (prisma as any).question.create({
          data: {
            id,
            text: q.text,
            correctAnswer: q.correctAnswer ?? null,
            acceptedAnswers,
            category: q.category ?? null,
            meta: q,
          },
        })
        inserted += 1
      }
    }

    return res.json({ written: true, count: payload.length, inserted, updated })
  } catch (err: any) {
    console.error('Failed to upload questions:', err)
    return res.status(500).json({ error: 'failed to upload questions', detail: String(err) })
  }
})

export default router
