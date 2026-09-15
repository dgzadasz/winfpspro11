import { Link, useRoute } from "wouter";
import { ArrowLeft, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { CatalogProduct } from "@shared/catalog";
import { track } from "@/lib/analytics";

export default function Product() {
  const [, params] = useRoute("/product/:slug");
  const [product, setProduct] = useState<CatalogProduct | null | undefined>(undefined);
  const [owned, setOwned] = useState(false);
  useEffect(() => { if (!params?.slug) return; setProduct(undefined); setOwned(false); const slug = params.slug; fetch(`/api/catalog/${encodeURIComponent(slug)}`).then(response => response.ok ? response.json() : Promise.reject()).then(data => setProduct(data.product || null)).catch(() => setProduct(null)); const planBySlug: Record<string,string> = {"sensi-normal":"sensiNormal","sensi-premium":"sensiPremium","sensi-emulator":"sensiEmulator"}; fetch("/api/store/licenses?scope=mine").then(response => response.ok ? response.json() : null).then(data => setOwned(Boolean(data?.licenses?.some((license: {productId?: string; productSlug?: string; plan?: string; status?: string}) => license.status === "ACTIVE" && (license.productId === slug || license.productSlug === slug || license.plan === planBySlug[slug]))))).catch(() => undefined); }, [params?.slug]);
  useEffect(() => { if (product) track("product_view", product.slug); }, [product?.slug]);
  if (product === undefined) return <main className="catalog-page"><section className="catalog-hero"><p role="status">Carregando produto…</p></section></main>;
  if (!product) return <main className="catalog-page"><section className="catalog-hero"><h1>Produto não encontrado</h1><Link href="/catalog">Voltar</Link></section></main>;
  const checkout = product.id === "sensi-normal" ? "sensiNormal" : product.id === "sensi-premium" ? "sensiPremium" : "sensiEmulator";
  const checkoutHref = `/checkout/${checkout}`;
  return <main className="catalog-page"><header className="checkout-header"><Link href="/catalog" className="back-link"><ArrowLeft size={16}/> Catálogo</Link><span className="brand"><span className="brand-mark">SK$</span><span>STORE</span></span></header><section className="product-detail"><span className="catalog-category">{product.category} · atualizado {product.updatedAt}</span><h1>{product.name}</h1>{owned && <span className="owned-badge">Você já possui este produto</span>}<p className="product-lead">{product.description}</p><div className="product-columns"><div className="product-panel"><h2>O que você recebe</h2><ul>{product.included.map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul><h2>Compatibilidade</h2><div className="catalog-tags">{product.compatibility.map(item => <span key={item}>{item}</span>)}</div>{product.requirements?.length ? <><h2>Requisitos</h2><ul>{product.requirements.map(item => <li key={item}><Check size={16}/>{item}</li>)}</ul></> : null}{product.faq?.length ? <><h2>Perguntas frequentes</h2>{product.faq.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</> : null}</div><aside className="product-buy"><ShieldCheck size={22}/><strong>R$ {(product.priceCents / 100).toFixed(2).replace(".", ",")}</strong><p>Entrega protegida após aprovação no Discord.</p><Link className="plan-button" href={owned ? "/dashboard" : checkoutHref}>{owned ? "Abrir meus produtos" : "Comprar agora"}</Link><small><LockKeyhole size={13}/> Acesso vinculado à sua conta</small></aside></div></section></main>;
}


