'use server'

export async function generateSpeech(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY")
    return null
  }

  // Voice ID: "Rachel" (American, Soft, Calm)
  const VOICE_ID = "21m00Tcm4TlvDq8ikWAM" 

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_flash_v2_5", // Using Flash for speed/efficiency
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs API Error: ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")
    
    return `data:audio/mp3;base64,${base64Audio}`

  } catch (error) {
    console.error("Voice Generation Failed:", error)
    return null
  }
}