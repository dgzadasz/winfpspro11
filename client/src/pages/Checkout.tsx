import { DevicePicker } from "@/components/DevicePicker";
import { validDeviceProfile, type DeviceProfile } from "../../../shared/devices";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Check, Clipboard, LockKeyhole, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeFromCart } from "@/lib/cart";

const plans = { daily: { name: "Daily Pass", duration: "1 dia de acesso", price: "R$ 10,00" }, weekly: { name: "Weekly Pass", duration: "7 dias de acesso", price: "R$ 40,00" }, monthly: { name: "Monthly Pass", duration: "30 dias de acesso", price: "R$ 120,00" }, lifetime: { name: "Lifetime", duration: "Acesso vitalício", price: "R$ 300,00" }, sensiNormal: { name: "Pack Sensi Normal", duration: "Presets Android e iPhone", price: "R$ 19,90" }, sensiPremium: { name: "Pack Sensi Premium", duration: "Presets exclusivos + IA", price: "R$ 39,90" }, sensiEmulator: { name: "Pack Sensi Emulador", duration: "Configuração para PC", price: "R$ 29,90" } } as const;
type PlanKey = keyof typeof plans;
type CreatedOrder = { id: string; plan: PlanKey; planName: string; amountCents: number; pix: string; qr: string; notified?: boolean; status?: "pending" | "approved" | "cancelled" };
async function json<T>(url: string, init?: RequestInit) { const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Não foi possível concluir a compra."); return body as T; }

export default function Checkout() {
  const { plan: rawPlan } = useParams<{ plan: string }>(); const plan = rawPlan as PlanKey; const selected = plans[plan];
  const mobilePack = plan === "sensiNormal" || plan === "sensiPremium";
  const [profile, setProfile] = useState<DeviceProfile>(() => { try { const saved=JSON.parse(sessionStorage.getItem("sk-device-profile") || "null"); if(validDeviceProfile(saved)) return saved; } catch {} return {brand:"Samsung",model:"",game:"Free Fire",style:"Equilibrado"}; });
  useEffect(() => { try { sessionStorage.setItem("sk-device-profile",JSON.stringify(profile)); } catch {} }, [profile]);
  const [user, setUser] = useState<{ displayName: string } | null>(null); const [order, setOrder] = useState<CreatedOrder | null>(null); const [loading, setLoading] = useState(true); const [working, setWorking] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setOrder(null); setLoading(true); setMessage("");
    const existingId = new URLSearchParams(window.location.search).get("order");
    json<{ user: { displayName: string } | null }>("/api/discord/session").then(async data => {
      if (!active) return;
      setUser(data.user);
      if (data.user && existingId) {
        const result = await json<{ order: CreatedOrder }>("/api/store/orders/" + encodeURIComponent(existingId));
        if (!active) return;
        if (result.order.plan !== plan) throw new Error("Plano diferente do pedido");
        setOrder(result.order);
        if (result.order.status === "approved") removeFromCart(result.order.plan);
      }
    }).catch(() => { if (active) setMessage("Não foi possível verificar sua sessão ou o pedido."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [plan]);
  useEffect(() => {
    if (!order || (order.status && order.status !== "pending")) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const result = await json<{ order: CreatedOrder }>("/api/store/orders/" + order.id);
        if (!active) return;
        setOrder(result.order);
        if (result.order.status === "approved") removeFromCart(result.order.plan);
      } catch { /* A temporary outage should not discard the payment. */ }
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [order?.id, order?.status]);
  const login = () => { document.cookie = `sk_checkout_plan=${plan}; Path=/; Max-Age=600; SameSite=Lax; Secure`; window.location.href = "/api/discord/login"; };
  const generate = async () => { setWorking(true); setMessage(""); try { const result = await json<{ order: CreatedOrder }>("/api/store/orders", { method: "POST", body: JSON.stringify({ plan, deviceProfile: mobilePack ? profile : undefined }) }); setOrder({ ...result.order, status: "pending" }); window.history.replaceState(null, "", "/checkout/" + plan + "?order=" + result.order.id); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível gerar o pedido."); } finally { setWorking(false); } };
  const cancel = async () => { if (!order) return; setWorking(true); try { await json(`/api/store/orders/${order.id}/cancel`, { method: "POST" }); setMessage("Compra cancelada. Você pode voltar à loja ou criar um novo pedido."); setOrder({ ...order, status: "cancelled" }); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível cancelar a compra."); } finally { setWorking(false); } };
  const copy = async () => { if (!order) return; await navigator.clipboard.writeText(order.pix); setMessage("Pix copia e cola copiado."); };
  if (!selected) return <div className="checkout-page"><h1>Plano não encontrado</h1><Link href="/">Voltar para a loja</Link></div>;
  return <div className="checkout-page"><header className="checkout-header"><Link href="/" className="brand"><span className="brand-mark">SK$</span><span>STORE</span></Link><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar para a loja</Link></header><main className="checkout-main"><span className="section-index">CHECKOUT / PIX</span><h1>Finalize seu acesso.</h1><p className="checkout-intro">Seu pedido será registrado no Discord para conferência manual. Você pode reabrir o pagamento ou cancelar enquanto estiver pendente.</p><div className="checkout-layout"><section className="checkout-summary"><span className="plan-number">PLANO SELECIONADO</span><h2>{selected.name}</h2><p>{selected.duration}</p><strong>{selected.price}</strong><ul><li><Check size={16} /> Identidade verificada pelo Discord</li><li><Check size={16} /> Pedido enviado ao canal de compras</li><li><Check size={16} /> Confirmação manual, sem aprovação automática</li></ul></section><section className="checkout-payment">{mobilePack && !order && <DevicePicker value={profile} onChange={setProfile}/>} {loading ? <p>Verificando sua conta...</p> : !user ? <><h2>Entre para continuar</h2><p>Você precisa entrar com Discord para vincular a compra à sua conta.</p><Button onClick={login}>Entrar com Discord</Button></> : !order ? <><h2>Gerar pagamento</h2><p>Cliente: <strong>{user.displayName}</strong></p><Button onClick={generate} disabled={working || (mobilePack && !validDeviceProfile(profile))}>{working ? "Gerando QR Code..." : "Gerar QR Code Pix"}</Button></> : order.status === "approved" ? <><h2>Pagamento confirmado</h2><p>Seu acesso está disponível em Minha conta.</p><Link href="/#account" className="plan-button">Ver minha compra</Link></> : order.status === "cancelled" ? <><h2>Compra cancelada</h2><p>Este pedido foi encerrado. Cancelar o pedido não estorna um Pix já enviado; nesse caso, fale com o suporte.</p><Link href="/cart" className="plan-button">Voltar ao carrinho</Link></> : <><div className="payment-success"><Check size={18} /> Pedido pendente</div><h2>Escaneie para pagar</h2><img className="pix-qr" src={order.qr} alt="QR Code Pix" /><strong className="payment-value">{(order.amountCents / 100).toFixed(2).replace(".", ",")} BRL</strong><p className="order-reference">Pedido <b>{order.id}</b></p><textarea readOnly value={order.pix} aria-label="Pix copia e cola" /><div className="order-meta"><Button onClick={copy}><Clipboard size={16} /> Copiar Pix copia e cola</Button><Button variant="outline" onClick={cancel} disabled={working}><XCircle size={16} /> Cancelar compra</Button></div><p className="privacy-note"><LockKeyhole size={14} /> O código Pix não contém seu nome nem seu ID Discord.</p></>}</section></div>{message && <div className="checkout-feedback">{message}</div>}</main><footer><span>Pix: DIEGO · SAO PAULO</span><a href="https://discord.gg/xJY2PZ6Zx" target="_blank" rel="noreferrer">Suporte pelo Discord ↗</a></footer></div>;
}
