import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readCart, writeCart, type CartItem } from "@/lib/cart";

const plans: Record<string, { name: string; price: number }> = {
  daily: { name: "Daily Pass", price: 1000 }, weekly: { name: "Weekly Pass", price: 4000 }, monthly: { name: "Monthly Pass", price: 12000 }, lifetime: { name: "Lifetime", price: 30000 },
  sensiNormal: { name: "Pack Sensi Normal", price: 1990 }, sensiPremium: { name: "Pack Sensi Premium", price: 3990 }, sensiEmulator: { name: "Pack Sensi Emulador", price: 2990 },
};
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

export default function Cart() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { const sync = () => setItems(readCart()); sync(); window.addEventListener("storage", sync); window.addEventListener("sk-cart-updated", sync); return () => { window.removeEventListener("storage", sync); window.removeEventListener("sk-cart-updated", sync); }; }, []);
  const update = (plan: string, quantity: number) => { const next = items.map(item => item.plan === plan ? { ...item, quantity } : item).filter(item => item.quantity > 0); setItems(next); writeCart(next); };
  const total = useMemo(() => items.reduce((sum, item) => sum + (plans[item.plan]?.price || 0) * item.quantity, 0), [items]);
  return <div className="checkout-page"><header className="checkout-header"><Link href="/" className="brand"><span className="brand-mark">SK$</span><span>STORE</span></Link><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar para a loja</Link></header><main className="checkout-main"><span className="section-index"><ShoppingCart size={14} /> MEU CARRINHO</span><h1>Seu carrinho.</h1><p className="checkout-intro">Seus itens ficam salvos neste navegador para você voltar e pagar quando quiser.</p>{items.length === 0 ? <section className="empty-panel"><p>Seu carrinho está vazio.</p><Button onClick={() => setLocation("/#plans")}>Ver planos</Button></section> : <div className="checkout-layout"><section className="checkout-payment">{items.map(item => { const plan = plans[item.plan]; if (!plan) return null; return <div className="order-row" key={item.plan}><div><strong>{plan.name}</strong><small>{money(plan.price)} cada</small></div><div className="order-meta"><span>1 acesso</span><Button variant="ghost" size="icon" onClick={() => update(item.plan, 0)} aria-label={`Remover ${plan.name}`}><Trash2 size={16} /></Button></div></div>; })}</section><section className="checkout-summary"><span className="plan-number">TOTAL</span><h2>{money(total)}</h2><p>Cada produto dá acesso à sua conta. Pague um item por vez; os demais continuam salvos.</p><div className="order-meta">{items.map(item => <Link key={item.plan} className="plan-button" href={`/checkout/${item.plan}`}>Pagar {plans[item.plan]?.name}</Link>)}</div></section></div>}</main><footer><span>Pix: DIEGO · SAO PAULO</span><span>Confirmação somente no Discord</span></footer></div>;
}
