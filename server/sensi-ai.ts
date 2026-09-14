import { invokeLLM } from "./_core/llm";
async function searchContext(query:string) { try { const q=encodeURIComponent(`${query.slice(0,180)} Free Fire sensibilidade aparelho`); const r=await fetch(`https://html.duckduckgo.com/html/?q=${q}`,{headers:{"User-Agent":"SK-Store-Coach/1.0"},signal:AbortSignal.timeout(7000)}); const html=await r.text(); return Array.from(html.matchAll(/class="result__snippet"[^>]*>(.*?)<\/a>/g)).slice(0,4).map(m=>m[1].replace(/<[^>]+>/g," ").replace(/&amp;/g,"&")).join("\n").slice(0,2400); } catch { return "Pesquisa web indisponível; responda usando somente conhecimento geral e deixe claro o limite."; } }

export async function recommendSensitivity(input: { device: string; refreshRate: string; style: string; game: string }) {
  const request = {
    messages: [
      { role: "system", content: "Você é o SK$ Coach, um chatbot conversacional em português. Fale de modo natural e faça perguntas de acompanhamento quando faltar aparelho, jogo, FPS, estilo ou objetivo. Seu único assunto é Free Fire/Free Fire MAX, sensibilidade, HUD, FPS, toque, controles e celulares. Recuse assuntos fora desse escopo em uma frase e traga a conversa de volta. Recomende apenas ajustes legais dentro das configurações do jogo e do aparelho; nunca scripts, macros, injeções, exploits, bypass ou alterações de arquivos. Não prometa uma sensibilidade universal: explique que são pontos iniciais e como testar." },
      { role: "user", content: `Conversa e pedido atual: jogo=${input.game.slice(0, 80)}, aparelho/histórico=${input.device.slice(0, 1200)}, taxa de atualização=${input.refreshRate.slice(0, 30)}, estilo=${input.style.slice(0, 80)}. Pesquise e use este contexto público como referência, sem tratar números de jogadores como garantia:\n${await searchContext(input.device)}` },
    ],
  };
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  if (key && model !== "openrouter/free" && !model.endsWith(":free")) throw new Error("Only free models are enabled");
  let response: any;
  try { response = key ? await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": process.env.PUBLIC_URL || "https://sk-store-ke6x.onrender.com" }, body: JSON.stringify({ ...request, model, max_tokens: 1200 }) }).then(async r => { if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`); return r.json(); }) : await invokeLLM(request as Parameters<typeof invokeLLM>[0]); }
  catch (error) { console.warn("[Premium AI] provider unavailable", error); throw new Error("A pesquisa ou o provedor de IA está temporariamente indisponível. Tente novamente em alguns segundos."); }
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part: any) => typeof part === "string" ? part : part?.text || "").join("\n").trim() || "Não foi possível gerar uma recomendação agora.";
  return "Não foi possível gerar uma recomendação agora.";
}
