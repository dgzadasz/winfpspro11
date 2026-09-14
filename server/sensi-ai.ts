import { invokeLLM } from "./_core/llm";

export async function recommendSensitivity(input: { device: string; refreshRate: string; style: string; game: string }) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Você é um assistente técnico de configuração de sensibilidade para jogos mobile. Recomende apenas ajustes legais dentro das configurações do jogo e do aparelho. Não sugira scripts, macros, injeções, exploits, bypass ou alterações de arquivos. Responda em português, de forma prática, com uma tabela curta de valores iniciais e passos de teste." },
      { role: "user", content: `Monte um ponto de partida seguro para: jogo=${input.game.slice(0, 80)}, aparelho=${input.device.slice(0, 120)}, taxa de atualização=${input.refreshRate.slice(0, 30)}, estilo=${input.style.slice(0, 80)}.` },
    ],
  });
  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "Não foi possível gerar uma recomendação agora.";
}
