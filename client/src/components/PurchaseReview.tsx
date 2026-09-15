import { useState } from "react";

export default function PurchaseReview({ orderId, productName }: { orderId: string; productName: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  return <details className="purchase-review"><summary>Avaliar {productName}</summary>
    {submitted ? <p role="status">{message}</p> : <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage("");
      try {
        const response = await fetch(`/api/store/orders/${encodeURIComponent(orderId)}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
        const data = await response.json();
        if (response.status === 409) { setSubmitted(true); setMessage(data.error); return; }
        if (!response.ok) throw new Error(data.error || "Não foi possível enviar sua avaliação.");
        setSubmitted(true); setMessage(data.message);
      } catch (error) { setMessage(error instanceof Error ? error.message : "Verifique sua conexão e tente novamente."); }
      finally { setBusy(false); }
    }}>
      <label>Nota<select value={rating} onChange={event => setRating(Number(event.target.value))} disabled={busy}>{[5, 4, 3, 2, 1].map(value => <option value={value} key={value}>{value} {value === 1 ? "estrela" : "estrelas"}</option>)}</select></label>
      <label>Sua experiência<textarea value={comment} onChange={event => setComment(event.target.value)} minLength={3} maxLength={1000} required disabled={busy} placeholder="Conte como foi usar o pack no seu aparelho."/></label>
      <small>A avaliação e seu nome do Discord serão publicados. Não inclua dados pessoais ou comprovantes.</small>
      <button className="plan-button" disabled={busy}>{busy ? "Enviando…" : "Publicar avaliação"}</button>
      {message && <p role="alert">{message}</p>}
    </form>}
  </details>;
}
