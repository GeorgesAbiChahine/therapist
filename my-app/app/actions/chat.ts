'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"

export async function getTherapistResponse(userMessage: string) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY")
    return "[NEUTRAL] I am disconnected. Please check the server logs."
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  // ✅ SWITCHING TO GEMINI 2.5 FLASH
  // This model was explicitly listed in your available models.
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `
    You are a compassionate, empathetic therapist AI. 
    The user says: "${userMessage}"
    
    Respond in 1 or 2 short sentences. 
    IMPORTANT: Start your response with an emotion tag in brackets.
    Options: [NEUTRAL], [HAPPY], [CONCERNED].
    
    Example: "[CONCERNED] I am so sorry to hear that. How long have you felt this way?"
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error: any) {
    console.error("Gemini Error:", error)
    // Detailed error message will help us if this one hits a quota limit too
    return `[NEUTRAL] I am sorry, I am having trouble thinking right now. (${error.message})`
  }
}