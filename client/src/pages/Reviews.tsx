import { Link } from "wouter";
import { Star, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

type Review = { orderId: string; rating: number; comment: string; planName: string; createdAt: string };
export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/store/reviews", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Não foi possível carregar as avaliações. Tente novamente.");
      const data = await response.json(); setReviews(data.reviews);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  return <main className="catalog-page"><header className="checkout-header"><Link href="/" className="back-link"><ArrowLeft size={16}/> Loja</Link><Link href="/dashboard">Minha conta</Link></header>
    <section className="catalog-hero"><span className="section-index">AVALIAÇÕES VERIFICADAS</span><h1>Experiências reais.</h1><p>Avaliações de clientes com compra aprovada. Para avaliar seu pack, acesse Minha conta.</p></section>
    <section className="reviews-grid">{loading ? <p role="status">Carregando avaliações…</p> : error ? <div role="alert"><p>{error}</p><button className="plan-button" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div> : reviews.length === 0 ? <div className="dashboard-empty compact"><p>Ainda não há avaliações publicadas.</p></div> : reviews.map(review => <article className="review-card" key={review.orderId}><div className="review-stars" aria-label={`${review.rating} de 5 estrelas`}>{Array.from({ length: 5 }, (_, index) => <Star aria-hidden="true" key={index} size={15} fill={index < review.rating ? "currentColor" : "none"}/>)}</div><p>{review.comment}</p><strong>{review.planName}</strong><small>Compra verificada · {new Date(review.createdAt).toLocaleDateString("pt-BR")}</small></article>)}</section>
  </main>;
}
