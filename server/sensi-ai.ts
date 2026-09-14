import { invokeLLM } from "./_core/llm";

export async function recommendSensitivity(input: { device: string; refreshRate: string; style: string; game: string }) {
  const request = {
    messages: [
      { role: "system", content: "Você é um assistente técnico de configuração de sensibilidade para jogos mobile. Recomende apenas ajustes legais dentro das configurações do jogo e do aparelho. Não sugira scripts, macros, injeções, exploits, bypass ou alterações de arquivos. Responda em português, de forma prática, com uma tabela curta de valores iniciais e passos de teste." },
      { role: "user", content: `Monte um ponto de partida seguro para: jogo=${input.game.slice(0, 80)}, aparelho=${input.device.slice(0, 120)}, taxa de atualização=${input.refreshRate.slice(0, 30)}, estilo=${input.style.slice(0, 80)}.` },
    ],
  };
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  if (key && model !== "openrouter/free" && !model.endsWith(":free")) throw new Error("Only free models are enabled");
  let response: any;
  try { response = key ? await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": process.env.PUBLIC_URL || "https://sk-store-ke6x.onrender.com" }, body: JSON.stringify({ ...request, model, max_tokens: 1200 }) }).then(async r => { if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`); return r.json(); }) : await invokeLLM(request as Parameters<typeof invokeLLM>[0]); }
  catch (error) { console.warn("[Premium AI] provider unavailable, using local baseline", error); return `Ponto de partida para ${input.game} em ${input.device}: Geral 160, Ponto vermelho 150, Mira 2x 140, Mira 4x 125, AWM 70 e Olhadinha 110.\n\nTreine por cinco minutos e ajuste de 5 em 5: reduza se passar do alvo e aumente se faltar movimento. O resultado depende do FPS, HUD e do seu toque.`; }
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part: any) => typeof part === "string" ? part : part?.text || "").join("\n").trim() || "Não foi possível gerar uma recomendação agora.";
  return "Não foi possível gerar uma recomendação agora.";
}
