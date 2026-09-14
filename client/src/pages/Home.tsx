import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Download, LockKeyhole, LogOut, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  { name: "Daily Pass", duration: "1 dia de acesso", price: "R$ 10,00", featured: false },
  { name: "Weekly Pass", duration: "7 dias de acesso", price: "R$ 40,00", featured: true },
  { name: "Monthly Pass", duration: "30 dias de acesso", price: "R$ 120,00", featured: false },
  { name: "Lifetime", duration: "Acesso vitalício", price: "R$ 300,00", featured: false },
];

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  return (
    <div className="store-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">SK$</span><span>STORE</span></a>
        <nav><a href="#plans">Planos</a><a href="#how">Como funciona</a><a href="#download">Download</a></nav>
        <div className="account-area">
          {loading ? <span className="muted">Carregando...</span> : isAuthenticated ? <><span className="user-name">{user?.name}</span><Button variant="ghost" size="sm" onClick={() => logout()}><LogOut size={16} /> Sair</Button></> : <Button onClick={() => startLogin()}>Entrar <ArrowRight size={16} /></Button>}
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> ANDROID · ACESSO PREMIUM</div>
            <h1>Seu próximo acesso.<br /><em>Começa aqui.</em></h1>
            <p>Escolha seu plano, pague com Pix e tenha acesso ao SK$ STORE pela sua conta.</p>
            <div className="hero-actions"><a className="primary-link" href="#plans">Ver planos <ArrowRight size={17} /></a><a className="secondary-link" href="#how">Saiba como funciona</a></div>
            <div className="trust-row"><span><ShieldCheck size={16} /> Compra protegida</span><span><LockKeyhole size={16} /> Download privado</span></div>
          </div>
          <div className="hero-card"><div className="orb orb-a" /><div className="orb orb-b" /><div className="hero-card-content"><span className="card-kicker">SK$ / ACCESS</span><strong>ACESSO<br /><span>SEM LIMITES</span></strong><div className="card-footer"><span>ANDROID</span><span>2026</span></div></div></div>
        </section>

        <section id="plans" className="content-section"><div className="section-heading"><div><span className="section-index">01 / LOJA</span><h2>Escolha seu plano</h2></div><p>Pix rápido, confirmação manual e acesso pelo seu painel.</p></div><div className="plans-grid">{plans.map((plan) => <article className={`plan-card ${plan.featured ? "featured" : ""}`} key={plan.name}>{plan.featured && <div className="popular">MAIS POPULAR</div>}<div className="plan-icon">{plan.name === "Lifetime" ? "∞" : "0" + (plans.indexOf(plan) + 1)}</div><h3>{plan.name}</h3><p>{plan.duration}</p><div className="price">{plan.price}</div><Button className="plan-button" onClick={() => startLogin()}>Entrar para comprar <ArrowRight size={16} /></Button><ul><li><Check size={15} /> Pagamento via Pix</li><li><Check size={15} /> Aprovação segura</li></ul></article>)}</div></section>

        <section id="how" className="how-section"><div><span className="section-index">02 / PROCESSO</span><h2>Simples do início ao fim.</h2></div><div className="steps"><div><b>01</b><h3>Entre com sua conta</h3><p>Use sua conta para acompanhar pedidos e liberar seu acesso.</p></div><div><b>02</b><h3>Faça o Pix</h3><p>O QR Code é gerado com seu pedido e valor correto.</p></div><div><b>03</b><h3>Receba o acesso</h3><p>Após a confirmação, o download aparece no seu painel.</p></div></div></section>

        <section id="download" className="download-banner"><div className="download-icon"><Download size={28} /></div><div><span className="section-index">03 / DOWNLOAD</span><h2>APK em preparação</h2><p>O download ficará disponível assim que o APK oficial for adicionado à loja.</p></div><Button variant="outline" disabled><LockKeyhole size={16} /> Bloqueado por enquanto</Button></section>
      </main>
      <footer><span>SK$ STORE</span><span>Pix configurado para DIEGO · SAO PAULO</span><span>Suporte pelo Discord</span></footer>
    </div>
  );
}
