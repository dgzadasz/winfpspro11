import { describe,it,expect } from 'vitest';
import { validDeviceProfile } from '../shared/devices';
import { deviceGuide, personalizedPack } from './pack-archive';
const profile={brand:'Apple',model:'iPhone 13',game:'Free Fire MAX',style:'Equilibrado'};
describe('device packs',()=>{
 it('requires a known brand and valid choices, allows unlisted models',()=>{
  expect(validDeviceProfile(profile)).toBeTruthy();
  for(const p of [null,{}, {...profile,brand:'__proto__'}, {...profile,game:'invalid'}, {...profile,model:''}, {...profile,model:'a'.repeat(101)}]) expect(validDeviceProfile(p)).toBeFalsy();
 });
 it('escapes model input and explains real touch behavior',()=>{
  const html=deviceGuide({...profile,model:'<script>alert(1)</script>'});
  expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('pode atrasar');expect(html).toContain('Não foi testado fisicamente');
 });
 it('builds a ZIP with personalized, phone and emulator guides',()=>{
  const zip=personalizedPack(profile,true);
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  expect(zip.readUInt16LE(zip.length-14)).toBe(4);
  expect(zip.toString()).toContain('iPhone 13');expect(zip.toString()).toContain('GUIA-EMULADOR.html');
 });
});
