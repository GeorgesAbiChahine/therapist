"use client";

import {
  ArrowUp,
  AudioLines,
  GraduationCap,
  Lightbulb,
  Paperclip,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button/button";
import { Card, CardContent, CardFooter } from "./ui/card/card";
import { Field, FieldControl } from "./ui/field/field";
import { Form } from "./ui/form/form";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "./ui/select/select";
import styles from "./ai-chat.module.css";

const aiModes = [
  { value: "creative", label: "Creative", icon: WandSparkles },
  { value: "fast", label: "Fast", icon: Zap },
  { value: "reasoning", label: "Reason", icon: Lightbulb },
  { value: "teach", label: "Teach", icon: GraduationCap },
];

export function AiChat() {
  const [inputValue, setInputValue] = useState("");
  const [selectedItem, setSelectedItem] = useState<string>(aiModes[0].value);
  const [messages, setMessages] = useState<{ from: "user" | "bot"; text: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // --- Speech Recognition Setup ---
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "fr-FR";

    recog.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      handleSend(transcript); // envoyer directement au bot
    };

    recog.onend = () => setListening(false);

    setRecognition(recog);
  }, []);

  const startListening = () => {
    if (!recognition) return;
    setListening(true);
    recognition.start();
  };

  // --- Simuler une réponse du bot ---
  const getBotReply = async (text: string) => {
    // Tu peux ici appeler un API réel ou un simple switch
    const lower = text.toLowerCase();
    let reply = "Je vois. Peux-tu m'en dire plus ?";

    if (lower.includes("bien") || lower.includes("heureux")) reply = "Super ! Je suis content de l'entendre 😄";
    else if (lower.includes("mal") || lower.includes("triste")) reply = "Je suis désolé d'entendre ça. Veux-tu en parler ?";
    else if (lower.includes("bonjour")) reply = "Bonjour ! Comment ça va aujourd'hui ?";

    // Synthèse vocale
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(reply);
    const voices = synth.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes("Google US English") || v.name.includes("Zira") || v.lang.startsWith("fr")
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.9;
    synth.cancel();
    synth.speak(utterance);

    return reply;
  };

  // --- Send message ---
  const handleSend = async (overrideText?: string) => {
    const text = overrideText ?? inputValue;
    if (!text.trim()) return;

    // Ajouter message utilisateur
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInputValue("");

    // Réponse bot
    const reply = await getBotReply(text);
    setMessages((prev) => [...prev, { from: "bot", text: reply }]);
  };

  return (
    <Form className={styles.form}>
      <Card className={styles.aiChatCard}>
        <CardContent>
          <div className={styles.chatWindow} style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "8px" }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                  background: m.from === "user" ? "#228be6" : "#333",
                  color: m.from === "user" ? "white" : "white",
                  padding: "6px 10px",
                  borderRadius: "12px",
                  marginBottom: "4px",
                  maxWidth: "80%",
                  wordBreak: "break-word",
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          <Field className={styles.field}>
            <FieldControl
              placeholder="Pose une question..."
              render={
                <textarea
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{ outline: "none", width: "100%", resize: "none" }}
                  value={inputValue}
                />
              }
            />
          </Field>
        </CardContent>

        <CardFooter className={styles.footer} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Button
            type="button"
            size="icon"
            style={{ borderRadius: "50%", width: "36px", height: "36px" }}
            variant="outline"
            onClick={startListening}
          >
            <AudioLines size={16} color={listening ? "red" : "black"} />
          </Button>

          <Select
            defaultValue={aiModes[0].value}
            items={aiModes}
            onValueChange={(value) => setSelectedItem(value as string)}
            value={selectedItem}
          >
            <SelectTrigger
              render={<Button size="sm" style={{ maxWidth: "100px" }} variant="outline" />}
            >
              <SelectValue>
                {(value) => {
                  const selectedMode = aiModes.find((mode) => mode.value === value);
                  const IconComponent = selectedMode?.icon;
                  return (
                    <div className={styles.triggerContent}>
                      {IconComponent && <IconComponent size={14} />}
                      <span>{selectedMode?.label}</span>
                    </div>
                  );
                }}
              </SelectValue>
              <SelectIcon />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner alignItemWithTrigger={false} sideOffset={8}>
                <SelectPopup className={styles.popup}>
                  {aiModes.map(({ label, value, icon: IconComponent }) => (
                    <SelectItem key={value} value={value}>
                      <div className={styles.triggerContent}>
                        <IconComponent size={14} />
                        <SelectItemText>{label}</SelectItemText>
                        <SelectItemIndicator />
                      </div>
                    </SelectItem>
                  ))}
                </SelectPopup>
              </SelectPositioner>
            </SelectPortal>
          </Select>

          <Button
            size="icon"
            style={{ borderRadius: "50%", width: "36px", height: "36px" }}
            type="button"
            variant="outline"
            onClick={() => handleSend()}
          >
            {inputValue.trim() ? <ArrowUp size={16} /> : <AudioLines size={16} />}
          </Button>
        </CardFooter>
      </Card>
    </Form>
  );
}
