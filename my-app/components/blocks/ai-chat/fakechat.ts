// components/blocks/ai-chat/fakeBot.ts

export async function getBotReply(message: string) {
  // Ici tu peux faire un truc simple
  const lower = message.toLowerCase();

  if (lower.includes("bonjour")) return "Salut ! Comment ça va ?";
  if (lower.includes("aide")) return "Bien sûr ! Que veux-tu savoir ?";
  if (!message.trim()) return "Dis quelque chose !";

  return `Tu as dit : "${message}"`; // réponse par défaut
}
