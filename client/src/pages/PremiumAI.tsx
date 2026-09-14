import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PremiumAI() {
  const [form, setForm] = useState({ device: "", refreshRate: "", style: "", game: "" });
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const ask = async () => {
    setWorking(true); setMessage(""); setResult("");
    try {
      const response = await fetch("/api/premium-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "premium_pack_required" ? "A IA é liberada após a aprovação do Pack Sensi Premium." : body.error || "Não foi possível gerar a recomendação.");
      setResult(body.recommendation);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível gerar a recomendação."); }
    finally { setWorking(false); }
  };
  return <div className="checkout-page ai-page"><header className="checkout-header"><Link href="/" className="brand"><span className="brand-mark">SK$</span><span>STORE</span></Link><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar para a loja</Link></header><main className="checkout-main"><span className="section-index"><Sparkles size={14} /> PREMIUM AI</span><h1>Encontre sua melhor base.</h1><p className="checkout-intro">A IA do Pack Premium cruza aparelho, taxa de atualização e estilo de controle para sugerir um ponto de partida legal e ajustável.</p><div className="ai-layout"><section className="checkout-payment"><h2><WandSparkles size={18} /> Seu setup</h2><label>Aparelho<input value={form.device} onChange={e => setForm({ ...form, device: e.target.value })} placeholder="Ex.: iPhone 13 ou Galaxy A54" /></label><label>Taxa de atualização<input value={form.refreshRate} onChange={e => setForm({ ...form, refreshRate: e.target.value })} placeholder="Ex.: 60 Hz, 90 Hz, 120 Hz" /></label><label>Estilo de controle<input value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} placeholder="Ex.: dois dedos, quatro dedos" /></label><label>Jogo<input value={form.game} onChange={e => setForm({ ...form, game: e.target.value })} placeholder="Nome do jogo" /></label><Button onClick={ask} disabled={working}>{working ? "Analisando..." : "Gerar recomendação"}</Button>{message && <p className="checkout-feedback">{message}</p>}</section><section className="ai-result"><span className="section-index">RECOMENDAÇÃO</span>{result ? <div className="ai-markdown">{result}</div> : <p>Após a aprovação do Pack Sensi Premium, preencha seu aparelho e receba uma recomendação personalizada.</p>}</section></div></main></div>;
}
