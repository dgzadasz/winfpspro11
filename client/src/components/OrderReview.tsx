import { useState } from 'react';
import { Button } from './ui/button';
export default function OrderReview({ id }: { id: string }) {
  const [open,setOpen]=useState(false), [rating,setRating]=useState(5), [comment,setComment]=useState(''), [busy,setBusy]=useState(false), [done,setDone]=useState(false), [message,setMessage]=useState('');
  async function submit() {
    setBusy(true);
    try {
      const response=await fetch(`/api/store/orders/${id}/review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,comment})});
      const data=await response.json(); setMessage(data.message || data.error);
      if(response.ok || response.status===409) setDone(true);
    } catch { setMessage('Falha de conexão. Tente novamente.'); } finally { setBusy(false); }
  }
  return <div className="review-box"><Button variant="outline" onClick={()=>setOpen(!open)}>★ Avaliar compra</Button>{open && <div className="review-form">{!done && <><label>Nota<select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} estrelas</option>)}</select></label><label>Sua experiência<textarea maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Como foi usar o pack?" /></label><small>Sua nota, comentário, nome Discord e item serão publicados no canal vendas.</small><Button disabled={busy || comment.trim().length<3} onClick={submit}>{busy?'Enviando…':'Publicar avaliação'}</Button></>}<p role="status">{message}</p></div>}</div>;
}
