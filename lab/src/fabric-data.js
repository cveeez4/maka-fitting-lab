// Deterministic, tileable artist-authored weave, not a scan of MAKA fabric.
export const fabricKinds=['crepe','satin','linen'];
export function makeFabricData(kind,size=256){
  if(!fabricKinds.includes(kind))throw Error('Unknown fabric preset');
  if(!Number.isInteger(size)||size<32||size>1024||size%32)throw Error('Size must be a multiple of 32, from 32 to 1024');
  const heights=new Float32Array(size*size),roughness=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
  const tau=Math.PI*2,base={crepe:.82,satin:.36,linen:.93}[kind];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,warp=Math.cos(tau*32*u),weft=Math.cos(tau*32*v);
    const grain=Math.sin(tau*(73*u+51*v))*Math.cos(tau*(47*u-63*v));
    const slub=Math.sin(tau*(3*u+v))*.5+Math.cos(tau*(u-5*v))*.5;
    const h=kind==='crepe'?.12*(warp+weft)+.25*grain:kind==='satin'?.33*warp+.07*weft+.035*grain:.24*(warp+weft)+.12*slub+.06*grain;
    const i=y*size+x,k=i*4;heights[i]=h;
    const r=Math.round(Math.max(0,Math.min(1,base+h*(kind==='satin'?.07:.10)))*255);
    roughness[k]=roughness[k+1]=roughness[k+2]=r;roughness[k+3]=255;
  }
  const at=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(at(x+1,y)-at(x-1,y))*1.6,dy=(at(x,y+1)-at(x,y-1))*1.6,len=Math.hypot(dx,dy,1),k=(y*size+x)*4;
    normal[k]=Math.round((-dx/len*.5+.5)*255);normal[k+1]=Math.round((-dy/len*.5+.5)*255);normal[k+2]=Math.round((1/len*.5+.5)*255);normal[k+3]=255;
  }
  return {size,normal,roughness};
}
