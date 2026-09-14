import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, Clipboard, Download, ExternalLink, LockKeyhole, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  { key: "daily", name: "Daily Pass", duration: "1 dia de acesso", price: "R$ 10,00", featured: false },
  { key: "weekly", name: "Weekly Pass", duration: "7 dias de acesso", price: "R$ 40,00", featured: true },
  { key: "monthly", name: "Monthly Pass", duration: "30 dias de acesso", price: "R$ 120,00", featured: false },
  { key: "lifetime", name: "Lifetime", duration: "Acesso vitalício", price: "R$ 300,00", featured: false },
] as const;

type DiscordUser = { id: string; displayName: string; username: string };
type Order = { id: string; discordId?: string; discordName?: string; planName: string; amountCents: number; status: "pending" | "approved"; createdAt: string; notifiedAt: string | null };
type CreatedOrder = { id: string; planName: string; amountCents: number; pix: string; notified: boolean };

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Não foi possível concluir esta ação.");
  return body as T;
}

export default function Home() {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingPlan, setWorkingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const session = await readJson<{ user: DiscordUser | null }>("/api/discord/session");
    setUser(session.user);
    if (!session.user) {
      setOrders([]);
      return;
    }
    const mine = await readJson<{ orders: Order[] }>("/api/store/orders");
    setOrders(mine.orders);
  };

  useEffect(() => {
    refresh().catch(() => setMessage("Não foi possível carregar a sessão Discord." )).finally(() => setLoading(false));
  }, []);

  const login = () => { window.location.href = "/api/discord/login"; };
  const logout = async () => { await readJson("/api/discord/logout", { method: "POST" }); setUser(null); setOrders([]); };
  const copyPix = async () => {
    if (!createdOrder) return;
    await navigator.clipboard.writeText(createdOrder.pix);
    setMessage("Pix copia e cola copiado.");
  };
  const formatAmount = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <div className="store-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">SK$</span><span>STORE</span></a>
        <nav><a href="#plans">Planos</a><a href="#how">Como funciona</a><a href="#account">Minha conta</a></nav>
        <div className="account-area">
          {loading ? <span className="muted">Carregando...</span> : user ? <><span className="user-name">{user.displayName}</span><Button variant="ghost" size="sm" onClick={logout}><LogOut size={16} /> Sair</Button></> : <Button onClick={login}>Entrar com Discord <ArrowRight size={16} /></Button>}
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> ANDROID · ACESSO PREMIUM</div><h1>Seu próximo acesso.<br /><em>Começa aqui.</em></h1><p>Entre com Discord, escolha seu plano e pague com Pix. Cada pedido é registrado no canal de compras para conferência manual.</p><div className="hero-actions"><a className="primary-link" href="#plans">Ver planos <ArrowRight size={17} /></a><a className="secondary-link" href="#how">Saiba como funciona</a></div><div className="trust-row"><span><ShieldCheck size={16} /> Cliente verificado no Discord</span><span><LockKeyhole size={16} /> Aprovação manual</span></div></div>
          <div className="hero-card"><div className="orb orb-a" /><div className="orb orb-b" /><div className="hero-card-content"><span className="card-kicker">SK$ / ACCESS</span><strong>ACESSO<br /><span>SEM LIMITES</span></strong><div className="card-footer"><span>ANDROID</span><span>2026</span></div></div></div>
        </section>

        <section id="plans" className="content-section"><div className="section-heading"><div><span className="section-index">01 / LOJA</span><h2>Escolha seu plano</h2></div><p>Pix rápido, registro no Discord e confirmação manual.</p></div><div className="plans-grid">{plans.map((plan, index) => <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.key}>{plan.featured && <div className="popular">MAIS POPULAR</div>}<div className="plan-icon">{plan.key === "lifetime" ? "∞" : `0${index + 1}`}</div><h3>{plan.name}</h3><p>{plan.duration}</p><div className="price">{plan.price}</div><Link href={`/checkout/${plan.key}`} className="plan-button">Ir para compra <ArrowRight size={16} /></Link><ul><li><Check size={15} /> Pagamento via Pix</li><li><Check size={15} /> Registro no canal de compras</li></ul></article>)}</div></section>

        <section id="how" className="how-section"><div><span className="section-index">02 / PROCESSO</span><h2>Simples do início ao fim.</h2></div><div className="steps"><div><b>01</b><h3>Entre com Discord</h3><p>O site verifica sua identidade e confirma que você está no servidor oficial.</p></div><div><b>02</b><h3>Faça o Pix</h3><p>O pedido gera um código Pix vinculado ao identificador único da compra.</p></div><div><b>03</b><h3>Aguarde a conferência</h3><p>O pedido chega ao canal de log. A aprovação é feita manualmente pelo administrador.</p></div></div></section>

        <section id="account" className="account-section"><div className="section-heading"><div><span className="section-index">03 / MINHA CONTA</span><h2>Seus pedidos</h2></div>{user && <span className="discord-badge">Discord ID: {user.id}</span>}</div>{!user ? <div className="empty-panel"><p>Entre com Discord para acompanhar pedidos e pagamentos.</p><Button onClick={login}>Entrar com Discord <ExternalLink size={16} /></Button></div> : orders.length === 0 ? <div className="empty-panel"><p>Você ainda não criou nenhum pedido.</p></div> : <div className="orders-list">{orders.map(order => <div className="order-row" key={order.id}><div><strong>{order.planName}</strong><small>Pedido {order.id}</small></div><div className="order-meta"><span className={`status status-${order.status}`}>{order.status === "approved" ? "Pagamento aprovado" : "Aguardando conferência"}</span><b>{formatAmount(order.amountCents)}</b></div></div>)}</div>}</section>

        {createdOrder && <section className="pix-panel"><div><span className="section-index">PEDIDO {createdOrder.id}</span><h2>Pix gerado</h2><p>Copie o código abaixo e faça o pagamento de {formatAmount(createdOrder.amountCents)}. O pedido já foi enviado ao canal de log para conferência manual.</p><p className="privacy-note"><LockKeyhole size={14} /> O Pix não contém seu nome, ID do Discord ou dados de cliente. Ele mostra somente os dados necessários do recebedor e o identificador do pedido.</p></div><div className="pix-copy"><textarea readOnly value={createdOrder.pix} aria-label="Pix copia e cola" /><Button onClick={copyPix}><Clipboard size={16} /> Copiar Pix</Button></div></section>}
        {message && <div className="feedback">{message}</div>}

        <section id="download" className="download-banner"><div className="download-icon"><Download size={28} /></div><div><span className="section-index">04 / DOWNLOAD</span><h2>APK em preparação</h2><p>O download ficará disponível assim que o APK oficial for adicionado à loja.</p></div><Button variant="outline" disabled><LockKeyhole size={16} /> Bloqueado por enquanto</Button></section>
      </main>
      <footer><span>SK$ STORE</span><span>Pix: DIEGO · SAO PAULO</span><a href="https://discord.gg/xJY2PZ6Zx" target="_blank" rel="noreferrer">Suporte pelo Discord ↗</a></footer>
    </div>
  );
}
