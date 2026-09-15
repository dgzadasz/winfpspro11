import PurchaseReview from "@/components/PurchaseReview";
import { Link } from "wouter";
import { Download, ExternalLink, ShieldCheck, BookOpen, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type User = { id: string; displayName: string };
type Order = { id: string; plan: string; planName: string; amountCents: number; status: "pending" | "approved" | "cancelled"; createdAt: string; deviceProfile?: string | null };
const statusLabels = { pending: "Aguardando confirmação", approved: "Aprovado", cancelled: "Cancelado" };
function deviceLabel(order: Order) {
  if (order.plan === "sensiEmulator") return "PC / Emulador";
  try { const profile = JSON.parse(order.deviceProfile || "null"); return profile?.model || "Celular"; } catch { return "Celular"; }
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const session = await fetch("/api/discord/session", { signal: controller.signal });
        if (!session.ok) throw new Error("Não foi possível verificar sua sessão.");
        const account = await session.json();
        setUser(account.user || null);
        if (!account.user) { setOrders([]); return; }
        const response = await fetch("/api/store/orders", { signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível carregar seus pedidos. Tente novamente.");
        const data = await response.json();
        setOrders(data.orders);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha de conexão.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [revision]);
  const approved = orders.filter(order => order.status === "approved");
  return <main className="dashboard-page">
    <header className="checkout-header"><Link href="/" className="brand"><span className="brand-mark">SK$</span><span>STORE</span></Link><Link href="/catalog">Explorar catálogo</Link></header>
    <section className="dashboard-content">
      <span className="section-index">ÁREA DO CLIENTE</span><h1>Seus produtos.</h1>
      {loading ? <p role="status">Carregando sua conta e seus pedidos…</p> : error ? <div className="dashboard-empty compact" role="alert"><p>{error}</p><button className="plan-button" onClick={() => setRevision(value => value + 1)}><RefreshCw size={16}/> Tentar novamente</button></div> : !user ? <div className="dashboard-empty compact"><ShieldCheck size={30}/><h2>Conecte seu Discord</h2><p>Entre com a conta usada na compra para acessar seus materiais.</p><a className="plan-button" href="/api/discord/login">Entrar com Discord <ExternalLink size={15}/></a></div> : <>
        <p className="dashboard-lead">{user.displayName} · Discord conectado</p>
        <div className="dashboard-stats"><div><small>PRODUTOS LIBERADOS</small><strong>{approved.length}</strong></div><div><small>AGUARDANDO APROVAÇÃO</small><strong>{orders.filter(order => order.status === "pending").length}</strong></div></div>
        <section className="dashboard-orders"><h2>Meus produtos</h2>
          {approved.length === 0 ? <p className="dashboard-lead">Seus materiais aparecerão aqui após a confirmação do Pix pelo administrador.</p> : approved.map(order => <article className="dashboard-order" key={order.id}><div><strong>{order.planName}</strong><small>{deviceLabel(order)}</small><small>Pedido {order.id}</small></div><div className="dashboard-actions"><a href={`/api/packs/${order.plan}/guide?order=${encodeURIComponent(order.id)}`}><BookOpen size={15}/> Abrir guia</a><a href={`/api/packs/${order.plan}/download?order=${encodeURIComponent(order.id)}`}><Download size={15}/> Baixar ZIP</a>{order.plan === "sensiPremium" && <Link href="/premium-ai">Conversar com IA</Link>}</div><PurchaseReview orderId={order.id} productName={order.planName}/></article>)}
        </section>
        <section className="dashboard-orders"><h2>Histórico de pedidos</h2>{orders.length === 0 ? <p className="dashboard-lead">Você ainda não fez um pedido. <Link href="/catalog">Ver packs disponíveis</Link></p> : orders.map(order => <article className="dashboard-order" key={order.id}><div><strong>{order.planName}</strong><small>{new Date(order.createdAt).toLocaleDateString("pt-BR")} · {(order.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</small></div><span className={`status status-${order.status}`}>{statusLabels[order.status]}</span>{order.status === "pending" && <Link href={`/checkout/${order.plan}?order=${encodeURIComponent(order.id)}`}>Ver Pix / cancelar</Link>}</article>)}</section>
        <div className="dashboard-actions"><Link href="/support">Meus chamados</Link><Link href="/reviews">Avaliações</Link><button onClick={() => setRevision(value => value + 1)}>Atualizar pedidos</button><a href="https://discord.gg/xJY2PZ6Zx" target="_blank" rel="noreferrer">Suporte no Discord ↗</a></div>
      </>}
    </section>
  </main>;
}


