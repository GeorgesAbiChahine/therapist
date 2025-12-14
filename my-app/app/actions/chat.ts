'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"

// Define the shape of a message
type Message = {
  role: "user" | "model"
  text: string
}

export async function getTherapistResponse(history: Message[]) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY")
    return "[NEUTRAL] I am disconnected. Please check the server logs."
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  // 1. Format the conversation history for the Prompt
  // We join previous messages into a script format.
  const conversationContext = history.map(msg => 
    `${msg.role === "user" ? "User" : "Therapist"}: ${msg.text}`
  ).join("\n")

  // 2. The System Prompt (Now includes History)
  const prompt = `
    You are a compassionate, empathetic therapist AI.
    
    --- CONVERSATION HISTORY ---
    ${conversationContext}
    
    --- INSTRUCTIONS ---
    Respond to the User's last message based on the history above.
    Respond in 1 or 2 short sentences.
    IMPORTANT: Start your response with an emotion tag in brackets.
    Options: [NEUTRAL], [HAPPY], [CONCERNED].
    
    Example: "[CONCERNED] I see. Tell me more about why that made you feel angry."
  `

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error: any) {
    console.error("Gemini Error:", error)
    return `[NEUTRAL] I am sorry, I am having trouble thinking right now. (${error.message})`
  }
}