import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('./db', () => ({ getDb: vi.fn() }));
vi.mock('./orders', () => ({ getOrderForUser: vi.fn() }));
vi.mock('./discord', () => ({ getDiscordUser: vi.fn() }));
import { registerReviewRoutes, validateReview } from './reviews';
import { getOrderForUser } from './orders';
import { getDb } from './db';
import { getDiscordUser } from './discord';
describe('purchase reviews', () => {
  let handler: any;
  beforeEach(() => { vi.resetAllMocks(); registerReviewRoutes({post: (_: string, fn: any) => handler=fn} as any); });
  it('validates rating and comment bounds', () => {
    for(const rating of [0,6,1.5,'5']) expect(()=>validateReview({rating,comment:'Bom pack'})).toThrow();
    expect(()=>validateReview({rating:5,comment:'a'.repeat(1001)})).toThrow();
    expect(validateReview({rating:4,comment:' Bom pack '})).toEqual({rating:4,comment:'Bom pack'});
  });
  it('denies an unauthenticated review', async()=>{
    const res={status:vi.fn().mockReturnThis(),json:vi.fn()};
    await handler({},res); expect(res.status).toHaveBeenCalledWith(401); expect(getDb).not.toHaveBeenCalled();
  });
  it.each([null,{status:'pending'},{status:'cancelled'}])('denies unapproved or foreign orders: %j',async(order)=>{
    vi.mocked(getDiscordUser).mockReturnValue({id:'buyer'} as any);
    vi.mocked(getOrderForUser).mockResolvedValue(order as any);
    const res={status:vi.fn().mockReturnThis(),json:vi.fn()};
    await handler({params:{id:'order'},body:{rating:5,comment:'Bom pack'}},res);
    expect(getOrderForUser).toHaveBeenCalledWith('order','buyer'); expect(res.status).toHaveBeenCalledWith(403); expect(getDb).not.toHaveBeenCalled();
  });
});
