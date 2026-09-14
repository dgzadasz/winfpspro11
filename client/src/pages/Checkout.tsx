import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Check, Clipboard, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = {
  daily: { name: "Daily Pass", duration: "1 dia de acesso", price: "R$ 10,00" },
  weekly: { name: "Weekly Pass", duration: "7 dias de acesso", price: "R$ 40,00" },
  monthly: { name: "Monthly Pass", duration: "30 dias de acesso", price: "R$ 120,00" },
  lifetime: { name: "Lifetime", duration: "Acesso vitalício", price: "R$ 300,00" },
} as const;

type PlanKey = keyof typeof plans;
type CreatedOrder = { id: string; planName: string; amountCents: number; pix: string; qr: string; notified: boolean };

async function json<T>(url: string, init?: RequestInit) { const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Não foi possível concluir a compra."); return body as T; }

export default function Checkout() {
  const { plan: rawPlan } = useParams<{ plan: string }>();
  const plan = rawPlan as PlanKey;
  const selected = plans[plan];
  const [user, setUser] = useState<{ displayName: string } | null>(null);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { json<{ user: { displayName: string } | null }>("/api/discord/session").then(data => setUser(data.user)).catch(() => setMessage("Não foi possível verificar sua sessão.")).finally(() => setLoading(false)); }, []);
  const login = () => { document.cookie = `sk_checkout_plan=${plan}; Path=/; Max-Age=600; SameSite=Lax; Secure`; window.location.href = "/api/discord/login"; };
  const generate = async () => { setWorking(true); setMessage(""); try { const result = await json<{ order: CreatedOrder }>("/api/store/orders", { method: "POST", body: JSON.stringify({ plan }) }); setOrder(result.order); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível gerar o pedido."); } finally { setWorking(false); } };
  const copy = async () => { if (!order) return; await navigator.clipboard.writeText(order.pix); setMessage("Pix copia e cola copiado."); };
  if (!selected) return <div className="checkout-page"><h1>Plano não encontrado</h1><Link href="/">Voltar para a loja</Link></div>;

  return <div className="checkout-page"><header className="checkout-header"><Link href="/" className="brand"><span className="brand-mark">SK$</span><span>STORE</span></Link><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar para a loja</Link></header><main className="checkout-main"><span className="section-index">CHECKOUT / PIX</span><h1>Finalize seu acesso.</h1><p className="checkout-intro">Seu pedido será registrado no Discord para conferência manual. A confirmação acontece somente no canal de log.</p><div className="checkout-layout"><section className="checkout-summary"><span className="plan-number">PLANO SELECIONADO</span><h2>{selected.name}</h2><p>{selected.duration}</p><strong>{selected.price}</strong><ul><li><Check size={16} /> Identidade verificada pelo Discord</li><li><Check size={16} /> Pedido enviado ao canal de compras</li><li><Check size={16} /> Confirmação manual, sem aprovação automática</li></ul></section><section className="checkout-payment">{loading ? <p>Verificando sua conta...</p> : !user ? <><h2>Entre para continuar</h2><p>Você precisa entrar com Discord para vincular a compra à sua conta.</p><Button onClick={login}>Entrar com Discord</Button></> : !order ? <><h2>Gerar pagamento</h2><p>Cliente: <strong>{user.displayName}</strong></p><Button onClick={generate} disabled={working}>{working ? "Gerando QR Code..." : "Gerar QR Code Pix"}</Button></> : <><div className="payment-success"><Check size={18} /> Pedido criado</div><h2>Escaneie para pagar</h2><img className="pix-qr" src={order.qr} alt="QR Code Pix" /><strong className="payment-value">{(order.amountCents / 100).toFixed(2).replace(".", ",")} BRL</strong><p className="order-reference">Pedido <b>{order.id}</b></p><textarea readOnly value={order.pix} aria-label="Pix copia e cola" /><Button onClick={copy}><Clipboard size={16} /> Copiar Pix copia e cola</Button><p className="privacy-note"><LockKeyhole size={14} /> O código Pix não contém seu nome nem seu ID Discord.</p></>}</section></div>{message && <div className="checkout-feedback">{message}</div>}</main><footer><span>Pix: DIEGO · SAO PAULO</span><span>Confirmação somente no Discord</span></footer></div>;
}
