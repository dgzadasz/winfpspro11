import { SetupVisual } from "@/components/SetupVisual";
import OrderReview from "@/components/OrderReview";
import { useEffect, useState } from "react";

import { Link } from "wouter";

import { ArrowRight, Check, Download, ExternalLink, LockKeyhole, LogOut, ShieldCheck, ShoppingCart, Sparkles, WandSparkles, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { addToCart, cartCount } from "@/lib/cart";



const plans = [

  { key: "daily", name: "Daily Pass", duration: "1 dia de acesso", price: "R$ 10,00", featured: false },

  { key: "weekly", name: "Weekly Pass", duration: "7 dias de acesso", price: "R$ 40,00", featured: true },

  { key: "monthly", name: "Monthly Pass", duration: "30 dias de acesso", price: "R$ 120,00", featured: false },

  { key: "yearly", name: "Annual Pass", duration: "1 ano de acesso", price: "Em breve", featured: false },
  { key: "lifetime", name: "Lifetime", duration: "Acesso vitalício", price: "R$ 300,00", featured: false },

] as const;

const packs = [

  { key: "sensiNormal", name: "Pack Sensi Normal", description: "Presets Android e iPhone para começar com uma base equilibrada.", price: "R$ 19,90", featured: false },

  { key: "sensiPremium", name: "Pack Sensi Premium", description: "Presets exclusivos, perfis por aparelho e IA de recomendação.", price: "R$ 39,90", featured: true },

  { key: "sensiEmulator", name: "Pack Sensi Emulador", description: "Configuração para mouse, DPI, resolução e controle no PC.", price: "R$ 29,90", featured: false },

] as const;

const packPlans = new Set(["sensiNormal", "sensiPremium", "sensiEmulator"]);

type DiscordUser = { id: string; displayName: string; username: string };

type Order = { id: string; plan: string; planName: string; amountCents: number; status: "pending" | "approved" | "cancelled"; createdAt: string; notifiedAt: string | null };

async function readJson<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Não foi possível concluir esta ação."); return body as T; }



export default function Home() {

  const [user, setUser] = useState<DiscordUser | null>(null); const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true); const [message, setMessage] = useState(""); const [items, setItems] = useState(cartCount()); const [introVisible, setIntroVisible] = useState(true); const [loginOpen, setLoginOpen] = useState(false);

  const refresh = async () => { const session = await readJson<{ user: DiscordUser | null }>("/api/discord/session"); setUser(session.user); if (!session.user) return setOrders([]); const mine = await readJson<{ orders: Order[] }>("/api/store/orders"); setOrders(mine.orders); };

useEffect(() => { refresh().catch(() => setMessage("Não foi possível carregar a sessão Discord.")).finally(() => setLoading(false)); const onCart = () => setItems(cartCount()); window.addEventListener("sk-cart-updated", onCart); window.addEventListener("storage", onCart); const timer=window.setTimeout(()=>{setIntroVisible(false);},3500); return () => { window.clearTimeout(timer); window.removeEventListener("sk-cart-updated", onCart); window.removeEventListener("storage", onCart); }; }, []);

  const login = () => { window.location.href = "/api/discord/login"; }; const logout = async () => { await readJson("/api/discord/logout", { method: "POST" }); setUser(null); setOrders([]); }; const formatAmount = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  const cancel = async (id: string) => { try { await readJson(`/api/store/orders/${id}/cancel`, { method: "POST" }); setMessage("Compra cancelada. Você pode criar outro pedido quando quiser."); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível cancelar a compra."); } };

  const add = (key: string) => { addToCart(key); setItems(cartCount()); setMessage("Item adicionado ao carrinho."); };



  return <div className="store-shell">{introVisible && <div className="intro-screen"><div className="intro-lines"/><div className="intro-logo"><span>SK$</span><b>STORE</b></div><p>SEU SETUP · SEU PRÓXIMO NÍVEL</p><div className="intro-loader"><i/></div></div>}{!loading && !user && !introVisible && loginOpen && <div className="login-backdrop" onClick={()=>setLoginOpen(false)}><div className="login-glass" onClick={e=>e.stopPropagation()}><button className="login-close" onClick={()=>setLoginOpen(false)} aria-label="Fechar">×</button><div className="login-symbol"><ShieldCheck size={22}/></div><span className="section-index">ACESSO VERIFICADO</span><h2>Entre no seu setup.</h2><p>Conecte seu Discord para comprar, acompanhar pedidos e acessar seus guias protegidos.</p><Button className="login-discord" onClick={login}>Entrar com Discord <ArrowRight size={16}/></Button><small><LockKeyhole size={13}/> Seus dados ficam vinculados somente à sua conta Discord.</small></div></div>}<header className="topbar"><a className="brand" href="#top"><span className="brand-mark">SK$</span><span>STORE</span></a><nav><a href="#plans">Planos</a><a href="#packs">Packs</a><a href="#how">Como funciona</a>{orders.some(o => o.plan === "sensiPremium" && o.status === "approved") && <Link href="/premium-ai" className="premium-nav">✦ IA Premium</Link>}<a href="#account">Minha conta</a><a href="https://discord.gg/xJY2PZ6Zx" target="_blank" rel="noreferrer">Suporte ↗</a><Link href="/cart" className="cart-link"><ShoppingCart size={16} /> Carrinho ({items})</Link></nav><div className="account-area">{loading ? <span className="muted">Carregando...</span> : user ? <><span className="user-name">{user.displayName}</span><Button variant="ghost" size="sm" onClick={logout}><LogOut size={16} /> Sair</Button></> : <Button onClick={()=>setLoginOpen(true)}>Entrar com Discord <ArrowRight size={16} /></Button>}</div></header>

    <div className="store-particles" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,animationDelay:`-${i*1.7}s`,animationDuration:`${12+i%7}s`}} />)}</div><main id="top"><section className="hero-section"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> FREE FIRE · CELULAR E PC</div><h1>Seu setup.<br /><em>Seu próximo nível.</em></h1><p>Packs de sensibilidade, guias para celular e emulador e assistente IA. Escolha seu pack e receba o ZIP após a confirmação do Pix.</p><div className="hero-actions"><a className="primary-link" href="#packs">Explorar packs <ArrowRight size={17} /></a><Link className="secondary-link" href="/cart">Abrir carrinho</Link></div><div className="trust-row"><span><ShieldCheck size={16} /> Cliente verificado no Discord</span><span><LockKeyhole size={16} /> Aprovação manual</span></div></div><SetupVisual /></section>

      <section id="packs" className="content-section packs-section"><div className="section-heading"><div><span className="section-index">01 / PACKS</span><h2>Sensibilidade para seu setup.</h2></div><p>Compra única · ZIP com guias para celular e PC. Download após aprovação no Discord.</p></div><div className="plans-grid packs-grid">{packs.map(pack => <article className={`plan-card pack-card ${pack.featured ? "featured" : ""}`} key={pack.key}>{pack.featured && <div className="popular">COM IA PREMIUM</div>}<div className="plan-icon"><WandSparkles size={16} /></div><h3>{pack.name}</h3><p>{pack.description}</p><div className="price">{pack.price}</div><div className="order-meta"><Link href={`/checkout/${pack.key}`} className="plan-button">Ver checkout <ArrowRight size={16} /></Link><Button variant="outline" size="sm" onClick={() => add(pack.key)}><ShoppingCart size={14} /> Adicionar</Button></div><span className="pack-note">Download protegido após aprovação</span></article>)}</div></section>

      <section id="plans" className="content-section"><div className="coming-soon-banner">EM BREVE — As chaves serão liberadas quando o APK estiver disponível.</div><div className="section-heading"><div><span className="section-index">02 / EM BREVE</span><h2>Chaves de acesso · Em breve</h2></div><p>Acesso por período com registro no Discord e confirmação manual.</p></div><div className="plans-grid">{plans.map((plan, index) => <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.key}>{plan.featured && <div className="popular">MAIS POPULAR</div>}<div className="plan-icon">0{index + 1}</div><h3>{plan.name}</h3><p className="plan-hidden">Informações em breve</p><div className="price price-blurred">R$ •••</div><div className="order-meta"><Button disabled className="plan-button">Em breve</Button></div><ul><li><Check size={15} /> Pagamento via Pix</li><li><Check size={15} /> Registro no canal de compras</li></ul></article>)}</div></section>

      <section id="how" className="how-section"><div><span className="section-index">03 / PROCESSO</span><h2>Simples do início ao fim.</h2></div><div className="steps"><div><b>01</b><h3>Entre com Discord</h3><p>O site verifica sua identidade e confirma que você está no servidor oficial.</p></div><div><b>02</b><h3>Faça o Pix</h3><p>O checkout gera QR Code e código copia e cola vinculado ao pedido.</p></div><div><b>03</b><h3>Aguarde a conferência</h3><p>O pedido chega ao canal de log e a confirmação é feita somente no Discord.</p></div></div></section>

      <section id="account" className="account-section"><div className="section-heading"><div><span className="section-index">04 / MINHA CONTA</span><h2>Seus pedidos</h2></div>{user && <span className="discord-badge">Discord ID: {user.id}</span>}</div>{!user ? <div className="empty-panel"><p>Entre com Discord para acompanhar pedidos e downloads.</p><Button onClick={login}>Entrar com Discord <ExternalLink size={16} /></Button></div> : orders.length === 0 ? <div className="empty-panel"><p>Você ainda não criou nenhum pedido.</p></div> : <div className="orders-list">{orders.map(order => <div className="order-row" key={order.id}><div><strong>{order.planName}</strong><small>Pedido {order.id}</small></div><div className="order-meta"><span className={`status status-${order.status}`}>{order.status === "approved" ? "Pagamento aprovado" : order.status === "cancelled" ? "Compra cancelada" : "Aguardando conferência"}</span><b>{formatAmount(order.amountCents)}</b>{order.status === "pending" && <><Link className="download-link" href={`/checkout/${order.plan}?order=${order.id}`}>Abrir pagamento</Link><Button variant="ghost" size="sm" onClick={() => cancel(order.id)}><XCircle size={14} /> Cancelar</Button></>}{order.status === "approved" && packPlans.has(order.plan) && <OrderReview id={order.id} />}{order.status === "approved" && packPlans.has(order.plan) && <><a className="download-link" href={`/api/packs/${order.plan}/guide?order=${order.id}`} target="_blank" rel="noreferrer"><Download size={14} /> Abrir guia</a><a className="download-link" href={`/api/packs/${order.plan}/download?order=${order.id}`}><Download size={14} /> Baixar ZIP</a></>}{order.status === "approved" && order.plan === "sensiPremium" && <Link className="download-link" href="/premium-ai"><WandSparkles size={14} /> IA Premium</Link>}</div></div>)}</div>}</section>

      <section id="download" className="download-banner"><div className="download-icon"><Download size={28} /></div><div><span className="section-index">05 / DOWNLOADS</span><h2>Materiais protegidos</h2><p>Os packs aprovados aparecem para download na sua conta.</p></div><Button variant="outline" disabled><LockKeyhole size={16} /> Acesso por compra</Button></section></main><footer><span>SK$ STORE</span><span>Pix: DIEGO · SAO PAULO</span><a href="https://discord.gg/xJY2PZ6Zx" target="_blank" rel="noreferrer">Suporte pelo Discord ↗</a></footer>{message && <div className="feedback">{message}</div>}</div>;

}





