import { useEffect, useState } from "react";

export function StoreIntro({ onDone }: { onDone: () => void }) {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const finish = window.setTimeout(() => { setClosing(true); window.setTimeout(onDone, 320); }, 1900);
    const safety = window.setTimeout(onDone, 2400);
    return () => { window.clearTimeout(finish); window.clearTimeout(safety); };
  }, [onDone]);
  return <div className={`store-intro ${closing ? "is-closing" : ""}`} aria-label="Carregando SK$ STORE"><div className="intro-mark"><span>SK$</span><b>STORE</b></div><p>FREE FIRE · SETUP LAB</p><div className="intro-progress"><i /></div><button onClick={onDone}>Pular intro</button></div>;
}
