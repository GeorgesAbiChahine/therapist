"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowUp, AudioLines, WandSparkles, Zap, Lightbulb, GraduationCap } from "lucide-react";
import { Button } from "./ui/button/button";
import { Card, CardContent, CardFooter } from "./ui/card/card";
import { Field, FieldControl } from "./ui/field/field";
import { Form } from "./ui/form/form";
import {
  Select, SelectTrigger, SelectValue, SelectPortal, SelectPositioner, SelectPopup,
  SelectItem, SelectItemText, SelectItemIndicator, SelectIcon
} from "./ui/select/select";
import styles from "./ai-chat.module.css";
import { getTherapistResponse } from "@/app/actions/chat";
import { generateSpeech } from "@/app/actions/voice"; // Rachel via ElevenLabs

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
  const [history, setHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [emotion, setEmotion] = useState<"neutral" | "happy" | "concerned">("neutral");
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const isSpeaking = useRef(false);

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
      handleSend(transcript);
    };
    recog.onend = () => setListening(false);

    setRecognition(recog);
  }, []);

  const startListening = () => {
    if (!recognition) return;
    setListening(true);
    recognition.start();
  };

  // --- Send message ---
  const handleSend = async (overrideText?: string) => {
    const text = overrideText ?? inputValue;
    if (!text.trim() || isThinking) return;

    setMessages(prev => [...prev, { from: "user", text }]);
    setInputValue("");

    const newHistory = [...history, { role: "user", text }];
    setHistory(newHistory);
    setIsThinking(true);

    try {
      // --- Appel backend ---
      const rawReply = await getTherapistResponse(newHistory);

      // --- Gestion des émotions ---
      let cleanText = rawReply;
      let newEmotion: "neutral" | "happy" | "concerned" = "neutral";
      const tagMatch = rawReply.match(/^\[(.*?)\]/);
      if (tagMatch) {
        const tag = tagMatch[1].toUpperCase();
        cleanText = rawReply.replace(/^\[(.*?)\]/, "").trim();
        if (tag.includes("HAPPY")) newEmotion = "happy";
        else if (tag.includes("CONCERNED")) newEmotion = "concerned";
      }

      setHistory(prev => [...prev, { role: "model", text: cleanText }]);
      setMessages(prev => [...prev, { from: "bot", text: cleanText }]);
      setEmotion(newEmotion);

      // --- Générer audio Rachel ---
      const audioUrl = await generateSpeech(cleanText);
      setIsThinking(false);

      if (audioUrl) {
        if (currentAudio.current) {
          currentAudio.current.pause();
          currentAudio.current = null;
        }
        const audio = new Audio(audioUrl);
        currentAudio.current = audio;
        audio.play();
        isSpeaking.current = true;
        audio.onended = () => { isSpeaking.current = false; }
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { from: "bot", text: "Erreur lors du traitement." }]);
      setIsThinking(false);
    }
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
                  color: "white",
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
            <SelectTrigger render={<Button size="sm" style={{ maxWidth: "100px" }} variant="outline" />}>
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
