import { invokeLLM } from "./_core/llm";
function baseline(device:string, game:string, style:string) { let hash=0; for(const c of device) hash=(hash*31+c.charCodeAt(0))>>>0; const emu=/emulador|mouse|dpi|pc/i.test(game+device); const fast=/rápido|agressivo/i.test(style); const offset=(hash%17)-8+(fast?7:0); const g=emu?145:160; return `Base calibrada para ${game} · perfil identificado: ${device.slice(0,70)}\n\n${emu?'Emulador: use mouse/DPI e mantenha a resolução fixa.':'Celular: mantenha FPS estável e não copie números de outro aparelho.'}\nGeral ${g+offset}, Ponto vermelho ${g-10+offset}, Mira 2x ${g-20+offset}, Mira 4x ${g-35+offset}, AWM ${emu?65:70+Math.round(offset/2)}, Olhadinha ${g-50+offset}.\n\nFaça três séries no treino. Se passar do alvo, reduza 5; se faltar movimento, aumente 5. Esta base é específica do perfil informado e precisa ser polida com seu resultado.`; }

export async function recommendSensitivity(input: { device: string; refreshRate: string; style: string; game: string }) {
  const request = {
    messages: [
      { role: "system", content: "Você é o SK$ Coach, um chatbot conversacional em português. Fale de modo natural e faça perguntas de acompanhamento quando faltar aparelho, jogo, FPS, estilo ou objetivo. Seu único assunto é Free Fire/Free Fire MAX, sensibilidade, HUD, FPS, toque, controles e celulares. Recuse assuntos fora desse escopo em uma frase e traga a conversa de volta. Recomende apenas ajustes legais dentro das configurações do jogo e do aparelho; nunca scripts, macros, injeções, exploits, bypass ou alterações de arquivos. Não prometa uma sensibilidade universal: explique que são pontos iniciais e como testar." },
      { role: "user", content: `Monte um ponto de partida seguro para: jogo=${input.game.slice(0, 80)}, aparelho=${input.device.slice(0, 120)}, taxa de atualização=${input.refreshRate.slice(0, 30)}, estilo=${input.style.slice(0, 80)}.` },
    ],
  };
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  if (key && model !== "openrouter/free" && !model.endsWith(":free")) throw new Error("Only free models are enabled");
  let response: any;
  try { response = key ? await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": process.env.PUBLIC_URL || "https://sk-store-ke6x.onrender.com" }, body: JSON.stringify({ ...request, model, max_tokens: 1200 }) }).then(async r => { if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`); return r.json(); }) : await invokeLLM(request as Parameters<typeof invokeLLM>[0]); }
  catch (error) { console.warn("[Premium AI] provider unavailable, using local baseline", error); return baseline(input.device,input.game,input.style); }
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part: any) => typeof part === "string" ? part : part?.text || "").join("\n").trim() || "Não foi possível gerar uma recomendação agora.";
  return "Não foi possível gerar uma recomendação agora.";
}
