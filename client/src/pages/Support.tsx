import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";

type Ticket = { id: string; order_id: string | null; subject: string; message: string; status: "open" | "answered"; reply: string | null; created_at: string };
async function request(url: string, body?: unknown) {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || "Não foi possível concluir a operação."), { status: response.status });
  return data;
}
function Reply({ ticketId, onSent }: { ticketId: string; onSent: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request(`/api/support/${encodeURIComponent(ticketId)}/reply`, { reply }); onSent(); }
    catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  return <form className="support-form" onSubmit={submit}><label>Resposta ao cliente<textarea minLength={3} maxLength={3000} required value={reply} onChange={event => setReply(event.target.value)}/></label><button className="plan-button" disabled={busy}>{busy ? "Salvando…" : "Responder chamado"}</button>{error && <p role="alert">{error}</p>}</form>;
}
export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<{ id: string; planName: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([request("/api/support"), request("/api/store/orders")]).then(([support, purchases]) => {
      if (!active) return;
      setTickets(support.tickets); setIsAdmin(support.isAdmin); setOrders(purchases.orders); setLoginRequired(false);
    }).catch(cause => { if (active) { setLoginRequired(cause.status === 401); setError(cause.status === 401 ? "" : cause.message); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form);
    setBusy(true); setError(""); setNotice("");
    try { await request("/api/support", Object.fromEntries(fields)); form.reset(); setNotice("Chamado salvo. Acompanhe a resposta abaixo."); setRevision(value => value + 1); }
    catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  return <main className="dashboard-page"><header className="checkout-header"><Link href="/">SK$ STORE</Link><Link href="/dashboard">Minha conta</Link></header><section className="dashboard-content"><span className="section-index">SUPORTE</span><h1>Vamos resolver.</h1><p className="dashboard-lead">Descreva seu problema e selecione o pedido relacionado. Você também pode <a href="https://discord.gg/xJY2PZ6Zx" target="_blank" rel="noreferrer">falar pelo Discord ↗</a>.</p>
    <details className="purchase-review"><summary>Paguei o Pix. Quando recebo meu pack?</summary><p>O administrador confere o recebimento e confirma o pedido no Discord. Depois, seu guia aparece em Minha conta. Se precisar de ajuda, vincule o pedido ao chamado.</p></details>
    {loading ? <p role="status">Carregando suporte…</p> : loginRequired ? <a className="plan-button" href="/api/discord/login">Entrar com Discord para abrir um chamado</a> : <>
      <form className="support-form" onSubmit={submit}><h2>Abrir chamado</h2><label>Pedido<select name="orderId"><option value="">Dúvida geral</option>{orders.map(order => <option key={order.id} value={order.id}>{order.planName} · {order.id}</option>)}</select></label><label>Assunto<input name="subject" required minLength={5} maxLength={120}/></label><label>O que aconteceu?<textarea name="message" required minLength={10} maxLength={3000}/></label><small>Não envie senhas, tokens ou dados bancários.</small><button className="plan-button" disabled={busy}>{busy ? "Salvando…" : "Abrir chamado"}</button></form>
      <h2>{isAdmin ? "Chamados dos clientes" : "Seus chamados"}</h2><button onClick={() => setRevision(value => value + 1)}>Atualizar chamados</button>
      {!tickets.length && <p className="dashboard-lead">Nenhum chamado encontrado.</p>}{tickets.map(ticket => <article className="support-ticket" key={ticket.id}><span className="section-index">{ticket.status === "open" ? "AGUARDANDO RESPOSTA" : "RESPONDIDO"}</span><h3>{ticket.subject}</h3><small>{new Date(ticket.created_at).toLocaleString("pt-BR")}{ticket.order_id && ` · Pedido ${ticket.order_id}`}</small><p>{ticket.message}</p>{ticket.reply && <blockquote><strong>Resposta do suporte</strong><p>{ticket.reply}</p></blockquote>}{isAdmin && ticket.status === "open" && <Reply ticketId={ticket.id} onSent={() => setRevision(value => value + 1)}/>}</article>)}
    </>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section></main>;
}
