import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, Search, ShieldCheck } from "lucide-react";
import { CATALOG, type CatalogProduct } from "@shared/catalog";

export default function Catalog() {
  const [products, setProducts] = useState<CatalogProduct[]>(CATALOG);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/catalog").then(async response => { if (!response.ok) throw new Error(); const data = await response.json(); if (Array.isArray(data.products)) setProducts(data.products); }).catch(() => undefined).finally(() => setLoading(false)); }, []);
  const categories = useMemo(() => Array.from(new Set(products.map(product => product.category))), [products]);
  const visible = products.filter(product => (category === "all" || product.category === category) && `${product.name} ${product.shortDescription} ${product.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <main className="catalog-page"><header className="checkout-header"><Link href="/" className="brand"><span className="brand-mark">SK$</span><span>STORE</span></Link><Link href="/">Voltar</Link></header><section className="catalog-hero"><span className="section-index">CATÁLOGO / PRODUTOS</span><h1>Escolha o setup certo.</h1><p>Produtos digitais organizados por plataforma, compatibilidade e objetivo. Cada item tem dados e materiais próprios.</p><div className="catalog-filters"><label><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar produto..." aria-label="Buscar produto"/></label><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filtrar categoria"><option value="all">Todas as categorias</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></div></section><section className="catalog-grid">{loading ? <p role="status">Carregando catálogo…</p> : visible.length === 0 ? <div className="dashboard-empty compact"><p>Nenhum produto encontrado para sua busca.</p><button className="plan-button" onClick={() => { setQuery(""); setCategory("all"); }}>Limpar filtros</button></div> : visible.map(product => <article className="catalog-card" key={product.id}><div className="catalog-card-top"><span className="catalog-category">{product.category}</span><ShieldCheck size={18}/></div><h2>{product.name}</h2><p>{product.shortDescription}</p><div className="catalog-tags">{product.tags.map(tag => <span key={tag}>{tag}</span>)}</div><ul>{product.included.map(item => <li key={item}><Check size={14}/>{item}</li>)}</ul><strong>R$ {(product.priceCents / 100).toFixed(2).replace(".", ",")}</strong><Link className="plan-button" href={`/product/${product.slug}`}>Ver produto <ArrowRight size={15}/></Link></article>)}</section></main>;
}
